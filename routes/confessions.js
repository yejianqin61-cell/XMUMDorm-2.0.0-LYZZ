/**
 * 万能墙（Confession Wall）路由 — M09
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md
 *
 * 核心不变量（**任何改动都不得破坏**）：
 *   1. 匿名性 —— 本文件所有对外响应**永不包含** user_id / username / nickname / avatar。
 *      条目一律经 projectConfession / projectComment 逐字段白名单构造，绝不 `...row` 展开。
 *   2. 身份字段仅用于：点赞去重、作者/admin 删除权限判定、管理员后台追溯。
 *   3. 路由注册顺序：/window 与 /meta 必须在 /:id 之前，否则会被 /:id 吞掉。
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { checkSanction } = require('../middleware/checkSanction');
const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');
const authenticateToken = require('../middleware/auth');
const { logAudit } = require('../services/auditLog');
const { simpleCache } = require('../utils/simpleCache');
const { cleanText } = require('../utils/cleanText');
const { parseOptionalUser } = require('../utils/parseOptionalUser');
const { nestComments } = require('../shared/utils/nestComments');
const {
  CONFESSION_TEMPLATE_KEYS,
  DEFAULT_CONFESSION_TEMPLATE,
  normalizeTemplateKey,
  getTemplateMaxLength,
} = require('../constants/confessionTemplates');

/** 单次窗口大小钳制范围 */
const LIMIT_MIN = 1;
const LIMIT_MAX = 10;
const LIMIT_DEFAULT = 5;

/** 评论长度上限（与设计文档 §6.5 一致） */
const COMMENT_MAX_LENGTH = 500;

/** 总篇数缓存 TTL：列表页每翻一窗都要 total，短缓存即可 */
const TOTAL_CACHE_TTL_MS = 15 * 1000;

/** 匿名展示名（写死，不接受客户端传入） */
const ANONYMOUS_LABEL = { zh: '匿名', en: 'Anonymous' };

// ============================================
// 工具函数
// ============================================

/** 当前用户是否为 admin */
function isAdmin(req) {
  return Boolean(req.user && req.user.role === 'admin');
}

/** 把 query 参数钳制为合法 limit */
function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return LIMIT_DEFAULT;
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, n));
}

/**
 * 匿名投影：把数据库行转成对外可见的帖子对象。
 * 逐字段构造，**不**展开原始行，从结构上杜绝身份字段泄漏。
 */
function projectConfession(row, viewerId) {
  const likeCount = Number(row.like_count) || 0;
  return {
    id: Number(row.id),
    template_key: normalizeTemplateKey(row.template_key),
    content: String(row.content == null ? '' : row.content),
    author: {
      display_name: ANONYMOUS_LABEL.zh,
      display_name_en: ANONYMOUS_LABEL.en,
    },
    like_count: likeCount,
    liked: Number(row.liked) === 1,
    comment_count: Number(row.comment_count) || 0,
    created_at: row.created_at,
    viewer_is_author: Boolean(
      viewerId != null && row.viewer_is_author != null && Number(row.viewer_is_author) === 1
    ),
  };
}

/**
 * 匿名投影：评论。同样逐字段构造。
 *
 * viewer_is_mine 是**布尔值**，只回答「这条评论是不是你自己发的」，
 * 用来决定是否渲染删除按钮——它不泄露任何人的身份，
 * 并且只有登录用户才可能出现 true（未登录时恒为 false）。
 */
function projectComment(row, viewerId) {
  return {
    id: Number(row.id),
    parent_id: row.parent_id == null ? null : Number(row.parent_id),
    content: String(row.content == null ? '' : row.content),
    author: {
      display_name: ANONYMOUS_LABEL.zh,
      display_name_en: ANONYMOUS_LABEL.en,
    },
    viewer_is_mine: Boolean(
      viewerId != null && row.user_id != null && Number(row.user_id) === Number(viewerId)
    ),
    created_at: row.created_at,
  };
}

