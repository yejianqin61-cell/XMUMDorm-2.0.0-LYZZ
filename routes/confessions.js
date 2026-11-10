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
const posterContract = require('../shared/constants/wallPosterContract.json');
const router = express.Router();
const { query } = require('../database');
const { checkSanction } = require('../middleware/checkSanction');
const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');
const { requireCurrentTerms } = require('../services/termsAcceptance');
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

/** 楼主精选上限（阶段 3 口径：默认最多 3 条） */
const FEATURE_LIMIT = 3;

/** 评论排序：latest=最新优先，hot=点赞/回复综合排序；缺省保持 created_at ASC */
const COMMENT_SORTS = new Set(['latest', 'hot']);

/** 回复引用摘要长度（只截展示用，不是正文副本） */
const REPLY_EXCERPT_MAX = 40;

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
    poster_style: normalizePosterStyle(row.poster_style),
    revision: Number(row.revision) || 0,
    updated_at: row.updated_at,
    content: String(row.content == null ? '' : row.content),
    author: {
      display_name: ANONYMOUS_LABEL.zh,
      display_name_en: ANONYMOUS_LABEL.en,
    },
    like_count: likeCount,
    liked: Number(row.liked) === 1,
    favorited: Boolean(row.favorited),
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
 *
 * anonymous_no 是**帖内匿名编号**（楼主固定 1，其余按首次参与顺序 2、3…）。
 * 它由服务端按 (confession_id, user_id) 维护，不接受客户端传入；
 * 编号按「人」而不是「评论」分配，删除评论不会重排。
 * is_author 只说明「这条评论来自帖子作者」，用于「楼主」标识，同样不泄露真实身份。
 */
function projectComment(row, viewerId, extras = {}) {
  const parentId = row.parent_id == null ? null : Number(row.parent_id);
  const data = {
    id: Number(row.id),
    parent_id: parentId,
    content: String(row.content == null ? '' : row.content),
    author: {
      display_name: ANONYMOUS_LABEL.zh,
      display_name_en: ANONYMOUS_LABEL.en,
    },
    anonymous_no: Number.isSafeInteger(extras.anonymousNo) && extras.anonymousNo > 0 ? extras.anonymousNo : null,
    is_author: Boolean(
      extras.authorId != null && row.user_id != null && Number(row.user_id) === Number(extras.authorId)
    ),
    like_count: Number(extras.likeCount ?? row.like_count) || 0,
    liked: extras.liked === true,
    featured: row.featured_at != null && row.featured_at !== undefined,
    featured_at: row.featured_at == null ? null : row.featured_at,
    viewer_is_mine: Boolean(
      viewerId != null && row.user_id != null && Number(row.user_id) === Number(viewerId)
    ),
    created_at: row.created_at,
  };
  if (parentId !== null) {
    data.reply_to_id = parentId;
    data.reply_to_excerpt = extras.replyToExcerpt == null ? null : String(extras.replyToExcerpt);
  }
  return data;
}

/** 截一段「回复引用」摘要（只用于展示，不复制正文身份信息） */
function replyExcerpt(content) {
  const text = String(content == null ? '' : content).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > REPLY_EXCERPT_MAX ? `${text.slice(0, REPLY_EXCERPT_MAX)}…` : text;
}

/**
 * 帖内匿名编号映射：user_id → 编号。
 * 楼主占用 1（即使尚未评论）；其他参与者按**首次评论 id 升序**编号。
 * 统计包含已逻辑删除的评论——编号属于「人」而不是「评论」，删除不重排。
 */
async function fetchAnonymousNumbers(confessionId, authorId) {
  const rows = await query(
    `SELECT user_id, MIN(id) AS first_id
       FROM confession_comments
      WHERE confession_id = ?
      GROUP BY user_id
      ORDER BY first_id ASC`,
    [confessionId]
  );
  const numbers = new Map();
  if (authorId != null) numbers.set(Number(authorId), 1);
  let next = 2;
  (rows || []).forEach((row) => {
    const userId = Number(row.user_id);
    if (!Number.isFinite(userId) || numbers.has(userId)) return;
    numbers.set(userId, next);
    next += 1;
  });
  return numbers;
}

