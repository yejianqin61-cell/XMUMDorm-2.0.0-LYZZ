/**
 * 从 Authorization 头解析用户（可选鉴权，失败不抛错，返回 null）。
 *
 * 用途：公开读接口需要「当前用户是否点过赞 / 是否本人」这类 viewer 维度的信息，
 * 但未登录也必须能访问，因此不能用 authenticateToken 强制鉴权。
 *
 * 来源：从 routes/posts.js 的同名函数提取（行为完全一致），供新模块共用。
 *
 * ⚠️ 现状说明：仓库内另有 7 处同名局部实现（routes/square.js、routes/handbook.js、
 * routes/clubs.js 等）。本次**仅新增本模块复用**，未改动既有路由——
 * 全量收敛应独立立项。新代码请优先复用本文件。
 */
const jwt = require('jsonwebtoken');

function parseOptionalUser(req) {
  if (!req || !req.headers || !req.headers.authorization) return null;
  try {
    const token = String(req.headers.authorization).split(' ')[1];
    if (!token) return null;
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
  } catch (_) {
    return null;
  }
}

module.exports = { parseOptionalUser };
