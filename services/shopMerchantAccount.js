const bcrypt = require('bcryptjs');
const { pool } = require('../database');
const s = require('./shop');
const createDormId = require('../utils/dormId');

// Serialize account-name checks without changing the legacy users table schema.
module.exports = async function createMerchantAccount(actorId, body) {
  const username = s.text(body.username, 50);
  const slug = s.text(body.slug, 60).toLowerCase();
  const nameZh = s.text(body.name_zh, 120), nameEn = s.text(body.name_en, 120);
  if (!/^[\p{Script=Han}a-zA-Z0-9_-]{2,50}$/u.test(username)) s.fail('用户名须为 2–50 位中文、字母、数字、下划线或短横线，不含空格');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) s.fail('店铺入口仅支持小写字母、数字和短横线');
  if (typeof body.password !== 'string' || body.password.length < 10 || Buffer.byteLength(body.password) > 72) s.fail('密码至少 10 位，最多 72 字节');
  const conn = await pool.getConnection();
  let locked = false;
  try {
    const [actors] = await conn.execute('SELECT role,status FROM users WHERE id=?', [actorId]);
    if (!actors[0] || actors[0].status !== 'active' || !['admin','merchant'].includes(actors[0].role)) s.fail('需要有效商家账号 / Merchant account required',403);
    const hash = await bcrypt.hash(body.password,12);
    const [lock] = await conn.query("SELECT GET_LOCK('shop_account_creation',10) AS acquired");
    if (!lock[0].acquired) s.fail('正在创建账号，请稍后重试',409);
    locked = true;
    await conn.beginTransaction();
    const [current] = await conn.execute('SELECT role,status FROM users WHERE id=? FOR UPDATE',[actorId]);
    if (current[0]?.status !== 'active' || !['admin','merchant'].includes(current[0]?.role)) s.fail('商家权限已失效',403);
    const [names] = await conn.execute('SELECT id FROM users WHERE username=?',[username]);
    const [stores] = await conn.execute('SELECT id FROM shop_merchants WHERE slug=?',[slug]);
    if (names.length) s.fail('商家用户名已存在。如需使用当前账号开店，请选择创建我的店铺 / Username already taken',409);
    if (stores.length) s.fail('店铺网址名称已被使用，请更换 / Store URL name already taken',409);
    const [user] = await conn.execute("INSERT INTO users (username,nickname,dorm_id,password_hash,role,status,email_verified) VALUES (?,?,?,?,'merchant','active',1)",[username,nameZh,createDormId(),hash]);
    const [store] = await conn.execute('INSERT INTO shop_merchants (slug,name_zh,name_en) VALUES (?,?,?)',[slug,nameZh,nameEn]);
    await conn.execute('INSERT INTO shop_merchant_members (merchant_id,user_id) VALUES (?,?)',[store.insertId,user.insertId]);
    await conn.execute('INSERT INTO shop_settings (id,delivery_notice_zh,delivery_notice_en,payment_zh,payment_en) VALUES (?,?,?,?,?)',[store.insertId,'','','','']);
    await conn.commit();
    return { id:store.insertId,slug,username };
  } catch (error) { await conn.rollback(); throw error; }
  finally { if (locked) await conn.query("SELECT RELEASE_LOCK('shop_account_creation')"); conn.release(); }
};
