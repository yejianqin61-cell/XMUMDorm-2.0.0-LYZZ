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
const { getUserLevelSummary, formatAuthorLevel } = require('../services/expService');
const { getExpProgress } = require('../constants/levelThresholds');

const DEFAULT_AVATAR = '/uploads/default-avatar.png';

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

function safeText(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

function normalizeCampusIdentity(row, isSelf) {
  const showCollege = isSelf || rowTruthyLike(row.show_college == null ? 1 : row.show_college);
  const showGrade = isSelf || rowTruthyLike(row.show_grade == null ? 1 : row.show_grade);
  const showMajor = isSelf || rowTruthyLike(row.show_major == null ? 0 : row.show_major);
  const college = safeText(row.college);
  const grade = safeText(row.grade);
  const major = safeText(row.major);

  return {
    college: showCollege ? college : null,
    grade: showGrade ? grade : null,
    major: showMajor ? major : null,
    visibility: {
      show_college: showCollege,
      show_grade: showGrade,
      show_major: showMajor,
    },
    raw: isSelf ? { college, grade, major } : undefined,
  };
}

async function getUserBaseRow(userId) {
  try {
    const rows = await query(
      `SELECT id, username, student_id, email, avatar, nickname, role, level, exp, badge, weekly_comment_count, created_at,
              college, grade, major, show_college, show_grade, show_major
         FROM users
        WHERE id = ?`,
      [userId]
    );
    return rows?.[0] || null;
  } catch (e) {
    if (e && e.code === 'ER_BAD_FIELD_ERROR') {
      let rows;
      try {
        rows = await query(
          `SELECT id, username, student_id, email, avatar, nickname, role, level, exp, badge, weekly_comment_count, created_at,
                  college
             FROM users
            WHERE id = ?`,
          [userId]
        );
      } catch (inner) {
        if (inner && inner.code === 'ER_BAD_FIELD_ERROR') {
          rows = await query(
            'SELECT id, username, student_id, email, avatar, nickname, role, level, exp, badge, weekly_comment_count, created_at FROM users WHERE id = ?',
            [userId]
          );
        } else {
          throw inner;
        }
      }
      const row = rows?.[0] || null;
      return row ? {
        ...row,
        college: row.college || null,
        grade: null,
        major: null,
        show_college: 1,
        show_grade: 1,
        show_major: 0,
      } : null;
    }
    throw e;
  }
}

async function getUserActiveDirections(userId) {
  const [postRows, reviewRows, clubRows, favoriteRows] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM posts WHERE user_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0', [userId]).catch(() => [{ total: 0 }]),
    query('SELECT COUNT(*) AS total FROM product_comments WHERE user_id = ? AND parent_id IS NULL AND deleted_at IS NULL', [userId]).catch(() => [{ total: 0 }]),
    query(
      `SELECT
        (SELECT COUNT(*) FROM club_activity_registrations WHERE user_id = ? AND status = 'registered' AND cancelled_at IS NULL) +
        (SELECT COUNT(*) FROM club_follows WHERE user_id = ?) +
        (SELECT COUNT(*) FROM club_members WHERE user_id = ?) AS total`,
      [userId, userId, userId]
    ).catch(() => [{ total: 0 }]),
    query('SELECT COUNT(*) AS total FROM favorite_products WHERE user_id = ?', [userId]).catch(() => [{ total: 0 }]),
  ]);

  return [
    { key: 'treehole', label: '树洞表达', value: Number(postRows?.[0]?.total) || 0, hint: '发帖与互动记录' },
    { key: 'canteen', label: '食堂点评', value: Number(reviewRows?.[0]?.total) || 0, hint: '菜品点评与口味偏好' },
    { key: 'club', label: '社团参与', value: Number(clubRows?.[0]?.total) || 0, hint: '关注、报名与社团关系' },
    { key: 'favorite', label: '收藏探索', value: Number(favoriteRows?.[0]?.total) || 0, hint: '长期保留的兴趣线索' },
  ]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

