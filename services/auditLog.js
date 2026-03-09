/**
 * 审计日志服务：记录关键用户行为到 audit_logs 表
 * 采用“尽力而为”策略：写日志失败不会影响主流程
 */

const { query } = require('../database');

/**
 * 写入一条审计日志
 * @param {Object} options
 * @param {number|null} options.userId
 * @param {string|null} options.role
 * @param {string} options.action - 如 LOGIN / POST_CREATE / POST_DELETE / ADMIN_HIDE 等
 * @param {string|null} options.targetType - post / comment / product / user 等
 * @param {number|null} options.targetId
 * @param {string|null} options.ip
 * @param {string|null} options.userAgent
 * @param {Object|null} options.meta - 额外信息，将序列化为 JSON
 */
async function logAudit({
  userId = null,
  role = null,
  action,
  targetType = null,
  targetId = null,
  ip = null,
  userAgent = null,
  meta = null,
}) {
  if (!action) return;
  try {
    const metaStr =
      meta && typeof meta === 'object'
        ? JSON.stringify(meta).slice(0, 2000) // 防止过长
        : null;
    await query(
      'INSERT INTO audit_logs (user_id, role, action, target_type, target_id, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, role, action, targetType, targetId, ip, userAgent, metaStr]
    );
  } catch (e) {
    // 日志失败不影响主流程，仅在控制台打点
    console.error('[AUDIT_LOG_ERROR]', e.message || e);
  }
}

module.exports = {
  logAudit,
};

