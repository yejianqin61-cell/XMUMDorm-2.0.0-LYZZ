/**
 * 管理员鉴权中间件
 * 必须在 authenticateToken 之后使用，校验请求者是否为管理员
 */

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: -1,
      message: '请先登录'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: -1,
      message: '需要管理员权限'
    });
  }

  next();
}

module.exports = requireAdmin;
