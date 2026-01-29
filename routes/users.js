/**
 * ============================================
 * 用户相关路由（2.0.0）
 * ============================================
 * 个人空间（资料 + 帖子 + 统计）、头像上传
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');

const UPLOAD_PREFIX_URL = '/uploads/';
const DEFAULT_AVATAR = '/uploads/default-avatar.png'; // 无头像时前端用此路径

// ============================================
// 当前用户资料（/me）
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, student_id, username, email, role, avatar, nickname, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '用户不存在' });
    }
    const u = rows[0];
    const data = {
      id: u.id,
      student_id: u.student_id,
      username: u.username,
      email: u.email,
      role: u.role,
      nickname: u.nickname,
      avatar: u.avatar ? UPLOAD_PREFIX_URL + u.avatar : DEFAULT_AVATAR,
      created_at: u.created_at
    };
    res.status(200).json({ status: 0, message: '获取成功', data });
  } catch (e) {
    console.error('获取当前用户错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 个人空间：某用户资料 + 已发帖子 + 评论/点赞统计
// ============================================
router.get('/:id/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ status: -1, message: '用户 ID 无效' });
    const users = await query(
      'SELECT id, username, email, avatar, nickname, role FROM users WHERE id = ?',
      [userId]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ status: -1, message: '用户不存在' });
    }
    const u = users[0];
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const posts = await query(
      `SELECT p.id, p.content, p.type, p.created_at,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
       FROM posts p
       WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );
    const postIds = (posts || []).map((p) => p.id);
    let images = [];
    if (postIds.length > 0) {
      images = await query(
        `SELECT post_id, file_path, sort_order FROM post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY post_id, sort_order`
      );
    }
    const imagesByPost = {};
    for (const img of images || []) {
      if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
      imagesByPost[img.post_id].push({ url: UPLOAD_PREFIX_URL + img.file_path, sort_order: img.sort_order });
    }
    const postList = (posts || []).map((p) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      created_at: p.created_at,
      like_count: Number(p.like_count),
      comment_count: Number(p.comment_count),
      images: (imagesByPost[p.id] || []).sort((a, b) => a.sort_order - b.sort_order)
    }));

    const postCountRow = await query(
      'SELECT COUNT(*) AS cnt FROM posts WHERE user_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [userId]
    );
    const likeReceivedRow = await query(
      'SELECT COUNT(*) AS cnt FROM post_likes pl INNER JOIN posts p ON pl.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL',
      [userId]
    );
    const commentReceivedRow = await query(
      'SELECT COUNT(*) AS cnt FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND c.deleted_at IS NULL',
      [userId]
    );

    const data = {
      user: {
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        email: u.email,
        avatar: u.avatar ? UPLOAD_PREFIX_URL + u.avatar : DEFAULT_AVATAR,
        role: u.role
      },
      posts: postList,
      stats: {
        post_count: Number((postCountRow && postCountRow[0] && postCountRow[0].cnt) || 0),
        comment_received_count: Number((commentReceivedRow && commentReceivedRow[0] && commentReceivedRow[0].cnt) || 0),
        like_received_count: Number((likeReceivedRow && likeReceivedRow[0] && likeReceivedRow[0].cnt) || 0)
      },
      page,
      pageSize,
      hasMore: (posts || []).length === pageSize
    };
    res.status(200).json({ status: 0, message: '获取成功', data });
  } catch (e) {
    console.error('个人空间错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 上传头像（当前用户）
// ============================================
router.patch('/me/avatar', authenticateToken, (req, res, next) => {
  avatarUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: -1,
        message: err.message || '仅支持 jpg/png/webp，单张≤5MB'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ status: -1, message: '请上传图片' });
    }
    const relativePath = 'avatars/' + req.file.filename;
    await query('UPDATE users SET avatar = ? WHERE id = ?', [relativePath, req.user.id]);
    res.status(200).json({
      status: 0,
      message: '头像更新成功',
      data: { avatar: UPLOAD_PREFIX_URL + relativePath }
    });
  } catch (e) {
    console.error('头像上传错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
