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
const jwt = require('jsonwebtoken');

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

async function getStatsForTargets(targetType, ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const likesRows = await query(
    `SELECT target_id, COUNT(*) AS c FROM club_likes WHERE target_type = ? AND target_id IN (${placeholders}) GROUP BY target_id`,
    [targetType, ...ids]
  );
  const viewsRows = await query(
    `SELECT target_id, COUNT(*) AS c FROM club_views WHERE target_type = ? AND target_id IN (${placeholders}) GROUP BY target_id`,
    [targetType, ...ids]
  );
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
    return res.json({ status: 0, data: { following: true } });
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
    const actRows = await query(
      `
      SELECT a.id, a.title, a.summary, a.cover, a.created_at, a.club_id, c.name AS club_name
      FROM club_activities a
      JOIN clubs c ON c.id = a.club_id
      ORDER BY a.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
    );
    const postRows = await query(
      `
      SELECT p.id, p.title, p.content, p.images, p.created_at, p.club_id, c.name AS club_name
      FROM club_posts p
      JOIN clubs c ON c.id = p.club_id
      ORDER BY p.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
      `
    );

    const actIds = (actRows || []).map((r) => Number(r.id));
    const postIds = (postRows || []).map((r) => Number(r.id));
    const actStats = await getStatsForTargets('activity', actIds);
    const postStats = await getStatsForTargets('post', postIds);
    const actLiked = await getViewerLikedMap(viewerId, 'activity', actIds);
    const postLiked = await getViewerLikedMap(viewerId, 'post', postIds);

    const items = [
      ...(actRows || []).map((r) => ({
        type: 'activity',
        id: r.id,
        cover: r.cover,
        title: r.title,
        summary: r.summary || '',
        clubId: r.club_id,
        clubName: r.club_name,
        createdAt: r.created_at,
        stats: actStats.get(Number(r.id)) || { likes: 0, views: 0 },
        viewer: { liked: !!actLiked.get(Number(r.id)) },
      })),
      ...(postRows || []).map((r) => ({
        type: 'post',
        id: r.id,
        cover: (() => {
          try {
            const arr = r.images ? JSON.parse(r.images) : null;
            return Array.isArray(arr) && arr[0] ? arr[0] : null;
          } catch {
            return null;
          }
        })(),
        title: r.title || cleanText(r.content, 40),
        summary: cleanText(r.content, 90),
        clubId: r.club_id,
        clubName: r.club_name,
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
        list: (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          cover: r.cover,
          time: r.start_time,
          endTime: r.end_time,
          location: r.location,
          clubId: r.club_id,
          clubName: r.club_name,
          status: computeActivityStatus(r.start_time, r.end_time),
          signupLink: r.signup_link,
          stats: stats.get(Number(r.id)) || { likes: 0, views: 0 },
          viewer: { liked: !!liked.get(Number(r.id)) },
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
          avatar: r.avatar,
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
          let images = [];
          try {
            const arr = r.images ? JSON.parse(r.images) : null;
            images = Array.isArray(arr) ? arr.filter(Boolean).slice(0, 6) : [];
          } catch {
            images = [];
          }
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
    res.json({
      status: 0,
      data: {
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        cover: a.cover,
        time: a.start_time,
        endTime: a.end_time,
        location: a.location,
        clubId: a.club_id,
        clubName: a.club_name,
        status: computeActivityStatus(a.start_time, a.end_time),
        signupLink: a.signup_link,
        stats: stats.get(id) || { likes: 0, views: 0 },
        viewer: { liked: !!liked.get(id) },
      },
    });
  } catch (e) {
    next(e);
  }
});

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
    let images = [];
    try {
      const arr = p.images ? JSON.parse(p.images) : null;
      images = Array.isArray(arr) ? arr.filter(Boolean).slice(0, 12) : [];
    } catch {
      images = [];
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
        stats: stats.get(id) || { likes: 0, views: 0 },
        viewer: { liked: !!liked.get(id) },
      },
    });
  } catch (e) {
    next(e);
  }
});

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

    const activities = await query(
      `
      SELECT a.*
      FROM club_activities a
      WHERE a.club_id = ?
      ORDER BY a.start_time DESC, a.created_at DESC
      LIMIT 20;
      `,
      [id]
    );
    const posts = await query(
      `
      SELECT p.*
      FROM club_posts p
      WHERE p.club_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20;
      `,
      [id]
    );

    const actIds = (activities || []).map((r) => Number(r.id));
    const postIds = (posts || []).map((r) => Number(r.id));
    const actStats = await getStatsForTargets('activity', actIds);
    const postStats = await getStatsForTargets('post', postIds);
    const followersRows = await query('SELECT COUNT(*) AS c FROM club_follows WHERE club_id = ?', [id]);
    const followers = followersRows && followersRows[0] ? Number(followersRows[0].c) : 0;
    const followingRows = viewerId
      ? await query('SELECT 1 AS ok FROM club_follows WHERE user_id = ? AND club_id = ? LIMIT 1', [viewerId, id])
      : [];
    const following = !!(followingRows && followingRows[0]);

    res.json({
      status: 0,
      data: {
        id: c.id,
        basicInfo: {
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          description: c.description || '',
          followers,
          viewer: { following },
        },
        joinInfo: {
          contactText: c.contact_text || '',
          signupLink: c.signup_link || '',
        },
        activities: (activities || []).map((a) => ({
          id: a.id,
          title: a.title,
          cover: a.cover,
          time: a.start_time,
          endTime: a.end_time,
          location: a.location,
          clubId: a.club_id,
          status: computeActivityStatus(a.start_time, a.end_time),
          signupLink: a.signup_link,
          stats: actStats.get(Number(a.id)) || { likes: 0, views: 0 },
        })),
        posts: (posts || []).map((p) => {
          let images = [];
          try {
            const arr = p.images ? JSON.parse(p.images) : null;
            images = Array.isArray(arr) ? arr.filter(Boolean).slice(0, 6) : [];
          } catch {
            images = [];
          }
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

