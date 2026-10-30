// 网站端：管理员审核商家入驻申请（独立路由，不混入 routes/admin.js）。
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const auth = require('../middleware/auth');
const { logAudit } = require('../services/auditLog');
const applications = require('../services/shopMerchantApplications');

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
    if (status === 500) console.error('[admin/shop-applications]', error.code || error.name);
    res.status(status).json({ status: -1, message: error.status ? error.message : '服务器错误，请稍后重试 / Server error' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const rows = await query('SELECT role, status FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0] || rows[0].status === 'deactivated' || rows[0].role !== 'admin') {
      return res.status(403).json({ status: -1, message: '需要管理员权限 / Admin required' });
    }
    next();
  } catch {
    res.status(500).json({ status: -1, message: '权限校验失败 / Authorization unavailable' });
  }
};

router.use(auth, requireAdmin);

router.get('/', wrap(async (req, res) => {
  const data = await applications.adminList({
    status: req.query.status,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.json({ status: 0, data });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ status: -1, message: 'ID 无效 / Invalid ID' });
  res.json({ status: 0, data: await applications.adminDetail(id) });
}));

router.post('/:id/approve', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ status: -1, message: 'ID 无效 / Invalid ID' });
  const result = await applications.approve(req.user.id, id);
  await logAudit({
    userId: req.user.id,
    role: 'admin',
    action: 'SHOP_MERCHANT_APPROVE',
    targetType: 'shop_application',
    targetId: id,
    ip: req.ip,
    meta: { merchantId: result.merchantId, slug: result.slug },
  }).catch(() => {});
  res.json({ status: 0, data: result });
}));

router.post('/:id/reject', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ status: -1, message: 'ID 无效 / Invalid ID' });
  const result = await applications.reject(req.user.id, id, req.body?.note);
  await logAudit({
    userId: req.user.id,
    role: 'admin',
    action: 'SHOP_MERCHANT_REJECT',
    targetType: 'shop_application',
    targetId: id,
    ip: req.ip,
    meta: { note: String(req.body?.note || '').slice(0, 200) },
  }).catch(() => {});
  res.json({ status: 0, data: result });
}));

module.exports = router;
