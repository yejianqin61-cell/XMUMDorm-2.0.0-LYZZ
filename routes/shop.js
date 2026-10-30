const express = require('express');
const router = express.Router({ mergeParams: true });
const { query } = require('../database');
const auth = require('../middleware/auth');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const proofUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const { checkBan } = require('../middleware/checkSanction');
const { logAudit } = require('../services/auditLog');
const s = require('../services/shop');
const coupons = require('../services/shopCoupons');
const rateLimit = require('express-rate-limit');
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    const status = err.status || (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT','ER_DUP_ENTRY'].includes(err.code) ? 409 : 500);
    if (status === 500) console.error('[shop]', err.code || err.name);
    res.status(status).json({ status: -1, ...(err.publicCode ? {code:err.publicCode} : {}), message: status === 500 ? '商城暂时不可用，请重试 / Shop unavailable' : (err.status ? err.message : '订单处理中，请重试 / Please retry') });
  }
};
const ok = (res, data) => res.json({ status: 0, data });
const id = value => s.integer(Number(value), 1);
const slotSelect = 'SELECT *, CAST(delivery_date AS CHAR) AS delivery_date, CAST(cutoff_at AS CHAR) AS cutoff_at FROM shop_slots';

router.use(async (req, res, next) => {
  try {
    const slug=req.params.slug || 'water-home';
    const rows=await query('SELECT * FROM shop_merchants WHERE slug = ? AND enabled = 1 AND deleted_at IS NULL',[slug]);
    if (!rows[0]) return res.status(404).json({status:-1,message:'商户不存在 / Store not found'});
    req.merchant=rows[0]; next();
  } catch { res.status(500).json({status:-1,message:'商户暂不可用 / Store unavailable'}); }
});
router.get('/catalog', wrap(async (req, res) => {
  const [products, specialSlots, settings] = await Promise.all([
    query('SELECT * FROM shop_products WHERE merchant_id = ? AND deleted_at IS NULL ORDER BY category, id', [req.merchant.id]),
    query(`${slotSelect} WHERE merchant_id = ? AND is_special = 1 AND deleted_at IS NULL AND enabled = 1 AND delivery_date >= ? ORDER BY delivery_date, delivery_start`, [req.merchant.id, s.campusNow().slice(0,10)]),
    query('SELECT * FROM shop_settings WHERE id = ?', [req.merchant.id]),
  ]);
  const counts = await query("SELECT slot_id, COUNT(*) AS n FROM shop_orders WHERE status <> 'cancelled' GROUP BY slot_id");
  const used = new Map(counts.map(c => [c.slot_id, c.n]));
  const paymentMethods = s.paymentMethods(settings[0]?.payment_methods);
  const hasPaymentMethods = paymentMethods.length > 0;
  const availableSlots = specialSlots.filter(t => s.isSpecialSlotOpen(t) && (used.get(t.id) || 0) < t.capacity);
  const setting = settings[0] ? { ...settings[0],
    has_payment_methods: hasPaymentMethods,
    payment_methods: availableSlots.length ? paymentMethods : [],
    delivery_zones: [],
  } : null;
  ok(res, { merchant:req.merchant, products, categories: s.CATEGORIES, coupons_enabled:await coupons.ready(), has_scheduled_slots: specialSlots.length > 0, order_window_open: availableSlots.length > 0, slots: availableSlots, settings: setting });
}));
router.use(auth, checkBan);
const quoteLimitResponse = (req,res) => res.status(429).json({status:-1,message:'优惠码试算过于频繁，请稍后重试 / Too many coupon attempts'});
router.post('/checkout-quote',
  rateLimit({windowMs:60000,limit:60,standardHeaders:true,legacyHeaders:false,handler:quoteLimitResponse}),
  rateLimit({windowMs:60000,limit:20,keyGenerator:req=>String(req.user.id),standardHeaders:true,legacyHeaders:false,handler:quoteLimitResponse}),
  wrap(async(req,res)=>ok(res,await s.checkout(req.user.id,req.body,'coupon-quote-readonly',req.merchant.id,{quote:true}))));