/** 批量取评论点赞数与「我赞过没有」（评论列表 / 新评论回执共用） */
async function fetchCommentLikeState(commentIds, viewerId) {
  const state = { counts: new Map(), liked: new Set() };
  const ids = (commentIds || []).filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0);
  if (ids.length === 0) return state;
  const placeholders = ids.map(() => '?').join(',');
  const [countRows, likedRows] = await Promise.all([
    query(
      `SELECT comment_id, COUNT(*) AS cnt
         FROM confession_comment_likes
        WHERE comment_id IN (${placeholders})
        GROUP BY comment_id`,
      ids
    ),
    viewerId == null
      ? Promise.resolve([])
      : query(
          `SELECT comment_id FROM confession_comment_likes
            WHERE user_id = ? AND comment_id IN (${placeholders})`,
          [viewerId, ...ids]
        ),
  ]);
  (countRows || []).forEach((row) => state.counts.set(Number(row.comment_id), Number(row.cnt) || 0));
  (likedRows || []).forEach((row) => state.liked.add(Number(row.comment_id)));
  return state;
}

/** 帖子对外查询的公共 SELECT 片段（单篇用，window 里有批量版本） */
const SINGLE_SELECT = `
  SELECT c.id, c.template_key, c.content, c.created_at, c.updated_at, c.poster_style, c.revision,
         (SELECT COUNT(*) FROM confession_likes l WHERE l.confession_id = c.id) AS like_count,
         (SELECT COUNT(*) FROM confession_comments cc WHERE cc.confession_id = c.id AND cc.deleted_at IS NULL) AS comment_count
  FROM confessions c
`;

/**
 * 取「当前用户是否已赞 / 是否作者」的批量映射。
 * 未登录（viewerId == null）时直接返回空映射，不发无意义的查询。
 */
async function fetchViewerState(ids, viewerId) {
  const state = { liked: new Set(), favorited: new Set(), authored: new Set() };
  if (viewerId == null || !Array.isArray(ids) || ids.length === 0) return state;

  const placeholders = ids.map(() => '?').join(',');

  const [likedRows, favoritedRows, authoredRows] = await Promise.all([
    query(
      `SELECT confession_id FROM confession_likes WHERE user_id = ? AND confession_id IN (${placeholders})`,
      [viewerId, ...ids]
    ),
    query(
      `SELECT confession_id FROM confession_favorites WHERE user_id = ? AND confession_id IN (${placeholders})`,
      [viewerId, ...ids]
    ),
    query(
      `SELECT id FROM confessions WHERE user_id = ? AND id IN (${placeholders})`,
      [viewerId, ...ids]
    ),
  ]);

  (likedRows || []).forEach((r) => state.liked.add(Number(r.confession_id)));
  (favoritedRows || []).forEach((r) => state.favorited.add(Number(r.confession_id)));
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
    `SELECT id, template_key, content, created_at, updated_at, poster_style, revision
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
        favorited: viewerState.favorited.has(Number(id)),
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
    res.status(200).json({ status: 0, message: '获取成功', data: { total, poster_style_version: posterContract.version } });
  } catch (e) {
    console.error('万能墙 meta 获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

function normalizePosterStyle(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || value.version !== posterContract.version ||
      !posterContract.layouts.includes(value.layoutId) || !posterContract.colors.includes(value.colorId)) {
    return null;
  }
  return { version: value.version, layoutId: value.layoutId, colorId: value.colorId };
}

function validatePoster(body, res) {
  const style = typeof body?.poster_style === 'object' ? normalizePosterStyle(body.poster_style) : null;
  if (!style) {
    res.status(400).json({ status: -1, message: '无效的版式或颜色' });
    return null;
  }
  const content = body.content;
  if (typeof content !== 'string' || !content.trim() || content.length > posterContract.maxLength) {
    res.status(400).json({ status: -1, message: `正文须为 1 至 ${posterContract.maxLength} 字且不能全为空白` });
    return null;
  }
  return { content, style };
}

// A retry can only resolve the authenticated author's original publication.
async function replayPublication(req, res, next) {
  const key = req.body?.publish_key;
  if (key === undefined && req.body?.poster_style === undefined) return next();
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(key)) {
    return res.status(400).json({ status: -1, message: '发布凭据无效' });
  }
  const poster = validatePoster(req.body, res);
  if (!poster) return;
  res.locals.wallPoster = poster;
  try {
    const rows = await query(`${SINGLE_SELECT} WHERE c.user_id = ? AND c.publish_key = ?
      AND c.deleted_at IS NULL AND c.hidden_by_admin = 0`, [req.user.id, key]);
    if (!rows[0]) return next();
    const viewer = await fetchViewerState([rows[0].id], req.user.id);
    return res.json({ status: 0, message: '发布成功！', data: projectConfession({
      ...rows[0],
      viewer_is_author: 1,
      liked: viewer.liked.has(Number(rows[0].id)) ? 1 : 0,
      favorited: viewer.favorited.has(Number(rows[0].id)),
    }, req.user.id) });
  } catch (error) {
    console.error('万能墙投稿重试错误:', error);
    return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
}

// ============================================
// POST / — 投稿（先发后审）
// ============================================
router.post('/', authenticateToken, replayPublication, requireCurrentTerms, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const poster = res.locals.wallPoster;
    if (poster) {
      const result = await query(
        `INSERT INTO confessions (user_id, template_key, content, poster_style, publish_key)
         VALUES (?, 'letter', ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [req.user.id, poster.content, JSON.stringify(poster.style), req.body.publish_key]
      );
      simpleCache.delete('confessions:total:v1');
      const rows = await query(`${SINGLE_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL AND c.hidden_by_admin = 0`,
        [result.insertId]);
      if (!rows[0]) return res.status(410).json({ status: -1, message: '原投稿已不可见' });
      return res.json({ status: 0, message: '发布成功！',
        data: projectConfession({ ...rows[0], viewer_is_author: 1 }, req.user.id) });
    }

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
          favorited: state.favorited.has(Number(id)),
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

