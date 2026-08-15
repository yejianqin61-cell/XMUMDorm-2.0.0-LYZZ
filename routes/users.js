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

function parsePositiveInteger(value) {
  const text = String(value == null ? '' : value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
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

function formatPublicProfileUser(user, campusIdentity) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar ? assetUrl(user.avatar) : DEFAULT_AVATAR,
    campus_identity: campusIdentity,
    ...formatAuthorLevel(user),
    levelProgress: getExpProgress(user.exp != null ? user.exp : 0),
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
    const userId = parsePositiveInteger(req.params.id);
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
    const viewerId = parsePositiveInteger(viewer?.id) || 0;
    const isSelf = viewerId > 0 && viewerId === userId;
    const cacheKey = `user_profile_v5:${userId}:viewer:${viewerId || 0}:p:${page}:s:${pageSize}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data: cached });
    }

    const u = await getUserBaseRow(userId);
    if (!u) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }

    const campusIdentity = normalizeCampusIdentity(u, isSelf);

    const posts = await query(
      `SELECT p.id, p.content, p.type, p.created_at
         FROM posts p
        WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
          AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)
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
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS post_count,
        (SELECT COUNT(*) FROM post_likes pl INNER JOIN posts p ON pl.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS like_received_count,
        (SELECT COUNT(*) FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS comment_received_count`,
      [userId, userId, userId]
    );

    const data = {
      user: formatPublicProfileUser(u, campusIdentity),
      campus_identity: campusIdentity,
      posts: postList,
      stats: {
        post_count: Number((statsRow && statsRow.post_count) || 0),
        comment_received_count: Number((statsRow && statsRow.comment_received_count) || 0),
        like_received_count: Number((statsRow && statsRow.like_received_count) || 0),
      },
      page,
      pageSize,
      hasMore: offset + postList.length < Number((statsRow && statsRow.post_count) || 0),
    };
    simpleCache.set(cacheKey, data, Number(process.env.CACHE_USER_PROFILE_TTL_MS || 10 * 1000));
    res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data });
  } catch (e) {
    console.error('ä¸ªäººç©ºé—´é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query("UPDATE users SET status = 'deactivated' WHERE id = ? AND status <> 'deactivated'", [req.user.id]);
    if (!result.affectedRows) {
      return res.status(400).json({ status: -1, message: '账号已注销或不存在' });
    }

    simpleCache.delete(`users:me:v1:${req.user.id}`);
    res.status(200).json({ status: 0, message: '账号已注销' });
  } catch (e) {
    console.error('注销账号错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
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