async function getUserRecentParticipation(userId) {
  const [latestPost, latestReview, latestActivity] = await Promise.all([
    query(
      `SELECT id, content, created_at
         FROM posts
        WHERE user_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId]
    ).catch(() => []),
    query(
      `SELECT pc.id, pc.product_id, pc.created_at, p.name AS product_name
         FROM product_comments pc
         JOIN products p ON p.id = pc.product_id
        WHERE pc.user_id = ? AND pc.parent_id IS NULL AND pc.deleted_at IS NULL
        ORDER BY pc.created_at DESC
        LIMIT 1`,
      [userId]
    ).catch(() => []),
    query(
      `SELECT r.id, r.activity_id, r.created_at, a.title
         FROM club_activity_registrations r
         JOIN club_activities a ON a.id = r.activity_id
        WHERE r.user_id = ? AND r.status = 'registered' AND r.cancelled_at IS NULL
        ORDER BY r.created_at DESC
        LIMIT 1`,
      [userId]
    ).catch(() => []),
  ]);

  const items = [];
  if (latestPost?.[0]) {
    items.push({
      key: `post-${latestPost[0].id}`,
      type: 'treehole',
      label: '最近发树洞',
      title: String(latestPost[0].content || '').trim().slice(0, 42) || '一条新的树洞动态',
      href: `/post/${latestPost[0].id}`,
      created_at: latestPost[0].created_at,
    });
  }
  if (latestReview?.[0]) {
    items.push({
      key: `review-${latestReview[0].id}`,
      type: 'canteen',
      label: '最近点评',
      title: latestReview[0].product_name || '食堂点评',
      href: `/eat/food/${latestReview[0].product_id}`,
      created_at: latestReview[0].created_at,
    });
  }
  if (latestActivity?.[0]) {
    items.push({
      key: `activity-${latestActivity[0].id}`,
      type: 'club',
      label: '最近参与活动',
      title: latestActivity[0].title || '社团活动',
      href: `/about/club/activity/${latestActivity[0].activity_id}`,
      created_at: latestActivity[0].created_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 3);
}

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const ttlMs = Number(process.env.CACHE_USER_ME_TTL_MS || 15 * 1000);
    const cacheKey = `users:me:v1:${req.user.id}`;
    const rows = await simpleCache.getOrSet(cacheKey, ttlMs, async () => {
      const row = await getUserBaseRow(req.user.id);
      return row ? [row] : [];
    });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }

    const u = rows[0];
    const campusIdentity = normalizeCampusIdentity(u, true);
    const data = {
      id: u.id,
      student_id: u.student_id,
      username: u.username,
      email: u.email,
      role: u.role,
      nickname: u.nickname,
      avatar: u.avatar ? assetUrl(u.avatar) : DEFAULT_AVATAR,
      weekly_comment_count: u.weekly_comment_count != null ? u.weekly_comment_count : 0,
      created_at: u.created_at,
      college: campusIdentity.raw?.college || null,
      grade: campusIdentity.raw?.grade || null,
      major: campusIdentity.raw?.major || null,
      show_college: campusIdentity.visibility.show_college,
      show_grade: campusIdentity.visibility.show_grade,
      show_major: campusIdentity.visibility.show_major,
      ...formatAuthorLevel(u),
      levelProgress: getExpProgress(u.exp != null ? u.exp : 0),
    };
    res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data });
  } catch (e) {
    console.error('èŽ·å–å½“å‰ç”¨æˆ·é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

router.get('/me/level', authenticateToken, async (req, res) => {
  try {
    const summary = await getUserLevelSummary(req.user.id);
    if (!summary) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }
    res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data: summary });
  } catch (e) {
    console.error('èŽ·å–ç­‰çº§é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

router.get('/:id/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ status: -1, message: 'ç”¨æˆ· ID æ— æ•ˆ' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize);
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: 'åˆ†é¡µå‚æ•°æ— æ•ˆ' });
    }

    const viewer = parseOptionalUser(req);
    const viewerId = viewer && viewer.id != null ? parseInt(viewer.id, 10) : 0;
    const isSelf = viewerId > 0 && viewerId === userId;
    const cacheKey = `user_profile_v3:${userId}:viewer:${viewerId || 0}:p:${page}:s:${pageSize}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data: cached });
    }

    const u = await getUserBaseRow(userId);
    if (!u) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }

    const [activeDirections, recentParticipation] = await Promise.all([
      getUserActiveDirections(userId),
      getUserRecentParticipation(userId),
    ]);
    const campusIdentity = normalizeCampusIdentity(u, isSelf);

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
        `SELECT post_id, file_path, sort_order
           FROM post_images
          WHERE post_id IN (${placeholders})
          ORDER BY post_id, sort_order`,
        postIds
      );
      likeCounts = await query(
        `SELECT post_id, COUNT(*) AS cnt
           FROM post_likes
          WHERE post_id IN (${placeholders})
          GROUP BY post_id`,
        postIds
      );
      commentCounts = await query(
        `SELECT post_id, COUNT(*) AS cnt
           FROM comments
          WHERE post_id IN (${placeholders}) AND deleted_at IS NULL
          GROUP BY post_id`,
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
      images: (imagesByPost[p.id] || []).sort((a, b) => a.sort_order - b.sort_order),
    }));

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
        weekly_comment_count: u.weekly_comment_count != null ? u.weekly_comment_count : 0,
        campus_identity: campusIdentity,
        ...formatAuthorLevel(u),
        levelProgress: getExpProgress(u.exp != null ? u.exp : 0),
      },
      campus_identity: campusIdentity,
      active_directions: activeDirections,
      recent_participation: recentParticipation,
      posts: postList,
      stats: {
        post_count: Number((statsRow && statsRow.post_count) || 0),
        comment_received_count: Number((statsRow && statsRow.comment_received_count) || 0),
        like_received_count: Number((statsRow && statsRow.like_received_count) || 0),
      },
      page,
      pageSize,
      hasMore: (posts || []).length === pageSize,
    };
    simpleCache.set(cacheKey, data, Number(process.env.CACHE_USER_PROFILE_TTL_MS || 10 * 1000));
    res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data });
  } catch (e) {
    console.error('ä¸ªäººç©ºé—´é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const rawName = (req.body && (req.body.nickname ?? req.body.username)) || '';
    const nickname = String(rawName).trim();
    if (!nickname) {
      return res.status(400).json({ status: -1, message: 'æ˜µç§°ä¸èƒ½ä¸ºç©º' });
    }
    const lower = nickname.toLowerCase();
    if (lower === 'admin' || lower === 'xmumdorm_official') {
      return res.status(400).json({ status: -1, message: 'è¯¥æ˜µç§°ä¸ºå®˜æ–¹ä¿ç•™åç§°ï¼Œæ— æ³•ä½¿ç”¨' });
    }

    const college = safeText(req.body?.college);
    const grade = safeText(req.body?.grade);
    const major = safeText(req.body?.major);
    const showCollege = rowTruthyLike(req.body?.show_college == null ? 1 : req.body.show_college) ? 1 : 0;
    const showGrade = rowTruthyLike(req.body?.show_grade == null ? 1 : req.body.show_grade) ? 1 : 0;
    const showMajor = rowTruthyLike(req.body?.show_major == null ? 0 : req.body.show_major) ? 1 : 0;

    try {
      await query(
        `UPDATE users
            SET nickname = ?, college = ?, grade = ?, major = ?, show_college = ?, show_grade = ?, show_major = ?
          WHERE id = ?`,
        [nickname, college, grade, major, showCollege, showGrade, showMajor, req.user.id]
      );
    } catch (e) {
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        await query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
      } else {
        throw e;
      }
    }

    simpleCache.delete(`users:me:v1:${req.user.id}`);
    res.status(200).json({
      status: 0,
      message: 'èµ„æ–™å·²æ›´æ–°',
      data: {
        nickname,
        college,
        grade,
        major,
        show_college: !!showCollege,
        show_grade: !!showGrade,
        show_major: !!showMajor,
      },
    });
  } catch (e) {
    console.error('æ›´æ–°èµ„æ–™é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

router.patch('/me/avatar', authenticateToken, (req, res, next) => {
  avatarUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: -1,
        message: err.message || 'ä»…æ”¯æŒ jpg/png/webp/gifï¼Œå•å¼ â‰¤8MB',
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ status: -1, message: 'è¯·ä¸Šä¼ å›¾ç‰‡' });
    }
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.jpg';
    const ts = Date.now();
    const key = `avatars/user_${req.user.id}_${ts}${safeExt}`;
    await uploadBuffer({ key, body: req.file.buffer, contentType: guessContentType(req.file.mimetype, safeExt) });
    await query('UPDATE users SET avatar = ? WHERE id = ?', [key, req.user.id]);
    simpleCache.delete(`users:me:v1:${req.user.id}`);
    res.status(200).json({
      status: 0,
      message: 'å¤´åƒæ›´æ–°æˆåŠŸ',
      data: { avatar: assetUrl(key) },
    });
  } catch (e) {
    console.error('å¤´åƒä¸Šä¼ é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

module.exports = router;
