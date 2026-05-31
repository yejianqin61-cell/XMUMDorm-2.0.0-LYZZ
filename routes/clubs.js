/**
 * ============================================
 * Clubs API (社团广场)
 * ============================================
 * Tabs:
 * - Recommend: mixed feed (activity/post)
 * - Activities
 * - ClubsList
 * - Posts
 *
 * MVP:
 * - Read-only lists + detail
 * - Like/view/follow endpoints can be added later
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const sanitizeHtml = require('sanitize-html');
const authenticateToken = require('../middleware/auth');
const { checkSanction } = require('../middleware/checkSanction');
const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');
const { createNotification, createNotificationBatch } = require('../services/notificationService');
const jwt = require('jsonwebtoken');
const { assetUrl } = require('../utils/assets');
const { uploadBuffer, guessContentType, isObjectStorageConfigured } = require('../services/objectStorage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const CLUB_CATEGORIES = new Set(['music', 'tech', 'culture', 'sport', 'art']);
const ACTIVITY_STATUS = new Set(['upcoming', 'ongoing', 'ended']);

function parseOptionalUser(req) {
  if (!req.headers.authorization) return null;
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (_) {
    return null;
  }
}

function viewerIsSiteAdmin(viewer) {
  return !!(viewer && String(viewer.role || '') === 'admin');
}

function isSiteAdmin(req) {
  return req.user && req.user.role === 'admin';
}

function cleanText(input, maxLen) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!maxLen) return cleaned;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function computeActivityStatus(startTime, endTime) {
  const now = Date.now();
  const s = startTime ? new Date(startTime).getTime() : NaN;
  const e = endTime ? new Date(endTime).getTime() : NaN;
  if (!Number.isFinite(s)) return 'upcoming';
  if (now < s) return 'upcoming';
  if (Number.isFinite(e) && now > e) return 'ended';
  return 'ongoing';
}

function computeActivityStatus2(row) {
  const override = row && row.status ? String(row.status) : '';
  if (override && ACTIVITY_STATUS.has(override)) return override;
  return computeActivityStatus(row?.start_time, row?.end_time);
}

function normalizeClubCategory(x) {
  const s = String(x || '').toLowerCase();
  return CLUB_CATEGORIES.has(s) ? s : null;
}

function normalizeActivityStatus(x) {
  const s = String(x || '').toLowerCase();
  return ACTIVITY_STATUS.has(s) ? s : null;
}

function extFromMime(mime, originalName) {
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
  const e = extMap[mime];
  if (e) return e;
  const byName = path.extname(originalName || '').toLowerCase();
  return byName || '.jpg';
}

function ensureUploadsDir(relDir) {
  const dir = path.join(process.cwd(), 'uploads', relDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 解析 JSON 图片数组（MySQL JSON：mysql2 可能返回 string | Buffer | 已解析的 Array）
 * @param {unknown} raw
 * @param {number} maxLen
 * @returns {string[]}
 */
function parseJsonImageArray(raw, maxLen) {
  if (raw == null || raw === '') return [];
  try {
    let v = raw;
    if (Buffer.isBuffer(raw)) v = JSON.parse(raw.toString('utf8'));
    else if (typeof raw === 'string') v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(Boolean).map(String).slice(0, maxLen);
  } catch {
    return [];
  }
}

const clubLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    const okExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    if (!okMime || !okExt) return cb(new Error('仅支持 jpg / png / webp / gif 格式'));
    cb(null, true);
  },
}).single('logo');

async function saveClubLogo(file, clubId) {
  if (!file || !file.buffer) return null;
  const ext = extFromMime(file.mimetype, file.originalname);
  const key = `clubs/club_${clubId}${ext}`;
  const useObjectStorage = isObjectStorageConfigured();
  if (useObjectStorage) {
    await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    return key;
  }
  ensureUploadsDir('clubs');
  const outPath = path.join(process.cwd(), 'uploads', key);
  fs.writeFileSync(outPath, file.buffer);
  return key;
}

async function saveClubPostImage(file, postId, index) {
  if (!file || !file.buffer) return null;
  const ext = extFromMime(file.mimetype, file.originalname);
  const key = `clubs/posts/cp_${postId}_${index}${ext}`;
  const useObjectStorage = isObjectStorageConfigured();
  if (useObjectStorage) {
    await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    return key;
  }
  ensureUploadsDir('clubs/posts');
  const outPath = path.join(process.cwd(), 'uploads', key);
  fs.writeFileSync(outPath, file.buffer);
  return key;
}

async function saveActivityImage(file, activityId, index) {
  if (!file || !file.buffer) return null;
  const ext = extFromMime(file.mimetype, file.originalname);
  const key = `clubs/activities/act_${activityId}_${index}${ext}`;
  const useObjectStorage = isObjectStorageConfigured();
  if (useObjectStorage) {
    await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    return key;
  }
  ensureUploadsDir('clubs/activities');
  const outPath = path.join(process.cwd(), 'uploads', key);
  fs.writeFileSync(outPath, file.buffer);
  return key;
}

function activityImageKeysFromRow(row) {
  let keys = parseJsonImageArray(row?.images, 4);
  if (!keys.length && row?.cover) keys = [String(row.cover)];
  return keys;
}

/** @returns {{ cover: string|null, images: Array<{ url: string }> }} */
function activityMediaForClient(row) {
  const keys = activityImageKeysFromRow(row);
  const urls = keys.map((k) => assetUrl(k)).filter(Boolean);
  return {
    cover: urls[0] || null,
    images: urls.map((url) => ({ url })),
  };
}

const activityImagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const okMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    const okExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    if (!okMime || !okExt) return cb(new Error('仅支持 jpg / png / webp / gif 格式'));
    cb(null, true);
  },
}).array('images', 4);

