// 网站端商家入驻：申请、撤回、管理员审核、店铺暂停营业。
// 与 App Stage 2 无关；路由挂载见 server.js 与 routes/shop.js。
const { query } = require('../database');
const s = require('./shop');

const STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

function readPayload(body = {}) {
  const nameZh = s.text(body.name_zh, 120);
  const nameEn = s.text(body.name_en, 120);
  const businessScope = s.text(body.business_scope, 500);
  const contactName = s.text(body.contact_name, 80);
  const studentId = s.text(body.student_id, 40);
  const contactPhone = s.text(body.contact_phone, 40);
  const contactWechat = s.text(body.contact_wechat, 80);
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(studentId)) s.fail('学号格式不正确 / Invalid student ID');
  if (!/^[0-9+()\-\s]{6,40}$/.test(contactPhone)) s.fail('电话号码格式不正确 / Invalid phone number');
  return {
    nameZh, nameEn, businessScope, contactName, studentId, contactPhone, contactWechat,
  };
}

function missingTable(error) {
  return error && error.code === 'ER_NO_SUCH_TABLE';
}

function slugBase(nameEn) {
  const base = String(nameEn)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return base || 'store';
}

async function uniqueSlug(conn, nameEn) {
  const base = slugBase(nameEn);
  for (let index = 1; index <= 200; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const [rows] = await conn.execute('SELECT id FROM shop_merchants WHERE slug = ? LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
  }
  s.fail('店铺网址生成失败，请修改英文名后重试 / Could not allocate a store URL', 409);
}

async function submit(userId, body) {
  const data = readPayload(body);
  try {
    return await s.transaction(async (conn) => {
      const [users] = await conn.execute('SELECT id, status FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (!users[0] || users[0].status !== 'active') s.fail('账号不可用 / Account unavailable', 403);
      const [pending] = await conn.execute(
        "SELECT id FROM shop_merchant_applications WHERE applicant_user_id = ? AND status = 'pending' LIMIT 1",
        [userId]
      );
      if (pending.length) s.fail('你已有一份待审核的申请 / You already have a pending application', 409);
      const [result] = await conn.execute(
        `INSERT INTO shop_merchant_applications
           (applicant_user_id, name_zh, name_en, business_scope, contact_name, student_id, contact_phone, contact_wechat)
         VALUES (?,?,?,?,?,?,?,?)`,
        [userId, data.nameZh, data.nameEn, data.businessScope, data.contactName, data.studentId, data.contactPhone, data.contactWechat]
      );
      return { id: result.insertId, status: 'pending' };
    });
  } catch (error) {
    if (missingTable(error)) s.fail('数据库缺少商家申请表，请先执行迁移 / Merchant application table is missing', 503);
    if (error.code === 'ER_DUP_ENTRY') s.fail('你已有一份待审核的申请 / You already have a pending application', 409);
    throw error;
  }
}

async function mine(userId) {
  try {
    const rows = await query(
      `SELECT a.id, a.status, a.name_zh, a.name_en, a.business_scope, a.created_at, a.reviewed_at, a.review_note,
              a.merchant_id, m.slug AS merchant_slug
       FROM shop_merchant_applications a
       LEFT JOIN shop_merchants m ON m.id = a.merchant_id
       WHERE a.applicant_user_id = ?
       ORDER BY a.id DESC
       LIMIT 20`,
      [userId]
    );
    return rows;
  } catch (error) {
    if (missingTable(error)) return [];
    throw error;
  }
}

async function withdraw(userId, applicationId) {
  try {
    const result = await s.transaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, status FROM shop_merchant_applications WHERE id = ? AND applicant_user_id = ? FOR UPDATE',
        [applicationId, userId]
      );
      if (!rows[0]) s.fail('申请不存在 / Application not found', 404);
      if (rows[0].status !== 'pending') s.fail('只有审核中的申请可以撤回 / Only pending applications can be withdrawn', 409);
      await conn.execute(
        "UPDATE shop_merchant_applications SET status = 'withdrawn' WHERE id = ? AND status = 'pending'",
        [applicationId]
      );
      return { id: applicationId, status: 'withdrawn' };
    });
    return result;
  } catch (error) {
    if (missingTable(error)) s.fail('数据库缺少商家申请表，请先执行迁移 / Merchant application table is missing', 503);
    throw error;
  }
}

