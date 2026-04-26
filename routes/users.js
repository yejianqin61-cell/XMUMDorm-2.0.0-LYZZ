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
const { assetUrl } = require('../utils/assets');
const { uploadBuffer, guessContentType } = require('../services/objectStorage');
const { simpleCache } = require('../utils/simpleCache');

const DEFAULT_AVATAR = '/uploads/default-avatar.png'; // 无头像时前端用此路径（可保留本地静态或后续迁移到 CDN）

/** 从 Authorization 解析用户（可选，不抛错） */
function parseOptionalUser(req) {
  if (!req.headers.authorization) return null;
  try {
    const jwt = require('jsonwebtoken');
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (_) {
    return null;
  }
}

function rowTruthyLike(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return v.length > 0 && v[0] === 1;
  return Boolean(v);
}

// ============================================
// 当前用户资料（/me）
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, student_id, username, email, role, avatar, nickname, weekly_comment_count, created_at FROM users WHERE id = ?',
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
      avatar: u.avatar ? assetUrl(u.avatar) : DEFAULT_AVATAR,
      weekly_comment_count: u.weekly_comment_count != null ? u.weekly_comment_count : 0,
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize);
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }

    const cacheKey = `user_profile_v2:${userId}:p:${page}:s:${pageSize}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: '获取成功', data: cached });
    }

    const users = await query(
      'SELECT id, username, email, avatar, nickname, role, weekly_comment_count FROM users WHERE id = ?',
      [userId]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ status: -1, message: '用户不存在' });
    }
    const u = users[0];

    // 先分页取帖子主表（避免每条帖都跑子查询 COUNT）
    const posts = await query(
      `SELECT p.id, p.content, p.type, p.created_at
       FROM posts p
       WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
       ORDER BY p.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );
    const postIds = (posts || []).map((p) => p.id);
    let images = [];
    let likeCounts = [];
    let commentCounts = [];
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      images = await query(
        `SELECT post_id, file_path, sort_order FROM post_images WHERE post_id IN (${placeholders}) ORDER BY post_id, sort_order`,
        postIds
      );
      likeCounts = await query(
        `SELECT post_id, COUNT(*) AS cnt FROM post_likes WHERE post_id IN (${placeholders}) GROUP BY post_id`,
        postIds
      );
      commentCounts = await query(
        `SELECT post_id, COUNT(*) AS cnt FROM comments WHERE post_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY post_id`,
        postIds
      );
    }
    const imagesByPost = {};
    for (const img of images || []) {
      if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
      imagesByPost[img.post_id].push({ url: assetUrl(img.file_path), sort_order: img.sort_order });
    }
    const likeByPost = {};
    for (const r of likeCounts || []) likeByPost[r.post_id] = Number(r.cnt) || 0;
    const commentByPost = {};
    for (const r of commentCounts || []) commentByPost[r.post_id] = Number(r.cnt) || 0;

    const postList = (posts || []).map((p) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      created_at: p.created_at,
      like_count: likeByPost[p.id] || 0,
      comment_count: commentByPost[p.id] || 0,
      user_liked: false,
      images: (imagesByPost[p.id] || []).sort((a, b) => a.sort_order - b.sort_order)
    }));

    // 统计：合并到 1 次 DB roundtrip（3 个子查询）
    const [statsRow] = await query(
      `SELECT
        (SELECT COUNT(*) FROM posts WHERE user_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0) AS post_count,
        (SELECT COUNT(*) FROM post_likes pl INNER JOIN posts p ON pl.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL) AS like_received_count,
        (SELECT COUNT(*) FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND c.deleted_at IS NULL) AS comment_received_count`,
      [userId, userId, userId]
    );

    const data = {
      user: {
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        email: u.email,
        avatar: u.avatar ? assetUrl(u.avatar) : DEFAULT_AVATAR,
        role: u.role,
        weekly_comment_count: u.weekly_comment_count != null ? u.weekly_comment_count : 0
      },
      posts: postList,
      stats: {
        post_count: Number((statsRow && statsRow.post_count) || 0),
        comment_received_count: Number((statsRow && statsRow.comment_received_count) || 0),
        like_received_count: Number((statsRow && statsRow.like_received_count) || 0)
      },
      page,
      pageSize,
      hasMore: (posts || []).length === pageSize
    };
    simpleCache.set(cacheKey, data, Number(process.env.CACHE_USER_PROFILE_TTL_MS || 10 * 1000));
    res.status(200).json({ status: 0, message: '获取成功', data });
  } catch (e) {
    console.error('个人空间错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 更新当前用户资料（仅昵称）
// ============================================
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const rawName = (req.body && (req.body.nickname ?? req.body.username)) || '';
    const nickname = String(rawName).trim();
    if (!nickname) {
      return res.status(400).json({ status: -1, message: '昵称不能为空' });
    }
    const lower = nickname.toLowerCase();
    if (lower === 'admin' || lower === 'xmumdorm_official') {
      return res.status(400).json({ status: -1, message: '该昵称为官方保留名称，无法使用' });
    }
    await query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
    res.status(200).json({ status: 0, message: '资料已更新', data: { nickname } });
  } catch (e) {
    console.error('更新资料错误:', e);
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
        message: err.message || '仅支持 jpg/png/webp，单张≤8MB'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ status: -1, message: '请上传图片' });
    }
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.jpg';
    // 每次更新头像使用带时间戳的新文件名，避免浏览器长时间缓存旧头像
    const ts = Date.now();
    const key = `avatars/user_${req.user.id}_${ts}${safeExt}`;
    await uploadBuffer({ key, body: req.file.buffer, contentType: guessContentType(req.file.mimetype, safeExt) });
    const relativePath = key;
    await query('UPDATE users SET avatar = ? WHERE id = ?', [relativePath, req.user.id]);
    res.status(200).json({
      status: 0,
      message: '头像更新成功',
      data: { avatar: assetUrl(relativePath) }
    });
  } catch (e) {
    console.error('头像上传错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