async function getStatsForTargets(targetType, ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const params = [targetType, ...ids];
  const likesSql = `SELECT target_id, COUNT(*) AS c FROM club_likes WHERE target_type = ? AND target_id IN (${placeholders}) GROUP BY target_id`;
  const viewsSql = `SELECT target_id, COUNT(*) AS c FROM club_views WHERE target_type = ? AND target_id IN (${placeholders}) GROUP BY target_id`;
  const [likesRows, viewsRows] = await Promise.all([query(likesSql, params), query(viewsSql, params)]);
  const likes = new Map((likesRows || []).map((r) => [Number(r.target_id), Number(r.c)]));
  const views = new Map((viewsRows || []).map((r) => [Number(r.target_id), Number(r.c)]));
  const out = new Map();
  for (const id of ids) {
    out.set(Number(id), { likes: likes.get(Number(id)) || 0, views: views.get(Number(id)) || 0 });
  }
  return out;
}

async function getViewerLikedMap(userId, targetType, ids) {
  if (!userId || !ids.length) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT target_id FROM club_likes WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`,
    [userId, targetType, ...ids]
  );
  return new Map((rows || []).map((r) => [Number(r.target_id), true]));
}

async function userCanManageClub(userId, clubId) {
  if (!userId || !clubId) return false;
  const rows = await query(
    'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1',
    [clubId, userId]
  );
  const r = rows && rows[0];
  if (!r) return false;
  return String(r.role) === 'admin';
}

async function userIsClubMember(userId, clubId) {
  if (!userId || !clubId) return false;
  const rows = await query(
    'SELECT 1 AS ok FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1',
    [clubId, userId]
  );
  return !!(rows && rows[0]);
}

/** 远程库尚未执行 037 迁移时避免整页 500 */
function isMissingClubCommentsTable(err) {
  return err && err.code === 'ER_NO_SUCH_TABLE' && String(err.sqlMessage || '').includes('club_comments');
}

/** 表存在但缺少 deleted_at（旧表结构 / 漏加列） */
function isUnknownClubCommentsDeletedAtColumn(err) {
  const msg = String(err?.sqlMessage || err?.message || '').toLowerCase();
  if (!msg.includes('deleted_at')) return false;
  return err?.code === 'ER_BAD_FIELD_ERROR' || Number(err?.errno) === 1054;
}

async function getClubCommentCount(targetType, targetId) {
  try {
    const rows = await query(
      'SELECT COUNT(*) AS c FROM club_comments WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL',
      [targetType, targetId]
    );
    return rows && rows[0] ? Number(rows[0].c) : 0;
  } catch (e) {
    if (isMissingClubCommentsTable(e)) return 0;
    if (isUnknownClubCommentsDeletedAtColumn(e)) {
      const rows = await query(
        'SELECT COUNT(*) AS c FROM club_comments WHERE target_type = ? AND target_id = ?',
        [targetType, targetId]
      );
      return rows && rows[0] ? Number(rows[0].c) : 0;
    }
    throw e;
  }
}

function mapClubCommentRows(rows) {
  const all = rows || [];
  const top = all.filter((r) => r.parent_id == null);
  const replies = all.filter((r) => r.parent_id != null);
  return top.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    parent_id: t.parent_id,
    content: t.content,
    created_at: t.created_at,
    author: {
      username: t.username,
      nickname: t.nickname,
      avatar: t.avatar ? assetUrl(t.avatar) : null,
    },
    replies: replies
      .filter((r) => r.parent_id === t.id)
      .map((r) => ({
        id: r.id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        content: r.content,
        created_at: r.created_at,
        author: {
          username: r.username,
          nickname: r.nickname,
          avatar: r.avatar ? assetUrl(r.avatar) : null,
        },
      })),
  }));
}

async function fetchClubCommentsTree(targetType, targetId) {
  const sqlWithDeleted = `SELECT c.id, c.user_id, c.parent_id, c.content, c.created_at,
            u.username, u.nickname, u.avatar
     FROM club_comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.target_type = ? AND c.target_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`;
  const sqlNoDeletedCol = `SELECT c.id, c.user_id, c.parent_id, c.content, c.created_at,
            u.username, u.nickname, u.avatar
     FROM club_comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.target_type = ? AND c.target_id = ?
     ORDER BY c.created_at ASC`;
  try {
    const rows = await query(sqlWithDeleted, [targetType, targetId]);
    return mapClubCommentRows(rows);
  } catch (e) {
    if (isMissingClubCommentsTable(e)) return [];
    if (isUnknownClubCommentsDeletedAtColumn(e)) {
      const rows = await query(sqlNoDeletedCol, [targetType, targetId]);
      return mapClubCommentRows(rows);
    }
    throw e;
  }
}

async function insertClubComment(req, res, next, targetType, targetId) {
  try {
    const userId = Number(req.user?.id);
    const { content, parent_id: parentId } = req.body || {};
    const safeContent = cleanText(content, 500);
    if (!targetId) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!safeContent) return res.status(400).json({ status: -1, message: '评论内容不能为空' });
    const exists = await query(
      targetType === 'activity'
        ? 'SELECT id FROM club_activities WHERE id = ? LIMIT 1'
        : 'SELECT id FROM club_posts WHERE id = ? LIMIT 1',
      [targetId]
    );
    if (!exists || !exists[0]) {
      return res.status(404).json({ status: -1, message: targetType === 'activity' ? '活动不存在' : '内容不存在' });
    }

    let parentIdNum = null;
    if (parentId != null && parentId !== '') {
      parentIdNum = parseInt(parentId, 10);
      let parentRow;
      try {
        parentRow = await query(
          'SELECT id, parent_id FROM club_comments WHERE id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
          [parentIdNum, targetType, targetId]
        );
      } catch (e) {
        if (isUnknownClubCommentsDeletedAtColumn(e)) {
          parentRow = await query(
            'SELECT id, parent_id FROM club_comments WHERE id = ? AND target_type = ? AND target_id = ?',
            [parentIdNum, targetType, targetId]
          );
        } else {
          throw e;
        }
      }
      if (!parentRow || !parentRow[0]) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      if (parentRow[0].parent_id != null) {
        return res.status(400).json({ status: -1, message: '仅支持二级评论，不能回复回复' });
      }
    }

    const result = await query(
      'INSERT INTO club_comments (target_type, target_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)',
      [targetType, targetId, userId, parentIdNum, safeContent]
    );
    const rows = await query(
      `SELECT c.id, c.user_id, c.parent_id, c.content, c.created_at, u.username, u.nickname, u.avatar
       FROM club_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [result.insertId]
    );
    const row = rows && rows[0];
    const data = row
      ? {
          id: row.id,
          user_id: row.user_id,
          parent_id: row.parent_id,
          content: row.content,
          created_at: row.created_at,
          author: {
            username: row.username,
            nickname: row.nickname,
            avatar: row.avatar ? assetUrl(row.avatar) : null,
          },
        }
      : { id: result.insertId, content: safeContent, created_at: new Date().toISOString() };

    // 通知社团管理员 + 被回复者
    try {
      let clubId = null;
      if (targetType === 'activity') {
        const [a] = await query('SELECT club_id FROM club_activities WHERE id = ?', [targetId]);
        clubId = a?.club_id;
      } else {
        const [p] = await query('SELECT club_id FROM club_posts WHERE id = ?', [targetId]);
        clubId = p?.club_id;
      }
      if (clubId) {
        const admins = await query('SELECT user_id FROM club_members WHERE club_id = ? AND role = ?', [clubId, 'admin']);
        const adminIds = admins.map((a) => a.user_id).filter((id) => id !== userId);
        if (adminIds.length > 0) {
          createNotificationBatch(adminIds, { type: 'club_comment', fromUserId: userId, extra: { targetType: `club_${targetType}`, targetId, targetPath: targetType === 'activity' ? `/about/club/activity/${targetId}` : `/about/club/post/${targetId}`, content: safeContent.slice(0, 80) } }).catch(() => {});
        }
        if (parentIdNum) {
          const [pc] = await query('SELECT user_id FROM club_comments WHERE id = ?', [parentIdNum]);
          if (pc && pc.user_id && pc.user_id !== userId && !adminIds.includes(pc.user_id)) {
            createNotification({ userId: pc.user_id, type: 'club_comment', fromUserId: userId, extra: { targetType: `club_${targetType}`, targetId, targetPath: targetType === 'activity' ? `/about/club/activity/${targetId}` : `/about/club/post/${targetId}`, content: safeContent.slice(0, 80) } }).catch(() => {});
          }
        }
      }
    } catch (_) {}

    res.json({ status: 0, message: 'ok', data });
  } catch (e) {
    if (isMissingClubCommentsTable(e)) {
      return res.status(503).json({
        status: -1,
        message: '数据库尚未创建 club_comments 表。请在当前库执行 migrations/037_club_comments.sql（例如：node scripts/apply-sql-file.js migrations/037_club_comments.sql，需使用与线上相同的 DATABASE_URL）',
      });
    }
    next(e);
  }
}