/** 帖子对外查询的公共 SELECT 片段（单篇用，window 里有批量版本） */
const SINGLE_SELECT = `
  SELECT c.id, c.template_key, c.content, c.created_at,
         (SELECT COUNT(*) FROM confession_likes l WHERE l.confession_id = c.id) AS like_count,
         (SELECT COUNT(*) FROM confession_comments cc WHERE cc.confession_id = c.id AND cc.deleted_at IS NULL) AS comment_count
  FROM confessions c
`;

/**
 * 取「当前用户是否已赞 / 是否作者」的批量映射。
 * 未登录（viewerId == null）时直接返回空映射，不发无意义的查询。
 */
async function fetchViewerState(ids, viewerId) {
  const state = { liked: new Set(), authored: new Set() };
  if (viewerId == null || !Array.isArray(ids) || ids.length === 0) return state;

  const placeholders = ids.map(() => '?').join(',');

  const [likedRows, authoredRows] = await Promise.all([
    query(
      `SELECT confession_id FROM confession_likes WHERE user_id = ? AND confession_id IN (${placeholders})`,
      [viewerId, ...ids]
    ),
    query(
      `SELECT id FROM confessions WHERE user_id = ? AND id IN (${placeholders})`,
      [viewerId, ...ids]
    ),
  ]);

  (likedRows || []).forEach((r) => state.liked.add(Number(r.confession_id)));
  (authoredRows || []).forEach((r) => state.authored.add(Number(r.id)));
  return state;
}

/** 批量取评论数映射（window 专用） */
async function fetchCommentCounts(ids) {
  const map = new Map();
  if (!Array.isArray(ids) || ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT confession_id, COUNT(*) AS cnt
       FROM confession_comments
      WHERE deleted_at IS NULL AND confession_id IN (${placeholders})
      GROUP BY confession_id`,
    ids
  );
  (rows || []).forEach((r) => map.set(Number(r.confession_id), Number(r.cnt) || 0));
  return map;
}

/** 批量取点赞数映射（window 专用） */
async function fetchLikeCounts(ids) {
  const map = new Map();
  if (!Array.isArray(ids) || ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT confession_id, COUNT(*) AS cnt
       FROM confession_likes
      WHERE confession_id IN (${placeholders})
      GROUP BY confession_id`,
    ids
  );
  (rows || []).forEach((r) => map.set(Number(r.confession_id), Number(r.cnt) || 0));
  return map;
}

/** 总篇数（带短缓存，避免每窗一次 COUNT(*)） */
async function fetchTotal() {
  return simpleCache.getOrSet('confessions:total:v1', TOTAL_CACHE_TTL_MS, async () => {
    const rows = await query(
      'SELECT COUNT(*) AS total FROM confessions WHERE deleted_at IS NULL AND hidden_by_admin = 0'
    );
    return Number(rows && rows[0] && rows[0].total) || 0;
  });
}

