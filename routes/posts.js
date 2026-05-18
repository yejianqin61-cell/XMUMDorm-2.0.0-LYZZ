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
const sanitizeHtml = require('sanitize-html');
const { logAudit } = require('../services/auditLog');
const { assetUrl } = require('../utils/assets');
const { simpleCache } = require('../utils/simpleCache');
const { grantExp, revokeByRef, checkAndGrantPostPopularRewards, formatAuthorLevel } = require('../services/expService');
const { attachExp } = require('../utils/expResponse');
const { isPostContentEligible, isCommentEligible } = require('../utils/expEligibility');

// 统一的文本清洗，防止 XSS 注入（去掉所有 HTML 标签，只保留纯文本）
function cleanText(input) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return cleaned.trim();
}

// 辅助：当前用户是否为 admin
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

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

/** 生成 URL slug（拉丁字母与数字） */
function slugifyLatin(input) {
  const s = String(input || '').trim().toLowerCase();
  const slug = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return slug || '';
}

async function ensureUniqueTagSlug(base) {
  let slug = (base && base.length > 0 ? base : 'topic').slice(0, 60);
  let n = 0;
  while (n < 200) {
    const rows = await query('SELECT id FROM tags WHERE slug = ?', [slug]);
    if (!rows || rows.length === 0) return slug;
    n += 1;
    slug = `${(base && base.length > 0 ? base : 'topic').slice(0, 50)}-${n}`;
  }
  return `topic-${Date.now()}`;
}

/** 为帖子列表/详情附加 tags 数组（表不存在时返回空数组） */
async function enrichPostsWithTags(posts) {
  if (!posts || posts.length === 0) return posts;
  const ids = [...new Set(posts.map((p) => p.id))];
  const placeholders = ids.map(() => '?').join(',');
  let rows = [];
  try {
    // 这段查询在瀑布流分页中会被频繁触发；用进程内 cache 降低远程 DB 往返放大效应
    const ttlMs = Number(process.env.CACHE_POST_TAGS_MAP_TTL_MS || 30 * 1000); // 30s
    const cacheKey = `posts:tagsMap:v1:${ids.join(',')}`;
    rows = await simpleCache.getOrSet(cacheKey, ttlMs, async () => {
      return await query(
        `SELECT ptm.post_id, t.id, t.slug, t.name_zh, t.name_en
         FROM post_tag_map ptm
         INNER JOIN tags t ON t.id = ptm.tag_id
         WHERE ptm.post_id IN (${placeholders})
         ORDER BY t.created_at ASC, t.id ASC`,
        ids
      );
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return posts.map((p) => ({ ...p, tags: [] }));
    }
    throw e;
  }
  const byPost = {};
  ids.forEach((id) => { byPost[id] = []; });
  for (const r of rows || []) {
    if (!byPost[r.post_id]) byPost[r.post_id] = [];
    byPost[r.post_id].push({
      id: r.id,
      slug: r.slug,
      name_zh: r.name_zh,
      name_en: r.name_en,
    });
  }
  return posts.map((p) => ({ ...p, tags: byPost[p.id] || [] }));
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
      title: row.title ?? null,
      content: row.content,
      type: row.type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      hidden_by_admin: !!row.hidden_by_admin,
      author: row.author_id ? {
        id: row.author_id,
        username: row.author_username,
        nickname: row.author_nickname,
        avatar: assetUrl(row.author_avatar),
        ...formatAuthorLevel({ level: row.author_level, badge: row.author_badge }),
      } : null,
      images: [],
      like_count: row.like_count != null ? Number(row.like_count) : 0,
      comment_count: row.comment_count != null ? Number(row.comment_count) : 0
    };
    if (row.image_path) {
      base.images.push({ url: assetUrl(row.image_path), sort_order: row.sort_order });
    }
    base.deleted_at = row.deleted_at || null;
    if (!visible) base.hidden = true;
    return base;
  });
}

