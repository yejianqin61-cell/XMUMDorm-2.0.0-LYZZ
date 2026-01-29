/**
 * ============================================
 * 帖子相关路由（2.0.0）
 * ============================================
 * 发布、列表、详情、逻辑删除、管理员隐藏、点赞、评论
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { postImagesUpload, savePostImages } = require('../middleware/upload');

const UPLOAD_PREFIX = '/uploads/'; // 前端拼接图片 URL 用

// 辅助：当前用户是否为 admin
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// 辅助：帖子是否对当前用户可见（未逻辑删除，且非隐藏或当前用户是 admin）
function postVisible(row, req) {
  if (row.deleted_at) return false;
  if (row.hidden_by_admin && !isAdmin(req)) return false;
  return true;
}

// 辅助：为帖子附加图片 URL 和作者信息
function attachPostExtra(rows, req) {
  return rows.map((row) => {
    const visible = postVisible(row, req);
    const base = {
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      type: row.type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      hidden_by_admin: !!row.hidden_by_admin,
      author: row.author_id ? {
        id: row.author_id,
        username: row.author_username,
        nickname: row.author_nickname,
        avatar: row.author_avatar ? UPLOAD_PREFIX + row.author_avatar : null
      } : null,
      images: [],
      like_count: row.like_count != null ? Number(row.like_count) : 0,
      comment_count: row.comment_count != null ? Number(row.comment_count) : 0
    };
    if (row.image_path) {
      base.images.push({ url: UPLOAD_PREFIX + row.image_path, sort_order: row.sort_order });
    }
    base.deleted_at = row.deleted_at || null;
    if (!visible) base.hidden = true;
    return base;
  });
}

// 聚合相同 post 的多行（多图、多点赞数等已用 GROUP BY 或子查询处理时，这里可能多行一帖）
function mergePostRows(rows, req) {
  const byId = {};
  for (const row of rows) {
    if (!postVisible(row, req)) continue;
    const id = row.id;
    if (!byId[id]) {
      byId[id] = {
        id: row.id,
        user_id: row.user_id,
        content: row.content,
        type: row.type,
        created_at: row.created_at,
        updated_at: row.updated_at,
        hidden_by_admin: !!row.hidden_by_admin,
        author: row.author_id ? {
          id: row.author_id,
          username: row.author_username,
          nickname: row.author_nickname,
          avatar: row.author_avatar ? UPLOAD_PREFIX + row.author_avatar : null
        } : null,
        images: [],
        like_count: row.like_count != null ? Number(row.like_count) : 0,
        comment_count: row.comment_count != null ? Number(row.comment_count) : 0
      };
    }
    if (row.image_path) {
      byId[id].images.push({ url: UPLOAD_PREFIX + row.image_path, sort_order: row.sort_order });
    }
  }
  return Object.values(byId).map((p) => {
    p.images.sort((a, b) => a.sort_order - b.sort_order);
    return p;
  });
}

// ============================================
// 发布帖子（登录 + 可选图片，最多 3 张）
// ============================================
router.post('/', authenticateToken, (req, res, next) => {
  postImagesUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: -1,
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp，单张≤5MB，最多3张）'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const content = (req.body && req.body.content) ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ status: -1, message: '内容不能为空' });
    }
    const type = (req.body && req.body.type) === 'announcement' ? 'announcement' : 'normal';
    if (type === 'announcement' && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '仅管理员可发公告' });
    }

    const result = await query(
      'INSERT INTO posts (user_id, content, type) VALUES (?, ?, ?)',
      [req.user.id, content, type]
    );
    const postId = result.insertId;
    const files = req.files || [];
    if (files.length > 0) {
      const paths = savePostImages(files, postId);
      for (let i = 0; i < paths.length; i++) {
        await query(
          'INSERT INTO post_images (post_id, file_path, sort_order) VALUES (?, ?, ?)',
          [postId, paths[i], i]
        );
      }
    }

    // 公告：给全站用户各插入一条未读通知
    if (type === 'announcement') {
      const allUsers = await query('SELECT id FROM users');
      for (const u of allUsers || []) {
        await query(
          'INSERT INTO notifications (user_id, type, post_id, from_user_id, extra) VALUES (?, ?, ?, ?, ?)',
          [u.id, 'announcement', postId, req.user.id, JSON.stringify({ title: content.slice(0, 100) })]
        );
      }
    }

    const rows = await query(
      `SELECT p.id, p.user_id, p.content, p.type, p.created_at, p.updated_at, p.hidden_by_admin,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
        pi.file_path AS image_path, pi.sort_order,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN post_images pi ON pi.post_id = p.id
       WHERE p.id = ?`,
      [postId]
    );
    const merged = mergePostRows(rows, req);
    const post = merged[0];
    if (!post) {
      return res.status(200).json({
        status: 0,
        message: '发布成功！',
        data: { id: postId, content, type, created_at: new Date().toISOString(), images: [] }
      });
    }
    res.status(200).json({
      status: 0,
      message: '发布成功！',
      data: post
    });
  } catch (e) {
    console.error('发布帖子错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 帖子列表（分页，排除已逻辑删除；非 admin 排除被隐藏）
// ============================================
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const user = req.headers['authorization'] ? (() => {
      try {
        const jwt = require('jsonwebtoken');
        const token = (req.headers['authorization'] || '').split(' ')[1];
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      } catch (_) { return null; }
    })() : null;
    const isAdminUser = user && user.role === 'admin';

    let where = 'p.deleted_at IS NULL';
    if (!isAdminUser) where += ' AND p.hidden_by_admin = 0';

    const rows = await query(
      `SELECT p.id, p.user_id, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
        pi.file_path AS image_path, pi.sort_order,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN post_images pi ON pi.post_id = p.id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize + 1, offset]
    );
    const list = mergePostRows(rows.map((r) => ({ ...r, deleted_at: null })), { user: user || {} });
    const hasMore = rows.length > pageSize;
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: { list, hasMore, page, pageSize }
    });
  } catch (e) {
    console.error('获取帖子列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 帖子详情
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    }
    const rows = await query(
      `SELECT p.id, p.user_id, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
        pi.file_path AS image_path, pi.sort_order,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN post_images pi ON pi.post_id = p.id
       WHERE p.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在' });
    }
    const user = req.headers['authorization'] ? (() => {
      try {
        const jwt = require('jsonwebtoken');
        const token = (req.headers['authorization'] || '').split(' ')[1];
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      } catch (_) { return null; }
    })() : null;
    const merged = mergePostRows(rows, { user: user || {} });
    const post = merged[0];
    if (!post) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已隐藏' });
    }
    if (rows[0].deleted_at) {
      return res.status(404).json({ status: -1, message: '帖子已删除' });
    }
    res.status(200).json({ status: 0, message: '获取成功', data: post });
  } catch (e) {
    console.error('帖子详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 逻辑删除帖子（本人或 admin，不删物理文件）
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    const rows = await query('SELECT id, user_id FROM posts WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    const post = rows[0];
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '只能删除自己的帖子' });
    }
    await query('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('删除帖子错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 管理员隐藏帖子
// ============================================
router.patch('/:id/hide', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    }
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    const rows = await query('SELECT id FROM posts WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在' });
    }
    await query('UPDATE posts SET hidden_by_admin = 1 WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '已隐藏' });
  } catch (e) {
    console.error('隐藏帖子错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 点赞 / 取消点赞
// ============================================
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!postId) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    const posts = await query('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    const existing = await query('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    if (existing && existing.length > 0) {
      await query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      return res.status(200).json({ status: 0, message: '已取消点赞', data: { post_id: postId, liked: false } });
    }
    await query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
    // 通知帖子作者（排除自己点赞）
    const [postAuthor] = await query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postAuthor && postAuthor.user_id && postAuthor.user_id !== req.user.id) {
      await query(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [postAuthor.user_id, 'like', postId, req.user.id]
      );
    }
    res.status(200).json({ status: 0, message: '点赞成功！', data: { post_id: postId, liked: true } });
  } catch (e) {
    console.error('点赞错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 评论列表（一级 + 二级）
// ============================================
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!postId) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    const rows = await query(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.deleted_at, c.created_at,
        u.username, u.nickname, u.avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [postId]
    );
    const top = (rows || []).filter((r) => r.parent_id == null);
    const replies = (rows || []).filter((r) => r.parent_id != null);
    const list = top.map((t) => ({
      ...t,
      author: { username: t.username, nickname: t.nickname, avatar: t.avatar ? UPLOAD_PREFIX + t.avatar : null },
      replies: replies.filter((r) => r.parent_id === t.id).map((r) => ({
        ...r,
        author: { username: r.username, nickname: r.nickname, avatar: r.avatar ? UPLOAD_PREFIX + r.avatar : null }
      }))
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('评论列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 发表评论（一级或二级）
// ============================================
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content, parent_id: parentId } = req.body || {};
    if (!postId) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    if (!content || !String(content).trim()) {
      return res.status(400).json({ status: -1, message: '评论内容不能为空' });
    }
    const posts = await query('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    let parentIdNum = null;
    if (parentId != null && parentId !== '') {
      parentIdNum = parseInt(parentId, 10);
      const parentRow = await query('SELECT id, parent_id FROM comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL', [parentIdNum, postId]);
      if (!parentRow || parentRow.length === 0) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      if (parentRow[0].parent_id != null) {
        return res.status(400).json({ status: -1, message: '仅支持二级评论，不能回复回复' });
      }
    }
    const result = await query(
      'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, parentIdNum, String(content).trim()]
    );
    // 通知帖子作者（排除自己评论）
    const [postRow] = await query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postRow && postRow.user_id && postRow.user_id !== req.user.id) {
      await query(
        'INSERT INTO notifications (user_id, type, post_id, comment_id, from_user_id, extra) VALUES (?, ?, ?, ?, ?, ?)',
        [postRow.user_id, 'comment', postId, result.insertId, req.user.id, JSON.stringify({ content: String(content).trim().slice(0, 80) })]
      );
    }
    const rows = await query(
      'SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.nickname, u.avatar FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [result.insertId]
    );
    const row = rows && rows[0];
    const data = row ? {
      ...row,
      author: { username: row.username, nickname: row.nickname, avatar: row.avatar ? UPLOAD_PREFIX + row.avatar : null }
    } : { id: result.insertId, content: String(content).trim(), created_at: new Date().toISOString() };
    res.status(200).json({ status: 0, message: '评论成功！', data });
  } catch (e) {
    console.error('评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 逻辑删除评论（本人或 admin）
// ============================================
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const commentId = parseInt(req.params.commentId, 10);
    if (!postId || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });
    const rows = await query('SELECT id, user_id FROM comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL', [commentId, postId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '评论不存在或已删除' });
    }
    const comment = rows[0];
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '只能删除自己的评论' });
    }
    await query('UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('删除评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