/** 把 id 列表补齐为完整的对外帖子对象（保持传入顺序） */
async function hydrateConfessions(ids, viewerId) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT id, template_key, content, created_at
       FROM confessions
      WHERE id IN (${placeholders}) AND deleted_at IS NULL AND hidden_by_admin = 0`,
    ids
  );

  const byId = new Map();
  (rows || []).forEach((r) => byId.set(Number(r.id), r));

  // 按传入顺序输出，并丢掉中间被删除/隐藏的条目
  const present = ids.filter((id) => byId.has(Number(id)));
  const [likeCounts, commentCounts, viewerState] = await Promise.all([
    fetchLikeCounts(present),
    fetchCommentCounts(present),
    fetchViewerState(present, viewerId),
  ]);

  return present.map((id) => {
    const row = byId.get(Number(id));
    return projectConfession(
      {
        ...row,
        like_count: likeCounts.get(Number(id)) || 0,
        comment_count: commentCounts.get(Number(id)) || 0,
        liked: viewerState.liked.has(Number(id)) ? 1 : 0,
        viewer_is_author: viewerState.authored.has(Number(id)) ? 1 : 0,
      },
      viewerId
    );
  });
}

// ============================================
// GET /window — 游标分页窗口（翻页核心）
// ⚠️ 必须注册在 /:id 之前
// ============================================
router.get('/window', async (req, res) => {
  try {
    const viewer = parseOptionalUser(req);
    const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;
    const limit = parseLimit(req.query.limit);
    const direction = req.query.direction === 'newer' ? 'newer' : 'older';
    const rawCursor = req.query.cursor;
    const cursor = rawCursor === undefined || rawCursor === '' ? null : parseInt(rawCursor, 10);

    const total = await fetchTotal();

    let ids = [];

    if (cursor === null || !Number.isFinite(cursor)) {
      // 无锚点：取最新的一窗
      const rows = await query(
        `SELECT id FROM confessions
          WHERE deleted_at IS NULL AND hidden_by_admin = 0
          ORDER BY id DESC
          LIMIT ${limit}`
      );
      ids = (rows || []).map((r) => Number(r.id));
    } else if (direction === 'older') {
      const rows = await query(
        `SELECT id FROM confessions
          WHERE deleted_at IS NULL AND hidden_by_admin = 0 AND id < ?
          ORDER BY id DESC
          LIMIT ${limit}`,
        [cursor]
      );
      ids = (rows || []).map((r) => Number(r.id));
    } else {
      // newer：按 ASC 取最近的一批，再在应用层反转，保证前端永远拿到「新 → 旧」
      const rows = await query(
        `SELECT id FROM confessions
          WHERE deleted_at IS NULL AND hidden_by_admin = 0 AND id > ?
          ORDER BY id ASC
          LIMIT ${limit}`,
        [cursor]
      );
      ids = (rows || []).map((r) => Number(r.id)).reverse();
    }

    const items = await hydrateConfessions(ids, viewerId);

    // 是否还有更旧 / 更新的内容
    let hasOlder = false;
    let hasNewer = false;
    if (items.length > 0) {
      const oldest = items[items.length - 1].id;
      const newest = items[0].id;
      const [olderRows, newerRows] = await Promise.all([
        query(
          'SELECT 1 FROM confessions WHERE deleted_at IS NULL AND hidden_by_admin = 0 AND id < ? LIMIT 1',
          [oldest]
        ),
        query(
          'SELECT 1 FROM confessions WHERE deleted_at IS NULL AND hidden_by_admin = 0 AND id > ? LIMIT 1',
          [newest]
        ),
      ]);
      hasOlder = Boolean(olderRows && olderRows.length > 0);
      hasNewer = Boolean(newerRows && newerRows.length > 0);
    }

    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        items,
        has_older: hasOlder,
        has_newer: hasNewer,
        oldest_cursor: items.length > 0 ? items[items.length - 1].id : null,
        newest_cursor: items.length > 0 ? items[0].id : null,
        total,
      },
    });
  } catch (e) {
    console.error('万能墙窗口获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// GET /meta — 总篇数（供「第 n 篇 / 共 m 篇」）
// ⚠️ 必须注册在 /:id 之前
// ============================================
router.get('/meta', async (_req, res) => {
  try {
    const total = await fetchTotal();
    res.status(200).json({ status: 0, message: '获取成功', data: { total } });
  } catch (e) {
    console.error('万能墙 meta 获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// POST / — 投稿（先发后审）
// ============================================
router.post('/', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const rawTemplateKey = req.body && req.body.template_key;
    const safeContent = cleanText(req.body && req.body.content);

    // 1. 版式白名单
    if (rawTemplateKey != null && rawTemplateKey !== '' && !CONFESSION_TEMPLATE_KEYS.includes(rawTemplateKey)) {
      return res.status(400).json({ status: -1, message: '无效的版式' });
    }
    const templateKey = rawTemplateKey == null || rawTemplateKey === ''
      ? DEFAULT_CONFESSION_TEMPLATE
      : rawTemplateKey;

    // 2. 正文非空
    if (!safeContent) {
      return res.status(400).json({ status: -1, message: '正文不能为空' });
    }

    // 3. 长度上限（按版式）
    const maxLength = getTemplateMaxLength(templateKey);
    if (safeContent.length > maxLength) {
      return res.status(400).json({ status: -1, message: `正文超出该版式字数上限（${maxLength} 字）` });
    }

    const result = await query(
      'INSERT INTO confessions (user_id, template_key, content) VALUES (?, ?, ?)',
      [req.user.id, templateKey, safeContent]
    );

    // 新投稿让总篇数缓存失效
    simpleCache.delete('confessions:total:v1');

    const rows = await query(`${SINGLE_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL AND c.hidden_by_admin = 0`, [
      result.insertId,
    ]);
    const row = rows && rows[0];
    if (!row) {
      // 极端情况：刚写入即被删/隐藏
      return res.status(200).json({
        status: 0,
        message: '发布成功！',
        data: {
          id: Number(result.insertId),
          template_key: templateKey,
          content: safeContent,
          author: { display_name: ANONYMOUS_LABEL.zh, display_name_en: ANONYMOUS_LABEL.en },
          like_count: 0,
          liked: false,
          comment_count: 0,
          created_at: new Date().toISOString(),
          viewer_is_author: true,
        },
      });
    }

    res.status(200).json({
      status: 0,
      message: '发布成功！',
      data: projectConfession({ ...row, viewer_is_author: 1 }, Number(req.user.id)),
    });
  } catch (e) {
    console.error('万能墙投稿错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// GET /:id — 单篇详情
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const viewer = parseOptionalUser(req);
    const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;

    const rows = await query(`${SINGLE_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL AND c.hidden_by_admin = 0`, [id]);
    const row = rows && rows[0];
    // 已删除/隐藏一律按「不存在」响应，不泄露存在性
    if (!row) return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });

    const state = await fetchViewerState([id], viewerId);
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: projectConfession(
        {
          ...row,
          liked: state.liked.has(Number(id)) ? 1 : 0,
          viewer_is_author: state.authored.has(Number(id)) ? 1 : 0,
        },
        viewerId
      ),
    });
  } catch (e) {
    console.error('万能墙详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// DELETE /:id — 逻辑删除（作者本人或 admin）
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const rows = await query('SELECT id, user_id FROM confessions WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }

    if (Number(rows[0].user_id) !== Number(req.user.id) && !isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '只能删除自己的帖子' });
    }

    await query('UPDATE confessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    simpleCache.delete('confessions:total:v1');

    const ip = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || null;
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CONFESSION_DELETE',
      targetType: 'confession',
      targetId: id,
      ip,
      userAgent: req.headers['user-agent'] || null,
      meta: { byAuthor: Number(rows[0].user_id) === Number(req.user.id) },
    });

    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('万能墙删除错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// POST /:id/like — 点赞 / 取消（切换语义）
// ============================================
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const exists = await query('SELECT id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0', [id]);
    if (!exists || exists.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }

    // 切换语义：有则删，无则插
    const existing = await query('SELECT user_id FROM confession_likes WHERE user_id = ? AND confession_id = ?', [
      req.user.id,
      id,
    ]);

    let liked;
    if (existing && existing.length > 0) {
      await query('DELETE FROM confession_likes WHERE user_id = ? AND confession_id = ?', [req.user.id, id]);
      liked = false;
    } else {
      // 主键 (user_id, confession_id) 兜底并发重复插入
      await query('INSERT IGNORE INTO confession_likes (user_id, confession_id) VALUES (?, ?)', [req.user.id, id]);
      liked = true;
    }

    const countRows = await query('SELECT COUNT(*) AS cnt FROM confession_likes WHERE confession_id = ?', [id]);
    const likeCount = Number(countRows && countRows[0] && countRows[0].cnt) || 0;

    res.status(200).json({
      status: 0,
      message: liked ? '点赞成功！' : '已取消点赞',
      data: { confession_id: id, liked, like_count: likeCount },
    });
  } catch (e) {
    console.error('万能墙点赞错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// GET /:id/comments — 评论列表（一级 + 一层回复）
// ============================================
router.get('/:id/comments', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const exists = await query('SELECT id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0', [id]);
    if (!exists || exists.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }

    const viewer = parseOptionalUser(req);
    const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;

    const rows = await query(
      `SELECT id, parent_id, content, user_id, created_at
         FROM confession_comments
        WHERE confession_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC`,
      [id]
    );

    // 投影后再嵌套，确保 replies 里也不含身份字段
    const projected = (rows || []).map((row) => projectComment(row, viewerId));
    const nested = nestComments(projected);

    res.status(200).json({ status: 0, message: '获取成功', data: nested });
  } catch (e) {
    console.error('万能墙评论列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// POST /:id/comments — 发表评论 / 回复
// ============================================
router.post('/:id/comments', authenticateToken, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const safeContent = cleanText(req.body && req.body.content);
    if (!safeContent) {
      return res.status(400).json({ status: -1, message: '评论内容不能为空' });
    }
    if (safeContent.length > COMMENT_MAX_LENGTH) {
      return res.status(400).json({ status: -1, message: `评论内容不能超过 ${COMMENT_MAX_LENGTH} 字` });
    }

    const exists = await query('SELECT id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0', [id]);
    if (!exists || exists.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }

    const rawParentId = req.body && req.body.parent_id;
    let parentIdNum = null;
    if (rawParentId != null && rawParentId !== '') {
      parentIdNum = parseInt(rawParentId, 10);
      if (!Number.isFinite(parentIdNum)) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      const parentRows = await query(
        'SELECT id, parent_id FROM confession_comments WHERE id = ? AND confession_id = ? AND deleted_at IS NULL',
        [parentIdNum, id]
      );
      if (!parentRows || parentRows.length === 0) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      // 仅支持二级：不能回复一条回复
      if (parentRows[0].parent_id != null) {
        return res.status(400).json({ status: -1, message: '仅支持二级评论，不能回复回复' });
      }
    }

    const result = await query(
      'INSERT INTO confession_comments (confession_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [id, req.user.id, parentIdNum, safeContent]
    );

    const rows = await query(
      'SELECT id, parent_id, content, user_id, created_at FROM confession_comments WHERE id = ?',
      [result.insertId]
    );
    const row = rows && rows[0];
    const data = row
      ? projectComment(row, Number(req.user.id))
      : {
          id: result.insertId,
          parent_id: parentIdNum,
          content: safeContent,
          author: { display_name: ANONYMOUS_LABEL.zh, display_name_en: ANONYMOUS_LABEL.en },
          viewer_is_mine: true,
          created_at: new Date().toISOString(),
        };

    // 按设计文档 §4.4 / Q1 决策：匿名墙不发送站内通知
    res.status(200).json({ status: 0, message: '评论成功！', data });
  } catch (e) {
    console.error('万能墙评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// DELETE /:id/comments/:commentId — 逻辑删除评论（本人或 admin）
// ============================================
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const commentId = parseInt(req.params.commentId, 10);
    if (!id || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });

    const rows = await query(
      'SELECT id, user_id FROM confession_comments WHERE id = ? AND confession_id = ? AND deleted_at IS NULL',
      [commentId, id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '评论不存在或已删除' });
    }

    if (Number(rows[0].user_id) !== Number(req.user.id) && !isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '只能删除自己的评论' });
    }

    await query('UPDATE confession_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);

    const ip = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || null;
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CONFESSION_COMMENT_DELETE',
      targetType: 'confession_comment',
      targetId: commentId,
      ip,
      userAgent: req.headers['user-agent'] || null,
      meta: { confessionId: id },
    });

    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('万能墙删除评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
