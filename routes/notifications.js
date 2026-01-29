/**
 * ============================================
 * 通知相关路由（2.0.0）
 * ============================================
 * 列表、已读、未读公告（弹窗用）
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');

const UPLOAD_PREFIX = '/uploads/';

// 为通知附加帖子/发送者等摘要
async function attachNotificationExtra(rows) {
  if (!rows || rows.length === 0) return [];
  const list = [];
  for (const r of rows) {
    const item = {
      id: r.id,
      type: r.type,
      is_read: !!r.is_read,
      post_id: r.post_id,
      comment_id: r.comment_id,
      from_user_id: r.from_user_id,
      extra: r.extra ? (typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra) : null,
      created_at: r.created_at
    };
    if (r.from_username || r.from_nickname) {
      item.from_user = {
        id: r.from_user_id,
        username: r.from_username,
        nickname: r.from_nickname,
        avatar: r.from_avatar ? UPLOAD_PREFIX + r.from_avatar : null
      };
    }
    list.push(item);
  }
  return list;
}

// ============================================
// 当前用户通知列表（分页，支持 type / is_read 筛选）
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const type = req.query.type; // comment | like | announcement
    const isRead = req.query.is_read; // 0 | 1

    let where = 'n.user_id = ?';
    const params = [req.user.id];
    if (type) {
      where += ' AND n.type = ?';
      params.push(type);
    }
    if (isRead !== undefined && isRead !== '') {
      where += ' AND n.is_read = ?';
      params.push(isRead === '1' ? 1 : 0);
    }
    params.push(pageSize + 1, offset);

    const rows = await query(
      `SELECT n.id, n.type, n.is_read, n.post_id, n.comment_id, n.from_user_id, n.extra, n.created_at,
        u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar
       FROM notifications n
       LEFT JOIN users u ON n.from_user_id = u.id
       WHERE ${where}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    const list = await attachNotificationExtra(rows);
    const hasMore = rows.length > pageSize;
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: { list, hasMore, page, pageSize }
    });
  } catch (e) {
    console.error('通知列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 未读公告（登录后弹窗用）
// ============================================
router.get('/unread-announcements', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT n.id, n.type, n.is_read, n.post_id, n.extra, n.created_at, n.from_user_id,
        u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar
       FROM notifications n
       LEFT JOIN users u ON n.from_user_id = u.id
       WHERE n.user_id = ? AND n.type = 'announcement' AND n.is_read = 0
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    const list = await attachNotificationExtra(rows || []);
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('未读公告错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 标记一条通知已读
// ============================================
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '通知 ID 无效' });
    const rows = await query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '通知不存在' });
    }
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(200).json({ status: 0, message: '已标记为已读' });
  } catch (e) {
    console.error('标记已读错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 批量标记已读（如弹窗关闭时传 id 列表）
// ============================================
router.patch('/read-batch', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: -1, message: '请提供 ids 数组' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      [req.user.id, ...ids]
    );
    res.status(200).json({ status: 0, message: '已标记为已读' });
  } catch (e) {
    console.error('批量已读错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