router.patch('/:id', authenticateToken, requireCurrentTerms, checkSanction, sensitiveWordFilter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const revision = req.body?.revision;
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(revision) || revision < 0) {
      return res.status(400).json({ status: -1, message: '帖子 ID 或版本无效' });
    }
    const poster = validatePoster(req.body, res);
    if (!poster) return;

    const rows = await query(
      'SELECT user_id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0', [id]
    );
    if (!rows[0]) return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    if (Number(rows[0].user_id) !== Number(req.user.id)) {
      return res.status(403).json({ status: -1, message: '只能编辑自己的帖子', code: 'CONFESSION_NOT_AUTHOR' });
    }

    const result = await query(
      `UPDATE confessions SET content = ?, poster_style = ?, revision = revision + 1
       WHERE id = ? AND user_id = ? AND revision = ? AND deleted_at IS NULL AND hidden_by_admin = 0`,
      [poster.content, JSON.stringify(poster.style), id, req.user.id, revision]
    );
    if (!result.affectedRows) return res.status(409).json({ status: -1, message: '帖子已更新或不可用，请重新加载' });
    return res.json({ status: 0, message: '保存成功', data: { id, revision: revision + 1 } });
  } catch (error) {
    console.error('万能墙编辑错误:', error);
    return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
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
// POST /:id/favorite — 收藏 / 取消（切换语义）
//   「我的收藏」页面不在阶段 3 范围，但保存接口先行。
// ============================================
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });

    const exists = await query(
      'SELECT id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [id]
    );
    if (!exists || exists.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }

    const existing = await query(
      'SELECT user_id FROM confession_favorites WHERE user_id = ? AND confession_id = ?',
      [req.user.id, id]
    );

    let favorited;
    if (existing && existing.length > 0) {
      await query('DELETE FROM confession_favorites WHERE user_id = ? AND confession_id = ?', [req.user.id, id]);
      favorited = false;
    } else {
      // 主键 (user_id, confession_id) 兜底并发重复插入
      await query('INSERT IGNORE INTO confession_favorites (user_id, confession_id) VALUES (?, ?)', [req.user.id, id]);
      favorited = true;
    }

    res.status(200).json({
      status: 0,
      message: favorited ? '收藏成功！' : '已取消收藏',
      data: { confession_id: id, favorited },
    });
  } catch (e) {
    console.error('万能墙收藏错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// GET /:id/comments — 评论列表（一级 + 扁平的 replies）
//   ?sort=hot|latest 一级评论排序；缺省保持 created_at ASC（Web 旧口径）
//   二级回复始终按时间从早到晚，不参与热度重排
// ============================================
router.get('/:id/comments', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '帖子 ID 无效' });
    const sort = COMMENT_SORTS.has(req.query.sort) ? req.query.sort : null;

    const posts = await query(
      'SELECT id, user_id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [id]
    );
    if (!posts || posts.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    const authorId = Number(posts[0].user_id);

    const viewer = parseOptionalUser(req);
    const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;

    const rows = await query(
      `SELECT id, parent_id, content, user_id, created_at, updated_at, featured_at
         FROM confession_comments
        WHERE confession_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC, id ASC`,
      [id]
    );

    const commentRows = rows || [];
    const [numbers, likeState] = await Promise.all([
      fetchAnonymousNumbers(id, authorId),
      fetchCommentLikeState(commentRows.map((row) => row.id), viewerId),
    ]);
    const byId = new Map(commentRows.map((row) => [Number(row.id), row]));

    // 投影后再嵌套，确保 replies 里也不含身份字段
    const projected = commentRows.map((row) => {
      const parent = row.parent_id == null ? null : byId.get(Number(row.parent_id));
      return projectComment(row, viewerId, {
        anonymousNo: numbers.get(Number(row.user_id)),
        authorId,
        likeCount: likeState.counts.get(Number(row.id)) || 0,
        liked: likeState.liked.has(Number(row.id)),
        replyToExcerpt: parent ? replyExcerpt(parent.content) : null,
      });
    });
    const nested = nestComments(projected, { sort });

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

    const posts = await query(
      'SELECT id, user_id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [id]
    );
    if (!posts || posts.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    const authorId = Number(posts[0].user_id);

    const rawParentId = req.body && req.body.parent_id;
    let parentIdNum = null;
    let parentRow = null;
    if (rawParentId != null && rawParentId !== '') {
      parentIdNum = parseInt(rawParentId, 10);
      if (!Number.isFinite(parentIdNum)) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      const parentRows = await query(
        'SELECT id, parent_id, content FROM confession_comments WHERE id = ? AND confession_id = ? AND deleted_at IS NULL',
        [parentIdNum, id]
      );
      if (!parentRows || parentRows.length === 0) {
        return res.status(400).json({ status: -1, message: '回复的评论不存在' });
      }
      // 阶段 3：允许回复任意一条评论（数据保留父子关系；展示仍只有两层）
      parentRow = parentRows[0];
    }

    const result = await query(
      'INSERT INTO confession_comments (confession_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [id, req.user.id, parentIdNum, safeContent]
    );

    const rows = await query(
      `SELECT id, parent_id, content, user_id, created_at, updated_at, featured_at
         FROM confession_comments WHERE id = ?`,
      [result.insertId]
    );
    const row = rows && rows[0];
    const numbers = await fetchAnonymousNumbers(id, authorId);
    const data = row
      ? projectComment(row, Number(req.user.id), {
          anonymousNo: numbers.get(Number(req.user.id)),
          authorId,
          replyToExcerpt: parentRow ? replyExcerpt(parentRow.content) : null,
        })
      : {
          id: result.insertId,
          parent_id: parentIdNum,
          content: safeContent,
          author: { display_name: ANONYMOUS_LABEL.zh, display_name_en: ANONYMOUS_LABEL.en },
          anonymous_no: numbers.get(Number(req.user.id)) ?? null,
          is_author: Number(req.user.id) === authorId,
          like_count: 0,
          liked: false,
          featured: false,
          featured_at: null,
          viewer_is_mine: true,
          created_at: new Date().toISOString(),
          ...(parentIdNum === null ? {} : {
            reply_to_id: parentIdNum,
            reply_to_excerpt: parentRow ? replyExcerpt(parentRow.content) : null,
          }),
        };

    // 按设计文档 §4.4 / Q1 决策：匿名墙不发送站内通知
    res.status(200).json({ status: 0, message: '评论成功！', data });
  } catch (e) {
    console.error('万能墙评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// POST /:id/comments/:commentId/like — 评论点赞 / 取消（切换语义）
// ============================================
router.post('/:id/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const commentId = parseInt(req.params.commentId, 10);
    if (!id || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });

    const rows = await query(
      `SELECT c.id
         FROM confession_comments c
         JOIN confessions f ON f.id = c.confession_id
        WHERE c.id = ? AND c.confession_id = ? AND c.deleted_at IS NULL
          AND f.deleted_at IS NULL AND f.hidden_by_admin = 0`,
      [commentId, id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '评论不存在或已删除' });
    }

    const existing = await query(
      'SELECT user_id FROM confession_comment_likes WHERE user_id = ? AND comment_id = ?',
      [req.user.id, commentId]
    );
    let liked;
    if (existing && existing.length > 0) {
      await query('DELETE FROM confession_comment_likes WHERE user_id = ? AND comment_id = ?', [req.user.id, commentId]);
      liked = false;
    } else {
      await query('INSERT IGNORE INTO confession_comment_likes (user_id, comment_id) VALUES (?, ?)', [req.user.id, commentId]);
      liked = true;
    }

    const countRows = await query(
      'SELECT COUNT(*) AS cnt FROM confession_comment_likes WHERE comment_id = ?',
      [commentId]
    );
    res.status(200).json({
      status: 0,
      message: liked ? '点赞成功！' : '已取消点赞',
      data: {
        comment_id: commentId,
        liked,
        like_count: Number(countRows && countRows[0] && countRows[0].cnt) || 0,
      },
    });
  } catch (e) {
    console.error('万能墙评论点赞错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// PATCH /:id/comments/:commentId/feature — 楼主精选 / 取消（仅帖子作者）
//   只允许一级评论；每个帖子最多 FEATURE_LIMIT 条；精选评论置顶展示。
// ============================================
router.patch('/:id/comments/:commentId/feature', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const featured = req.body && req.body.featured;
    if (!id || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });
    if (typeof featured !== 'boolean') {
      return res.status(400).json({ status: -1, message: '精选状态无效' });
    }

    const posts = await query(
      'SELECT id, user_id FROM confessions WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [id]
    );
    if (!posts || posts.length === 0) {
      return res.status(404).json({ status: -1, message: '帖子不存在或已删除' });
    }
    if (Number(posts[0].user_id) !== Number(req.user.id)) {
      return res.status(403).json({ status: -1, message: '只有楼主可以精选评论', code: 'CONFESSION_NOT_AUTHOR' });
    }

    const comments = await query(
      'SELECT id, parent_id, featured_at FROM confession_comments WHERE id = ? AND confession_id = ? AND deleted_at IS NULL',
      [commentId, id]
    );
    if (!comments || comments.length === 0) {
      return res.status(404).json({ status: -1, message: '评论不存在或已删除' });
    }
    if (comments[0].parent_id != null) {
      return res.status(400).json({ status: -1, message: '只能精选一级评论' });
    }

    if (featured && comments[0].featured_at == null) {
      const countRows = await query(
        'SELECT COUNT(*) AS cnt FROM confession_comments WHERE confession_id = ? AND featured_at IS NOT NULL AND deleted_at IS NULL',
        [id]
      );
      const featuredCount = Number(countRows && countRows[0] && countRows[0].cnt) || 0;
      if (featuredCount >= FEATURE_LIMIT) {
        return res.status(409).json({
          status: -1,
          message: `最多精选 ${FEATURE_LIMIT} 条评论`,
          code: 'CONFESSION_FEATURE_LIMIT',
        });
      }
      await query('UPDATE confession_comments SET featured_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    } else if (!featured && comments[0].featured_at != null) {
      await query('UPDATE confession_comments SET featured_at = NULL WHERE id = ?', [commentId]);
    }

    const refreshed = await query('SELECT featured_at FROM confession_comments WHERE id = ?', [commentId]);
    const featuredAt = refreshed && refreshed[0] ? refreshed[0].featured_at : null;
    res.status(200).json({
      status: 0,
      message: featuredAt == null ? '已取消精选' : '已精选',
      data: { comment_id: commentId, featured: featuredAt != null, featured_at: featuredAt ?? null },
    });
  } catch (e) {
    console.error('万能墙精选评论错误:', e);
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

    // 阶段 3：删除带回复的评论时，本条与全部下级回复一起不可见。
    // 先取该帖存活评论在内存里求后代，避免依赖 MySQL 递归 CTE 的版本差异。
    const live = await query(
      'SELECT id, parent_id FROM confession_comments WHERE confession_id = ? AND deleted_at IS NULL',
      [id]
    );
    const childrenByParent = new Map();
    (live || []).forEach((row) => {
      if (row.parent_id == null) return;
      const key = Number(row.parent_id);
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(Number(row.id));
    });
    const removedIds = [];
    const queue = [commentId];
    const seen = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      removedIds.push(current);
      (childrenByParent.get(current) || []).forEach((childId) => queue.push(childId));
    }

    if (removedIds.length > 0) {
      const placeholders = removedIds.map(() => '?').join(',');
      await query(
        `UPDATE confession_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        removedIds
      );
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || null;
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CONFESSION_COMMENT_DELETE',
      targetType: 'confession_comment',
      targetId: commentId,
      ip,
      userAgent: req.headers['user-agent'] || null,
      meta: { confessionId: id, removedCount: removedIds.length },
    });

    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('万能墙删除评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
