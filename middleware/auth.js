/**
 * ============================================
 * JWT 身份验证中间件
 * ============================================
 * 创建时间: 2025-01-26
 * 功能: 验证请求中的 JWT 令牌，保护需要登录才能访问的路由
 */

// 引入 JWT 库
const jwt = require('jsonwebtoken');

// 从环境变量获取 JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT 验证中间件
 */
function authenticateToken(req, res, next) {
  // 1. 从请求头中获取令牌
  const authHeader = req.headers['authorization'];
  
  // 2. 提取令牌
  const token = authHeader && authHeader.split(' ')[1];

  // 3. 如果没有令牌，返回 401 未授权错误
  if (!token) {
    return res.status(401).json({
      status: -1,
      message: '未提供身份验证令牌，请先登录'
    });
  }

  // 4. 验证令牌
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: -1,
        message: '身份验证令牌无效或已过期，请重新登录'
      });
    }

    // 5. 验证成功，将解码后的用户信息添加到请求对象
    req.user = decoded;
    
    // 6. 调用 next() 继续执行下一个中间件或路由处理函数
    next();
  });
}

// 导出中间件函数
module.exports = authenticateToken;

