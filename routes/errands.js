/**
 * ============================================
 * Errands Service API
 * ============================================
 * - Tabs: all / delivery / purchase / urgent
 * - Status: open / taken / done
 * - No private chat core: contact_info is returned in detail
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { checkSanction } = require('../middleware/checkSanction');
const sanitizeHtml = require('sanitize-html');

const TYPES = new Set(['delivery', 'purchase', 'urgent']);
const STATUSES = new Set(['open', 'taken', 'done']);

function isAdmin(req) {
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

function toMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeType(x) {
  const t = String(x || '').toLowerCase();
  return TYPES.has(t) ? t : null;
}

function normalizeStatus(x) {
  const s = String(x || '').toLowerCase();
  return STATUSES.has(s) ? s : null;
}

// =========================
// List errands
// GET /api/errands?type=delivery|purchase|urgent&status=open|taken|done&page=1&pageSize=20
// =========================
router.get('/', async (req, res, next) => {
  try {
    const type = normalizeType(req.query.type);
    const status = normalizeStatus(req.query.status);
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(50, Math.max(5, toInt(req.query.pageSize, 20)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (type) {
      where.push('e.type = ?');
      params.push(type);
    }
    if (status) {
      where.push('e.status = ?');
      params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 兼容少数 MySQL/驱动组合对 LIMIT/OFFSET 绑定参数的坑：这里用已校验过的整数直接拼接
    const listSql = `
      SELECT
        e.id, e.title, e.reward, e.deadline, e.location, e.type, e.status,
        e.created_at,
        u.id AS owner_id, u.username AS owner_username, u.nickname AS owner_nickname, u.avatar AS owner_avatar
      FROM errands e
      JOIN users u ON u.id = e.owner_user_id
      ${whereSql}
      ORDER BY
        CASE WHEN e.deadline IS NULL THEN 1 ELSE 0 END ASC,
        e.deadline ASC,
        e.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM errands e
      ${whereSql};
    `;

    const rows = await query(listSql, params);
    const countRows = await query(countSql, params);
    const total = countRows && countRows[0] ? Number(countRows[0].cnt) : 0;

    res.json({
      status: 0,
      data: {
        list: (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          reward: Number(r.reward),
          deadline: r.deadline,
          location: r.location,
          type: r.type,
          status: r.status,
          createdAt: r.created_at,
          owner: {
            id: r.owner_id,
            username: r.owner_username,
            nickname: r.owner_nickname,
            avatar: r.owner_avatar,
          },
        })),
        page,
        pageSize,
        total,
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Detail
// GET /api/errands/:id
// =========================
router.get('/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) {
      return res.status(400).json({ status: -1, message: '参数错误' });
    }

    const rows = await query(
      `
      SELECT
        e.*,
        u.id AS owner_id, u.username AS owner_username, u.nickname AS owner_nickname, u.avatar AS owner_avatar,
        t.id AS taker_id, t.username AS taker_username, t.nickname AS taker_nickname, t.avatar AS taker_avatar
      FROM errands e
      JOIN users u ON u.id = e.owner_user_id
      LEFT JOIN users t ON t.id = e.taken_by_user_id
      WHERE e.id = ?
      LIMIT 1;
      `,
      [id]
    );

    const r = rows && rows[0];
    if (!r) {
      return res.status(404).json({ status: -1, message: '任务不存在' });
    }

    res.json({
      status: 0,
      data: {
        id: r.id,
        title: r.title,
        description: r.description || '',
        reward: Number(r.reward),
        deadline: r.deadline,
        location: r.location,
        type: r.type,
        status: r.status,
        contactInfo: r.contact_info || '',
        takenAt: r.taken_at,
        doneAt: r.done_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        owner: {
          id: r.owner_id,
          username: r.owner_username,
          nickname: r.owner_nickname,
          avatar: r.owner_avatar,
        },
        taker: r.taker_id
          ? { id: r.taker_id, username: r.taker_username, nickname: r.taker_nickname, avatar: r.taker_avatar }
          : null,
      },
    });
  } catch (e) {
    next(e);
  }
});

// =========================
// Publish
// POST /api/errands
// =========================
router.post('/', authenticateToken, checkSanction, async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const title = cleanText(req.body?.title, 120);
    const description = cleanText(req.body?.description, 5000);
    const reward = toMoney(req.body?.reward);
    const location = cleanText(req.body?.location, 120) || null;
    const type = normalizeType(req.body?.type) || 'delivery';
    const contactInfo = cleanText(req.body?.contactInfo, 255) || null;
    const deadlineRaw = req.body?.deadline ? String(req.body.deadline) : '';
    const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

    if (!userId) return res.status(401).json({ status: -1, message: '请先登录' });
    if (!title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    if (!contactInfo) return res.status(400).json({ status: -1, message: '联系方式不能为空' });

    const deadlineValue = deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;

    const result = await query(
      `
      INSERT INTO errands
        (owner_user_id, title, description, reward, deadline, location, type, status, contact_info)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'open', ?);
      `,
      [userId, title, description || null, reward, deadlineValue, location, type, contactInfo]
    );

    res.status(201).json({ status: 0, data: { id: result.insertId } });
  } catch (e) {
    next(e);
  }
});

// =========================
// Take task
// POST /api/errands/:id/take
// =========================
router.post('/:id/take', authenticateToken, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const userId = req.user && req.user.id;
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!userId) return res.status(401).json({ status: -1, message: '请先登录' });

    const rows = await query('SELECT id, owner_user_id, status, taken_by_user_id FROM errands WHERE id = ? LIMIT 1', [id]);
    const e = rows && rows[0];
    if (!e) return res.status(404).json({ status: -1, message: '任务不存在' });
    const status = String(e.status);
    const ownerId = Number(e.owner_user_id);
    const canToggle = ownerId === Number(userId) || isAdmin(req);

    // toggle behavior:
    // - open <-> taken (only owner/admin)
    // - done: disallow toggle here
    if (status === 'done') return res.status(409).json({ status: -1, message: '该任务已完成，无法操作接单' });
    if (!canToggle) return res.status(403).json({ status: -1, message: '仅发布者或管理员可切换接单状态' });

    if (status === 'open') {
      const r = await query(
        `
        UPDATE errands
        SET status = 'taken', taken_by_user_id = NULL, taken_at = NOW()
        WHERE id = ? AND status = 'open';
        `,
        [id]
      );
      if (!r.affectedRows) return res.status(409).json({ status: -1, message: '接单失败，请刷新后重试' });
      return res.json({ status: 0, message: '已接单' });
    }

    if (status === 'taken') {
      const r = await query(
        `
        UPDATE errands
        SET status = 'open', taken_by_user_id = NULL, taken_at = NULL
        WHERE id = ? AND status = 'taken';
        `,
        [id]
      );
      if (!r.affectedRows) return res.status(409).json({ status: -1, message: '取消接单失败，请刷新后重试' });
      return res.json({ status: 0, message: '已取消接单' });
    }

    return res.status(409).json({ status: -1, message: '状态不允许' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Mark done
// POST /api/errands/:id/done
// =========================
router.post('/:id/done', authenticateToken, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const userId = req.user && req.user.id;
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!userId) return res.status(401).json({ status: -1, message: '请先登录' });

    const rows = await query('SELECT id, owner_user_id, status, taken_by_user_id FROM errands WHERE id = ? LIMIT 1', [id]);
    const e = rows && rows[0];
    if (!e) return res.status(404).json({ status: -1, message: '任务不存在' });

    const can = Number(e.owner_user_id) === Number(userId) || Number(e.taken_by_user_id) === Number(userId);
    if (!can) return res.status(403).json({ status: -1, message: '无权限操作' });
    const status = String(e.status);

    // toggle behavior:
    // - open/taken -> done
    // - done -> revert to taken (if has taker) else open
    if (status === 'done') {
      const nextStatus = e.taken_by_user_id ? 'taken' : 'open';
      const r = await query(
        `
        UPDATE errands
        SET status = ?, done_at = NULL
        WHERE id = ? AND status = 'done';
        `,
        [nextStatus, id]
      );
      if (!r.affectedRows) return res.status(409).json({ status: -1, message: '撤销完成失败，请刷新后重试' });
      return res.json({ status: 0, message: '已撤销完成' });
    }

    if (status !== 'taken' && status !== 'open') {
      return res.status(409).json({ status: -1, message: '状态不允许' });
    }

    const r = await query(
      `
      UPDATE errands
      SET status = 'done', done_at = NOW()
      WHERE id = ? AND status IN ('open', 'taken');
      `,
      [id]
    );
    if (!r.affectedRows) return res.status(409).json({ status: -1, message: '操作失败，请刷新后重试' });

    return res.json({ status: 0, message: '已标记完成' });
  } catch (e) {
    next(e);
  }
});

// =========================
// Delete
// DELETE /api/errands/:id
// =========================
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const userId = req.user && req.user.id;
    if (!id) return res.status(400).json({ status: -1, message: '参数错误' });
    if (!userId) return res.status(401).json({ status: -1, message: '请先登录' });

    const rows = await query('SELECT id, owner_user_id FROM errands WHERE id = ? LIMIT 1', [id]);
    const e = rows && rows[0];
    if (!e) return res.status(404).json({ status: -1, message: '任务不存在' });

    const canDelete = Number(e.owner_user_id) === Number(userId) || isAdmin(req);
    if (!canDelete) return res.status(403).json({ status: -1, message: '无权限删除' });

    await query('DELETE FROM errands WHERE id = ? LIMIT 1', [id]);
    return res.json({ status: 0, message: '已删除' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

