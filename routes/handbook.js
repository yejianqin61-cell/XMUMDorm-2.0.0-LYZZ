/**
 * ============================================
 * Square · 新生手册（Handbook）API
 * ============================================
 * - 普通用户可投稿（默认 draft）
 * - admin 可发布/隐藏/管理全站内容
 * - 富文本：Markdown（前端负责 TOC；后端只存储与返回）
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { assetUrl } = require('../utils/assets');
const { simpleCache } = require('../utils/simpleCache');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer, guessContentType, isObjectStorageConfigured } = require('../services/objectStorage');

// -------------------- helpers --------------------
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

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

function cleanText(input, maxLen) {
  const raw = input == null ? '' : String(input);
  const s = raw.trim();
  if (!maxLen) return s;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function ensureUploadsDir(relDir) {
  const dir = path.join(process.cwd(), 'uploads', relDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// -------------------- cache --------------------
const TABS_TTL = 60 * 60 * 1000;
const TAGS_TTL = 60 * 60 * 1000;

// ============================================
// Tabs / Tags（公开读）
// ============================================
router.get('/tabs', async (req, res) => {
  try {
    const rows = await simpleCache.getOrSet('handbook:tabs:v1', TABS_TTL, async () => {
      return await query(
        `SELECT id, slug, name_zh, name_en, sort_order
         FROM handbook_tabs
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, id ASC`
      );
    });
    res.status(200).json({ status: 0, message: 'ok', data: rows || [] });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 handbook 表，请先执行 migrations/017_handbook.sql' });
    }
    console.error('handbook tabs error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/tags', async (req, res) => {
  try {
    const rows = await simpleCache.getOrSet('handbook:tags:v1', TAGS_TTL, async () => {
      return await query(
        `SELECT id, slug, name_zh, name_en, sort_order
         FROM handbook_tags
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, id ASC`
      );
    });
    res.status(200).json({ status: 0, message: 'ok', data: rows || [] });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 handbook 表，请先执行 migrations/017_handbook.sql' });
    }
    console.error('handbook tags error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Tags 管理（admin）
// ============================================
router.post('/tags', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    const slug = cleanText(req.body && req.body.slug, 80);
    const nameZh = cleanText(req.body && req.body.name_zh, 100);
    const nameEn = cleanText(req.body && req.body.name_en, 100);
    const sortOrder = clamp(toInt(req.body && req.body.sort_order, 0), 0, 9999);
    if (!slug) return res.status(400).json({ status: -1, message: 'slug 不能为空' });
    if (!nameZh || !nameEn) return res.status(400).json({ status: -1, message: 'name_zh 与 name_en 必填' });

    const result = await query(
      'INSERT INTO handbook_tags (slug, name_zh, name_en, sort_order, is_enabled) VALUES (?, ?, ?, ?, 1)',
      [slug, nameZh, nameEn, sortOrder]
    );
    simpleCache.delete('handbook:tags:v1');
    res.status(200).json({ status: 0, message: 'ok', data: { id: result.insertId, slug } });
  } catch (e) {
    const msg = String(e && (e.code || e.message || '') || '');
    if (msg.includes('ER_DUP_ENTRY')) {
      return res.status(400).json({ status: -1, message: 'slug 已存在' });
    }
    console.error('handbook tag create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/tags/:id', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'tag id 无效' });
    const nameZh = req.body && req.body.name_zh != null ? cleanText(req.body.name_zh, 100) : undefined;
    const nameEn = req.body && req.body.name_en != null ? cleanText(req.body.name_en, 100) : undefined;
    const sortOrder = req.body && req.body.sort_order != null ? clamp(toInt(req.body.sort_order, 0), 0, 9999) : undefined;
    const isEnabled =
      req.body && req.body.is_enabled != null ? (String(req.body.is_enabled) === '1' || req.body.is_enabled === true ? 1 : 0) : undefined;

    const fields = [];
    const params = [];
    if (nameZh !== undefined) { fields.push('name_zh = ?'); params.push(nameZh); }
    if (nameEn !== undefined) { fields.push('name_en = ?'); params.push(nameEn); }
    if (sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(sortOrder); }
    if (isEnabled !== undefined) { fields.push('is_enabled = ?'); params.push(isEnabled); }
    if (fields.length === 0) return res.status(400).json({ status: -1, message: '没有可更新字段' });

    params.push(id);
    await query(`UPDATE handbook_tags SET ${fields.join(', ')} WHERE id = ?`, params);
    simpleCache.delete('handbook:tags:v1');
    res.status(200).json({ status: 0, message: 'ok', data: { id } });
  } catch (e) {
    console.error('handbook tag update error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/tags/:id', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'tag id 无效' });
    await query('UPDATE handbook_tags SET is_enabled = 0 WHERE id = ?', [id]);
    simpleCache.delete('handbook:tags:v1');
    res.status(200).json({ status: 0, message: 'ok', data: { id } });
  } catch (e) {
    console.error('handbook tag delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Articles 列表（公开读；可选登录态附加 liked/saved）
// query:
// - tab=all|freshman-guide|...
// - tag=<tagSlug>
// - q=<keyword>
// - sort=new|hot
// - includeMine=1（登录后看自己的 draft/hidden）
// - includeDraft=1（仅 admin，看全站含 draft/hidden）
// ============================================
router.get('/articles', async (req, res) => {
  try {
    const user = parseOptionalUser(req);
    const viewerUid = user && user.id != null ? Number(user.id) : 0;
    const viewerId = Number.isFinite(viewerUid) && viewerUid > 0 ? viewerUid : 0;
    const isViewerAdmin = !!(user && user.role === 'admin');

    const page = clamp(toInt(req.query.page, 1), 1, 9999);
    const pageSize = clamp(toInt(req.query.pageSize, 10), 1, 30);
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;

    const tabSlug = cleanText(req.query.tab, 40);
    const tagSlug = cleanText(req.query.tag, 80);
    const qRaw = cleanText(req.query.q, 200);
    const sort = cleanText(req.query.sort, 20) || 'new';
    const includeMine = String(req.query.includeMine || '') === '1';
    const includeDraft = String(req.query.includeDraft || '') === '1';

    let where = 'a.deleted_at IS NULL';
    const params = [viewerId, viewerId];

    if (includeDraft && isViewerAdmin) {
      // admin sees all
    } else if (includeMine && viewerId > 0) {
      where += " AND (a.status = 'published' OR a.author_user_id = ?)";
      params.push(viewerId);
    } else {
      where += " AND a.status = 'published'";
    }

    if (tabSlug && tabSlug !== 'all') {
      where += ' AND t.slug = ?';
      params.push(tabSlug);
    }

    if (tagSlug) {
      where +=
        ' AND EXISTS (SELECT 1 FROM handbook_article_tag_map atm INNER JOIN handbook_tags ht ON ht.id = atm.tag_id WHERE atm.article_id = a.id AND ht.slug = ?)';
      params.push(tagSlug);
    }

    if (qRaw) {
      const safe = qRaw.replace(/[%_\\]/g, '');
      if (safe) {
        where += ' AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)';
        params.push(`%${safe}%`, `%${safe}%`, `%${safe}%`);
      }
    }

    let orderBy = 'a.published_at DESC, a.id DESC';
    if (sort === 'hot') {
      orderBy = '(a.likes_count * 8 + a.saves_count * 10 + a.views_count) DESC, a.published_at DESC, a.id DESC';
    }

    const rows = await query(
      `SELECT
        a.id, a.title, a.summary, a.cover_path, a.status, a.published_at, a.created_at, a.updated_at,
        a.views_count, a.likes_count, a.saves_count,
        t.slug AS tab_slug,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
        (SELECT 1 FROM handbook_article_likes l WHERE l.article_id = a.id AND l.user_id = ? LIMIT 1) AS viewer_liked,
        (SELECT 1 FROM handbook_article_saves s WHERE s.article_id = a.id AND s.user_id = ? LIMIT 1) AS viewer_saved
       FROM handbook_articles a
       INNER JOIN handbook_tabs t ON t.id = a.tab_id
       LEFT JOIN users u ON u.id = a.author_user_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ${limitCount} OFFSET ${offset}`,
      params
    );

    const hasMore = (rows || []).length > pageSize;
    const list = (rows || [])
      .slice(0, pageSize)
      .map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        cover: r.cover_path ? assetUrl(r.cover_path, r.updated_at) : null,
        tab: r.tab_slug,
        tags: [],
        author: r.author_id
          ? { id: r.author_id, username: r.author_username, nickname: r.author_nickname, avatar: assetUrl(r.author_avatar) }
          : null,
        stats: { views: Number(r.views_count || 0), likes: Number(r.likes_count || 0), saves: Number(r.saves_count || 0) },
        viewer: { liked: !!r.viewer_liked, saved: !!r.viewer_saved },
        status: r.status,
        published_at: r.published_at,
        created_at: r.created_at,
      }));

    res.status(200).json({ status: 0, message: 'ok', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 handbook 表，请先执行 migrations/017_handbook.sql' });
    }
    console.error('handbook list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Article 详情（公开读；published 自动 views +1）
// ============================================
router.get('/articles/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });

    const user = parseOptionalUser(req);
    const viewerUid = user && user.id != null ? Number(user.id) : 0;
    const viewerId = Number.isFinite(viewerUid) && viewerUid > 0 ? viewerUid : 0;
    const viewerIsAdmin = !!(user && user.role === 'admin');

    const rows = await query(
      `SELECT
        a.id, a.title, a.summary, a.cover_path, a.content, a.source_name, a.source_link,
        a.status, a.published_at, a.created_at, a.updated_at,
        a.views_count, a.likes_count, a.saves_count, a.shares_count,
        t.slug AS tab_slug,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar,
        (SELECT 1 FROM handbook_article_likes l WHERE l.article_id = a.id AND l.user_id = ? LIMIT 1) AS viewer_liked,
        (SELECT 1 FROM handbook_article_saves s WHERE s.article_id = a.id AND s.user_id = ? LIMIT 1) AS viewer_saved
       FROM handbook_articles a
       INNER JOIN handbook_tabs t ON t.id = a.tab_id
       LEFT JOIN users u ON u.id = a.author_user_id
       WHERE a.id = ? AND a.deleted_at IS NULL
       LIMIT 1`,
      [viewerId, viewerId, id]
    );
    const row = rows && rows[0];
    if (!row) return res.status(404).json({ status: -1, message: '文章不存在' });

    const canView =
      row.status === 'published' || viewerIsAdmin || (viewerId > 0 && Number(row.author_id) === viewerId);
    if (!canView) return res.status(404).json({ status: -1, message: '文章不存在或未发布' });

    const tagRows = await query(
      `SELECT ht.id, ht.slug, ht.name_zh, ht.name_en
       FROM handbook_article_tag_map atm
       INNER JOIN handbook_tags ht ON ht.id = atm.tag_id
       WHERE atm.article_id = ?
       ORDER BY ht.sort_order ASC, ht.id ASC`,
      [id]
    );

    if (row.status === 'published') {
      query('UPDATE handbook_articles SET views_count = views_count + 1 WHERE id = ?', [id]).catch(() => {});
    }

    res.status(200).json({
      status: 0,
      message: 'ok',
      data: {
        id: row.id,
        tab: row.tab_slug,
        title: row.title,
        summary: row.summary,
        cover: row.cover_path ? assetUrl(row.cover_path, row.updated_at) : null,
        content: row.content,
        tags: (tagRows || []).map((t) => ({ id: t.id, slug: t.slug, name_zh: t.name_zh, name_en: t.name_en })),
        authorInfo: row.author_id
          ? { id: row.author_id, username: row.author_username, nickname: row.author_nickname, avatar: assetUrl(row.author_avatar) }
          : null,
        sourceName: row.source_name || null,
        sourceLink: row.source_link || null,
        status: row.status,
        published_at: row.published_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        stats: {
          views: Number(row.views_count || 0),
          likes: Number(row.likes_count || 0),
          saves: Number(row.saves_count || 0),
          shares: Number(row.shares_count || 0),
        },
        viewer: { liked: !!row.viewer_liked, saved: !!row.viewer_saved },
        actions: { like: true, save: true, share: true },
      },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 handbook 表，请先执行 migrations/017_handbook.sql' });
    }
    console.error('handbook detail error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 投稿/管理：创建、更新、删除（登录）
// - 普通用户：创建= draft；更新仅限自己；不允许 publish/hidden
// - admin：可设置 status=draft/published/hidden，可管理任意文章
// ============================================
router.post('/articles', authenticateToken, async (req, res) => {
  try {
    const title = cleanText(req.body && req.body.title, 200);
    const summary = cleanText(req.body && req.body.summary, 400) || null;
    const content = String(req.body && req.body.content ? req.body.content : '').trim();
    const tabSlug = cleanText(req.body && req.body.tab, 40);
    const coverPath = cleanText(req.body && req.body.cover_path, 500) || null;
    const sourceName = cleanText(req.body && req.body.source_name, 120) || null;
    const sourceLink = cleanText(req.body && req.body.source_link, 600) || null;
    const tagIds = Array.isArray(req.body && req.body.tag_ids) ? req.body.tag_ids : [];

    if (!title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    if (!content) return res.status(400).json({ status: -1, message: '内容不能为空' });
    if (!tabSlug) return res.status(400).json({ status: -1, message: 'tab 不能为空' });

    const tabRows = await query('SELECT id FROM handbook_tabs WHERE slug = ? AND is_enabled = 1 LIMIT 1', [tabSlug]);
    const tab = tabRows && tabRows[0];
    if (!tab) return res.status(400).json({ status: -1, message: 'tab 无效' });

    const admin = isAdmin(req);
    const requestedStatus = cleanText(req.body && req.body.status, 20);
    // 允许普通用户直接发布：draft/published；hidden 仅 admin
    let status = 'draft';
    if (requestedStatus === 'draft' || requestedStatus === 'published') status = requestedStatus;
    if (admin && requestedStatus === 'hidden') status = 'hidden';
    const publishedAt = status === 'published' ? new Date() : null;

    const result = await query(
      `INSERT INTO handbook_articles
        (tab_id, author_user_id, title, summary, cover_path, content, source_name, source_link, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tab.id, req.user.id, title, summary, coverPath, content, sourceName, sourceLink, status, publishedAt]
    );
    const articleId = result.insertId;

    const uniq = [...new Set((tagIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 20);
    if (uniq.length > 0) {
      const ph = uniq.map(() => '?').join(',');
      const found = await query(`SELECT id FROM handbook_tags WHERE id IN (${ph}) AND is_enabled = 1`, uniq);
      const foundIds = new Set((found || []).map((r) => r.id));
      const ok = uniq.filter((tid) => foundIds.has(tid));
      if (ok.length > 0) {
        const placeholders = ok.map(() => '(?, ?)').join(',');
        const ps = [];
        ok.forEach((tid) => ps.push(articleId, tid));
        await query(`INSERT INTO handbook_article_tag_map (article_id, tag_id) VALUES ${placeholders}`, ps);
      }
    }

    res.status(200).json({ status: 0, message: admin ? '已创建' : '已投稿（草稿）', data: { id: articleId, status } });
  } catch (e) {
    console.error('handbook create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/articles/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });

    const rows = await query('SELECT id, author_user_id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const cur = rows && rows[0];
    if (!cur) return res.status(404).json({ status: -1, message: '文章不存在' });

    const admin = isAdmin(req);
    const isOwner = Number(cur.author_user_id) === Number(req.user.id);
    if (!admin && !isOwner) return res.status(403).json({ status: -1, message: '无权限' });

    const title = req.body && req.body.title != null ? cleanText(req.body.title, 200) : undefined;
    const summary = req.body && req.body.summary != null ? cleanText(req.body.summary, 400) : undefined;
    const content = req.body && req.body.content != null ? String(req.body.content).trim() : undefined;
    const tabSlug = req.body && req.body.tab != null ? cleanText(req.body.tab, 40) : undefined;
    const coverPath = req.body && req.body.cover_path != null ? cleanText(req.body.cover_path, 500) : undefined;
    const sourceName = req.body && req.body.source_name != null ? cleanText(req.body.source_name, 120) : undefined;
    const sourceLink = req.body && req.body.source_link != null ? cleanText(req.body.source_link, 600) : undefined;
    const tagIds = req.body && req.body.tag_ids != null ? (Array.isArray(req.body.tag_ids) ? req.body.tag_ids : []) : undefined;

    let tabId = undefined;
    if (tabSlug !== undefined) {
      const tabRows = await query('SELECT id FROM handbook_tabs WHERE slug = ? AND is_enabled = 1 LIMIT 1', [tabSlug]);
      const tab = tabRows && tabRows[0];
      if (!tab) return res.status(400).json({ status: -1, message: 'tab 无效' });
      tabId = tab.id;
    }

    let status = undefined;
    let publishedAt = undefined;
    if (req.body && req.body.status != null) {
      const requested = cleanText(req.body.status, 20);
      // 允许普通用户直接发布/撤回（draft/published），但 hidden 仅 admin
      if (requested === 'draft' || requested === 'published') {
        status = requested;
        publishedAt = requested === 'published' ? new Date() : null;
      } else if (admin && requested === 'hidden') {
        status = 'hidden';
        publishedAt = null;
      }
    }

    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (summary !== undefined) { fields.push('summary = ?'); params.push(summary || null); }
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (tabId !== undefined) { fields.push('tab_id = ?'); params.push(tabId); }
    if (coverPath !== undefined) { fields.push('cover_path = ?'); params.push(coverPath || null); }
    if (sourceName !== undefined) { fields.push('source_name = ?'); params.push(sourceName || null); }
    if (sourceLink !== undefined) { fields.push('source_link = ?'); params.push(sourceLink || null); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (publishedAt !== undefined) { fields.push('published_at = ?'); params.push(publishedAt); }

    if (fields.length > 0) {
      params.push(id);
      await query(`UPDATE handbook_articles SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    if (tagIds !== undefined) {
      await query('DELETE FROM handbook_article_tag_map WHERE article_id = ?', [id]);
      const uniq = [...new Set((tagIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 20);
      if (uniq.length > 0) {
        const ph = uniq.map(() => '?').join(',');
        const found = await query(`SELECT id FROM handbook_tags WHERE id IN (${ph}) AND is_enabled = 1`, uniq);
        const foundIds = new Set((found || []).map((r) => r.id));
        const ok = uniq.filter((tid) => foundIds.has(tid));
        if (ok.length > 0) {
          const placeholders = ok.map(() => '(?, ?)').join(',');
          const ps = [];
          ok.forEach((tid) => ps.push(id, tid));
          await query(`INSERT INTO handbook_article_tag_map (article_id, tag_id) VALUES ${placeholders}`, ps);
        }
      }
    }

    res.status(200).json({ status: 0, message: '已更新', data: { id } });
  } catch (e) {
    console.error('handbook update error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/articles/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const rows = await query('SELECT id, author_user_id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const cur = rows && rows[0];
    if (!cur) return res.status(404).json({ status: -1, message: '文章不存在' });
    const admin = isAdmin(req);
    const isOwner = Number(cur.author_user_id) === Number(req.user.id);
    if (!admin && !isOwner) return res.status(403).json({ status: -1, message: '无权限' });
    await query('UPDATE handbook_articles SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '已删除', data: { id } });
  } catch (e) {
    console.error('handbook delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Like / Save / Share（登录）
// ============================================
router.post('/articles/:id/like', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const rows = await query("SELECT id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '文章不存在或未发布' });

    const existing = await query('SELECT 1 FROM handbook_article_likes WHERE user_id = ? AND article_id = ? LIMIT 1', [req.user.id, id]);
    if (existing && existing.length > 0) {
      await query('DELETE FROM handbook_article_likes WHERE user_id = ? AND article_id = ?', [req.user.id, id]);
      await query('UPDATE handbook_articles SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [id]);
      return res.status(200).json({ status: 0, message: 'ok', data: { article_id: id, liked: false } });
    }
    await query('INSERT INTO handbook_article_likes (user_id, article_id) VALUES (?, ?)', [req.user.id, id]);
    await query('UPDATE handbook_articles SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { article_id: id, liked: true } });
  } catch (e) {
    console.error('handbook like error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/articles/:id/save', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const rows = await query("SELECT id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '文章不存在或未发布' });

    const existing = await query('SELECT 1 FROM handbook_article_saves WHERE user_id = ? AND article_id = ? LIMIT 1', [req.user.id, id]);
    if (existing && existing.length > 0) {
      await query('DELETE FROM handbook_article_saves WHERE user_id = ? AND article_id = ?', [req.user.id, id]);
      await query('UPDATE handbook_articles SET saves_count = GREATEST(0, saves_count - 1) WHERE id = ?', [id]);
      return res.status(200).json({ status: 0, message: 'ok', data: { article_id: id, saved: false } });
    }
    await query('INSERT INTO handbook_article_saves (user_id, article_id) VALUES (?, ?)', [req.user.id, id]);
    await query('UPDATE handbook_articles SET saves_count = saves_count + 1 WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { article_id: id, saved: true } });
  } catch (e) {
    console.error('handbook save error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/articles/:id/share', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const rows = await query("SELECT id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '文章不存在或未发布' });
    await query('UPDATE handbook_articles SET shares_count = shares_count + 1 WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { article_id: id } });
  } catch (e) {
    console.error('handbook share error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Comments（读/写）
// ============================================
router.get('/articles/:id/comments', async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const aRows = await query('SELECT id, status, author_user_id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const a = aRows && aRows[0];
    if (!a) return res.status(404).json({ status: -1, message: '文章不存在' });

    const user = parseOptionalUser(req);
    const viewerUid = user && user.id != null ? Number(user.id) : 0;
    const viewerId = Number.isFinite(viewerUid) && viewerUid > 0 ? viewerUid : 0;
    const canView = a.status === 'published' || (user && user.role === 'admin') || (viewerId > 0 && viewerId === Number(a.author_user_id));
    if (!canView) return res.status(404).json({ status: -1, message: '文章不存在或未发布' });

    const list = await query(
      `SELECT c.id, c.article_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.username, u.nickname, u.avatar
       FROM handbook_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.article_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [id]
    );

    const top = (list || []).filter((r) => r.parent_id == null);
    const replies = (list || []).filter((r) => r.parent_id != null);
    const out = top.map((t) => ({
      id: t.id,
      article_id: t.article_id,
      user_id: t.user_id,
      parent_id: null,
      content: t.content,
      created_at: t.created_at,
      author: { username: t.username, nickname: t.nickname, avatar: assetUrl(t.avatar) },
      replies: replies
        .filter((r) => r.parent_id === t.id)
        .map((r) => ({
          id: r.id,
          article_id: r.article_id,
          user_id: r.user_id,
          parent_id: r.parent_id,
          content: r.content,
          created_at: r.created_at,
          author: { username: r.username, nickname: r.nickname, avatar: assetUrl(r.avatar) },
        })),
    }));

    res.status(200).json({ status: 0, message: 'ok', data: out });
  } catch (e) {
    console.error('handbook comments list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/articles/:id/comments', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '文章 ID 无效' });
    const content = cleanText(req.body && req.body.content, 800);
    if (!content) return res.status(400).json({ status: -1, message: '评论内容不能为空' });
    const parentIdRaw = req.body && req.body.parent_id != null ? toInt(req.body.parent_id, null) : null;

    const aRows = await query('SELECT id, status, author_user_id FROM handbook_articles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const a = aRows && aRows[0];
    if (!a) return res.status(404).json({ status: -1, message: '文章不存在' });

    const admin = isAdmin(req);
    const isOwner = Number(a.author_user_id) === Number(req.user.id);
    if (a.status !== 'published' && !admin && !isOwner) {
      return res.status(403).json({ status: -1, message: '文章未发布，暂无权限评论' });
    }

    let parentId = null;
    if (parentIdRaw != null) {
      const parentRows = await query(
        'SELECT id, parent_id FROM handbook_comments WHERE id = ? AND article_id = ? AND deleted_at IS NULL LIMIT 1',
        [parentIdRaw, id]
      );
      const p = parentRows && parentRows[0];
      if (!p) return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      if (p.parent_id != null) return res.status(400).json({ status: -1, message: '仅支持二级评论' });
      parentId = p.id;
    }

    const result = await query(
      'INSERT INTO handbook_comments (article_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [id, req.user.id, parentId, content]
    );

    res.status(200).json({
      status: 0,
      message: 'ok',
      data: { id: result.insertId, article_id: id, user_id: req.user.id, parent_id: parentId, content, created_at: new Date().toISOString() },
    });
  } catch (e) {
    console.error('handbook comment create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/articles/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const articleId = toInt(req.params.id, 0);
    const commentId = toInt(req.params.commentId, 0);
    if (!articleId || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });

    const rows = await query(
      'SELECT id, user_id FROM handbook_comments WHERE id = ? AND article_id = ? AND deleted_at IS NULL LIMIT 1',
      [commentId, articleId]
    );
    const c = rows && rows[0];
    if (!c) return res.status(404).json({ status: -1, message: '评论不存在' });
    if (!isAdmin(req) && Number(c.user_id) !== Number(req.user.id)) return res.status(403).json({ status: -1, message: '无权限' });

    await query('UPDATE handbook_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    res.status(200).json({ status: 0, message: '已删除', data: { id: commentId } });
  } catch (e) {
    console.error('handbook comment delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Collections：Saved Articles（登录）
// ============================================
router.get('/me/saved', authenticateToken, async (req, res) => {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 9999);
    const pageSize = clamp(toInt(req.query.pageSize, 10), 1, 30);
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;

    const rows = await query(
      `SELECT
        a.id, a.title, a.summary, a.cover_path, a.published_at, a.updated_at,
        a.views_count, a.likes_count, a.saves_count,
        t.slug AS tab_slug,
        u.id AS author_id, u.username AS author_username, u.nickname AS author_nickname, u.avatar AS author_avatar
       FROM handbook_article_saves s
       INNER JOIN handbook_articles a ON a.id = s.article_id
       INNER JOIN handbook_tabs t ON t.id = a.tab_id
       LEFT JOIN users u ON u.id = a.author_user_id
       WHERE s.user_id = ? AND a.deleted_at IS NULL AND a.status = 'published'
       ORDER BY s.created_at DESC
       LIMIT ${limitCount} OFFSET ${offset}`,
      [req.user.id]
    );

    const hasMore = (rows || []).length > pageSize;
    const list = (rows || []).slice(0, pageSize).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      cover: r.cover_path ? assetUrl(r.cover_path, r.updated_at) : null,
      tab: r.tab_slug,
      tags: [],
      author: r.author_id
        ? { id: r.author_id, username: r.author_username, nickname: r.author_nickname, avatar: assetUrl(r.author_avatar) }
        : null,
      stats: { views: Number(r.views_count || 0), likes: Number(r.likes_count || 0), saves: Number(r.saves_count || 0) },
      viewer: { liked: false, saved: true },
      published_at: r.published_at,
    }));

    res.status(200).json({ status: 0, message: 'ok', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    console.error('handbook me saved error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Checklist（登录）
// ============================================
router.get('/me/checklists', authenticateToken, async (req, res) => {
  try {
    const lists = await query(
      'SELECT id, title, created_at, updated_at FROM handbook_checklists WHERE user_id = ? ORDER BY updated_at DESC, id DESC',
      [req.user.id]
    );
    const ids = (lists || []).map((x) => x.id);
    let items = [];
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',');
      items = await query(
        `SELECT id, checklist_id, content, is_done, sort_order, created_at, updated_at
         FROM handbook_checklist_items
         WHERE checklist_id IN (${ph})
         ORDER BY checklist_id ASC, sort_order ASC, id ASC`,
        ids
      );
    }
    const by = {};
    ids.forEach((id) => { by[id] = []; });
    (items || []).forEach((it) => {
      if (!by[it.checklist_id]) by[it.checklist_id] = [];
      by[it.checklist_id].push({
        id: it.id,
        content: it.content,
        is_done: !!it.is_done,
        sort_order: Number(it.sort_order || 0),
        created_at: it.created_at,
        updated_at: it.updated_at,
      });
    });
    const out = (lists || []).map((c) => ({
      id: c.id,
      title: c.title,
      items: by[c.id] || [],
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
    res.status(200).json({ status: 0, message: 'ok', data: out });
  } catch (e) {
    console.error('handbook checklists list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/me/checklists', authenticateToken, async (req, res) => {
  try {
    const title = cleanText(req.body && req.body.title, 120);
    if (!title) return res.status(400).json({ status: -1, message: 'title 不能为空' });
    const result = await query('INSERT INTO handbook_checklists (user_id, title) VALUES (?, ?)', [req.user.id, title]);
    res.status(200).json({ status: 0, message: 'ok', data: { id: result.insertId, title } });
  } catch (e) {
    console.error('handbook checklist create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/me/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'checklist id 无效' });
    const title = cleanText(req.body && req.body.title, 120);
    if (!title) return res.status(400).json({ status: -1, message: 'title 不能为空' });
    const rows = await query('SELECT id FROM handbook_checklists WHERE id = ? AND user_id = ? LIMIT 1', [id, req.user.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: 'checklist 不存在' });
    await query('UPDATE handbook_checklists SET title = ? WHERE id = ?', [title, id]);
    res.status(200).json({ status: 0, message: 'ok', data: { id, title } });
  } catch (e) {
    console.error('handbook checklist update error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/me/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'checklist id 无效' });
    const rows = await query('SELECT id FROM handbook_checklists WHERE id = ? AND user_id = ? LIMIT 1', [id, req.user.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: 'checklist 不存在' });
    await query('DELETE FROM handbook_checklists WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { id } });
  } catch (e) {
    console.error('handbook checklist delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/me/checklists/:id/items', authenticateToken, async (req, res) => {
  try {
    const checklistId = toInt(req.params.id, 0);
    if (!checklistId) return res.status(400).json({ status: -1, message: 'checklist id 无效' });
    const content = cleanText(req.body && req.body.content, 300);
    if (!content) return res.status(400).json({ status: -1, message: 'content 不能为空' });
    const sortOrder = clamp(toInt(req.body && req.body.sort_order, 0), 0, 999999);
    const rows = await query('SELECT id FROM handbook_checklists WHERE id = ? AND user_id = ? LIMIT 1', [checklistId, req.user.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: 'checklist 不存在' });
    const result = await query(
      'INSERT INTO handbook_checklist_items (checklist_id, content, is_done, sort_order) VALUES (?, ?, 0, ?)',
      [checklistId, content, sortOrder]
    );
    res.status(200).json({ status: 0, message: 'ok', data: { id: result.insertId, checklist_id: checklistId, content, is_done: false, sort_order: sortOrder } });
  } catch (e) {
    console.error('handbook checklist item create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/me/checklists/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const checklistId = toInt(req.params.id, 0);
    const itemId = toInt(req.params.itemId, 0);
    if (!checklistId || !itemId) return res.status(400).json({ status: -1, message: '参数无效' });
    const content = req.body && req.body.content != null ? cleanText(req.body.content, 300) : undefined;
    const isDone = req.body && req.body.is_done != null ? (String(req.body.is_done) === '1' || req.body.is_done === true ? 1 : 0) : undefined;
    const sortOrder = req.body && req.body.sort_order != null ? clamp(toInt(req.body.sort_order, 0), 0, 999999) : undefined;

    const owns = await query('SELECT id FROM handbook_checklists WHERE id = ? AND user_id = ? LIMIT 1', [checklistId, req.user.id]);
    if (!owns || owns.length === 0) return res.status(404).json({ status: -1, message: 'checklist 不存在' });

    const fields = [];
    const params = [];
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (isDone !== undefined) { fields.push('is_done = ?'); params.push(isDone); }
    if (sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(sortOrder); }
    if (fields.length === 0) return res.status(400).json({ status: -1, message: '没有可更新字段' });

    params.push(itemId, checklistId);
    const result = await query(`UPDATE handbook_checklist_items SET ${fields.join(', ')} WHERE id = ? AND checklist_id = ?`, params);
    if (result && result.affectedRows === 0) return res.status(404).json({ status: -1, message: 'item 不存在' });
    res.status(200).json({ status: 0, message: 'ok', data: { id: itemId } });
  } catch (e) {
    console.error('handbook checklist item update error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/me/checklists/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const checklistId = toInt(req.params.id, 0);
    const itemId = toInt(req.params.itemId, 0);
    if (!checklistId || !itemId) return res.status(400).json({ status: -1, message: '参数无效' });
    const owns = await query('SELECT id FROM handbook_checklists WHERE id = ? AND user_id = ? LIMIT 1', [checklistId, req.user.id]);
    if (!owns || owns.length === 0) return res.status(404).json({ status: -1, message: 'checklist 不存在' });
    const result = await query('DELETE FROM handbook_checklist_items WHERE id = ? AND checklist_id = ?', [itemId, checklistId]);
    if (result && result.affectedRows === 0) return res.status(404).json({ status: -1, message: 'item 不存在' });
    res.status(200).json({ status: 0, message: 'ok', data: { id: itemId } });
  } catch (e) {
    console.error('handbook checklist item delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// CourseReview（独立实体）
// ============================================
router.get('/course-reviews', async (req, res) => {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 9999);
    const pageSize = clamp(toInt(req.query.pageSize, 10), 1, 30);
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;
    const qRaw = cleanText(req.query.q, 120);
    const tagsRaw = cleanText(req.query.tags ?? req.query.tag, 200);
    const allowedTags = new Set(['MPU', 'GE', 'ME', 'required', 'final', 'no final']);

    let where = 'cr.deleted_at IS NULL';
    const params = [];
    if (tagsRaw) {
      const list = String(tagsRaw)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((t) => allowedTags.has(t));
      const uniq = [...new Set(list)].slice(0, 8);
      if (uniq.length > 0) {
        where += ` AND ( ${uniq.map(() => 'JSON_CONTAINS(COALESCE(cr.tags_json, JSON_ARRAY(cr.tag)), JSON_QUOTE(?))').join(' OR ')} )`;
        uniq.forEach((t) => params.push(t));
      }
    }
    if (qRaw) {
      const safe = qRaw.replace(/[%_\\]/g, '');
      if (safe) {
        where += ' AND (cr.course_name LIKE ? OR cr.teacher LIKE ?)';
        params.push(`%${safe}%`, `%${safe}%`);
      }
    }

    // 课程评价保持匿名：公开接口不返回作者信息
    const rows = await query(
      `SELECT cr.id, cr.course_name, cr.teacher, cr.tag, cr.tags_json, cr.rating, cr.difficulty, cr.comment, cr.created_by, cr.created_at, cr.updated_at,
        (SELECT COUNT(*) FROM course_review_comments c WHERE c.review_id = cr.id AND c.deleted_at IS NULL) AS comment_count,
        (SELECT AVG(r.rating) FROM course_review_ratings r WHERE r.review_id = cr.id) AS avg_rating,
        (SELECT COUNT(*) FROM course_review_ratings r WHERE r.review_id = cr.id) AS rating_count
       FROM course_reviews cr
       WHERE ${where}
       ORDER BY cr.created_at DESC, cr.id DESC
       LIMIT ${limitCount} OFFSET ${offset}`,
      params
    );

    const hasMore = (rows || []).length > pageSize;
    const list = (rows || []).slice(0, pageSize).map((r) => ({
      id: r.id,
      courseName: r.course_name,
      teacher: r.teacher,
      tags: Array.isArray(r.tags_json) ? r.tags_json : (r.tags_json ? (() => { try { return JSON.parse(r.tags_json); } catch { return null; } })() : null) || [r.tag || 'required'],
      rating: Number(r.rating || 0),
      difficulty: Number(r.difficulty || 0),
      comment: r.comment || null,
      created_at: r.created_at,
      author: null,
      stats: {
        comments: Number(r.comment_count || 0),
        avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
        ratingCount: Number(r.rating_count || 0),
      },
    }));

    res.status(200).json({ status: 0, message: 'ok', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 course_reviews 表，请先执行 migrations/017_handbook.sql' });
    }
    console.error('course reviews list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/course-reviews/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'ID 无效' });
    // 课程评价保持匿名：公开接口不返回作者信息
    const rows = await query(
      `SELECT cr.id, cr.course_name, cr.teacher, cr.tag, cr.tags_json, cr.rating, cr.difficulty, cr.comment, cr.created_by, cr.created_at, cr.updated_at,
        (SELECT AVG(r.rating) FROM course_review_ratings r WHERE r.review_id = cr.id) AS avg_rating,
        (SELECT COUNT(*) FROM course_review_ratings r WHERE r.review_id = cr.id) AS rating_count
       FROM course_reviews cr
       WHERE cr.id = ? AND cr.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    const r = rows && rows[0];
    if (!r) return res.status(404).json({ status: -1, message: '不存在' });
    res.status(200).json({
      status: 0,
      message: 'ok',
      data: {
        id: r.id,
        courseName: r.course_name,
        teacher: r.teacher,
        tags: (() => { try { return r.tags_json ? JSON.parse(r.tags_json) : null; } catch { return null; } })() || [r.tag || 'required'],
        rating: Number(r.rating || 0),
        difficulty: Number(r.difficulty || 0),
        comment: r.comment || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author: null,
        stats: {
          avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
          ratingCount: Number(r.rating_count || 0),
        },
      },
    });
  } catch (e) {
    console.error('course review detail error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/course-reviews', authenticateToken, async (req, res) => {
  try {
    const courseName = cleanText(req.body && (req.body.courseName ?? req.body.course_name), 180);
    const teacher = cleanText(req.body && req.body.teacher, 120);
    const tagsBody = req.body && (req.body.tags ?? req.body.tag);
    const rating = clamp(toInt(req.body && req.body.rating, 0), 1, 5);
    const difficulty = clamp(toInt(req.body && req.body.difficulty, 3), 1, 5);
    const comment = cleanText(req.body && (req.body.comment ?? req.body.content), 3000);
    const allowedTags = new Set(['MPU', 'GE', 'ME', 'required', 'final', 'no final']);
    if (!courseName) return res.status(400).json({ status: -1, message: 'courseName 不能为空' });
    if (!teacher) return res.status(400).json({ status: -1, message: 'teacher 不能为空' });
    const tagListRaw = Array.isArray(tagsBody)
      ? tagsBody
      : String(tagsBody || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
    const tags = [...new Set(tagListRaw.filter((t) => allowedTags.has(t)))].slice(0, 8);
    if (tags.length === 0) return res.status(400).json({ status: -1, message: 'tags 不能为空' });
    if (!rating) return res.status(400).json({ status: -1, message: 'rating 必须为 1-5' });
    if (!comment) return res.status(400).json({ status: -1, message: '评价不能为空' });
    const result = await query(
      'INSERT INTO course_reviews (course_name, teacher, tag, tags_json, rating, difficulty, comment, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [courseName, teacher, tags[0], JSON.stringify(tags), rating, difficulty, comment, req.user.id]
    );
    res.status(200).json({ status: 0, message: 'ok', data: { id: result.insertId } });
  } catch (e) {
    console.error('course review create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/me/course-reviews', authenticateToken, async (req, res) => {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 9999);
    const pageSize = clamp(toInt(req.query.pageSize, 10), 1, 30);
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;
    const tagsRaw = cleanText(req.query.tags ?? req.query.tag, 200);
    const allowedTags = new Set(['MPU', 'GE', 'ME', 'required', 'final', 'no final']);
    let where = 'cr.deleted_at IS NULL AND cr.created_by = ?';
    const params = [req.user.id];
    if (tagsRaw) {
      const list = String(tagsRaw)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((t) => allowedTags.has(t));
      const uniq = [...new Set(list)].slice(0, 8);
      if (uniq.length > 0) {
        where += ` AND ( ${uniq.map(() => 'JSON_CONTAINS(COALESCE(cr.tags_json, JSON_ARRAY(cr.tag)), JSON_QUOTE(?))').join(' OR ')} )`;
        uniq.forEach((t) => params.push(t));
      }
    }

    // 保持课程评价匿名（即使是“我的”列表，也不依赖 author 字段）
    const rows = await query(
      `SELECT cr.id, cr.course_name, cr.teacher, cr.tag, cr.tags_json, cr.rating, cr.difficulty, cr.comment, cr.created_by, cr.created_at, cr.updated_at,
        (SELECT COUNT(*) FROM course_review_comments c WHERE c.review_id = cr.id AND c.deleted_at IS NULL) AS comment_count,
        (SELECT AVG(r.rating) FROM course_review_ratings r WHERE r.review_id = cr.id) AS avg_rating,
        (SELECT COUNT(*) FROM course_review_ratings r WHERE r.review_id = cr.id) AS rating_count
       FROM course_reviews cr
       WHERE ${where}
       ORDER BY cr.created_at DESC, cr.id DESC
       LIMIT ${limitCount} OFFSET ${offset}`,
      params
    );

    const hasMore = (rows || []).length > pageSize;
    const list = (rows || []).slice(0, pageSize).map((r) => ({
      id: r.id,
      courseName: r.course_name,
      teacher: r.teacher,
      tags: (() => { try { return r.tags_json ? JSON.parse(r.tags_json) : null; } catch { return null; } })() || [r.tag || 'required'],
      rating: Number(r.rating || 0),
      difficulty: Number(r.difficulty || 0),
      comment: r.comment || null,
      created_at: r.created_at,
      author: null,
      stats: {
        comments: Number(r.comment_count || 0),
        avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
        ratingCount: Number(r.rating_count || 0),
      },
    }));

    res.status(200).json({ status: 0, message: 'ok', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    console.error('my course reviews list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/course-reviews/:id/rate', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    const rating = clamp(toInt(req.body && req.body.rating, 0), 1, 5);
    if (!id) return res.status(400).json({ status: -1, message: 'ID 无效' });
    if (!rating) return res.status(400).json({ status: -1, message: 'rating 必须为 1-5' });

    const rows = await query('SELECT id, created_by FROM course_reviews WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const r = rows && rows[0];
    if (!r) return res.status(404).json({ status: -1, message: '不存在' });
    if (Number(r.created_by) === Number(req.user.id)) return res.status(403).json({ status: -1, message: '不能给自己的课程评价评分' });

    const existing = await query('SELECT id FROM course_review_ratings WHERE review_id = ? AND user_id = ? LIMIT 1', [id, req.user.id]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ status: -1, message: '你已经评分过了' });
    }

    await query('INSERT INTO course_review_ratings (review_id, user_id, rating) VALUES (?, ?, ?)', [id, req.user.id, rating]);

    const agg = await query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM course_review_ratings WHERE review_id = ?',
      [id]
    );
    const a = agg && agg[0];
    res.status(200).json({
      status: 0,
      message: 'ok',
      data: {
        review_id: id,
        avgRating: a && a.avg_rating != null ? Number(a.avg_rating) : null,
        ratingCount: a ? Number(a.rating_count || 0) : 0,
      },
    });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: -1, message: '你已经评分过了' });
    }
    console.error('course review rate error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/course-reviews/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'ID 无效' });
    const rows = await query('SELECT id, created_by FROM course_reviews WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const r = rows && rows[0];
    if (!r) return res.status(404).json({ status: -1, message: '不存在' });
    if (!isAdmin(req) && Number(r.created_by) !== Number(req.user.id)) return res.status(403).json({ status: -1, message: '无权限' });
    await query('UPDATE course_reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { id } });
  } catch (e) {
    console.error('course review delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/course-reviews/:id/comments', async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'ID 无效' });
    const rows = await query('SELECT id FROM course_reviews WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '不存在' });
    // 课程评价评论保持匿名：不返回 user_id/作者信息
    const list = await query(
      `SELECT c.id, c.review_id, c.content, c.created_at
       FROM course_review_comments c
       WHERE c.review_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [id]
    );
    const out = (list || []).map((c) => ({
      id: c.id,
      review_id: c.review_id,
      content: c.content,
      created_at: c.created_at,
      author: null,
    }));
    res.status(200).json({ status: 0, message: 'ok', data: out });
  } catch (e) {
    console.error('course review comments list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/course-reviews/:id/comments', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'ID 无效' });
    const content = cleanText(req.body && req.body.content, 800);
    if (!content) return res.status(400).json({ status: -1, message: '内容不能为空' });
    const rows = await query('SELECT id FROM course_reviews WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '不存在' });
    const result = await query('INSERT INTO course_review_comments (review_id, user_id, content) VALUES (?, ?, ?)', [id, req.user.id, content]);
    res.status(200).json({ status: 0, message: 'ok', data: { id: result.insertId } });
  } catch (e) {
    console.error('course review comment create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/course-reviews/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const reviewId = toInt(req.params.id, 0);
    const commentId = toInt(req.params.commentId, 0);
    if (!reviewId || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });
    const rows = await query('SELECT id FROM course_reviews WHERE id = ? AND deleted_at IS NULL LIMIT 1', [reviewId]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '不存在' });
    const cr = await query('SELECT id, user_id FROM course_review_comments WHERE id = ? AND review_id = ? AND deleted_at IS NULL LIMIT 1', [commentId, reviewId]);
    const c = cr && cr[0];
    if (!c) return res.status(404).json({ status: -1, message: '评论不存在' });
    if (!isAdmin(req) && Number(c.user_id) !== Number(req.user.id)) return res.status(403).json({ status: -1, message: '无权限' });
    await query('UPDATE course_review_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    res.status(200).json({ status: 0, message: 'ok', data: { id: commentId } });
  } catch (e) {
    console.error('course review comment delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Upload 图片（用于 Markdown 内插图/封面）
// field: image
// response: { key, url }
// ============================================
const MAX_UPLOAD = 10 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const handbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp / gif 格式'));
    }
    cb(null, true);
  },
}).single('image');

router.post('/upload/image', authenticateToken, (req, res, next) => {
  handbookUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ status: -1, message: '未选择图片' });
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.jpg';

    const key = `handbook/images/user_${req.user.id}_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;
    const useObjectStorage = isObjectStorageConfigured();

    if (useObjectStorage) {
      await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, safeExt) });
    } else {
      ensureUploadsDir('handbook/images');
      const filePath = path.join(process.cwd(), 'uploads', key);
      ensureUploadsDir(path.dirname(key));
      fs.writeFileSync(filePath, file.buffer);
    }

    res.status(200).json({ status: 0, message: 'ok', data: { key, url: assetUrl(key) } });
  } catch (e) {
    console.error('handbook upload error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;

