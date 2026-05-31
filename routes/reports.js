/**
 * 用户举报提交路由
 * 普通用户提交举报，不需要管理员权限
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');

/**
 * POST /api/reports
 * 用户提交举报
 * Body: { target_type, target_id, reason, detail?, screenshots? }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { target_type, target_id, reason, detail, screenshots } = req.body;

    // 参数校验
    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ status: -1, message: '缺少必要参数：target_type, target_id, reason' });
    }

    const validReasons = ['spam', 'fraud', 'abuse', 'nsfw', 'trolling', 'privacy', 'illegal_trade', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ status: -1, message: '无效的举报原因' });
    }

    const validTargets = [
      'post', 'comment', 'product_comment', 'club_activity', 'club_post',
      'marketplace', 'errand', 'handbook_article', 'handbook_comment',
      'course_review', 'trending_post', 'campus_post',
      'trending_comment', 'campus_comment', 'club_comment', 'course_review_comment',
    ];
    if (!validTargets.includes(target_type)) {
      return res.status(400).json({ status: -1, message: '无效的举报目标类型' });
    }

    // 查找被举报内容的作者
    let reportedUserId = null;
    try {
      reportedUserId = await findReportedUser(target_type, target_id);
    } catch (_) { /* 忽略查找失败 */ }

    // 防止重复举报（同一人同一内容）
    const existing = await query(
      `SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status IN ('pending', 'processing')`,
      [reporterId, target_type, target_id]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({ status: -1, message: '您已举报过该内容，请等待处理' });
    }

    const result = await query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, detail, screenshots, reported_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reporterId,
        target_type,
        target_id,
        reason,
        detail || null,
        screenshots ? JSON.stringify(screenshots) : null,
        reportedUserId,
      ]
    );

    // 自动举报规则：检查同一内容被举报次数
    const countRows = await query(
      'SELECT COUNT(*) AS cnt FROM reports WHERE target_type = ? AND target_id = ?',
      [target_type, target_id]
    );

    const reportCount = countRows[0]?.cnt || 0;

    // 获取自动阈值配置
    try {
      const configs = await query(
        'SELECT config_key, config_value FROM system_configs WHERE config_key IN (\'report_auto_hide_threshold\', \'report_auto_review_threshold\', \'report_auto_delist_threshold\')'
      );
      const configMap = {};
      for (const c of configs) configMap[c.config_key] = parseInt(c.config_value, 10) || 0;

      // ≥10 次自动进入审核队列（将举报状态改为 processing）
      if (configMap.report_auto_review_threshold && reportCount >= configMap.report_auto_review_threshold) {
        await query(
          `UPDATE reports SET status = 'processing' WHERE target_type = ? AND target_id = ? AND status = 'pending'`,
          [target_type, target_id]
        );
      }
    } catch (_) { /* 自动规则失败不影响举报提交 */ }

    res.json({ status: 0, data: { id: result.insertId }, message: '举报提交成功' });
  } catch (err) {
    console.error('[reports]', err);
    res.status(500).json({ status: -1, message: '提交举报失败' });
  }
});

/**
 * 根据 target_type 和 target_id 查找被举报内容的作者
 */
async function findReportedUser(targetType, targetId) {
  let sql;
  switch (targetType) {
    case 'post':
    case 'campus_post':
      sql = 'SELECT user_id FROM posts WHERE id = ?';
      break;
    case 'trending_post':
      sql = 'SELECT user_id FROM trending_posts WHERE id = ?';
      break;
    case 'comment':
      sql = 'SELECT user_id FROM comments WHERE id = ?';
      break;
    case 'trending_comment':
      sql = 'SELECT user_id FROM trending_post_comments WHERE id = ?';
      break;
    case 'campus_comment':
      sql = 'SELECT user_id FROM campus_post_comments WHERE id = ?';
      break;
    case 'club_comment':
      sql = 'SELECT user_id FROM club_comments WHERE id = ?';
      break;
    case 'course_review_comment':
      sql = 'SELECT user_id FROM course_review_comments WHERE id = ?';
      break;
    case 'product_comment':
      sql = 'SELECT user_id FROM product_comments WHERE id = ?';
      break;
    case 'club_activity':
      // club_activities 没有直接的用户列，通过 club_members 找管理员
      sql = 'SELECT cm.user_id FROM club_activities ca JOIN club_members cm ON ca.club_id = cm.club_id AND cm.role = \'admin\' WHERE ca.id = ? LIMIT 1';
      break;
    case 'club_post':
      // club_posts 没有直接的用户列，通过 club_members 找管理员
      sql = 'SELECT cm.user_id FROM club_posts cp JOIN club_members cm ON cp.club_id = cm.club_id AND cm.role = \'admin\' WHERE cp.id = ? LIMIT 1';
      break;
    case 'marketplace':
      sql = 'SELECT seller_user_id AS user_id FROM marketplace_items WHERE id = ?';
      break;
    case 'errand':
      sql = 'SELECT owner_user_id AS user_id FROM errands WHERE id = ?';
      break;
    case 'handbook_article':
      sql = 'SELECT author_user_id AS user_id FROM handbook_articles WHERE id = ?';
      break;
    case 'handbook_comment':
      sql = 'SELECT user_id FROM handbook_comments WHERE id = ?';
      break;
    case 'course_review':
      sql = 'SELECT created_by AS user_id FROM course_reviews WHERE id = ?';
      break;
    default:
      return null;
  }
  try {
    const rows = await query(sql, [targetId]);
    if (rows && rows.length > 0) {
      return rows[0].user_id || null;
    }
  } catch (_) { /* 表或列不存在时优雅降级 */ }
  return null;
}

module.exports = router;