async function adminList({ status, page = 1, pageSize = 20 } = {}) {
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) {
    where.push('a.status = ?');
    params.push(status);
  }
  const filters = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
  const [countRows, rows] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM shop_merchant_applications a ${filters}`, params),
    query(
      `SELECT a.id, a.applicant_user_id, a.status, a.name_zh, a.name_en, a.business_scope,
              a.contact_name, a.contact_phone, a.contact_wechat, a.student_id,
              a.merchant_id, a.review_note, a.reviewed_at, a.created_at,
              u.username AS applicant_username
       FROM shop_merchant_applications a
       LEFT JOIN users u ON u.id = a.applicant_user_id
       ${filters}
       ORDER BY a.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
  ]);
  return { list: rows, total: Number(countRows[0]?.total || 0), page: Number(page) || 1, pageSize: limit };
}

async function adminDetail(applicationId) {
  const rows = await query(
    `SELECT a.*, u.username AS applicant_username
     FROM shop_merchant_applications a
     LEFT JOIN users u ON u.id = a.applicant_user_id
     WHERE a.id = ? LIMIT 1`,
    [applicationId]
  );
  if (!rows[0]) s.fail('申请不存在 / Application not found', 404);
  return rows[0];
}

async function approve(adminId, applicationId) {
  return s.transaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM shop_merchant_applications WHERE id = ? FOR UPDATE',
      [applicationId]
    );
    const application = rows[0];
    if (!application) s.fail('申请不存在 / Application not found', 404);
    if (application.status !== 'pending') s.fail('该申请已处理 / This application is already reviewed', 409);

    const slug = await uniqueSlug(conn, application.name_en);
    const [store] = await conn.execute(
      `INSERT INTO shop_merchants (slug, name_zh, name_en, business_scope, owner_user_id, enabled, paused)
       VALUES (?,?,?,?,?,1,0)`,
      [slug, application.name_zh, application.name_en, application.business_scope, application.applicant_user_id]
    );
    const merchantId = store.insertId;
    await conn.execute(
      `INSERT INTO shop_settings (id, delivery_notice_zh, delivery_notice_en, payment_zh, payment_en)
       VALUES (?,?,?,?,?)`,
      [merchantId, '', '', '', '']
    );
    await conn.execute(
      'INSERT INTO shop_merchant_members (merchant_id, user_id) VALUES (?,?)',
      [merchantId, application.applicant_user_id]
    );
    await conn.execute(
      `UPDATE shop_merchant_applications
       SET status = 'approved', merchant_id = ?, reviewer_id = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [merchantId, adminId, applicationId]
    );
    return { id: applicationId, status: 'approved', merchantId, slug };
  });
}

async function reject(adminId, applicationId, note) {
  const reason = s.text(note, 500);
  return s.transaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT id, status FROM shop_merchant_applications WHERE id = ? FOR UPDATE',
      [applicationId]
    );
    if (!rows[0]) s.fail('申请不存在 / Application not found', 404);
    if (rows[0].status !== 'pending') s.fail('该申请已处理 / This application is already reviewed', 409);
    await conn.execute(
      `UPDATE shop_merchant_applications
       SET status = 'rejected', reviewer_id = ?, review_note = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [adminId, reason, applicationId]
    );
    return { id: applicationId, status: 'rejected' };
  });
}

async function setPaused(userId, merchantId, paused) {
  return s.transaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT m.id, m.paused
       FROM shop_merchants m
       JOIN shop_merchant_members mm ON mm.merchant_id = m.id
       WHERE m.id = ? AND mm.user_id = ? AND m.deleted_at IS NULL
       LIMIT 1`,
      [merchantId, userId]
    );
    if (!rows[0]) s.fail('没有该店铺的管理权限 / Not your store', 403);
    const next = paused ? 1 : 0;
    if (Number(rows[0].paused) !== next) {
      await conn.execute('UPDATE shop_merchants SET paused = ? WHERE id = ?', [next, merchantId]);
    }
    return { id: merchantId, paused: Boolean(next) };
  });
}

module.exports = { STATUSES, submit, mine, withdraw, adminList, adminDetail, approve, reject, setPaused };
