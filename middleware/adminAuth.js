/**
 * 管理员鉴权中间件
 * 必须在 authenticateToken 之后使用，校验请求者是否为管理员
 * 以数据库 role 为准（JWT 可能在提权后未重新登录）
 */

const { query } = require('../database');

async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: -1,
      message: '请先登录',
    });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const rows = await query('SELECT role FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows?.[0]?.role === 'admin') {
      req.user.role = 'admin';
      return next();
    }
  } catch (err) {
    console.error('[requireAdmin]', err);
    return res.status(500).json({
      status: -1,
      message: '权限校验失败',
    });
  }

  return res.status(403).json({
    status: -1,
    message: '需要管理员权限',
  });
}

module.exports = requireAdmin;
