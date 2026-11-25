const { pool } = require('../database');
const sanitize = require('sanitize-html');
const crypto = require('crypto');
const coupons = require('./shopCoupons');

const CATEGORIES = ['offers', 'water', 'drinks', 'noodles', 'eggs', 'groceries', 'snacks'];
const TRANSITIONS = {
  pending_verification: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'], preparing: ['delivering', 'cancelled'],
  delivering: ['completed'], completed: [], cancelled: [],
};
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function integer(value, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail('数值无效 / Invalid number');
  return value;
}
function text(value, max) {
  if (typeof value !== 'string') fail('请填写必填信息 / Required field');
  const clean = sanitize(value, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!clean || clean.length > max) fail('文字为空或过长 / Empty or too long');
  return clean;
}
function optionalText(value, max) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') fail('文字格式无效 / Invalid text');
  const clean = sanitize(value, { allowedTags: [], allowedAttributes: {} }).trim();
  if (clean.length > max) fail('文字过长 / Text too long');
  return clean;
}
function paymentMethods(value) {
  let methods = value;
  if (typeof methods === 'string') {
    try { methods = JSON.parse(methods); } catch { return []; }
  }
  if (!Array.isArray(methods)) return [];
  return methods.filter(method => method && typeof method === 'object' && !Array.isArray(method)).map(method => {
    const normalized = {
      id: optionalText(String(method.id || ''), 40),
      name_zh: optionalText(method.name_zh, 120),
      name_en: optionalText(method.name_en, 120),
      qr_url: optionalText(method.qr_url, 500),
    };
    const paymentUrl = optionalText(method.payment_url, 1000);
    if (paymentUrl) normalized.payment_url = paymentUrl;
    return normalized;
  }).filter(method => {
    const validQr = method.qr_url && (/^\/(?!\/)[\w/.-]+$/.test(method.qr_url) || /^https:\/\//.test(method.qr_url));
    let validPaymentUrl = false;
    try { const url = new URL(method.payment_url); validPaymentUrl = url.protocol === 'https:' && !url.username && !url.password; } catch {}
    return method.id && method.name_zh && method.name_en && (validQr || validPaymentUrl)
      && (!method.payment_url || validPaymentUrl);
  });
}
function address(body) {
  return { contact_name: text(body.contact_name, 100), contact: text(body.contact, 120),
    building: text(body.building, 40), room: text(body.room, 30) };
}
function flag(value) { if (typeof value !== 'boolean') fail('开关值无效 / Invalid flag'); return value ? 1 : 0; }
function product(body) {
  if (!CATEGORIES.includes(body.category)) fail('分类无效 / Invalid category');
  const image = text(body.image_url, 500);
  if (!/^\/(?!\/)[\w/.-]+$/.test(image) && !/^https:\/\//.test(image)) fail('图片须为本地路径或 HTTPS / Invalid image URL');
  return { category: body.category, name_zh: text(body.name_zh, 120), name_en: text(body.name_en, 120),
    spec_zh: optionalText(body.spec_zh, 120), spec_en: optionalText(body.spec_en, 120),
    description_zh: optionalText(body.description_zh, 2000), description_en: optionalText(body.description_en, 2000),
    image_url: image, price_cents: integer(body.price_cents, body.sold_out ? 0 : 1, 1000000), stock: integer(body.stock, 0, 1000000),
    sold_out: flag(body.sold_out), is_demo: flag(body.is_demo ?? false) };
}
// All slot times use campus wall clock explicitly, independent of server timezone.
function campusNow() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }); }
function isSpecialSlotOpen(slot, now = campusNow()) {
  const date = String(slot?.delivery_date || '').slice(0, 10);
  const start = String(slot?.delivery_start || '').slice(0, 5);
  const end = String(slot?.delivery_end || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) return false;
  return `${date} ${start}:00` <= now && now < `${date} ${end}:00`;
}
function slot(body) {
  const date = text(body.delivery_date, 10);
  const cutoff = text(body.cutoff_at, 19).replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date
    || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cutoff)
    || Number.isNaN(Date.parse(cutoff.replace(' ', 'T') + '+08:00')) || cutoff.slice(0, 10) > date
    || cutoff.slice(11, 13) > '23' || cutoff.slice(14, 16) > '59' || cutoff.slice(17) > '59'
    || new Date(cutoff.replace(' ', 'T') + '+08:00').toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }) !== cutoff) fail('日期或截止时间无效 / Invalid slot date');
  return { delivery_date: date, label_zh: text(body.label_zh, 120), label_en: text(body.label_en, 120),
    cutoff_at: cutoff, capacity: integer(body.capacity, 1, 100000), enabled: flag(body.enabled), is_demo: flag(body.is_demo ?? false) };
}
function specialSlot(body) {
  const date = text(body.delivery_date, 10);
  const start = text(body.delivery_start, 8);
  const end = text(body.delivery_end, 8);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
    || start >= end) fail('日期或配送时间段无效 / Invalid date or delivery period');
  return { delivery_date: date, delivery_start: `${start}:00`, delivery_end: `${end}:00`,
    label_zh: text(body.label_zh, 120), label_en: text(body.label_en, 120),
    capacity: 100000, enabled: 1 };
}
function decode(row) {
  if (!row) return row;
  const result = { ...row };
  for (const key of ['address_json', 'items_json', 'slot_json', 'payment_json', 'coupon_json']) {
    if (typeof result[key] === 'string') result[key] = JSON.parse(result[key]);
  }
  return result;
}
async function transaction(work) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const result = await work(conn); await conn.commit(); return result; }
  catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}
