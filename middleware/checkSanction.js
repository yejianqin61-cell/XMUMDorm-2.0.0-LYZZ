/**
 * 封禁/禁言检查中间件
 * 在 authenticateToken 之后调用，检查当前用户是否处于封禁或禁言状态
 *
 * 使用方式：
 * - checkBan: 阻止所有操作（用于登录或全局拦截）
 * - checkMute: 仅阻止发帖/评论等创作操作
 * - checkSanction: 同时检查封禁和禁言（用于发帖/评论）
 */

const { query } = require('../database');

/**
 * 检查用户是否被封禁（禁止所有操作）
 */
async function checkBan(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return next();

    const now = new Date();
    const rows = await query(
      `SELECT id, ends_at FROM user_sanctions
       WHERE user_id = ? AND type = 'ban'
         AND revoked_at IS NULL
         AND (ends_at IS NULL OR ends_at > ?)
       LIMIT 1`,
      [userId, now]
    );

    if (rows && rows.length > 0) {
      const ban = rows[0];
      const msg = ban.ends_at
        ? `账号已被封禁至 ${new Date(ban.ends_at).toLocaleDateString('zh-CN')}`
        : '账号已被永久封禁';
      return res.status(403).json({ status: -1, message: msg, banned: true });
    }

    next();
  } catch (err) {
    console.error('[checkBan]', err.message || err);
    // 检查失败不阻塞用户，放行
    next();
  }
}

/**
 * 检查用户是否被禁言（禁止发帖/评论）
 */
async function checkMute(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return next();

    const now = new Date();
    const rows = await query(
      `SELECT id, ends_at FROM user_sanctions
       WHERE user_id = ? AND type = 'mute'
         AND revoked_at IS NULL
         AND (ends_at IS NULL OR ends_at > ?)
       LIMIT 1`,
      [userId, now]
    );

    if (rows && rows.length > 0) {
      const mute = rows[0];
      const msg = mute.ends_at
        ? `账号已被禁言至 ${new Date(mute.ends_at).toLocaleDateString('zh-CN')}`
        : '账号已被永久禁言';
      return res.status(403).json({ status: -1, message: msg, muted: true });
    }

    next();
  } catch (err) {
    console.error('[checkMute]', err.message || err);
    next();
  }
}

/**
 * 同时检查封禁和禁言（用于发帖/评论等创作操作）
 */
async function checkSanction(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return next();

    const now = new Date();
    const rows = await query(
      `SELECT type, ends_at FROM user_sanctions
       WHERE user_id = ? AND revoked_at IS NULL
         AND (ends_at IS NULL OR ends_at > ?)
       LIMIT 2`,
      [userId, now]
    );

    for (const s of rows) {
      if (s.type === 'ban') {
        const msg = s.ends_at
          ? `账号已被封禁至 ${new Date(s.ends_at).toLocaleDateString('zh-CN')}`
          : '账号已被永久封禁';
        return res.status(403).json({ status: -1, message: msg, banned: true });
      }
      if (s.type === 'mute') {
        const msg = s.ends_at
          ? `账号已被禁言至 ${new Date(s.ends_at).toLocaleDateString('zh-CN')}`
          : '账号已被永久禁言';
        return res.status(403).json({ status: -1, message: msg, muted: true });
      }
    }

    next();
  } catch (err) {
    console.error('[checkSanction]', err.message || err);
    next();
  }
}

module.exports = { checkBan, checkMute, checkSanction };