// Check the current database role even when an old JWT still says admin.
const currentAdmin = async (req, res, next) => {
  try {
    const rows = await query('SELECT role, status FROM users WHERE id = ?', [req.user.id]);
    const membership=await query('SELECT user_id FROM shop_merchant_members WHERE merchant_id = ? AND user_id = ?', [req.merchant.id,req.user.id]);
    if (!rows[0] || rows[0].status === 'deactivated' || (rows[0].role !== 'admin' && !(rows[0].role === 'merchant' && membership.length))) return res.status(403).json({ status: -1, message: '需要管理员权限 / Admin required' });
    next();
  } catch { res.status(500).json({ status: -1, message: '权限校验失败 / Authorization unavailable' }); }
};
router.use('/admin', currentAdmin);
router.use('/admin', (req, res, next) => {
  const route = req.path;
  if (['PUT', 'PATCH', 'POST', 'DELETE'].includes(req.method)) res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) void logAudit({
      userId: req.user.id, role: req.user.role, action: 'SHOP_ADMIN_WRITE', targetType: 'shop',
      targetId: Number(route.match(/\/(\d+)(?:\/|$)/)?.[1]) || null,
      meta: { method: req.method, route, merchantId:req.merchant.id },
    });
  });
  next();
});
router.get('/admin/settings', wrap(async (req,res)=>{
  const rows=await query('SELECT id,payment_methods FROM shop_settings WHERE id = ?', [req.merchant.id]);
  const methods=s.paymentMethods(rows[0]?.payment_methods);
  ok(res,{id:req.merchant.id,payment_methods:methods,has_payment_methods:methods.length>0});
}));
router.get('/admin/coupons',wrap(async(req,res)=>ok(res,await coupons.list(req.merchant.id,req.query))));
router.post('/admin/coupons',wrap(async(req,res)=>ok(res,await coupons.create(req.merchant.id,req.user.id,req.body,req.get('Idempotency-Key')))));
router.patch('/admin/coupons/:id/status',wrap(async(req,res)=>ok(res,await coupons.setStatus(req.merchant.id,id(req.params.id),req.body.status))));
router.get('/admin/coupons/:id/redemptions',wrap(async(req,res)=>ok(res,await coupons.redemptions(req.merchant.id,id(req.params.id),req.query))));
router.delete('/admin/store', wrap(async (req,res)=>{
  await s.transaction(async conn=>{
    const [stores]=await conn.execute('SELECT id FROM shop_merchants WHERE id=? AND deleted_at IS NULL FOR UPDATE',[req.merchant.id]);
    if(!stores[0]) s.fail('店铺不存在或已删除 / Store not found or already deleted',404);
    await conn.execute('UPDATE shop_merchants SET enabled=0,deleted_at=NOW() WHERE id=? AND deleted_at IS NULL',[req.merchant.id]);
  });
  ok(res,{deleted:true});
}));

const productImageUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
router.post('/admin/product-images',(req,res,next)=>productImageUpload.single('image')(req,res,err=>err?res.status(400).json({status:-1,message:'请上传不超过5MB的 JPG、PNG 或 WebP 图片'}):next()),wrap(async(req,res)=>{
 if(!req.file)s.fail('请选择 JPG、PNG 或 WebP 图片');
 ok(res,{url:await require('../services/shopProductImage').saveProductImage(req.file,req.merchant.id)});
}));
router.post('/admin/payment-images', (req,res,next)=>proofUpload.single('image')(req,res,err=>err?res.status(400).json({status:-1,message:'图片不能超过 5MB / Maximum 5 MB'}):next()), wrap(async(req,res)=>{
  if(!req.file) s.fail('请选择收款码图片 / Choose a payment QR image');
  let image;
  try {
    const input=sharp(req.file.buffer,{limitInputPixels:16000000});
    const metadata=await input.metadata();
    if(!['jpeg','png','webp'].includes(metadata.format)&&!(metadata.format==='heif'&&metadata.compression==='av1')) throw Error('format');
    image=await input.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  } catch { s.fail('请选择有效 JPG、PNG、WebP 或 AVIF 图片 / Invalid image'); }
  const storage=require('../services/objectStorage');
  const objectKey='shop/payment/'+req.merchant.id+'/'+require('crypto').randomBytes(18).toString('hex')+'.png';
  if(storage.isObjectStorageConfigured()){
    const url=storage.publicUrlForKey(objectKey);
    if(!url||!url.startsWith('https://')) s.fail('收款码存储未配置公开 HTTPS 地址 / Public HTTPS storage URL required',503);
    await storage.uploadBuffer({key:objectKey,body:image,contentType:'image/png'});
    return ok(res,{url});
  }
  if(process.env.NODE_ENV==='production'&&!process.env.SHOP_ASSET_DIR) s.fail('请配置收款码持久化存储 / Persistent payment image storage required',503);
  const assetRoot=process.env.SHOP_ASSET_DIR||path.join(__dirname,'../.local/shop-assets');
  const dir=path.join(assetRoot,'payment',String(req.merchant.id));
  await require('fs').promises.mkdir(dir,{recursive:true});
  const name=require('crypto').randomBytes(18).toString('hex')+'.png';
  await require('fs').promises.writeFile(path.join(dir,name),image,{flag:'wx'});
  ok(res,{url:'/api/shop/assets/payment/'+req.merchant.id+'/'+name});
}));
router.delete('/orders/:id/proof', wrap(async(req,res)=>{
  await s.transaction(async conn=>{
    const [orders]=await conn.execute('SELECT id,status FROM shop_orders WHERE id=? AND user_id=? AND merchant_id=? FOR UPDATE',[id(req.params.id),req.user.id,req.merchant.id]);
    if(!orders[0]) s.fail('订单不存在 / Order not found',404);
    if(orders[0].status!=='pending_verification') s.fail('已核实订单不可删除凭证 / Verified receipts cannot be deleted',409);
    await conn.execute('DELETE FROM shop_payment_proofs WHERE order_id=?',[orders[0].id]);
  });
  void logAudit({userId:req.user.id,role:req.user.role,action:'SHOP_PROOF_DELETE',targetType:'shop_order',targetId:id(req.params.id),meta:{merchantId:req.merchant.id}});
  ok(res,{deleted:true});
}));
router.post('/orders/:id/proof', (req,res,next)=>proofUpload.single('proof')(req,res,err=>err?res.status(400).json({status:-1,message:'仅支持不超过 5MB 的图片 / Images must be 5 MB or smaller'}):next()), wrap(async(req,res)=>{
  let b=req.file?.buffer;
  let type=b?.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b?.[0]===255&&b?.[1]===216&&b?.[2]===255?'image/jpeg':b?.subarray(0,4).toString()==='RIFF'&&b?.subarray(8,12).toString()==='WEBP'?'image/webp':null;
  if(!type&&req.file?.mimetype==='image/avif'){
    try{
      const metadata=await sharp(b,{limitInputPixels:40000000}).metadata();
      if(metadata.format==='heif'&&metadata.compression==='av1'){
        b=await sharp(b,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
        type='image/jpeg';
      }
    }catch{/* Invalid or unsupported images are rejected below. */}
  }
  if(!type) s.fail('请上传 JPG / PNG / WebP 图片；HEIC 照片请先另存为 JPG / Please upload JPG, PNG, or WebP. Convert HEIC photos to JPG first.');
  await s.transaction(async conn=>{
    const [orders]=await conn.execute('SELECT id,status FROM shop_orders WHERE id=? AND user_id=? AND merchant_id=? FOR UPDATE',[id(req.params.id),req.user.id,req.merchant.id]);
    if(!orders[0]) s.fail('订单不存在 / Order not found',404);
    if(orders[0].status!=='pending_verification') s.fail('仅待核实订单可更新凭证 / Order already verified',409);
    await conn.execute('INSERT INTO shop_payment_proofs (order_id,content_type,image) VALUES (?,?,?) ON DUPLICATE KEY UPDATE content_type=VALUES(content_type),image=VALUES(image)',[orders[0].id,type,b]);
  });
  ok(res,{saved:true});
}));
router.get('/orders/:id/proof', wrap(async(req,res)=>{
  const rows=await query('SELECT p.content_type,p.image,o.user_id FROM shop_payment_proofs p JOIN shop_orders o ON o.id=p.order_id WHERE o.id=? AND o.merchant_id=?',[id(req.params.id),req.merchant.id]);
  if(!rows[0]) s.fail('暂无付款截图 / No receipt',404);
  if(rows[0].user_id!==req.user.id){
    const users=await query('SELECT role,status FROM users WHERE id=?',[req.user.id]);
    const members=await query('SELECT user_id FROM shop_merchant_members WHERE merchant_id=? AND user_id=?',[req.merchant.id,req.user.id]);
    if(users[0]?.status==='deactivated'||!(users[0]?.role==='admin'||(users[0]?.role==='merchant'&&members.length))) s.fail('无权查看 / Forbidden',403);
  }
  res.set({'Content-Type':rows[0].content_type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(rows[0].image);
}));
router.get('/address', wrap(async (req, res) => {
  const rows = await query('SELECT contact_name, contact, building, room FROM shop_addresses WHERE user_id = ?', [req.user.id]);
  ok(res, rows[0] || null);
}));
router.get('/requests/:key', wrap(async (req, res) => {
  if (!/^[\w-]{16,80}$/.test(req.params.key)) s.fail('下单标识无效 / Invalid request key');
  const rows = await query('SELECT id FROM shop_orders WHERE merchant_id = ? AND user_id = ? AND idempotency_key = ?', [req.merchant.id, req.user.id, req.params.key]);
  ok(res, rows[0] || null);
}));
router.get('/cart', wrap(async (req, res) => {
  const items = await query(`SELECT p.*, c.quantity FROM shop_cart_items c JOIN shop_products p ON p.id = c.product_id
    WHERE p.merchant_id = ? AND c.user_id = ? AND c.deleted_at IS NULL AND c.quantity > 0 ORDER BY p.id`, [req.merchant.id, req.user.id]);
  ok(res, { items, total_cents: items.reduce((sum, p) => sum + p.price_cents * p.quantity, 0) });
}));
router.put('/cart/:id', wrap(async (req, res) => {
  const productId = id(req.params.id);
  const quantity = s.integer(req.body.quantity, 0, 99);
  await s.transaction(async conn => {
    await s.lockUser(conn, req.user.id);
    const [rows] = await conn.execute('SELECT * FROM shop_products WHERE id = ? FOR UPDATE', [productId]);
    if (!rows[0] || rows[0].merchant_id !== req.merchant.id) s.fail('商品不存在 / Product not found', 404);
    if (quantity && (rows[0].deleted_at || rows[0].sold_out || rows[0].stock < quantity)) s.fail('库存不足 / Insufficient stock', 409);
    await conn.execute(`INSERT INTO shop_cart_items (user_id, product_id, quantity, deleted_at) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), deleted_at = VALUES(deleted_at)`, [req.user.id, productId, quantity, quantity ? null : new Date()]);
  });
  ok(res, { saved: true });
}));
router.post('/orders', wrap(async (req, res) => {
  const result = await s.checkout(req.user.id, req.body, req.get('Idempotency-Key'), req.merchant.id);
  res.status(result.replayed ? 200 : 201).json({ status: 0, data: result });
}));
router.get('/orders', wrap(async (req, res) => {
  const page = req.query.page === undefined ? 1 : id(req.query.page);
  const orders = await query('SELECT * FROM shop_orders WHERE merchant_id = ? AND user_id = ? ORDER BY id DESC LIMIT 20 OFFSET ' + ((page - 1) * 20), [req.merchant.id, req.user.id]);
  ok(res, { orders: orders.map(s.decode), page, has_more: orders.length === 20 });
}));
router.get('/orders/:id', wrap(async (req, res) => {
  const rows = await query('SELECT *, EXISTS(SELECT 1 FROM shop_payment_proofs p WHERE p.order_id=shop_orders.id) AS has_proof FROM shop_orders WHERE id = ? AND user_id = ? AND merchant_id = ?', [id(req.params.id), req.user.id, req.merchant.id]);
  if (!rows[0]) s.fail('订单不存在 / Order not found', 404);
  ok(res, s.decode(rows[0]));
}));
router.post('/orders/:id/reorder', wrap(async (req, res) => {
  const result = await s.transaction(async conn => {
    await s.lockUser(conn, req.user.id);
    const [orders] = await conn.execute('SELECT * FROM shop_orders WHERE id = ? AND user_id = ? AND merchant_id = ?', [id(req.params.id), req.user.id, req.merchant.id]);
    if (!orders[0]) s.fail('订单不存在 / Order not found', 404);
    const changes = [];
    for (const item of [...s.decode(orders[0]).items_json].sort((a,b) => a.product_id - b.product_id)) {
      const [rows] = await conn.execute('SELECT * FROM shop_products WHERE id = ? FOR UPDATE', [item.product_id]);
      const p = rows[0];
      const [cart] = await conn.execute('SELECT quantity FROM shop_cart_items WHERE user_id = ? AND product_id = ? AND deleted_at IS NULL', [req.user.id, item.product_id]);
      const before = cart[0]?.quantity || 0;
      const quantity = !p || p.deleted_at || p.sold_out ? 0 : Math.min(99, p.stock, before + item.quantity);
      const added = Math.max(0, quantity - before);
      if (added) await conn.execute(`INSERT INTO shop_cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), deleted_at = NULL`, [req.user.id, item.product_id, quantity]);
      changes.push({ product_id: item.product_id, requested: item.quantity, added });
    }
    return changes;
  });
  ok(res, result);
}));

router.get('/admin/products', wrap(async (req, res) => ok(res, await query('SELECT * FROM shop_products WHERE merchant_id = ? AND deleted_at IS NULL ORDER BY id',[req.merchant.id]))));
router.put('/admin/products/:id', wrap(async (req, res) => {
  const data = s.product(req.body);
  const productId = req.params.id === 'new' ? null : id(req.params.id);
  ok(res, { id: await save('shop_products', data, productId, req.merchant.id) });
}));
// Explicit columns and placeholders; never accept arbitrary SQL keys from the browser.
async function save(table, data, rowId, merchantId) {
  const keys = Object.keys(data);
  if (rowId) {
    const result = await query(`UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ? AND merchant_id = ? AND deleted_at IS NULL`, [...Object.values(data), rowId, merchantId]);
    if (!result.affectedRows) s.fail('记录不存在 / Record not found', 404);
    return rowId;
  }
  const result = await query(`INSERT INTO ${table} (merchant_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`, [merchantId, ...Object.values(data)]);
  return result.insertId;
}
router.get('/admin/special-slots', wrap(async (req,res)=>ok(res,await query(`${slotSelect} WHERE merchant_id=? AND is_special=1 AND deleted_at IS NULL ORDER BY delivery_date DESC,id DESC`,[req.merchant.id]))));
router.put('/admin/special-slots/:id', wrap(async (req,res)=>{
  const value=s.specialSlot(req.body);
  if(value.delivery_date<s.campusNow().slice(0,10)) s.fail('不能设置过去的配送日期 / Delivery date must be today or later');
  const start=value.delivery_start.slice(0,5);
  const data={delivery_date:value.delivery_date,delivery_start:value.delivery_start,delivery_end:value.delivery_end,
    label_zh:`${value.label_zh} ${start}-${value.delivery_end.slice(0,5)}`,
    label_en:`${value.label_en} ${start}-${value.delivery_end.slice(0,5)}`,
    cutoff_at:`${value.delivery_date} ${value.delivery_start}`,capacity:value.capacity,enabled:1,is_demo:0,is_special:1};
  const rowId=req.params.id==='new'?null:id(req.params.id);
  if(rowId){
    const rows=await query('SELECT id FROM shop_slots WHERE id=? AND merchant_id=? AND is_special=1 AND deleted_at IS NULL',[rowId,req.merchant.id]);
    if(!rows.length)s.fail('指定日期时段不存在 / Special delivery period not found',404);
    await query(`UPDATE shop_slots SET delivery_date=?,delivery_start=?,delivery_end=?,label_zh=?,label_en=?,cutoff_at=?,capacity=?,enabled=? WHERE id=? AND merchant_id=?`,
      [data.delivery_date,data.delivery_start,data.delivery_end,data.label_zh,data.label_en,data.cutoff_at,data.capacity,1,rowId,req.merchant.id]);
  }else{
    const result=await query(`INSERT INTO shop_slots (merchant_id,delivery_date,delivery_start,delivery_end,is_special,label_zh,label_en,cutoff_at,capacity,enabled,is_demo) VALUES (?,?,?,?,1,?,?,?,?,?,0)`,
      [req.merchant.id,data.delivery_date,data.delivery_start,data.delivery_end,data.label_zh,data.label_en,data.cutoff_at,data.capacity,data.enabled]);
    return ok(res,{id:result.insertId});
  }
  ok(res,{id:rowId});
}));
router.put('/admin/settings', wrap(async (req, res) => {
  const methods = req.body.payment_methods || [];
  // Legacy field retained in storage, but new orders accept all student-entered addresses.
  const safeZones = [];
  if(!Array.isArray(methods)||methods.length>8) s.fail('配置无效 / Invalid settings');
  const safeMethods=methods.map(m=>({id:m.id?s.text(m.id,40):require('crypto').randomUUID(),name_zh:s.text(m.name_zh,120),name_en:s.text(m.name_en,120),qr_url:s.text(m.qr_url,500)}));
  for(const m of safeMethods) if(!m.name_zh||!m.name_en||!m.qr_url) s.fail('请填写中英文名称并上传二维码 / Chinese name, English name, and QR image are required');
  for(const m of safeMethods) if(!/^\/(?!\/)[\w/.-]+$/.test(m.qr_url)&&!/^https:\/\//.test(m.qr_url)) s.fail('二维码地址无效 / Invalid QR URL');
  if(new Set(safeMethods.map(m=>m.id)).size!==safeMethods.length) s.fail('标识不能重复 / Duplicate IDs');
  await s.transaction(async conn=>{
    await conn.execute(`INSERT INTO shop_settings (id,delivery_notice_zh,delivery_notice_en,payment_zh,payment_en,payment_methods,delivery_zones) VALUES (?, '', '', '', '', ?, ?) ON DUPLICATE KEY UPDATE payment_methods=VALUES(payment_methods),delivery_zones=VALUES(delivery_zones)`,[req.merchant.id,JSON.stringify(safeMethods),JSON.stringify(safeZones)]);
  });
  ok(res, { saved: true });
}));
router.get('/admin/orders', wrap(async (req, res) => {
  let where = 'WHERE o.merchant_id = ?'; const params = [req.merchant.id];
  if (req.query.date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) s.fail('日期无效 / Invalid date'); where += " AND JSON_UNQUOTE(JSON_EXTRACT(o.slot_json, '$.delivery_date')) = ?"; params.push(req.query.date); }
  if (req.query.slot_id) { where += ' AND o.slot_id = ?'; params.push(id(req.query.slot_id)); }
  for (const field of ['building', 'room']) if (req.query[field]) {
    where += ` AND JSON_UNQUOTE(JSON_EXTRACT(o.address_json, '$.${field}')) = ?`; params.push(s.text(req.query[field], field === 'building' ? 40 : 30));
  }
  if (req.query.status) { if (!Object.hasOwn(s.TRANSITIONS, req.query.status)) s.fail('状态无效 / Invalid status'); where += ' AND o.status = ?'; params.push(req.query.status); }
  // Bounded result with explicit truncation; prep list only includes returned non-cancelled orders.
  const rows = await query(`SELECT o.*, EXISTS(SELECT 1 FROM shop_payment_proofs p WHERE p.order_id=o.id) AS has_proof FROM shop_orders o JOIN shop_slots t ON t.id = o.slot_id ${where} ORDER BY o.id DESC LIMIT 1001`, params);
  const orders = rows.slice(0,1000).map(s.decode);
  const prep = new Map();
  for (const order of orders.filter(o => !['cancelled', 'completed'].includes(o.status))) {
    for (const item of order.items_json) {
      const key = `${order.slot_id}/${order.address_json.building}/${item.product_id}/${item.spec_zh}/${item.spec_en}`;
      const line = prep.get(key) || { ...item, quantity: 0, building: order.address_json.building, slot: order.slot_json, slot_id: order.slot_id };
      line.quantity += item.quantity; prep.set(key, line);
    }
  }
  ok(res, { orders, prep: [...prep.values()], truncated: rows.length > 1000 });
}));
router.patch('/admin/orders/:id/status', wrap(async (req, res) => ok(res, await s.changeStatus(id(req.params.id), req.body.status, req.merchant.id))));
const entry=express.Router();
const requireShopAdmin=async(req,res,next)=>{
 try{
  const users=await query('SELECT role,status FROM users WHERE id=?',[req.user.id]);
  if(users[0]?.role!=='admin'||users[0]?.status==='deactivated')return res.status(403).json({status:-1,message:'需要管理员权限 / Admin required'});
  next();
 }catch{return res.status(500).json({status:-1,message:'权限校验失败 / Authorization unavailable'});}
};
entry.get('/admin/stores',auth,checkBan,requireShopAdmin,wrap(async(req,res)=>ok(res,await query('SELECT id,slug,name_zh,name_en,enabled,created_at FROM shop_merchants WHERE deleted_at IS NULL ORDER BY id'))));
entry.delete('/admin/stores/:id',auth,checkBan,requireShopAdmin,wrap(async(req,res)=>{
 const merchantId=id(req.params.id);
 await s.transaction(async conn=>{
  const [stores]=await conn.execute('SELECT id,slug FROM shop_merchants WHERE id=? AND deleted_at IS NULL FOR UPDATE',[merchantId]);
  if(!stores[0])s.fail('店铺不存在或已删除 / Store not found or already deleted',404);
  await conn.execute('UPDATE shop_merchants SET enabled=0,deleted_at=NOW() WHERE id=? AND deleted_at IS NULL',[merchantId]);
 });
 void logAudit({userId:req.user.id,role:'admin',action:'SHOP_STORE_DELETE',targetType:'shop',targetId:merchantId,meta:{scope:'admin'}});
 ok(res,{deleted:true});
}));
entry.get('/merchants', wrap(async (req,res)=>ok(res,await query('SELECT id,slug,name_zh,name_en FROM shop_merchants WHERE enabled=1 AND deleted_at IS NULL ORDER BY id'))));
entry.get('/my-merchants',auth,checkBan,wrap(async(req,res)=>{
 const users=await query('SELECT role,status FROM users WHERE id=?',[req.user.id]);
 if(users[0]?.status==='deactivated') s.fail('账号停用 / Inactive',403);
 const rows=users[0]?.role==='admin'?await query('SELECT * FROM shop_merchants WHERE enabled=1 AND deleted_at IS NULL'):users[0]?.role==='merchant'?await query('SELECT m.* FROM shop_merchants m JOIN shop_merchant_members u ON u.merchant_id=m.id WHERE u.user_id=? AND m.enabled=1 AND m.deleted_at IS NULL',[req.user.id]):[];
 ok(res,rows);
}));
entry.post('/merchants',auth,checkBan,wrap(async(req,res)=>{
 const users=await query('SELECT role,status FROM users WHERE id=?',[req.user.id]);
 if(users[0]?.role!=='admin'||users[0]?.status==='deactivated') s.fail('需要管理员权限 / Admin required',403);
 const slug=s.text(req.body.slug,60);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))s.fail('入口仅支持小写字母、数字及短横线');
 const nameZh=s.text(req.body.name_zh,120),nameEn=s.text(req.body.name_en,120),username=s.text(req.body.username,100);
 const merchantId=await s.transaction(async conn=>{
  const [owners]=await conn.execute("SELECT id,role,status FROM users WHERE username=? FOR UPDATE",[username]);
  if(!owners[0]||!['merchant','admin'].includes(owners[0].role)||owners[0].status==='deactivated')s.fail('请选择已有有效商家或管理员账号 / Existing merchant account required');
  const [r]=await conn.execute('INSERT INTO shop_merchants (slug,name_zh,name_en) VALUES (?,?,?)',[slug,nameZh,nameEn]);
  await conn.execute('INSERT INTO shop_merchant_members (merchant_id,user_id) VALUES (?,?)',[r.insertId,owners[0].id]);
  await conn.execute('INSERT INTO shop_settings (id,delivery_notice_zh,delivery_notice_en,payment_zh,payment_en) VALUES (?,?,?,?,?)',[r.insertId,'','','','']);
  return r.insertId;
 });
 await logAudit({userId:req.user.id,role:'admin',action:'SHOP_MERCHANT_CREATE',targetType:'shop',targetId:merchantId,meta:{slug}});
 ok(res,{id:merchantId,slug});
}));
entry.post('/my-stores',auth,checkBan,wrap(async(req,res)=>{
 const result=await require('../services/shopOwnStore')(req.user.id,req.body);
 await logAudit({userId:req.user.id,role:req.user.role,action:'SHOP_OWN_STORE_CREATE',targetType:'shop',targetId:result.id,meta:{slug:result.slug}});
 ok(res,result);
}));
entry.post('/merchant-accounts',auth,checkBan,wrap(async(req,res)=>{
 const result=await require('../services/shopMerchantAccount')(req.user.id,req.body);
 await logAudit({userId:req.user.id,role:'merchant',action:'SHOP_MERCHANT_ACCOUNT_CREATE',targetType:'shop',targetId:result.id,meta:{slug:result.slug}});
 ok(res,result);
}));
entry.use('/assets', express.static((process.env.SHOP_ASSET_DIR||path.join(__dirname,'../.local/shop-assets')),{dotfiles:'deny',index:false,
 setHeaders:res=>res.setHeader('Cross-Origin-Resource-Policy','cross-origin'),
}));
entry.use('/stores/:slug',router);
entry.use('/',router);
module.exports = entry;