async function lockUser(conn, userId) {
  const [users] = await conn.execute('SELECT id, status FROM users WHERE id = ? FOR UPDATE', [userId]);
  if (!users[0] || users[0].status === 'deactivated') fail('账号不可用 / Account unavailable', 403);
}
async function checkout(userId, body, key, merchantId = 1, options = {}) {
  if (typeof key !== 'string' || !/^[\w-]{16,80}$/.test(key)) fail('缺少有效下单标识 / Invalid request key');
  const location = options.quote ? null : address(body.address || {});
  const slotId = integer(body.slot_id, 1);
  const expected = options.quote ? null : integer(body.expected_total_cents, 1);
  const couponCode = coupons.normalizeCode(body.coupon_code);
  // Check capability before taking a transaction connection; do not exhaust the
  // pool by asking it for a second connection while every checkout holds one.
  const couponAvailable = (couponCode || options.quote || coupons.enabled()) ? await coupons.ready() : false;
  const paymentMethod = body.payment_method || null;
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ location, slotId, expected, merchantId, paymentMethod, ...(couponCode ? {couponCode} : {}) })).digest('hex');
  return transaction(async (conn) => {
    await lockUser(conn, userId); // serializes cart writes, checkout and repeated requests for this user
    const [merchants] = await conn.execute('SELECT id FROM shop_merchants WHERE id=? AND enabled=1 AND deleted_at IS NULL FOR UPDATE', [merchantId]);
    if (!merchants[0]) fail('店铺已停止营业 / Store is unavailable', 409);
    const [existing] = options.quote ? [[]] : await conn.execute('SELECT * FROM shop_orders WHERE user_id = ? AND idempotency_key = ?', [userId, key]);
    if (existing[0]) {
      if (existing[0].merchant_id !== merchantId) fail('订单不属于此商户 / Wrong merchant', 404);
      if (existing[0].request_hash !== fingerprint) fail('下单标识已用于其他内容 / Request key reused', 409);
      return { order: decode(existing[0]), replayed: true };
    }
    if ((couponCode || options.quote) && !couponAvailable) throw Object.assign(new Error('优惠券暂未开放，请稍后重试 / Coupons are unavailable'),{status:503,publicCode:'COUPONS_UNAVAILABLE'});
    const [slots] = await conn.execute('SELECT *, CAST(delivery_date AS CHAR) AS delivery_date, CAST(cutoff_at AS CHAR) AS cutoff_at FROM shop_slots WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [slotId]);
    const selected = slots[0];
    if (!selected || selected.merchant_id !== merchantId || Number(selected.is_special) !== 1 || !selected.enabled || !isSpecialSlotOpen(selected)) fail('当前不在商家开放的下单时段内 / Ordering is currently outside the merchant’s open period', 409);
    {
      const start = String(selected.delivery_start || '').slice(0, 5);
      const end = String(selected.delivery_end || '').slice(0, 5);
      if (!start || !end || start >= end || selected.cutoff_at !== `${selected.delivery_date} ${start}:00`
        || selected.label_zh !== `${String(selected.label_zh).replace(/ \d{2}:\d{2}-\d{2}:\d{2}$/, '')} ${start}-${end}`
        || selected.label_en !== `${String(selected.label_en).replace(/ \d{2}:\d{2}-\d{2}:\d{2}$/, '')} ${start}-${end}`) {
        fail('指定日期配送时段已变更，请刷新后重新下单 / Special delivery period changed; refresh and retry', 409);
      }
    }
    // Current locking read: a plain COUNT under REPEATABLE READ could use the
    // snapshot established before waiting for another user's slot lock.
    const [booked] = await conn.execute("SELECT id FROM shop_orders WHERE slot_id = ? AND status <> 'cancelled' FOR UPDATE", [slotId]);
    if (booked.length >= selected.capacity) fail('时段已满 / Slot full', 409);
    const [cart] = await conn.execute('SELECT c.product_id, c.quantity FROM shop_cart_items c JOIN shop_products p ON p.id=c.product_id WHERE c.user_id = ? AND p.merchant_id = ? AND c.deleted_at IS NULL AND c.quantity > 0 ORDER BY c.product_id', [userId, merchantId]);
    if (!cart.length) fail('购物车为空 / Cart empty');
    let total = 0;
    const items = [];
    for (const line of cart) {
      const [rows] = await conn.execute('SELECT * FROM shop_products WHERE id = ? FOR UPDATE', [line.product_id]);
      const p = rows[0];
      if (!p || p.merchant_id !== merchantId || p.deleted_at || p.sold_out || p.price_cents <= 0 || p.stock < line.quantity) fail('商品库存不足或已售罄，请刷新购物车 / Stock changed', 409);
      total += p.price_cents * line.quantity;
      integer(total, 1);
      items.push({ product_id: p.id, name_zh: p.name_zh, name_en: p.name_en, spec_zh: p.spec_zh, spec_en: p.spec_en,
        price_cents: p.price_cents, quantity: line.quantity, is_demo: p.is_demo });
    }
    const [settings] = await conn.execute('SELECT payment_zh, payment_en, payment_methods FROM shop_settings WHERE id = ?', [merchantId]);
    if (!settings[0]) fail('商家尚未配置付款说明 / Payment instructions unavailable', 409);
    const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
    const methods = paymentMethods(settings[0].payment_methods);
    const method = methods.find(m => m.id === paymentMethod);
    if (!options.quote && methods.length && !method) fail('请选择付款方式 / Choose payment method');
    const payment = { ...settings[0], payment_methods: methods, delivery_zones: [], selected_method: method || null, delivery_zone: null };
    const subtotal = total;
    const coupon = couponCode ? await coupons.discount(conn,couponCode,merchantId,userId,subtotal,campusNow()) : null;
    const discount = coupon?.discount_cents || 0;
    total -= discount;
    if (options.quote) return {subtotal_cents:subtotal,discount_cents:discount,total_cents:total,coupon,server_time:campusNow()};
    if (total !== expected) throw Object.assign(new Error('价格或优惠已变更，请重新确认 / Price or discount changed'),{status:409,publicCode:'PRICE_CHANGED'});
    for (const item of items) await conn.execute('UPDATE shop_products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    const [insert] = await conn.execute(`INSERT INTO shop_orders (user_id, slot_id, idempotency_key, request_hash, address_json, items_json, slot_json, payment_json, total_cents, merchant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, slotId, key, fingerprint, JSON.stringify(location), JSON.stringify(items),
      JSON.stringify({ delivery_date: selected.delivery_date, label_zh: selected.label_zh, label_en: selected.label_en, is_demo: selected.is_demo }), JSON.stringify(payment), total, merchantId]);
    if (couponAvailable) await conn.execute('UPDATE shop_orders SET subtotal_cents=?,discount_cents=?,coupon_json=? WHERE id=?',[subtotal,discount,coupon?JSON.stringify(coupon):null,insert.insertId]);
    if (coupon) await coupons.reserve(conn,coupon,insert.insertId,userId);
    await conn.execute('UPDATE shop_cart_items c JOIN shop_products p ON p.id=c.product_id SET c.deleted_at = NOW() WHERE c.user_id = ? AND p.merchant_id = ? AND c.deleted_at IS NULL', [userId, merchantId]);
    await conn.execute(`INSERT INTO shop_addresses (user_id, contact_name, contact, building, room) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE contact_name=VALUES(contact_name), contact=VALUES(contact), building=VALUES(building), room=VALUES(room)`, [userId, ...Object.values(location)]);
    const [orders] = await conn.execute('SELECT * FROM shop_orders WHERE id = ?', [insert.insertId]);
    return { order: decode(orders[0]), replayed: false };
  });
}
async function changeStatus(id, next, merchantId = 1) {
  if (!Object.hasOwn(TRANSITIONS, next)) fail('订单状态无效 / Invalid status');
  return transaction(async conn => {
    const [rows] = await conn.execute('SELECT * FROM shop_orders WHERE id = ? FOR UPDATE', [id]);
    const order = decode(rows[0]);
    if (!order || order.merchant_id !== merchantId) fail('订单不存在 / Order not found', 404);
    if (order.status === next) return order;
    if(next==='confirmed' && order.payment_json?.selected_method){
      const [proofs]=await conn.execute('SELECT order_id FROM shop_payment_proofs WHERE order_id=?',[id]);
      if(!proofs.length) fail('请先核实付款截图 / Payment receipt required',409);
    }
    if (!TRANSITIONS[order.status]?.includes(next)) fail('不允许的状态变更 / Invalid transition', 409);
    if (next === 'cancelled') {
      for (const item of [...order.items_json].sort((a,b) => a.product_id - b.product_id)) {
        await conn.execute('UPDATE shop_products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
    await coupons.transition(conn,order,next);
    await conn.execute('UPDATE shop_orders SET status = ? WHERE id = ?', [next, id]);
    return { ...order, status: next };
  });
}
module.exports = { CATEGORIES, TRANSITIONS, fail, integer, text, address, product, paymentMethods, slot, specialSlot, decode, transaction, lockUser, checkout, changeStatus, campusNow, isSpecialSlotOpen };