// 聚合相同 post 的多行（多图、多点赞数等已用 GROUP BY 或子查询处理时，这里可能多行一帖）
// 按 rows 中首次出现的顺序输出，以保持 SQL ORDER BY p.created_at DESC 的新帖在前
/** MySQL 可能返回 0/1、true/false 或 bit Buffer */
function rowTruthyLike(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return v.length > 0 && v[0] === 1;
  return Boolean(v);
}

function mergePostRows(rows, req) {
  const byId = {};
  const order = [];
  for (const row of rows) {
    if (!postVisible(row, req)) continue;
    const id = row.id;
    if (!byId[id]) {
      order.push(id);
      byId[id] = {
        id: row.id,
        user_id: row.user_id,
        title: row.title ?? null,
        content: row.content,
        type: row.type,
        created_at: row.created_at,
        updated_at: row.updated_at,
        hidden_by_admin: !!row.hidden_by_admin,
        author: row.author_id ? {
          id: row.author_id,
          username: row.author_username,
          nickname: row.author_nickname,
          avatar: assetUrl(row.author_avatar),
          ...formatAuthorLevel({ level: row.author_level, badge: row.author_badge }),
        } : null,
        images: [],
        like_count: row.like_count != null ? Number(row.like_count) : 0,
        comment_count: row.comment_count != null ? Number(row.comment_count) : 0,
        user_liked: rowTruthyLike(row.user_liked)
      };
    }
    if (row.image_path) {
      byId[id].images.push({ url: assetUrl(row.image_path), sort_order: row.sort_order });
    }
  }
  return order.map((id) => {
    const p = byId[id];
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
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp/gif，单张≤8MB，最多3张）'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const title = cleanText(req.body && req.body.title).slice(0, 120);
    const content = cleanText(req.body && req.body.content);
    if (!content) {
      return res.status(400).json({ status: -1, message: '内容不能为空' });
    }
    const requestedType = (req.body && req.body.type) === 'announcement' ? 'announcement' : 'normal';
    // 仅管理员可发公告，且管理员只能发公告（不能发普通树洞帖）
    if (requestedType === 'announcement' && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '仅管理员可发公告' });
    }
    if (requestedType === 'normal' && req.user.role === 'admin') {
      return res.status(403).json({ status: -1, message: '管理员只能发布公告' });
    }
    const type = requestedType;

    // 普通帖：强制标题（公告不强制，保持旧行为）
    if (type === 'normal' && !title) {
      return res.status(400).json({ status: -1, message: '标题不能为空' });
    }

    let result;
    try {
      result = await query(
        'INSERT INTO posts (user_id, title, content, type) VALUES (?, ?, ?, ?)',
        [req.user.id, type === 'normal' ? title : null, content, type]
      );
    } catch (e) {
      // 数据库尚未迁移 title 字段时，给出明确提示（避免 500 迷惑）
      if (e && e.code === 'ER_BAD_FIELD_ERROR' && String(e.sqlMessage || '').includes('title')) {
        return res.status(503).json({
          status: -1,
          message: '数据库缺少 posts.title，请先执行迁移 migrations/013_posts_title.sql',
        });
      }
      throw e;
    }
    const postId = result.insertId;
    const files = req.files || [];
    if (files.length > 0) {
      const paths = await savePostImages(files, postId);
      if (paths && paths.length > 0) {
        const placeholders = paths.map(() => '(?, ?, ?)').join(',');
        const params = [];
        for (let i = 0; i < paths.length; i++) {
          params.push(postId, paths[i], i);
        }
        await query(
          `INSERT INTO post_images (post_id, file_path, sort_order) VALUES ${placeholders}`,
          params
        );
      }
    }

    // 普通帖：可选最多 3 个标签（公告不支持标签）
    let tagIds = [];
    try {
      const raw = req.body && req.body.tag_ids;
      if (typeof raw === 'string' && raw.trim()) {
        tagIds = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        tagIds = raw;
      }
    } catch (_) {
      tagIds = [];
    }
    tagIds = [...new Set(tagIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 3);
    if (type === 'normal' && tagIds.length > 0) {
      try {
        const ph = tagIds.map(() => '?').join(',');
        const found = await query(`SELECT id FROM tags WHERE id IN (${ph})`, tagIds);
        if (!found || found.length !== tagIds.length) {
          return res.status(400).json({ status: -1, message: '标签无效 Invalid tags' });
        }
        const placeholders = tagIds.map(() => '(?, ?)').join(',');
        const params = [];
        for (const tid of tagIds) params.push(postId, tid);
        await query(`INSERT INTO post_tag_map (post_id, tag_id) VALUES ${placeholders}`, params);
      } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
      }
    }

    // 公告：给全站用户各插入一条未读通知
    if (type === 'announcement') {
      // 通知页仅展示公告内容：这里存一段更完整的内容片段（避免只有“标题”）
      const extra = JSON.stringify({ content: content.slice(0, 600) });
      await query(
        `INSERT INTO notifications (user_id, type, post_id, from_user_id, extra)
         SELECT id, 'announcement', ?, ?, ? FROM users`,
        [postId, req.user.id, extra]
      );
    }

    // 审计日志：发帖 / 发布公告
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][POST_CREATE]', {
      userId: req.user.id,
      role: req.user.role,
      postId,
      type,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: type === 'announcement' ? 'ANNOUNCEMENT_CREATE' : 'POST_CREATE',
      targetType: 'post',
      targetId: postId,
      ip,
      userAgent: ua,
    });

    const posterUid = req.user && req.user.id != null ? parseInt(req.user.id, 10) : 0;
    const likeUserParam = Number.isFinite(posterUid) && posterUid > 0 ? posterUid : 0;
    const rows = await query(
      `SELECT p.id, p.user_id, p.title, p.content, p.type, p.created_at, p.updated_at, p.hidden_by_admin,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
          u.level AS author_level, u.badge AS author_badge,
        u.level AS author_level, u.badge AS author_badge,
        pi.file_path AS image_path, pi.sort_order,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) > 0 AS user_liked
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN post_images pi ON pi.post_id = p.id
       WHERE p.id = ?`,
      [likeUserParam, postId]
    );
    const merged = mergePostRows(rows, req);
    let post = merged[0];
    if (!post) {
      return res.status(200).json({
        status: 0,
        message: '发布成功！',
        data: { id: postId, content, type, created_at: new Date().toISOString(), images: [] }
      });
    }
    const [withTags] = await enrichPostsWithTags([post]);
    post = withTags;

    let expResult = null;
    if (type === 'normal' && isPostContentEligible(title, content)) {
      expResult = await grantExp(req.user.id, {
        action: 'post',
        refType: 'treehole_post',
        refId: postId,
      });
    }

    res.status(200).json(attachExp({
      status: 0,
      message: '发布成功！',
      data: post,
    }, expResult));
  } catch (e) {
    console.error('发布帖子错误:', e);
    const msg = process.env.NODE_ENV === 'development' ? (e.message || String(e)) : '服务器错误，请稍后重试';
    res.status(500).json({ status: -1, message: msg });
  }
});

