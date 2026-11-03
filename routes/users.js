/**
 * ============================================
 * 用户相关路由（2.0.0）
 * ============================================
 * 个人空间（资料 + 帖子 + 统计）、头像上传
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { query, pool } = require('../database');
const academicIdentity = require('../services/academicIdentity');
const authenticateToken = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');
const { assetUrl } = require('../utils/assets');
const { uploadBuffer } = require('../services/objectStorage');
const { prepareImageUpload } = require('../services/imageProcessing');
const { simpleCache } = require('../utils/simpleCache');
const { getUserLevelSummary, formatAuthorLevel } = require('../services/expService');
const { getExpProgress } = require('../constants/levelThresholds');
const { CURRENT_TERMS_VERSION, getCurrentTermsStatus } = require('../services/termsAcceptance');

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

function normalizeCampusIdentity(row) {
  const showCollege = rowTruthyLike(row.show_college == null ? 1 : row.show_college);
  const showGrade = rowTruthyLike(row.show_grade == null ? 1 : row.show_grade);
  const showMajor = rowTruthyLike(row.show_major == null ? 0 : row.show_major);
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
  };
}

function formatPublicProfileUser(user, campusIdentity) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar ? assetUrl(user.avatar) : DEFAULT_AVATAR,
    dorm_id: user.dorm_id,
    campus_identity: campusIdentity,
    ...formatAuthorLevel(user),
    levelProgress: getExpProgress(user.exp != null ? user.exp : 0),
  };
}

async function getPublicProfileStats(userId, viewerId) {
  try {
    return await query(
      `SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS post_count,
        (SELECT COUNT(*) FROM post_likes pl INNER JOIN posts p ON pl.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS like_received_count,
        (SELECT COUNT(*) FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS comment_received_count,
        (SELECT COUNT(*) FROM user_follows uf INNER JOIN users follower ON follower.id = uf.follower_id AND follower.status <> 'deactivated' WHERE uf.following_id = ?) AS follower_count,
        (SELECT COUNT(*) FROM user_follows uf INNER JOIN users followed ON followed.id = uf.following_id AND followed.status <> 'deactivated' WHERE uf.follower_id = ?) AS following_count,
        EXISTS(SELECT 1 FROM user_follows uf WHERE uf.follower_id = ? AND uf.following_id = ?) AS viewer_is_following`,
      [userId, userId, userId, userId, userId, viewerId, userId]
    );
  } catch (error) {
    const missingFollowsTable = error?.code === 'ER_NO_SUCH_TABLE' && /user_follows/i.test(error.message || '');
    if (!missingFollowsTable) throw error;

    console.warn('user_follows 表尚未迁移，公开主页暂不显示关注数据');
    const rows = await query(
      `SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS post_count,
        (SELECT COUNT(*) FROM post_likes pl INNER JOIN posts p ON pl.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS like_received_count,
        (SELECT COUNT(*) FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0 AND c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)) AS comment_received_count`,
      [userId, userId, userId]
    );
    return (rows || []).map((row) => ({
      ...row,
      follower_count: 0,
      following_count: 0,
      viewer_is_following: 0,
    }));
  }
}

async function getUserBaseRow(userId) {
  try {
    const rows = await query(
      `SELECT id, username, student_id, dorm_id, email, avatar, nickname, role, level, exp, badge, weekly_comment_count, created_at,
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
          `SELECT id, username, student_id, dorm_id, email, avatar, nickname, role, level, exp, badge, weekly_comment_count, created_at,
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
        dorm_id: row.dorm_id || null,
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
    const cacheKey = `users:me:v2:${req.user.id}`;
    const rows = await simpleCache.getOrSet(cacheKey, ttlMs, async () => {
      const row = await getUserBaseRow(req.user.id);
      return row ? [row] : [];
    });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }

    const u = rows[0];
    const campusIdentity = normalizeCampusIdentity(u);
    const data = {
      id: u.id,
      dorm_id: u.dorm_id,
      student_id: u.student_id,
      username: u.username,
      email: u.email,
      role: u.role,
      nickname: u.nickname,
      avatar: u.avatar ? assetUrl(u.avatar) : DEFAULT_AVATAR,
      weekly_comment_count: u.weekly_comment_count != null ? u.weekly_comment_count : 0,
      created_at: u.created_at,
      ...(await academicIdentity.ownSelection(pool, req.user.id)),
      college: safeText(u.college),
      grade: safeText(u.grade),
      major: safeText(u.major),
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

// 当前用户的服务端条款接受状态（按版本记录，客户端缓存不是授权依据）
router.get('/me/terms', authenticateToken, async (req, res) => {
  try {
    const terms = await getCurrentTermsStatus(req.user.id);
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: terms,
    });
  } catch (e) {
    console.error('获取条款状态错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/me/terms/accept', authenticateToken, async (req, res) => {
  try {
    const version = typeof req.body?.version === 'string' ? req.body.version.trim() : '';
    if (version !== CURRENT_TERMS_VERSION) {
      return res.status(400).json({ status: -1, message: '条款版本无效或已过期', data: { version: CURRENT_TERMS_VERSION } });
    }
    await query(
      `INSERT INTO user_terms_acceptances (user_id, terms_version)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE accepted_at = CURRENT_TIMESTAMP`,
      [req.user.id, CURRENT_TERMS_VERSION]
    );
    const rows = await query(
      'SELECT accepted_at FROM user_terms_acceptances WHERE user_id = ? AND terms_version = ? LIMIT 1',
      [req.user.id, CURRENT_TERMS_VERSION]
    );
    res.status(200).json({
      status: 0,
      message: '已接受条款',
      data: { version: CURRENT_TERMS_VERSION, accepted: true, accepted_at: rows?.[0]?.accepted_at || null },
    });
  } catch (e) {
    console.error('接受条款错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
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

router.get('/me/posts', authenticateToken, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  if (!Number.isSafeInteger((page - 1) * pageSize)) return res.status(400).json({ status: -1, message: '分页参数无效' });
  try {
    const data = await require('../services/myPosts').getMyPosts(req.user.id, page, pageSize);
    res.json({ status: 0, data });
  } catch (error) {
    console.error('获取我的帖子失败:', error);
    res.status(500).json({ status: -1, message: '帖子加载失败，请重试' });
  }
});

router.get('/:id/profile', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store');
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
    const cacheKey = `user_profile_v8:${userId}:viewer:${viewerId || 0}:p:${page}:s:${pageSize}`;
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 0, message: 'èŽ·å–æˆåŠŸ', data: cached });
    }

    const [u, posts, statsRows] = await Promise.all([
      getUserBaseRow(userId),
      query(
        `SELECT post_page.*, pi.file_path AS image_file_path, pi.sort_order AS image_sort_order
           FROM (
             SELECT p.id, p.content, p.type, p.created_at,
                    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
                    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
               FROM posts p
              WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
                AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)
              ORDER BY p.created_at DESC
              LIMIT ${limitNum} OFFSET ${offsetNum}
           ) post_page
           LEFT JOIN post_images pi ON pi.post_id = post_page.id
          ORDER BY post_page.created_at DESC, pi.sort_order`,
        [userId]
      ),
      getPublicProfileStats(userId, viewerId),
    ]);
    if (!u) {
      return res.status(404).json({ status: -1, message: 'ç”¨æˆ·ä¸å­˜åœ¨' });
    }

    const campusIdentity = normalizeCampusIdentity(u);

    const statsRow = statsRows?.[0];
    const postsById = new Map();
    for (const p of posts || []) {
      if (!postsById.has(p.id)) {
        postsById.set(p.id, {
          id: p.id,
          content: p.content,
          type: p.type,
          created_at: p.created_at,
          like_count: Number(p.like_count) || 0,
          comment_count: Number(p.comment_count) || 0,
          user_liked: false,
          images: [],
        });
      }
      if (p.image_file_path) {
        postsById.get(p.id).images.push({ url: assetUrl(p.image_file_path), sort_order: p.image_sort_order });
      }
    }
    const postList = Array.from(postsById.values());

    const data = {
      user: formatPublicProfileUser(u, campusIdentity),
      campus_identity: campusIdentity,
      posts: postList,
      stats: {
        post_count: Number((statsRow && statsRow.post_count) || 0),
        comment_received_count: Number((statsRow && statsRow.comment_received_count) || 0),
        like_received_count: Number((statsRow && statsRow.like_received_count) || 0),
        follower_count: Number((statsRow && statsRow.follower_count) || 0),
        following_count: Number((statsRow && statsRow.following_count) || 0),
      },
      viewer: { is_following: rowTruthyLike(statsRow?.viewer_is_following) },
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

async function getUserRelationList(userId, relation, page, pageSize) {
  const isFollowers = relation === 'followers';
  const relatedUserColumn = isFollowers ? 'uf.follower_id' : 'uf.following_id';
  const targetColumn = isFollowers ? 'uf.following_id' : 'uf.follower_id';
  const offset = (page - 1) * pageSize;
  const [countRows, rows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
         FROM user_follows uf
         INNER JOIN users u ON u.id = ${relatedUserColumn}
        WHERE ${targetColumn} = ? AND u.status <> 'deactivated'`,
      [userId]
    ),
    query(
      `SELECT u.id, u.username, u.nickname, u.avatar, uf.created_at
         FROM user_follows uf
         INNER JOIN users u ON u.id = ${relatedUserColumn}
        WHERE ${targetColumn} = ? AND u.status <> 'deactivated'
        ORDER BY uf.created_at DESC, u.id DESC
        LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    ),
  ]);
  const total = Number(countRows?.[0]?.total) || 0;
  return {
    users: (rows || []).map((row) => ({
      id: row.id,
      username: row.username,
      nickname: row.nickname,
      avatar: row.avatar ? assetUrl(row.avatar) : DEFAULT_AVATAR,
      created_at: row.created_at,
    })),
    page,
    pageSize,
    total,
    hasMore: offset + (rows?.length || 0) < total,
  };
}

async function handleUserRelationList(req, res, relation) {
  const userId = parsePositiveInteger(req.params.id);
  if (!userId) return res.status(400).json({ status: -1, message: '无效的用户 ID' });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 30));
  if (!Number.isSafeInteger((page - 1) * pageSize)) {
    return res.status(400).json({ status: -1, message: '分页参数无效' });
  }
  try {
    const exists = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!exists?.length) return res.status(404).json({ status: -1, message: '用户不存在' });
    const data = await getUserRelationList(userId, relation, page, pageSize);
    return res.json({ status: 0, data });
  } catch (error) {
    console.error('获取用户关系列表失败:', error);
    return res.status(500).json({ status: -1, message: '列表暂时无法加载' });
  }
}

router.get('/:id/followers', (req, res) => handleUserRelationList(req, res, 'followers'));
router.get('/:id/following', (req, res) => handleUserRelationList(req, res, 'following'));

router.post('/:id/follow', authenticateToken, async (req, res) => {
  const targetId = parsePositiveInteger(req.params.id);
  if (!targetId) return res.status(400).json({ status: -1, message: '无效的用户 ID' });
  if (targetId === Number(req.user.id)) return res.status(400).json({ status: -1, message: '不能关注自己' });
  try {
    const target = await query("SELECT id FROM users WHERE id = ? AND status <> 'deactivated' LIMIT 1", [targetId]);
    if (!target?.length) return res.status(404).json({ status: -1, message: '用户不存在' });
    await query('INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, targetId]);
    const counts = await query(
      `SELECT COUNT(*) AS total FROM user_follows uf
        INNER JOIN users follower ON follower.id = uf.follower_id AND follower.status <> 'deactivated'
       WHERE uf.following_id = ?`,
      [targetId]
    );
    return res.json({ status: 0, data: { following: true, follower_count: Number(counts?.[0]?.total) || 0 } });
  } catch (error) {
    console.error('关注用户失败:', error);
    return res.status(500).json({ status: -1, message: '操作失败，请稍后重试' });
  }
});

router.delete('/:id/follow', authenticateToken, async (req, res) => {
  const targetId = parsePositiveInteger(req.params.id);
  if (!targetId) return res.status(400).json({ status: -1, message: '无效的用户 ID' });
  if (targetId === Number(req.user.id)) return res.status(400).json({ status: -1, message: '操作无效' });
  try {
    await query('DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
    const counts = await query(
      `SELECT COUNT(*) AS total FROM user_follows uf
        INNER JOIN users follower ON follower.id = uf.follower_id AND follower.status <> 'deactivated'
       WHERE uf.following_id = ?`,
      [targetId]
    );
    return res.json({ status: 0, data: { following: false, follower_count: Number(counts?.[0]?.total) || 0 } });
  } catch (error) {
    console.error('取消关注失败:', error);
    return res.status(500).json({ status: -1, message: '操作失败，请稍后重试' });
  }
});

router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query("UPDATE users SET status = 'deactivated' WHERE id = ? AND status <> 'deactivated'", [req.user.id]);
    if (!result.affectedRows) {
      return res.status(400).json({ status: -1, message: '账号已注销或不存在' });
    }

    simpleCache.delete(`users:me:v2:${req.user.id}`);
    res.status(200).json({ status: 0, message: '账号已注销' });
  } catch (e) {
    console.error('注销账号错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const data = await academicIdentity.saveProfile(pool, req.user.id, req.body || {});
    simpleCache.delete(`users:me:v2:${req.user.id}`);
    res.json({ status: 0, message: '资料已更新', data });
  } catch (e) {
    res.status(e.status || 503).json({ status: -1, code: e.code || 'PROFILE_SAVE_FAILED', message: e.status ? e.message : '资料保存失败，请重试' });
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
    const prepared = await prepareImageUpload({ key: `avatars/user_${req.user.id}_${ts}${safeExt}`, body: req.file.buffer, mimetype: req.file.mimetype });
    await uploadBuffer(prepared);
    await query('UPDATE users SET avatar = ? WHERE id = ?', [prepared.key, req.user.id]);
    simpleCache.delete(`users:me:v2:${req.user.id}`);
    res.status(200).json({
      status: 0,
      message: 'å¤´åƒæ›´æ–°æˆåŠŸ',
      data: { avatar: assetUrl(prepared.key) },
    });
  } catch (e) {
    console.error('å¤´åƒä¸Šä¼ é”™è¯¯:', e);
    res.status(500).json({ status: -1, message: 'æœåŠ¡å™¨é”™è¯¯ï¼Œè¯·ç¨åŽé‡è¯•' });
  }
});

module.exports = router;
