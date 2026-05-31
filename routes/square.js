/**
 * ============================================
 * V3.0 广场系统路由（热搜 + 校园此刻）
 * ============================================
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const { checkSanction } = require('../middleware/checkSanction');
const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');
const authenticateToken = require('../middleware/auth');
const { bannerImageUpload, postImagesUpload } = require('../middleware/upload');
const { logAudit } = require('../services/auditLog');
const { assetUrl } = require('../utils/assets');
const { uploadBuffer, guessContentType } = require('../services/objectStorage');
const { simpleCache } = require('../utils/simpleCache');
const sanitizeHtml = require('sanitize-html');
const { grantExp, revokeByRef, checkAndGrantPostPopularRewards } = require('../services/expService');
const { attachExp } = require('../utils/expResponse');
const { isPostContentEligible, isCommentEligible } = require('../utils/expEligibility');

const BANNER_LINK_TYPES = ['none', 'product', 'shop', 'post', 'url', 'region'];

function cleanText(input) {
  const raw = input == null ? '' : String(input);
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

function parseOptionalUser(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (_) {
    return null;
  }
}

function mapCommentAuthor(r) {
  return {
    id: r.user_id,
    username: r.username,
    nickname: r.nickname,
    name: r.nickname || r.username || '匿名',
    avatar: assetUrl(r.avatar),
  };
}

function nestCommentRows(rows) {
  const top = (rows || []).filter((r) => r.parent_id == null);
  const replies = (rows || []).filter((r) => r.parent_id != null);
  return top.map((t) => ({
    id: t.id,
    post_id: t.post_id,
    user_id: t.user_id,
    parent_id: t.parent_id,
    content: t.content,
    created_at: t.created_at,
    author: mapCommentAuthor(t),
    replies: replies
      .filter((r) => r.parent_id === t.id)
      .map((r) => ({
        id: r.id,
        post_id: r.post_id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        content: r.content,
        created_at: r.created_at,
        author: mapCommentAuthor(r),
      })),
  }));
}

function invalidateSquareBannerCache() {
  simpleCache.delete('square:banners:v1');
}

async function saveSquareBannerImage(file, bannerId) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? (ext === '.jpeg' ? '.jpg' : ext)
    : '.jpg';
  const key = `square/banners/banner_${bannerId}${safeExt}`;
  await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, safeExt) });
  return key;
}

async function saveTrendingPostImage(file, postId, index) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? (ext === '.jpeg' ? '.jpg' : ext)
    : '.jpg';
  const key = `square/trending/posts/post_${postId}_${index}${safeExt}`;
  await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, safeExt) });
  return key;
}

async function saveCampusPostImage(file, postId, index) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? (ext === '.jpeg' ? '.jpg' : ext)
    : '.jpg';
  const key = `square/campus/posts/post_${postId}_${index}${safeExt}`;
  await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, safeExt) });
  return key;
}

function parseBannerBody(body) {
  const raw = body || {};
  const type = raw.type === 'ad' ? 'ad' : 'content';
  const title = cleanText(raw.title);
  const subtitle = raw.subtitle != null && String(raw.subtitle).trim() !== ''
    ? cleanText(raw.subtitle) : null;
  let link_type = String(raw.link_type || 'none');
  if (!BANNER_LINK_TYPES.includes(link_type)) link_type = 'none';
  let link_target = raw.link_target != null ? String(raw.link_target).trim() : '';
  if (link_type === 'none') link_target = null;
  else if (!link_target) link_target = null;
  const sort_order = parseInt(raw.sort_order, 10);
  const is_active = raw.is_active === '0' || raw.is_active === 0 || raw.is_active === false ? 0 : 1;
  return { type, title, subtitle, link_type, link_target, sort_order: Number.isFinite(sort_order) ? sort_order : 0, is_active };
}

// ============================================
// 热搜话题
// ============================================

// ---------- 热搜列表 ----------
router.get('/trending', async (req, res) => {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.sort_order, t.created_at,
              (SELECT COUNT(*) FROM trending_posts WHERE topic_id = t.id AND deleted_at IS NULL AND hidden_by_admin = 0) AS post_count
       FROM trending_topics t
       WHERE t.is_active = 1
         AND (t.starts_at IS NULL OR t.starts_at <= ?)
         AND (t.ends_at IS NULL OR t.ends_at >= ?)
       ORDER BY t.sort_order ASC, t.id DESC
       LIMIT 20`,
      [now, now]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      post_count: r.post_count || 0,
      sort_order: r.sort_order,
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('热搜列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜详情 ----------
router.get('/trending/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.sort_order, t.created_at,
              (SELECT COUNT(*) FROM trending_posts WHERE topic_id = t.id AND deleted_at IS NULL AND hidden_by_admin = 0) AS post_count
       FROM trending_topics t WHERE t.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '话题不存在' });
    const r = rows[0];
    res.status(200).json({
      status: 0, message: '获取成功',
      data: { id: r.id, title: r.title, description: r.description || '', post_count: r.post_count || 0, sort_order: r.sort_order },
    });
  } catch (e) {
    console.error('热搜详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜帖列表 ----------
router.get('/trending/:id/posts', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const countRows = await query(
      'SELECT COUNT(*) AS total FROM trending_posts WHERE topic_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [topicId]
    );
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    const rows = await query(
      `SELECT p.id, p.content, p.created_at,
              u.id AS user_id, u.username, u.nickname, u.avatar
       FROM trending_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.topic_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
       ORDER BY p.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [topicId]
    );

    // 批量获取图片、点赞数、评论数
    const postIds = (rows || []).map((r) => r.id);
    const [imageRows, likeRows, commentRows] = await Promise.all(
      postIds.length > 0
        ? [
            query(`SELECT post_id, file_path, sort_order FROM trending_post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY sort_order ASC`),
            query(`SELECT post_id, COUNT(*) AS cnt FROM trending_post_likes WHERE post_id IN (${postIds.join(',')}) GROUP BY post_id`),
            query(`SELECT post_id, COUNT(*) AS cnt FROM trending_post_comments WHERE post_id IN (${postIds.join(',')}) AND deleted_at IS NULL GROUP BY post_id`),
          ]
        : [[], [], []]
    );

    const imagesMap = {};
    for (const img of imageRows || []) {
      if (!imagesMap[img.post_id]) imagesMap[img.post_id] = [];
      imagesMap[img.post_id].push({ url: assetUrl(img.file_path), sort_order: img.sort_order });
    }
    const likesMap = {};
    for (const l of likeRows || []) likesMap[l.post_id] = l.cnt;
    const commentsMap = {};
    for (const c of commentRows || []) commentsMap[c.post_id] = c.cnt;

    const list = (rows || []).map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      images: imagesMap[r.id] || [],
      like_count: likesMap[r.id] || 0,
      comment_count: commentsMap[r.id] || 0,
      author: {
        id: r.user_id,
        name: r.nickname || r.username || '匿名',
        avatar: assetUrl(r.avatar),
      },
    }));
    const hasMore = offset + pageSize < total;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('热搜帖列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发帖到热搜（支持图片） ----------
router.post('/trending/:id/posts', authenticateToken, checkSanction, sensitiveWordFilter, (req, res, next) => {
  postImagesUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片上传失败' });
    next();
  });
}, async (req, res) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const content = cleanText(req.body.content);
    if (!content) return res.status(200).json({ status: -1, message: '内容不能为空' });

    // 校验话题存在且生效
    const topics = await query('SELECT id FROM trending_topics WHERE id = ? AND is_active = 1', [topicId]);
    if (!topics || topics.length === 0) return res.status(200).json({ status: -1, message: '话题不存在或已下线' });

    const result = await query(
      'INSERT INTO trending_posts (topic_id, user_id, content) VALUES (?, ?, ?)',
      [topicId, req.user.id, content]
    );
    const postId = result.insertId;

    // 保存图片
    const files = req.files || [];
    for (let i = 0; i < files.length; i++) {
      const key = await saveTrendingPostImage(files[i], postId, i);
      await query('INSERT INTO trending_post_images (post_id, file_path, sort_order) VALUES (?, ?, ?)', [postId, key, i]);
    }

    let expResult = null;
    if (isPostContentEligible(null, content)) {
      expResult = await grantExp(req.user.id, {
        action: 'post',
        refType: 'trending_post',
        refId: postId,
      });
    }

    res.status(200).json(attachExp({ status: 0, message: '发布成功', data: { id: postId } }, expResult));
  } catch (e) {
    console.error('热搜发帖错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜帖详情 ----------
router.get('/trending/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const viewer = parseOptionalUser(req);
    const viewerUid = viewer && viewer.id != null ? parseInt(viewer.id, 10) : 0;
    const rows = await query(
      `SELECT p.id, p.topic_id, p.content, p.created_at,
              u.id AS user_id, u.username, u.nickname, u.avatar
       FROM trending_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [postId]
    );
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });
    const r = rows[0];

    const [imgRows, likeRows, commentRows, userLikedRows] = await Promise.all([
      query('SELECT file_path, sort_order FROM trending_post_images WHERE post_id = ? ORDER BY sort_order ASC', [postId]),
      query('SELECT COUNT(*) AS cnt FROM trending_post_likes WHERE post_id = ?', [postId]),
      query('SELECT COUNT(*) AS cnt FROM trending_post_comments WHERE post_id = ? AND deleted_at IS NULL', [postId]),
      viewerUid > 0
        ? query('SELECT 1 AS v FROM trending_post_likes WHERE post_id = ? AND user_id = ? LIMIT 1', [postId, viewerUid])
        : Promise.resolve([]),
    ]);

    res.status(200).json({
      status: 0, message: '获取成功',
      data: {
        id: r.id,
        topic_id: r.topic_id,
        content: r.content,
        created_at: r.created_at,
        images: (imgRows || []).map((img) => ({ url: assetUrl(img.file_path), sort_order: img.sort_order })),
        like_count: (likeRows && likeRows[0]) ? likeRows[0].cnt : 0,
        comment_count: (commentRows && commentRows[0]) ? commentRows[0].cnt : 0,
        user_liked: !!(userLikedRows && userLikedRows.length > 0),
        author: {
          id: r.user_id,
          username: r.username,
          nickname: r.nickname,
          name: r.nickname || r.username || '匿名',
          avatar: assetUrl(r.avatar),
        },
      },
    });
  } catch (e) {
    console.error('热搜帖详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜帖评论列表 ----------
router.get('/trending/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
              u.username, u.nickname, u.avatar
       FROM trending_post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [postId]
    );
    const list = nestCommentRows(rows || []);
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('热搜帖评论列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发表热搜帖评论 ----------
router.post('/trending/posts/:id/comments', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const content = cleanText(req.body.content);
    const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
    if (!content) return res.status(200).json({ status: -1, message: '内容不能为空' });

    // 校验帖子存在
    const posts = await query('SELECT id FROM trending_posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });

    // 如果是回复，校验父评论存在且属于同一帖子
    if (parentId) {
      const parents = await query('SELECT id FROM trending_post_comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL', [parentId, postId]);
      if (!parents || parents.length === 0) return res.status(200).json({ status: -1, message: '父评论不存在' });
    }

    const [postRow] = await query('SELECT user_id FROM trending_posts WHERE id = ?', [postId]);

    const result = await query(
      'INSERT INTO trending_post_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, parentId, content]
    );

    let expResult = null;
    if (postRow && postRow.user_id !== req.user.id && isCommentEligible(content)) {
      expResult = await grantExp(req.user.id, {
        action: 'comment',
        refType: 'trending_post',
        refId: postId,
      });
      await checkAndGrantPostPopularRewards('trending', postId, postRow.user_id);
    }

    res.status(200).json(attachExp({ status: 0, message: '评论成功', data: { id: result.insertId } }, expResult));
  } catch (e) {
    console.error('热搜帖评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜帖点赞/取消点赞 ----------
router.post('/trending/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const posts = await query('SELECT id FROM trending_posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });

    const [postAuthor] = await query('SELECT user_id FROM trending_posts WHERE id = ?', [postId]);
    const authorId = postAuthor && postAuthor.user_id;

    const existing = await query(
      'SELECT 1 FROM trending_post_likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );
    let liked;
    let expResult = null;
    if (existing && existing.length > 0) {
      await query('DELETE FROM trending_post_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
      liked = false;
      if (authorId && authorId !== req.user.id) {
        expResult = await revokeByRef(req.user.id, {
          action: 'like',
          refType: 'trending_post',
          refId: postId,
        });
      }
    } else {
      await query('INSERT INTO trending_post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      liked = true;
      if (authorId && authorId !== req.user.id) {
        expResult = await grantExp(req.user.id, {
          action: 'like',
          refType: 'trending_post',
          refId: postId,
        });
        await checkAndGrantPostPopularRewards('trending', postId, authorId);
      }
    }
    const [cntRow] = await query('SELECT COUNT(*) AS cnt FROM trending_post_likes WHERE post_id = ?', [postId]);
    res.status(200).json(attachExp({
      status: 0,
      message: liked ? '点赞成功' : '已取消点赞',
      data: { liked, like_count: (cntRow && cntRow.cnt) || 0 },
    }, expResult));
  } catch (e) {
    console.error('热搜帖点赞错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员 CRUD 热搜话题 ----------
router.post('/trending', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const title = cleanText(req.body.title);
    if (!title) return res.status(200).json({ status: -1, message: '请输入标题' });
    const description = cleanText(req.body.description);
    const sortOrder = parseInt(req.body.sort_order, 10) || 0;

    const result = await query(
      'INSERT INTO trending_topics (title, description, sort_order, created_by) VALUES (?, ?, ?, ?)',
      [title, description, sortOrder, req.user.id]
    );
    res.status(200).json({ status: 0, message: '热搜创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.patch('/trending/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const id = parseInt(req.params.id, 10);
    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(cleanText(req.body.title)); }
    if (req.body.description !== undefined) { sets.push('description = ?'); params.push(cleanText(req.body.description)); }
    if (req.body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(parseInt(req.body.sort_order, 10) || 0); }
    if (req.body.is_active !== undefined) { sets.push('is_active = ?'); params.push(req.body.is_active ? 1 : 0); }
    if (req.body.starts_at !== undefined) { sets.push('starts_at = ?'); params.push(req.body.starts_at || null); }
    if (req.body.ends_at !== undefined) { sets.push('ends_at = ?'); params.push(req.body.ends_at || null); }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });
    params.push(id);
    await query(`UPDATE trending_topics SET ${sets.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ status: 0, message: '热搜更新成功' });
  } catch (e) {
    console.error('更新热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.delete('/trending/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM trending_topics WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '热搜已删除' });
  } catch (e) {
    console.error('删除热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ============================================
// 校园此刻
// ============================================

// ---------- 校园动态列表 ----------
router.get('/campus-feed', async (req, res) => {
  try {
    const tab = req.query.tab === 'college' ? 'college' : 'school';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    // school tab 允许 SchoolDepartment 和 Official；college tab 仅 College
    const orgTypeCondition = tab === 'college'
      ? "AND o.type = 'College'"
      : "AND o.type IN ('SchoolDepartment', 'Official')";

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       WHERE cp.feed_tab = ? AND cp.deleted_at IS NULL AND cp.hidden_by_admin = 0 ${orgTypeCondition}`,
      [tab]
    );
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    const rows = await query(
      `SELECT cp.id, cp.title, cp.content, cp.feed_tab, cp.created_at,
              o.id AS org_id, o.name AS org_name, o.type AS org_type, o.avatar AS org_avatar,
              u.id AS author_id, u.username, u.nickname
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       JOIN users u ON cp.author_user_id = u.id
       WHERE cp.feed_tab = ? AND cp.deleted_at IS NULL AND cp.hidden_by_admin = 0 ${orgTypeCondition}
       ORDER BY cp.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [tab]
    );
    // 批量获取图片
    const postIds = (rows || []).map((r) => r.id);
    const imgRows = postIds.length > 0
      ? await query(`SELECT post_id, file_path, sort_order FROM campus_post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY sort_order ASC`)
      : [];
    const imagesMap = {};
    for (const img of imgRows || []) {
      if (!imagesMap[img.post_id]) imagesMap[img.post_id] = [];
      imagesMap[img.post_id].push({ url: assetUrl(img.file_path), sort_order: img.sort_order });
    }

    const list = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      feed_tab: r.feed_tab,
      created_at: r.created_at,
      images: imagesMap[r.id] || [],
      organization: {
        id: r.org_id,
        name: r.org_name,
        type: r.org_type,
        avatar: assetUrl(r.org_avatar),
      },
      author: {
        id: r.author_id,
        name: r.nickname || r.username || '匿名',
      },
    }));
    const hasMore = offset + pageSize < total;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('校园动态列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发校园帖（组织身份，支持图片） ----------
router.post('/campus-posts', authenticateToken, checkSanction, sensitiveWordFilter, (req, res, next) => {
  postImagesUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片上传失败' });
    next();
  });
}, async (req, res) => {
  try {
    const organizationId = parseInt(req.body.organization_id, 10);
    const feedTab = req.body.feed_tab === 'college' ? 'college' : 'school';
    const title = cleanText(req.body.title);
    const content = cleanText(req.body.content);
    if (!organizationId || !title || !content) return res.status(200).json({ status: -1, message: '请填写完整信息' });

    // 校验用户是否为该组织成员
    const members = await query(
      'SELECT om.permission_level, o.type FROM organization_memberships om JOIN organizations o ON om.organization_id = o.id WHERE om.organization_id = ? AND om.user_id = ? AND o.is_active = 1',
      [organizationId, req.user.id]
    );
    if (!members || members.length === 0) {
      return res.status(200).json({ status: -1, message: '你不在该组织中或无发帖权限' });
    }
    const m = members[0];

    // 校验组织类型与 tab 匹配
    if (feedTab === 'college' && m.type !== 'College') {
      return res.status(200).json({ status: -1, message: '学院通知仅限 College 类型组织发布' });
    }
    if (feedTab === 'school' && !['SchoolDepartment', 'Official'].includes(m.type)) {
      return res.status(200).json({ status: -1, message: '学校公告仅限 SchoolDepartment/Official 类型组织发布' });
    }

    const result = await query(
      'INSERT INTO campus_posts (organization_id, author_user_id, feed_tab, title, content) VALUES (?, ?, ?, ?, ?)',
      [organizationId, req.user.id, feedTab, title, content]
    );
    const postId = result.insertId;

    // 保存图片
    const files = req.files || [];
    for (let i = 0; i < files.length; i++) {
      const key = await saveCampusPostImage(files[i], postId, i);
      await query('INSERT INTO campus_post_images (post_id, file_path, sort_order) VALUES (?, ?, ?)', [postId, key, i]);
    }

    res.status(200).json({ status: 0, message: '发布成功', data: { id: postId } });
  } catch (e) {
    console.error('发校园帖错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 校园帖详情 ----------
router.get('/campus-posts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const viewer = parseOptionalUser(req);
    const viewerUid = viewer && viewer.id != null ? parseInt(viewer.id, 10) : 0;
    const rows = await query(
      `SELECT cp.id, cp.title, cp.content, cp.feed_tab, cp.created_at,
              o.id AS org_id, o.name AS org_name, o.type AS org_type, o.avatar AS org_avatar,
              u.id AS author_id, u.username, u.nickname, u.avatar AS author_avatar
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       JOIN users u ON cp.author_user_id = u.id
       WHERE cp.id = ? AND cp.deleted_at IS NULL`,
      [id]
    );
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });
    const r = rows[0];

    const [imgRows, likeRows, commentRows, userLikedRows] = await Promise.all([
      query('SELECT file_path, sort_order FROM campus_post_images WHERE post_id = ? ORDER BY sort_order ASC', [id]),
      query('SELECT COUNT(*) AS cnt FROM campus_post_likes WHERE post_id = ?', [id]),
      query('SELECT COUNT(*) AS cnt FROM campus_post_comments WHERE post_id = ? AND deleted_at IS NULL', [id]),
      viewerUid > 0
        ? query('SELECT 1 AS v FROM campus_post_likes WHERE post_id = ? AND user_id = ? LIMIT 1', [id, viewerUid])
        : Promise.resolve([]),
    ]);

    res.status(200).json({
      status: 0, message: '获取成功',
      data: {
        id: r.id,
        title: r.title,
        content: r.content,
        feed_tab: r.feed_tab,
        created_at: r.created_at,
        images: (imgRows || []).map((img) => ({ url: assetUrl(img.file_path), sort_order: img.sort_order })),
        like_count: (likeRows && likeRows[0]) ? likeRows[0].cnt : 0,
        comment_count: (commentRows && commentRows[0]) ? commentRows[0].cnt : 0,
        user_liked: !!(userLikedRows && userLikedRows.length > 0),
        organization: { id: r.org_id, name: r.org_name, type: r.org_type, avatar: assetUrl(r.org_avatar) },
        author: {
          id: r.author_id,
          username: r.username,
          nickname: r.nickname,
          name: r.nickname || r.username || '匿名',
          avatar: assetUrl(r.author_avatar),
        },
      },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 054 Run migration 054' });
    }
    console.error('校园帖详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 校园帖评论列表 ----------
router.get('/campus-posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
              u.username, u.nickname, u.avatar
       FROM campus_post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.status(200).json({ status: 0, message: '获取成功', data: nestCommentRows(rows || []) });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(200).json({ status: 0, message: '获取成功', data: [] });
    }
    console.error('校园帖评论列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发表校园帖评论 ----------
router.post('/campus-posts/:id/comments', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const content = cleanText(req.body.content);
    const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
    if (!content) return res.status(200).json({ status: -1, message: '内容不能为空' });

    const posts = await query('SELECT id FROM campus_posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });

    if (parentId) {
      const parents = await query(
        'SELECT id, parent_id FROM campus_post_comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL',
        [parentId, postId]
      );
      if (!parents || parents.length === 0) return res.status(200).json({ status: -1, message: '父评论不存在' });
      if (parents[0].parent_id != null) {
        return res.status(200).json({ status: -1, message: '仅支持二级评论' });
      }
    }

    const result = await query(
      'INSERT INTO campus_post_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, parentId, content]
    );
    const rows = await query(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
              u.username, u.nickname, u.avatar
       FROM campus_post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );
    const row = rows && rows[0];
    const data = row
      ? {
          id: row.id,
          post_id: row.post_id,
          user_id: row.user_id,
          parent_id: row.parent_id,
          content: row.content,
          created_at: row.created_at,
          author: mapCommentAuthor(row),
        }
      : { id: result.insertId, content };
    res.status(200).json({ status: 0, message: '评论成功', data });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 054 Run migration 054' });
    }
    console.error('校园帖评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 校园帖点赞/取消点赞 ----------
router.post('/campus-posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const posts = await query('SELECT id FROM campus_posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!posts || posts.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });

    const existing = await query(
      'SELECT 1 FROM campus_post_likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );
    let liked;
    if (existing && existing.length > 0) {
      await query('DELETE FROM campus_post_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
      liked = false;
    } else {
      await query('INSERT INTO campus_post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      liked = true;
    }
    const [cntRow] = await query('SELECT COUNT(*) AS cnt FROM campus_post_likes WHERE post_id = ?', [postId]);
    res.status(200).json({
      status: 0,
      message: liked ? '点赞成功' : '已取消点赞',
      data: { liked, like_count: (cntRow && cntRow.cnt) || 0 },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 054 Run migration 054' });
    }
    console.error('校园帖点赞错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ============================================
// 广场轮播（与食堂轮播结构一致、数据独立；支持上传图片/gif）
// ============================================

router.get('/banners', async (req, res) => {
  try {
    const now = new Date();
    const rows = await simpleCache.getOrSet('square:banners:v1', 5 * 60 * 1000, async () => {
      return await query(
        `SELECT id, type, title, subtitle, image_url, link_type, link_target, sort_order
         FROM square_banners
         WHERE is_active = 1
           AND (starts_at IS NULL OR starts_at <= ?)
           AND (ends_at IS NULL OR ends_at >= ?)
         ORDER BY sort_order ASC, id ASC
         LIMIT 10`,
        [now, now]
      );
    });
    const list = (rows || []).map((r) => ({
      id: r.id, type: r.type, title: r.title, subtitle: r.subtitle || '',
      image_url: assetUrl(r.image_url), link_type: r.link_type, link_target: r.link_target || '',
      sort_order: r.sort_order,
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('广场轮播获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// Admin: 全量列表（含未生效，供管理端）
router.get('/banners/admin', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const rows = await query(
      'SELECT id, type, title, subtitle, image_url, link_type, link_target, sort_order, is_active FROM square_banners ORDER BY sort_order ASC, id ASC'
    );
    const list = (rows || []).map((r) => ({
      ...r, subtitle: r.subtitle || '', link_target: r.link_target || '',
      image_url: assetUrl(r.image_url),
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('广场轮播管理列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 上传图片
router.post('/banners/upload', authenticateToken, (req, res, next) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  bannerImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    next();
  });
}, async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ status: -1, message: '请选择图片' });
    // 先插入占位记录获取 id，用于生成 key
    const result = await query(
      'INSERT INTO square_banners (type, title, image_url) VALUES (?, ?, ?)',
      ['content', '_uploading', '']
    );
    const bannerId = result.insertId;
    const key = await saveSquareBannerImage(file, bannerId);
    await query('UPDATE square_banners SET image_url = ? WHERE id = ?', [key, bannerId]);
    invalidateSquareBannerCache();
    res.status(200).json({ status: 0, message: '上传成功', data: { id: bannerId, image_url: assetUrl(key) } });
  } catch (e) {
    console.error('广场轮播上传错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 创建（支持 multipart 上传图片或填写 URL）
router.post('/banners', authenticateToken, (req, res, next) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  bannerImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    next();
  });
}, async (req, res) => {
  try {
    const parsed = parseBannerBody(req.body);
    if (!parsed.title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    let imagePath = req.body && req.body.image_url != null ? String(req.body.image_url).trim() : '';
    if (!imagePath && !req.file) return res.status(400).json({ status: -1, message: '请上传图片或填写图片地址' });
    const result = await query(
      `INSERT INTO square_banners (type, title, subtitle, image_url, link_type, link_target, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [parsed.type, parsed.title, parsed.subtitle, imagePath, parsed.link_type, parsed.link_target, parsed.sort_order, parsed.is_active]
    );
    const bannerId = result.insertId;
    if (req.file) {
      const key = await saveSquareBannerImage(req.file, bannerId);
      await query('UPDATE square_banners SET image_url = ? WHERE id = ?', [key, bannerId]);
    }
    invalidateSquareBannerCache();
    res.status(200).json({ status: 0, message: '轮播创建成功', data: { id: bannerId } });
  } catch (e) {
    console.error('广场轮播创建错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 编辑（支持 multipart 上传新图片或填写新 URL）
router.patch('/banners/:id', authenticateToken, (req, res, next) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  bannerImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    next();
  });
}, async (req, res) => {
  try {
    const bannerId = parseInt(req.params.id, 10);
    if (!bannerId) return res.status(400).json({ status: -1, message: '轮播 ID 无效' });
    const existing = await query('SELECT id FROM square_banners WHERE id = ?', [bannerId]);
    if (!existing || !existing.length) return res.status(404).json({ status: -1, message: '轮播不存在' });
    const parsed = parseBannerBody(req.body);
    if (!parsed.title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    const sets = [];
    const params = [];
    sets.push('type = ?'); params.push(parsed.type);
    sets.push('title = ?'); params.push(parsed.title);
    sets.push('subtitle = ?'); params.push(parsed.subtitle || null);
    sets.push('link_type = ?'); params.push(parsed.link_type);
    sets.push('link_target = ?'); params.push(parsed.link_target);
    sets.push('sort_order = ?'); params.push(parsed.sort_order);
    sets.push('is_active = ?'); params.push(parsed.is_active);
    if (req.file) {
      const key = await saveSquareBannerImage(req.file, bannerId);
      sets.push('image_url = ?'); params.push(key);
    } else if (req.body && req.body.image_url != null) {
      sets.push('image_url = ?'); params.push(String(req.body.image_url).trim());
    }
    params.push(bannerId);
    await query(`UPDATE square_banners SET ${sets.join(', ')} WHERE id = ?`, params);
    invalidateSquareBannerCache();
    res.status(200).json({ status: 0, message: '轮播更新成功' });
  } catch (e) {
    console.error('广场轮播更新错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.delete('/banners/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    await query('DELETE FROM square_banners WHERE id = ?', [parseInt(req.params.id, 10)]);
    invalidateSquareBannerCache();
    res.status(200).json({ status: 0, message: '轮播已删除' });
  } catch (e) {
    console.error('广场轮播删除错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

module.exports = router;
