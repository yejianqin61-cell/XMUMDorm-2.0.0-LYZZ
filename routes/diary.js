/**
 * ============================================
 * 日记本路由
 * ============================================
 * - 一天一篇，按 user_id + date 唯一
 * - 日期一律用 YYYY-MM-DD 的本地日历日
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { query } = require('../database');

function parseDateParam(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  // 规范为 YYYY-MM-DD
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================
// 获取某天日记（默认今天）
// GET /api/diary/day?date=YYYY-MM-DD
// ============================================
router.get('/day', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const raw = req.query.date;
    const date = parseDateParam(raw) || todayDateString();
    const rows = await query(
      'SELECT id, date, content, created_at, updated_at FROM diaries WHERE user_id = ? AND date = ?',
      [userId, date]
    );
    const row = rows && rows[0];
    if (!row) {
      return res.status(200).json({
        status: 0,
        message: '暂无日记',
        data: { date, content: null }
      });
    }
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        id: row.id,
        date: row.date,
        content: row.content || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (e) {
    console.error('获取日记错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 写入 / 更新某天日记（默认今天）
// POST /api/diary/day { date?: YYYY-MM-DD, content }
// ============================================
router.post('/day', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    const rawDate = body.date;
    const content = body.content != null ? String(body.content) : '';
    const date = parseDateParam(rawDate) || todayDateString();

    await query(
      `INSERT INTO diaries (user_id, date, content)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = CURRENT_TIMESTAMP`,
      [userId, date, content]
    );

    const rows = await query(
      'SELECT id, date, content, created_at, updated_at FROM diaries WHERE user_id = ? AND date = ?',
      [userId, date]
    );
    const row = rows && rows[0];
    res.status(200).json({
      status: 0,
      message: '保存成功',
      data: {
        id: row.id,
        date: row.date,
        content: row.content || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (e) {
    console.error('保存日记错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 概览：今日、往年今日、最近一段时间（供右侧时间轴）
// GET /api/diary/overview?date=YYYY-MM-DD&recentDays=30
// ============================================
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const raw = req.query.date;
    const dateStr = parseDateParam(raw) || todayDateString();
    const baseDate = new Date(dateStr + 'T00:00:00Z');
    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({ status: -1, message: '日期格式无效' });
    }

    const y = baseDate.getUTCFullYear();
    const m = baseDate.getUTCMonth() + 1;
    const d = baseDate.getUTCDate();
    const monthStr = String(m).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');

    const recentDaysParam = parseInt(req.query.recentDays, 10);
    const recentDays = Number.isFinite(recentDaysParam) && recentDaysParam > 0 && recentDaysParam <= 90 ? recentDaysParam : 30;

    // 往年今日
    const sameDayRows = await query(
      `SELECT date, content
       FROM diaries
       WHERE user_id = ?
         AND date < ?
         AND MONTH(date) = ?
         AND DAY(date) = ?
       ORDER BY date DESC`,
      [userId, dateStr, m, d]
    );
    const sameDayPastYears = (sameDayRows || []).map((r) => ({
      date: r.date,
      year: new Date(r.date).getFullYear(),
      hasDiary: !!(r.content && String(r.content).trim())
    }));

    // 最近一段时间（含当天），用于右侧时间轴
    const recentStart = new Date(baseDate);
    recentStart.setUTCDate(recentStart.getUTCDate() - (recentDays - 1));
    const startStr = `${recentStart.getUTCFullYear()}-${String(recentStart.getUTCMonth() + 1).padStart(2, '0')}-${String(recentStart.getUTCDate()).padStart(2, '0')}`;

    const recentRows = await query(
      `SELECT date, content
       FROM diaries
       WHERE user_id = ?
         AND date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [userId, startStr, dateStr]
    );
    const hasDiaryByDate = new Map();
    for (const r of recentRows || []) {
      hasDiaryByDate.set(
        r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
        !!(r.content && String(r.content).trim())
      );
    }

    const recentList = [];
    const cursor = new Date(baseDate);
    for (let i = 0; i < recentDays; i++) {
      const yy = cursor.getUTCFullYear();
      const mm = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getUTCDate()).padStart(2, '0');
      const ds = `${yy}-${mm}-${dd}`;
      recentList.push({
        date: ds,
        hasDiary: hasDiaryByDate.get(ds) || false
      });
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        today: {
          date: dateStr,
          label: `${y}.${m}.${d}`
        },
        sameDayPastYears,
        recentDays: recentList
      }
    });
  } catch (e) {
    console.error('获取日记概览错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;