// ============================================
// 帖子列表（分页，排除已逻辑删除；非 admin 排除被隐藏）
// ============================================
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = Math.max(0, (page - 1) * pageSize);
    const limitCount = pageSize + 1;
    const user = parseOptionalUser(req);
    const isAdminUser = user && user.role === 'admin';

    let where = "p.deleted_at IS NULL AND p.type <> 'announcement'";
    if (!isAdminUser) where += ' AND p.hidden_by_admin = 0';

    const sqlParams = [];

    const qRaw = (req.query.q || '').trim().slice(0, 200);
    if (qRaw) {
      const safe = qRaw.replace(/[%_\\]/g, '');
      if (safe) {
        where += ' AND p.content LIKE ?';
        sqlParams.push(`%${safe}%`);
      }
    }

    const tagIdNum = parseInt(req.query.tagId, 10);
    if (Number.isFinite(tagIdNum) && tagIdNum > 0) {
      where += ' AND EXISTS (SELECT 1 FROM post_tag_map ptm WHERE ptm.post_id = p.id AND ptm.tag_id = ?)';
      sqlParams.push(tagIdNum);
    } else {
      const tagSlug = (req.query.tagSlug || '').trim().slice(0, 80);
      if (tagSlug) {
        where += ' AND EXISTS (SELECT 1 FROM post_tag_map ptm INNER JOIN tags tg ON tg.id = ptm.tag_id WHERE ptm.post_id = p.id AND tg.slug = ?)';
        sqlParams.push(tagSlug);
      }
    }

    const viewerUid = user && user.id != null ? parseInt(user.id, 10) : 0;
    const likeUserParam = Number.isFinite(viewerUid) && viewerUid > 0 ? viewerUid : 0;

    // 占位符顺序必须与 SQL 中 ? 出现顺序一致：SELECT 里 user_liked 在前，WHERE 里 LIKE / tag 在后
    let rows;
    try {
      rows = await query(
        `SELECT p.id, p.user_id, p.title, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
          u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
          u.level AS author_level, u.badge AS author_badge,
          pi.file_path AS image_path, pi.sort_order,
          (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
          (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) > 0 AS user_liked
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN post_images pi ON pi.post_id = p.id
         WHERE ${where}
         ORDER BY p.created_at DESC
         LIMIT ${limitCount} OFFSET ${offset}`,
        [likeUserParam, ...sqlParams]
      );
    } catch (e) {
      // 兼容未执行 013 迁移：降级不查询 title，避免列表直接 500
      if (e && e.code === 'ER_BAD_FIELD_ERROR' && String(e.sqlMessage || '').includes("p.title")) {
        rows = await query(
          `SELECT p.id, p.user_id, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
            u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
          u.level AS author_level, u.badge AS author_badge,
            pi.file_path AS image_path, pi.sort_order,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) > 0 AS user_liked
           FROM posts p
           LEFT JOIN users u ON p.user_id = u.id
           LEFT JOIN post_images pi ON pi.post_id = p.id
           WHERE ${where}
           ORDER BY p.created_at DESC
           LIMIT ${limitCount} OFFSET ${offset}`,
          [likeUserParam, ...sqlParams]
        );
      } else {
        throw e;
      }
    }
    let list = mergePostRows(rows.map((r) => ({ ...r, deleted_at: null })), { user: user || {} });
    list = await enrichPostsWithTags(list);
    const hasMore = rows.length > pageSize;
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: { list, hasMore, page, pageSize }
    });
  } catch (e) {
    console.error('获取帖子列表错误:', e);
    const msg = process.env.NODE_ENV === 'development' ? (e.message || String(e)) : '服务器错误，请稍后重试';
    res.status(500).json({ status: -1, message: msg });
  }
});

