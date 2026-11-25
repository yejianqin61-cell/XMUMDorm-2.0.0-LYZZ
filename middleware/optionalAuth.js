/**
 * 可选身份：带了有效令牌就挂上 `req.user`，否则按游客放行（⛔ 不返回 401/403）。
 * 用于「游客可读、登录后能多看一点」的接口。账号状态与 `authenticateToken` 一样复查数据库。
 */
const jwt = require('jsonwebtoken');
const { query } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function optionalAuth(req, _res, next) {
  const token = String(req.headers.authorization || '').split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) return next();
    const rows = await query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows && rows.length === 1 && rows[0].status !== 'deactivated') req.user = decoded;
  } catch (_error) {
    // 令牌无效或状态查不到：按游客处理（宁可少给，不可多给）
  }
  return next();
}

module.exports = optionalAuth;