async function deleteClubComment(req, res, next, targetType) {
  try {
    const targetId = toInt(req.params.id, 0);
    const commentId = toInt(req.params.commentId, 0);
    if (!targetId || !commentId) return res.status(400).json({ status: -1, message: '参数错误' });
    let rows;
    try {
      rows = await query(
        'SELECT id, user_id FROM club_comments WHERE id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
        [commentId, targetType, targetId]
      );
    } catch (e) {
      if (isUnknownClubCommentsDeletedAtColumn(e)) {
        rows = await query(
          'SELECT id, user_id FROM club_comments WHERE id = ? AND target_type = ? AND target_id = ?',
          [commentId, targetType, targetId]
        );
      } else {
        throw e;
      }
    }
    if (!rows || !rows[0]) return res.status(404).json({ status: -1, message: '评论不存在或已删除' });
    if (rows[0].user_id !== req.user.id && !isSiteAdmin(req)) {
      return res.status(403).json({ status: -1, message: '只能删除自己的评论' });
    }
    try {
      await query('UPDATE club_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    } catch (e) {
      if (isUnknownClubCommentsDeletedAtColumn(e)) {
        await query('DELETE FROM club_comments WHERE id = ?', [commentId]);
      } else {
        throw e;
      }
    }
    res.json({ status: 0, message: '删除成功' });
  } catch (e) {
    if (isMissingClubCommentsTable(e)) {
      return res.status(503).json({
        status: -1,
        message: '数据库尚未创建 club_comments 表，请先在当前库执行 migrations/037_club_comments.sql',
      });
    }
    next(e);
  }
}

// =========================
// Tabs meta (optional)
// GET /api/clubs/tabs
// =========================
router.get('/tabs', async (req, res) => {
  res.json({
    status: 0,
    data: [
      { slug: 'recommend', name_zh: '推荐', name_en: 'Recommend' },
      { slug: 'activities', name_zh: '活动', name_en: 'Activities' },
      { slug: 'clubs', name_zh: '社团大全', name_en: 'Clubs' },
      { slug: 'posts', name_zh: '日常', name_en: 'Posts' },
    ],
  });
});

// =========================
// User search by email (site admin)
// GET /api/clubs/users/search?email=
// =========================
router.get('/users/search', authenticateToken, async (req, res, next) => {
  try {
    if (!isSiteAdmin(req)) return res.status(403).json({ status: -1, message: '无权限' });
    const email = cleanText(req.query.email, 120);
    if (!email) return res.json({ status: 0, data: { list: [] } });
    const rows = await query(
      'SELECT id, email, username, nickname, avatar, role FROM users WHERE email LIKE ? ORDER BY id DESC LIMIT 20',
      [`%${email}%`]
    );
    res.json({
      status: 0,
      data: {
        list: (rows || []).map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          nickname: u.nickname,
          avatar: u.avatar ? assetUrl(u.avatar) : null,
          role: u.role,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// User search by email (club admin)
// GET /api/clubs/:id/users/search?email=
// =========================
router.get('/:id/users/search', authenticateToken, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const userId = Number(req.user?.id);
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    const email = cleanText(req.query.email, 120);
    if (!email) return res.json({ status: 0, data: { list: [] } });
    const rows = await query(
      'SELECT id, email, username, nickname, avatar, role FROM users WHERE email LIKE ? ORDER BY id DESC LIMIT 20',
      [`%${email}%`]
    );
    res.json({
      status: 0,
      data: {
        list: (rows || []).map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          nickname: u.nickname,
          avatar: u.avatar ? assetUrl(u.avatar) : null,
          role: u.role,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Create club (site admin)
// POST /api/clubs  (multipart/form-data)
// fields: name, category, description, ig, xhs, signupLink, contactText, adminEmail(optional)
// file: logo
// =========================
router.post('/', authenticateToken, (req, res, next) => {
  clubLogoUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '上传失败' });
    next();
  });
}, async (req, res, next) => {
  try {
    if (!isSiteAdmin(req)) return res.status(403).json({ status: -1, message: '无权限' });
    const name = cleanText(req.body?.name, 120);
    const category = normalizeClubCategory(req.body?.category);
    const description = cleanText(req.body?.description, 2000);
    const contactText = cleanText(req.body?.contactText, 255);
    const signupLink = cleanText(req.body?.signupLink, 500);
    const ig = cleanText(req.body?.ig, 80);
    const xhs = cleanText(req.body?.xhs, 120);
    const adminEmail = cleanText(req.body?.adminEmail, 120);

    if (!name) return res.status(400).json({ status: -1, message: '社团名字不能为空' });
    if (!category) return res.status(400).json({ status: -1, message: '社团分类不能为空' });

    const r = await query(
      'INSERT INTO clubs (name, category, avatar, description, contact_text, signup_link, ig, xhs) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
      [name, category, description || null, contactText || null, signupLink || null, ig || null, xhs || null]
    );
    const clubId = r.insertId;

    // upload logo if provided
    if (req.file) {
      const key = await saveClubLogo(req.file, clubId);
      if (key) await query('UPDATE clubs SET avatar = ? WHERE id = ?', [key, clubId]);
    }

    // assign admin: provided email (if exists) + creator (req.user.id)
    const adminIds = new Set([Number(req.user.id)]);
    if (adminEmail) {
      const urows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [adminEmail]);
      if (urows && urows[0]) adminIds.add(Number(urows[0].id));
    }
    for (const uid of adminIds) {
      await query(
        'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
        [clubId, uid, 'admin']
      );
    }

    res.status(201).json({ status: 0, data: { id: clubId } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Update activity status (club admin or site admin)
// PATCH /api/clubs/activities/:id/status { status }
// 必须注册在 PATCH /:id 之前，避免被误匹配
// =========================
router.patch('/activities/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const activityId = toInt(req.params.id, 0);
    const status = normalizeActivityStatus(req.body?.status);
    if (!activityId || !status) return res.status(400).json({ status: -1, message: '参数错误' });

    const rows = await query('SELECT id, club_id FROM club_activities WHERE id = ? LIMIT 1', [activityId]);
    const a = rows && rows[0];
    if (!a) return res.status(404).json({ status: -1, message: '活动不存在' });

    const clubId = Number(a.club_id);
    const userId = Number(req.user?.id);
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    await query('UPDATE club_activities SET status = ? WHERE id = ?', [status, activityId]);
    res.json({ status: 0, message: 'ok' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Update club (club admin or site admin)
// PATCH /api/clubs/:id (multipart/form-data)
// =========================
router.patch('/:id', authenticateToken, (req, res, next) => {
  clubLogoUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '上传失败' });
    next();
  });
}, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    const userId = Number(req.user?.id);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    const name = cleanText(req.body?.name, 120);
    const category = normalizeClubCategory(req.body?.category);
    const description = cleanText(req.body?.description, 2000);
    const contactText = cleanText(req.body?.contactText, 255);
    const signupLink = cleanText(req.body?.signupLink, 500);
    const ig = cleanText(req.body?.ig, 80);
    const xhs = cleanText(req.body?.xhs, 120);

    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(name); }
    if (category) { fields.push('category = ?'); params.push(category); }
    if (description != null) { fields.push('description = ?'); params.push(description || null); }
    if (contactText != null) { fields.push('contact_text = ?'); params.push(contactText || null); }
    if (signupLink != null) { fields.push('signup_link = ?'); params.push(signupLink || null); }
    if (ig != null) { fields.push('ig = ?'); params.push(ig || null); }
    if (xhs != null) { fields.push('xhs = ?'); params.push(xhs || null); }

    if (req.file) {
      const key = await saveClubLogo(req.file, clubId);
      if (key) {
        fields.push('avatar = ?');
        params.push(key);
      }
    }

    if (!fields.length) return res.json({ status: 0, message: 'ok' });
    params.push(clubId);
    await query(`UPDATE clubs SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ status: 0, message: 'ok' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Add member/admin by email (club admin or site admin)
// POST /api/clubs/:id/members { email, role }
// =========================
router.post('/:id/members', authenticateToken, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    const userId = Number(req.user?.id);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    const email = cleanText(req.body?.email, 120);
    const role = String(req.body?.role || 'member').toLowerCase() === 'admin' ? 'admin' : 'member';
    if (!email) return res.status(400).json({ status: -1, message: '邮箱不能为空' });

    const urows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (!urows || !urows[0]) return res.status(404).json({ status: -1, message: '未找到该用户' });
    const targetUserId = Number(urows[0].id);

    await query(
      'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [clubId, targetUserId, role]
    );

    res.json({ status: 0, message: '已添加' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Create activity (club admin or site admin)
// POST /api/clubs/:id/activities
// JSON body 或 multipart/form-data（字段 + 最多 4 张 images）
// =========================
router.post('/:id/activities', authenticateToken, checkSanction, sensitiveWordFilter, (req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.toLowerCase().includes('multipart/form-data')) {
    return activityImagesUpload(req, res, (err) => {
      if (err) return res.status(400).json({ status: -1, message: err.message || '上传失败' });
      next();
    });
  }
  next();
}, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    const userId = Number(req.user?.id);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    const title = cleanText(req.body?.title, 160);
    const summary = cleanText(req.body?.summary, 255);
    const location = cleanText(req.body?.location, 160);
    const signupLink = cleanText(req.body?.signupLink, 500);
    const tag = normalizeClubCategory(req.body?.tag);
    const startTime = req.body?.time ? new Date(String(req.body.time)) : null;
    const endTime = req.body?.endTime ? new Date(String(req.body.endTime)) : null;
    const status = normalizeActivityStatus(req.body?.status);

    if (!title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    const st = startTime && !Number.isNaN(startTime.getTime()) ? startTime : null;
    const et = endTime && !Number.isNaN(endTime.getTime()) ? endTime : null;

    const r = await query(
      `
      INSERT INTO club_activities
        (club_id, title, tag, summary, cover, start_time, end_time, location, signup_link, status)
      VALUES
        (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
      `,
      [clubId, title, tag || null, summary || null, st, et, location || null, signupLink || null, status || null]
    );
    const activityId = r.insertId;

    const files = Array.isArray(req.files) ? req.files : [];
    const paths = [];
    for (let i = 0; i < Math.min(4, files.length); i += 1) {
      const key = await saveActivityImage(files[i], activityId, i);
      if (key) paths.push(key);
    }
    if (paths.length) {
      try {
        await query('UPDATE club_activities SET images = ?, cover = ? WHERE id = ?', [
          JSON.stringify(paths),
          paths[0],
          activityId,
        ]);
      } catch (_) {
        await query('UPDATE club_activities SET cover = ? WHERE id = ?', [paths[0], activityId]);
      }
    }

    res.status(201).json({ status: 0, data: { id: activityId } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Create club post (club admin or site admin)
// POST /api/clubs/:id/posts — JSON 或 multipart（最多 4 张 images）
// =========================
router.post('/:id/posts', authenticateToken, checkSanction, sensitiveWordFilter, (req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.toLowerCase().includes('multipart/form-data')) {
    return activityImagesUpload(req, res, (err) => {
      if (err) return res.status(400).json({ status: -1, message: err.message || '上传失败' });
      next();
    });
  }
  next();
}, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    const userId = Number(req.user?.id);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });

    const title = cleanText(req.body?.title, 160);
    const content = cleanText(req.body?.content, 8000);
    if (!content) return res.status(400).json({ status: -1, message: '内容不能为空' });

    const r = await query(
      'INSERT INTO club_posts (club_id, title, content, images) VALUES (?, ?, ?, NULL)',
      [clubId, title || null, content]
    );
    const postId = r.insertId;

    const files = Array.isArray(req.files) ? req.files : [];
    const paths = [];
    for (let i = 0; i < Math.min(4, files.length); i += 1) {
      const key = await saveClubPostImage(files[i], postId, i);
      if (key) paths.push(key);
    }
    if (paths.length) {
      await query('UPDATE club_posts SET images = ? WHERE id = ?', [JSON.stringify(paths), postId]);
    }

    res.status(201).json({ status: 0, data: { id: postId } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Track view
// POST /api/clubs/views { targetType: 'activity'|'post', targetId }
// =========================
router.post('/views', async (req, res, next) => {
  try {
    const targetType = String(req.body?.targetType || '').toLowerCase();
    const targetId = toInt(req.body?.targetId, 0);
    if (!['activity', 'post'].includes(targetType)) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!targetId) return res.status(400).json({ status: -1, message: '参数错误' });
    const u = parseOptionalUser(req);
    const viewerId = u?.id ? Number(u.id) : null;
    await query(
      'INSERT INTO club_views (target_type, target_id, viewer_user_id) VALUES (?, ?, ?)',
      [targetType, targetId, viewerId]
    );
    return res.json({ status: 0, message: 'ok' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Toggle like
// POST /api/clubs/likes/toggle { targetType, targetId }
// =========================
router.post('/likes/toggle', authenticateToken, async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const targetType = String(req.body?.targetType || '').toLowerCase();
    const targetId = toInt(req.body?.targetId, 0);
    if (!['activity', 'post'].includes(targetType)) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!targetId) return res.status(400).json({ status: -1, message: '参数错误' });

    const rows = await query(
      'SELECT 1 AS ok FROM club_likes WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1',
      [userId, targetType, targetId]
    );
    const liked = !!(rows && rows[0]);
    if (liked) {
      await query('DELETE FROM club_likes WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1', [userId, targetType, targetId]);
      return res.json({ status: 0, data: { liked: false } });
    }
    await query('INSERT INTO club_likes (user_id, target_type, target_id) VALUES (?, ?, ?)', [userId, targetType, targetId]);
    // 通知社团管理员
    try {
      let clubId = null;
      if (targetType === 'activity') {
        const [a] = await query('SELECT club_id FROM club_activities WHERE id = ?', [targetId]);
        clubId = a?.club_id;
      } else if (targetType === 'post') {
        const [p] = await query('SELECT club_id FROM club_posts WHERE id = ?', [targetId]);
        clubId = p?.club_id;
      }
      if (clubId) {
        const admins = await query('SELECT user_id FROM club_members WHERE club_id = ? AND role = ?', [clubId, 'admin']);
        const adminIds = admins.map((a) => a.user_id).filter((id) => id !== userId);
        if (adminIds.length > 0) {
          createNotificationBatch(adminIds, { type: 'club_like', fromUserId: userId, extra: { targetType: `club_${targetType}`, targetId, targetPath: targetType === 'activity' ? `/about/club/activity/${targetId}` : `/about/club/post/${targetId}` } }).catch(() => {});
        }
      }
    } catch (_) {}
    return res.json({ status: 0, data: { liked: true } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Toggle follow club
// POST /api/clubs/:id/follow
// =========================
router.post('/:id/follow', authenticateToken, async (req, res, next) => {
  try {
    const clubId = toInt(req.params.id, 0);
    const userId = Number(req.user?.id);
    if (!clubId) return res.status(400).json({ status: -1, message: '参数错误' });
    const clubs = await query('SELECT id FROM clubs WHERE id = ? LIMIT 1', [clubId]);
    if (!clubs || !clubs[0]) return res.status(404).json({ status: -1, message: '社团不存在' });

    const rows = await query('SELECT 1 AS ok FROM club_follows WHERE user_id = ? AND club_id = ? LIMIT 1', [userId, clubId]);
    const following = !!(rows && rows[0]);
    if (following) {
      await query('DELETE FROM club_follows WHERE user_id = ? AND club_id = ? LIMIT 1', [userId, clubId]);
      return res.json({ status: 0, data: { following: false } });
    }
    await query('INSERT INTO club_follows (user_id, club_id) VALUES (?, ?)', [userId, clubId]);
    // 通知社团管理员
    try {
      const admins = await query('SELECT user_id FROM club_members WHERE club_id = ? AND role = ?', [clubId, 'admin']);
      const adminIds = admins.map((a) => a.user_id).filter((id) => id !== userId);
      if (adminIds.length > 0) {
        createNotificationBatch(adminIds, { type: 'club_follow', fromUserId: userId, extra: { targetType: 'club', targetId: clubId, targetPath: `/about/club/${clubId}` } }).catch(() => {});
      }
    } catch (_) {}
    return res.json({ status: 0, data: { following: true } });
  } catch (e) {
    next(e);
  }
});

// =========================
// My clubs (memberships)
// GET /api/clubs/me/clubs
// =========================
router.get('/me/clubs', authenticateToken, async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const rows = await query(
      `
      SELECT c.*,
        (SELECT COUNT(*) FROM club_follows f2 WHERE f2.club_id = c.id) AS followers
      FROM club_members m
      JOIN clubs c ON c.id = m.club_id
      WHERE m.user_id = ?
      ORDER BY (m.role='admin') DESC, m.created_at DESC, c.id DESC
      LIMIT 200;
      `,
      [userId]
    );

    res.json({
      status: 0,
      data: {
        list: (rows || []).map((r) => ({
          id: r.id,
          name: r.name,
          avatar: r.avatar ? assetUrl(r.avatar) : null,
          description: r.description || '',
          followers: Number(r.followers || 0),
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Recommend feed (mixed)
// GET /api/clubs/feed?page=&pageSize=
// =========================
router.get('/feed', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(30, Math.max(5, toInt(req.query.pageSize, 10)));
    const offset = (page - 1) * pageSize;

    // Simple strategy: take latest activities + latest posts then merge by created_at.
    const [actRows, postRows] = await Promise.all([
      query(
        `
      SELECT a.*, c.name AS club_name, c.category AS club_category
      FROM club_activities a
      JOIN clubs c ON c.id = a.club_id
      ORDER BY a.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
      ),
      query(
        `
      SELECT p.id, p.title,
             SUBSTRING(COALESCE(p.content, ''), 1, 800) AS content,
             p.images, p.created_at, p.club_id, c.name AS club_name, c.category AS club_category
      FROM club_posts p
      JOIN clubs c ON c.id = p.club_id
      ORDER BY p.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
      ),
    ]);

    const actIds = (actRows || []).map((r) => Number(r.id));
    const postIds = (postRows || []).map((r) => Number(r.id));
    // 分类型 IN 可走 (target_type,target_id) / 主键；大 OR 在部分 MySQL 版本上计划较差，故四路并行
    const [actStats, postStats, actLiked, postLiked] = await Promise.all([
      getStatsForTargets('activity', actIds),
      getStatsForTargets('post', postIds),
      getViewerLikedMap(viewerId, 'activity', actIds),
      getViewerLikedMap(viewerId, 'post', postIds),
    ]);

    const items = [
      ...(actRows || []).map((r) => {
        const media = activityMediaForClient(r);
        return {
          type: 'activity',
          id: r.id,
          cover: media.cover,
          images: media.images,
          title: r.title,
          summary: r.summary || '',
          clubId: r.club_id,
          clubName: r.club_name,
          clubCategory: r.club_category || null,
          tag: r.tag || null,
          status: computeActivityStatus2(r),
          createdAt: r.created_at,
          stats: actStats.get(Number(r.id)) || { likes: 0, views: 0 },
          viewer: { liked: !!actLiked.get(Number(r.id)) },
        };
      }),
      ...(postRows || []).map((r) => ({
        type: 'post',
        id: r.id,
        cover: (() => {
          const keys = parseJsonImageArray(r.images, 4);
          const first = keys[0];
          return first ? assetUrl(String(first)) : null;
        })(),
        title: r.title || cleanText(r.content, 40),
        summary: cleanText(r.content, 90),
        clubId: r.club_id,
        clubName: r.club_name,
        clubCategory: r.club_category || null,
        createdAt: r.created_at,
        stats: postStats.get(Number(r.id)) || { likes: 0, views: 0 },
        viewer: { liked: !!postLiked.get(Number(r.id)) },
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, pageSize);

    res.json({ status: 0, data: { list: items, page, pageSize } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Activities list
// GET /api/clubs/activities?page=&pageSize=
// =========================
router.get('/activities', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(50, Math.max(5, toInt(req.query.pageSize, 20)));
    const offset = (page - 1) * pageSize;

    const rows = await query(
      `
      SELECT a.*, c.name AS club_name
      FROM club_activities a
      JOIN clubs c ON c.id = a.club_id
      ORDER BY
        CASE WHEN a.start_time IS NULL THEN 1 ELSE 0 END ASC,
        a.start_time DESC,
        a.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
    );

    const ids = (rows || []).map((r) => Number(r.id));
    const stats = await getStatsForTargets('activity', ids);
    const liked = await getViewerLikedMap(viewerId, 'activity', ids);

    res.json({
      status: 0,
      data: {
        list: (rows || []).map((r) => {
          const media = activityMediaForClient(r);
          return {
            id: r.id,
            title: r.title,
            tag: r.tag || null,
            cover: media.cover,
            images: media.images,
            time: r.start_time,
            endTime: r.end_time,
            location: r.location,
            clubId: r.club_id,
            clubName: r.club_name,
            status: computeActivityStatus2(r),
            signupLink: r.signup_link,
            stats: stats.get(Number(r.id)) || { likes: 0, views: 0 },
            viewer: { liked: !!liked.get(Number(r.id)) },
          };
        }),
        page,
        pageSize,
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Clubs list
// GET /api/clubs/list?page=&pageSize=
// =========================
router.get('/list', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(50, Math.max(5, toInt(req.query.pageSize, 30)));
    const offset = (page - 1) * pageSize;
    const q = cleanText(req.query.q, 60);

    const where = [];
    const params = [];
    if (q) {
      where.push('(c.name LIKE ? OR c.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `
      SELECT c.*,
        (SELECT COUNT(*) FROM club_follows f WHERE f.club_id = c.id) AS followers
      FROM clubs c
      ${whereSql}
      ORDER BY followers DESC, c.id DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `,
      params
    );
    const ids = (rows || []).map((r) => Number(r.id));
    const followingMap = viewerId
      ? new Map(
          (await query(
            `SELECT club_id FROM club_follows WHERE user_id = ? AND club_id IN (${ids.map(() => '?').join(',')})`,
            [viewerId, ...ids]
          )).map((r) => [Number(r.club_id), true])
        )
      : new Map();

    res.json({
      status: 0,
      data: {
        list: (rows || []).map((r) => ({
          id: r.id,
          name: r.name,
          avatar: r.avatar ? assetUrl(r.avatar) : null,
          description: r.description || '',
          followers: Number(r.followers || 0),
          viewer: { following: !!followingMap.get(Number(r.id)) },
        })),
        page,
        pageSize,
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Posts list
// GET /api/clubs/posts?page=&pageSize=
// =========================
router.get('/posts', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(30, Math.max(5, toInt(req.query.pageSize, 10)));
    const offset = (page - 1) * pageSize;

    const rows = await query(
      `
      SELECT p.id, p.club_id, p.title, p.content, p.images, p.created_at, c.name AS club_name
      FROM club_posts p
      JOIN clubs c ON c.id = p.club_id
      ORDER BY p.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
    );
    const ids = (rows || []).map((r) => Number(r.id));
    const stats = await getStatsForTargets('post', ids);
    const liked = await getViewerLikedMap(viewerId, 'post', ids);

    res.json({
      status: 0,
      data: {
        list: (rows || []).map((r) => {
          const imageKeys = parseJsonImageArray(r.images, 4);
          const images = imageKeys.map((k) => assetUrl(String(k))).filter(Boolean);
          return {
            id: r.id,
            clubId: r.club_id,
            clubName: r.club_name,
            content: r.content,
            title: r.title || '',
            images,
            createdAt: r.created_at,
            stats: stats.get(Number(r.id)) || { likes: 0, views: 0 },
            viewer: { liked: !!liked.get(Number(r.id)) },
          };
        }),
        page,
        pageSize,
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Activity detail
// GET /api/clubs/activity/:id
// =========================
router.get('/activity/:id', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const rows = await query(
      `
      SELECT a.*, c.name AS club_name
      FROM club_activities a
      JOIN clubs c ON c.id = a.club_id
      WHERE a.id = ?
      LIMIT 1;
      `,
      [id]
    );
    const a = rows && rows[0];
    if (!a) return res.status(404).json({ status: -1, message: '活动不存在' });
    const stats = await getStatsForTargets('activity', [id]);
    const liked = await getViewerLikedMap(viewerId, 'activity', [id]);
    const commentCount = await getClubCommentCount('activity', id);
    const media = activityMediaForClient(a);
    let canManage = false;
    if (viewerId) {
      try {
        canManage = viewerIsSiteAdmin(viewer) || (await userCanManageClub(viewerId, Number(a.club_id)));
      } catch {
        canManage = viewerIsSiteAdmin(viewer);
      }
    }
    res.json({
      status: 0,
      data: {
        id: a.id,
        title: a.title,
        tag: a.tag || null,
        summary: a.summary || '',
        cover: media.cover,
        images: media.images,
        time: a.start_time,
        endTime: a.end_time,
        location: a.location,
        clubId: a.club_id,
        clubName: a.club_name,
        status: computeActivityStatus2(a),
        signupLink: a.signup_link,
        stats: { ...(stats.get(id) || { likes: 0, views: 0 }), comments: commentCount },
        viewer: { liked: !!liked.get(id), canManage },
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Delete activity（社团管理员 / 站管理员）
// DELETE /api/clubs/activity/:id
// =========================
router.delete('/activity/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const rows = await query('SELECT id, club_id FROM club_activities WHERE id = ? LIMIT 1', [id]);
    const row = rows && rows[0];
    if (!row) return res.status(404).json({ status: -1, message: '内容不存在' });
    const clubId = Number(row.club_id);
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });
    try {
      await query('DELETE FROM club_comments WHERE target_type = ? AND target_id = ? AND parent_id IS NOT NULL', [
        'activity',
        id,
      ]);
      await query('DELETE FROM club_comments WHERE target_type = ? AND target_id = ?', ['activity', id]);
    } catch (e) {
      if (!isMissingClubCommentsTable(e)) throw e;
    }
    await query('DELETE FROM club_likes WHERE target_type = ? AND target_id = ?', ['activity', id]);
    await query('DELETE FROM club_views WHERE target_type = ? AND target_id = ?', ['activity', id]);
    await query('DELETE FROM club_activities WHERE id = ? LIMIT 1', [id]);
    return res.json({ status: 0, message: 'ok' });
  } catch (e) {
    return next(e);
  }
});

// =========================
// Activity comments（一级 + 二级）
// GET/POST /api/clubs/activity/:id/comments
// DELETE /api/clubs/activity/:id/comments/:commentId
// =========================
router.get('/activity/:id/comments', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const list = await fetchClubCommentsTree('activity', id);
    res.json({ status: 0, data: list });
  } catch (e) {
    next(e);
  }
});

router.post('/activity/:id/comments', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res, next) => {
  const id = toInt(req.params.id, 0);
  return insertClubComment(req, res, next, 'activity', id);
});

router.delete('/activity/:id/comments/:commentId', authenticateToken, async (req, res, next) =>
  deleteClubComment(req, res, next, 'activity')
);

// =========================
// Post detail
// GET /api/clubs/post/:id
// =========================
router.get('/post/:id', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const rows = await query(
      `
      SELECT p.*, c.name AS club_name
      FROM club_posts p
      JOIN clubs c ON c.id = p.club_id
      WHERE p.id = ?
      LIMIT 1;
      `,
      [id]
    );
    const p = rows && rows[0];
    if (!p) return res.status(404).json({ status: -1, message: '内容不存在' });
    const stats = await getStatsForTargets('post', [id]);
    const liked = await getViewerLikedMap(viewerId, 'post', [id]);
    const commentCount = await getClubCommentCount('post', id);
    const imageKeys = parseJsonImageArray(p.images, 4);
    const images = imageKeys.map((k) => assetUrl(String(k))).filter(Boolean);
    let canManage = false;
    if (viewerId) {
      try {
        canManage = viewerIsSiteAdmin(viewer) || (await userCanManageClub(viewerId, Number(p.club_id)));
      } catch {
        canManage = viewerIsSiteAdmin(viewer);
      }
    }
    res.json({
      status: 0,
      data: {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        title: p.title || '',
        content: p.content,
        images,
        createdAt: p.created_at,
        stats: { ...(stats.get(id) || { likes: 0, views: 0 }), comments: commentCount },
        viewer: { liked: !!liked.get(id), canManage },
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Delete club post（社团管理员 / 站管理员）
// DELETE /api/clubs/post/:id
// =========================
router.delete('/post/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const rows = await query('SELECT id, club_id FROM club_posts WHERE id = ? LIMIT 1', [id]);
    const row = rows && rows[0];
    if (!row) return res.status(404).json({ status: -1, message: '内容不存在' });
    const clubId = Number(row.club_id);
    const canManage = isSiteAdmin(req) || (await userCanManageClub(userId, clubId));
    if (!canManage) return res.status(403).json({ status: -1, message: '无权限' });
    try {
      await query('DELETE FROM club_comments WHERE target_type = ? AND target_id = ? AND parent_id IS NOT NULL', [
        'post',
        id,
      ]);
      await query('DELETE FROM club_comments WHERE target_type = ? AND target_id = ?', ['post', id]);
    } catch (e) {
      if (!isMissingClubCommentsTable(e)) throw e;
    }
    await query('DELETE FROM club_likes WHERE target_type = ? AND target_id = ?', ['post', id]);
    await query('DELETE FROM club_views WHERE target_type = ? AND target_id = ?', ['post', id]);
    await query('DELETE FROM club_posts WHERE id = ? LIMIT 1', [id]);
    return res.json({ status: 0, message: 'ok' });
  } catch (e) {
    return next(e);
  }
});

// =========================
// Club post comments（一级 + 二级）
// GET/POST /api/clubs/post/:id/comments
// DELETE /api/clubs/post/:id/comments/:commentId
// =========================
router.get('/post/:id/comments', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    const list = await fetchClubCommentsTree('post', id);
    res.json({ status: 0, data: list });
  } catch (e) {
    next(e);
  }
});

router.post('/post/:id/comments', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res, next) => {
  const id = toInt(req.params.id, 0);
  return insertClubComment(req, res, next, 'post', id);
});

router.delete('/post/:id/comments/:commentId', authenticateToken, async (req, res, next) =>
  deleteClubComment(req, res, next, 'post')
);

// =========================
// Club profile
// GET /api/clubs/:id
// =========================
router.get('/:id', async (req, res, next) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer?.id ? Number(viewer.id) : null;
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });

    const clubs = await query('SELECT * FROM clubs WHERE id = ? LIMIT 1', [id]);
    const c = clubs && clubs[0];
    if (!c) return res.status(404).json({ status: -1, message: '社团不存在' });

    const activitiesSql = `
      SELECT a.*
      FROM club_activities a
      WHERE a.club_id = ?
      ORDER BY a.start_time DESC, a.created_at DESC
      LIMIT 20`;
    const postsSql = `
      SELECT p.*
      FROM club_posts p
      WHERE p.club_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20`;
    const membersSql = `
      SELECT m.user_id, m.role, u.email, u.username, u.nickname, u.avatar
      FROM club_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.club_id = ?
      ORDER BY (m.role='admin') DESC, m.created_at ASC
      LIMIT 200`;

    const [
      activities,
      posts,
      followersRows,
      followingRows,
      mrows,
      selfMemberRows,
    ] = await Promise.all([
      query(activitiesSql, [id]),
      query(postsSql, [id]),
      query('SELECT COUNT(*) AS c FROM club_follows WHERE club_id = ?', [id]),
      viewerId ? query('SELECT 1 AS ok FROM club_follows WHERE user_id = ? AND club_id = ? LIMIT 1', [viewerId, id]) : Promise.resolve([]),
      query(membersSql, [id]),
      viewerId ? query('SELECT role FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1', [id, viewerId]) : Promise.resolve([]),
    ]);

    const actIds = (activities || []).map((r) => Number(r.id));
    const postIds = (posts || []).map((r) => Number(r.id));
    const [actStats, postStats] = await Promise.all([
      getStatsForTargets('activity', actIds),
      getStatsForTargets('post', postIds),
    ]);

    const followers = followersRows && followersRows[0] ? Number(followersRows[0].c) : 0;
    const following = !!(followingRows && followingRows[0]);
    const selfRow = selfMemberRows && selfMemberRows[0];
    const isMember = viewerId ? !!selfRow : false;
    const canManage = viewerId ? String(selfRow?.role || '') === 'admin' : false;

    const members = (mrows || []).map((m) => ({
      id: m.user_id,
      role: m.role,
      email: m.email,
      username: m.username,
      nickname: m.nickname,
      avatar: m.avatar ? assetUrl(m.avatar) : null,
    }));

    res.json({
      status: 0,
      data: {
        id: c.id,
        basicInfo: {
          id: c.id,
          name: c.name,
          avatar: c.avatar ? assetUrl(c.avatar) : null,
          category: c.category || null,
          description: c.description || '',
          followers,
          viewer: { following, canManage, isMember },
        },
        joinInfo: {
          contactText: c.contact_text || '',
          signupLink: c.signup_link || '',
          ig: c.ig || '',
          xhs: c.xhs || '',
        },
        members,
        activities: (activities || []).map((a) => {
          const media = activityMediaForClient(a);
          return {
            id: a.id,
            title: a.title,
            tag: a.tag || null,
            cover: media.cover,
            images: media.images,
            time: a.start_time,
            endTime: a.end_time,
            location: a.location,
            clubId: a.club_id,
            status: computeActivityStatus2(a),
            signupLink: a.signup_link,
            stats: actStats.get(Number(a.id)) || { likes: 0, views: 0 },
          };
        }),
        posts: (posts || []).map((p) => {
          const imageKeys = parseJsonImageArray(p.images, 4);
          const images = imageKeys.map((k) => assetUrl(String(k))).filter(Boolean);
          return {
            id: p.id,
            clubId: p.club_id,
            content: p.content,
            images,
            createdAt: p.created_at,
            stats: postStats.get(Number(p.id)) || { likes: 0, views: 0 },
          };
        }),
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