// ============================================
// 标签列表（按创建时间升序：最先创建的在前）
// ============================================
router.get('/tags', async (req, res) => {
  try {
    const ttlMs = Number(process.env.CACHE_TAGS_TTL_MS || 60 * 60 * 1000); // 60min
    const rows = await simpleCache.getOrSet('posts:tags:v1', ttlMs, async () => {
      return await query('SELECT id, slug, name_zh, name_en, created_at FROM tags ORDER BY created_at ASC, id ASC');
    });
    res.status(200).json({ status: 0, message: 'ok', data: rows || [] });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(200).json({ status: 0, message: 'ok', data: [] });
    }
    console.error('标签列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 创建标签（仅管理员）
// ============================================
router.post('/tags', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可创建标签 Admins only' });
    }
    const nameZh = cleanText(req.body && req.body.name_zh).slice(0, 100);
    const nameEn = cleanText(req.body && req.body.name_en).slice(0, 100);
    if (!nameZh || !nameEn) {
      return res.status(400).json({ status: -1, message: '请填写中文与英文名称 Name (ZH) & (EN) required' });
    }
    let base = slugifyLatin(req.body && req.body.slug) || slugifyLatin(nameEn) || slugifyLatin(nameZh);
    if (!base) base = 'topic';
    const slug = await ensureUniqueTagSlug(base);
    const result = await query(
      'INSERT INTO tags (slug, name_zh, name_en, created_by) VALUES (?, ?, ?, ?)',
      [slug, nameZh, nameEn, req.user.id]
    );
    res.status(200).json({
      status: 0,
      message: '创建成功 Created',
      data: { id: result.insertId, slug, name_zh: nameZh, name_en: nameEn },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 011_post_tags.sql Run migration 011' });
    }
    console.error('创建标签错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 删除标签（仅管理员，关联帖子自动解绑）
// ============================================
router.delete('/tags/:tagId', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可删除标签 Admins only' });
    }
    const tagId = parseInt(req.params.tagId, 10);
    if (!tagId) {
      return res.status(400).json({ status: -1, message: '标签 ID 无效' });
    }
    await query('DELETE FROM tags WHERE id = ?', [tagId]);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'TAG_DELETE',
      targetType: 'tag',
      targetId: tagId,
      ip,
      userAgent: ua,
    });
    res.status(200).json({ status: 0, message: '已删除 Deleted' });
  } catch (e) {
    console.error('删除标签错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 标签可见性管理（用户自定义 Tag 栏展示）
// ============================================

// 获取所有标签及当前用户的可见性状态
router.get('/tags/visible', authenticateToken, async (req, res) => {
  try {
    const tagRows = await query('SELECT id, slug, name_zh, name_en, created_at FROM tags ORDER BY created_at ASC, id ASC');
    const visRows = await query(
      'SELECT tag_id, visible FROM tag_visibility WHERE user_id = ?',
      [req.user.id]
    );
    const visMap = {};
    for (const v of visRows || []) {
      visMap[v.tag_id] = !!v.visible;
    }
    // 默认：前10个tag可见（与现有逻辑一致）；已显式设置的按用户偏好
    const allTags = (tagRows || []).map((t, i) => ({
      ...t,
      visible: t.id in visMap ? visMap[t.id] : i < 10,
    }));
    const visible = allTags.filter((t) => t.visible);
    const hidden = allTags.filter((t) => !t.visible);
    res.status(200).json({ status: 0, message: 'ok', data: { all: allTags, visible, hidden } });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      // tag_visibility 表尚未迁移，回退到全部可见
      const tagRows = await query('SELECT id, slug, name_zh, name_en, created_at FROM tags ORDER BY created_at ASC, id ASC');
      const allTags = (tagRows || []).map((t) => ({ ...t, visible: true }));
      return res.status(200).json({ status: 0, message: 'ok', data: { all: allTags, visible: allTags, hidden: [] } });
    }
    console.error('标签可见性查询错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// 设置单个标签的可见性
router.patch('/tags/:tagId/visible', authenticateToken, async (req, res) => {
  try {
    const tagId = parseInt(req.params.tagId, 10);
    if (!tagId) return res.status(400).json({ status: -1, message: '标签 ID 无效' });
    const bodyVisible = req.body && req.body.visible;
    const visible = bodyVisible === true || bodyVisible === 1 || bodyVisible === '1' ? 1 : 0;

    await query(
      'INSERT INTO tag_visibility (user_id, tag_id, visible) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE visible = VALUES(visible)',
      [req.user.id, tagId, visible]
    );
    res.status(200).json({ status: 0, message: 'ok', data: { tag_id: tagId, visible: !!visible } });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '请先执行数据库迁移 047 Run migration 047' });
    }
    console.error('标签可见性设置错误:', e);
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
    const user = parseOptionalUser(req);
    const viewerUid = user && user.id != null ? parseInt(user.id, 10) : 0;
    const likeUserParam = Number.isFinite(viewerUid) && viewerUid > 0 ? viewerUid : 0;

    const cacheKey = `post_detail_v2:${id}:u:${likeUserParam}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: '获取成功', data: cached });
    }

    let rows;
    try {
      rows = await query(
        `SELECT p.id, p.user_id, p.title, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
          u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
          u.level AS author_level, u.badge AS author_badge,
          pi.file_path AS image_path, pi.sort_order,
          COALESCE(plc.like_count, 0) AS like_count,
          COALESCE(cc.comment_count, 0) AS comment_count,
          COALESCE(ul.user_liked, 0) AS user_liked
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN post_images pi ON pi.post_id = p.id
         LEFT JOIN (
           SELECT post_id, COUNT(*) AS like_count
           FROM post_likes
           WHERE post_id = ?
           GROUP BY post_id
         ) plc ON plc.post_id = p.id
         LEFT JOIN (
           SELECT post_id, COUNT(*) AS comment_count
           FROM comments
           WHERE post_id = ? AND deleted_at IS NULL
           GROUP BY post_id
         ) cc ON cc.post_id = p.id
         LEFT JOIN (
           SELECT post_id, 1 AS user_liked
           FROM post_likes
           WHERE post_id = ? AND user_id = ?
           LIMIT 1
         ) ul ON ul.post_id = p.id
         WHERE p.id = ?`,
        [id, id, id, likeUserParam, id]
      );
    } catch (e) {
      if (e && e.code === 'ER_BAD_FIELD_ERROR' && String(e.sqlMessage || '').includes("p.title")) {
        rows = await query(
          `SELECT p.id, p.user_id, p.content, p.type, p.deleted_at, p.hidden_by_admin, p.created_at, p.updated_at,
            u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
          u.level AS author_level, u.badge AS author_badge,
            pi.file_path AS image_path, pi.sort_order,
            COALESCE(plc.like_count, 0) AS like_count,
            COALESCE(cc.comment_count, 0) AS comment_count,
            COALESCE(ul.user_liked, 0) AS user_liked
           FROM posts p
           LEFT JOIN users u ON p.user_id = u.id
           LEFT JOIN post_images pi ON pi.post_id = p.id
           LEFT JOIN (
             SELECT post_id, COUNT(*) AS like_count
             FROM post_likes
             WHERE post_id = ?
             GROUP BY post_id
           ) plc ON plc.post_id = p.id
           LEFT JOIN (
             SELECT post_id, COUNT(*) AS comment_count
             FROM comments
             WHERE post_id = ? AND deleted_at IS NULL
             GROUP BY post_id
           ) cc ON cc.post_id = p.id
           LEFT JOIN (
             SELECT post_id, 1 AS user_liked
             FROM post_likes
             WHERE post_id = ? AND user_id = ?
             LIMIT 1
           ) ul ON ul.post_id = p.id
           WHERE p.id = ?`,
          [id, id, id, likeUserParam, id]
        );
      } else {
        throw e;
      }
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在' });
    }
    const merged = mergePostRows(rows, { user: user || {} });
    let post = merged[0];
    if (!post) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已隐藏' });
    }
    if (rows[0].deleted_at) {
      return res.status(404).json({ status: -1, message: '帖子已删除' });
    }
    const [enriched] = await enrichPostsWithTags([post]);
    post = enriched;
    simpleCache.set(cacheKey, post, 10 * 1000);
    res.status(200).json({ status: 0, message: '获取成功', data: post });
  } catch (e) {
    console.error('帖子详情错误:', e);
    const msg = process.env.NODE_ENV === 'development' ? (e.message || String(e)) : '服务器错误，请稍后重试';
    res.status(500).json({ status: -1, message: msg });
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][POST_DELETE]', {
      userId: req.user.id,
      role: req.user.role,
      postId: id,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'POST_DELETE',
      targetType: 'post',
      targetId: id,
      ip,
      userAgent: ua,
    });
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][ADMIN_POST_HIDE]', {
      userId: req.user.id,
      role: req.user.role,
      postId: id,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'ADMIN_POST_HIDE',
      targetType: 'post',
      targetId: id,
      ip,
      userAgent: ua,
    });
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
    const [postAuthor] = await query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    const authorId = postAuthor && postAuthor.user_id;

    const existing = await query('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    if (existing && existing.length > 0) {
      await query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      let expResult = null;
      if (authorId && authorId !== req.user.id) {
        expResult = await revokeByRef(req.user.id, {
          action: 'like',
          refType: 'treehole_post',
          refId: postId,
        });
      }
      return res.status(200).json(attachExp({
        status: 0,
        message: '已取消点赞',
        data: { post_id: postId, liked: false },
      }, expResult));
    }
    await query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
    let expResult = null;
    if (authorId && authorId !== req.user.id) {
      expResult = await grantExp(req.user.id, {
        action: 'like',
        refType: 'treehole_post',
        refId: postId,
      });
      await checkAndGrantPostPopularRewards('treehole', postId, authorId);
    }
    if (authorId && authorId !== req.user.id) {
      await query(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [authorId, 'like', postId, req.user.id]
      );
    }
    res.status(200).json(attachExp({
      status: 0,
      message: '点赞成功！',
      data: { post_id: postId, liked: true },
    }, expResult));
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
    const cacheKey = `post_comments_v1:${postId}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: '获取成功', data: cached });
    }
    const rows = await query(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.deleted_at, c.created_at,
        u.username, u.nickname, u.avatar, u.level, u.badge
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
      author: {
        username: t.username,
        nickname: t.nickname,
        avatar: assetUrl(t.avatar),
        ...formatAuthorLevel({ level: t.level, badge: t.badge }),
      },
      replies: replies.filter((r) => r.parent_id === t.id).map((r) => ({
        ...r,
        author: {
          username: r.username,
          nickname: r.nickname,
          avatar: assetUrl(r.avatar),
          ...formatAuthorLevel({ level: r.level, badge: r.badge }),
        },
      })),
    }));
    simpleCache.set(cacheKey, list, 10 * 1000);
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
    const safeContent = cleanText(content);
    if (!postId) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    if (!safeContent) {
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
      [postId, req.user.id, parentIdNum, safeContent]
    );
    // 通知帖子作者（排除自己评论）
    const [postRow] = await query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postRow && postRow.user_id && postRow.user_id !== req.user.id) {
      await query(
        'INSERT INTO notifications (user_id, type, post_id, comment_id, from_user_id, extra) VALUES (?, ?, ?, ?, ?, ?)',
        [postRow.user_id, 'comment', postId, result.insertId, req.user.id, JSON.stringify({ content: String(content).trim().slice(0, 80) })]
      );
    }
    simpleCache.delete(`post_comments_v1:${postId}`);
    // 详情缓存按 viewer 维度，评论写入后不强依赖立刻更新；短 TTL 下自然过期即可
    const rows = await query(
      'SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.nickname, u.avatar, u.level, u.badge FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [result.insertId]
    );
    const row = rows && rows[0];
    const data = row ? {
      ...row,
      author: {
        username: row.username,
        nickname: row.nickname,
        avatar: assetUrl(row.avatar),
        ...formatAuthorLevel({ level: row.level, badge: row.badge }),
      },
    } : { id: result.insertId, content: safeContent, created_at: new Date().toISOString() };

    let expResult = null;
    if (postRow && postRow.user_id !== req.user.id && isCommentEligible(safeContent)) {
      expResult = await grantExp(req.user.id, {
        action: 'comment',
        refType: 'treehole_post',
        refId: postId,
      });
      await checkAndGrantPostPopularRewards('treehole', postId, postRow.user_id);
    }

    res.status(200).json(attachExp({ status: 0, message: '评论成功！', data }, expResult));
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][COMMENT_DELETE]', {
      userId: req.user.id,
      role: req.user.role,
      commentId,
      postId,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'COMMENT_DELETE',
      targetType: 'comment',
      targetId: commentId,
      ip,
      userAgent: ua,
      meta: { postId },
    });
    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('删除评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
