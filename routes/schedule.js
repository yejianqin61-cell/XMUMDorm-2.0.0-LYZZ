/**
 * ============================================
 * 课程表（导入/查询）
 * ============================================
 * - POST /api/schedule/import/preview  解析预览（不落库）
 * - POST /api/schedule/import/commit   确认导入（覆盖该用户旧课程表）
 * - GET  /api/schedule/week?week=1     查询某周课表（按天分组）
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { pool, query } = require('../database');
const { parseScheduleText } = require('../utils/scheduleParser');

function normalizeWeekParam(w) {
  const n = Number(w);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1 || i > 60) return null;
  return i;
}

// ============================================
// 解析预览
// ============================================
router.post('/import/preview', authenticateToken, async (req, res) => {
  try {
    const text = req.body?.text;
    if (!text || String(text).trim().length < 10) {
      return res.status(400).json({ status: -1, message: '请粘贴课程表文本' });
    }
    const parsed = parseScheduleText(text);
    return res.status(200).json({
      status: 0,
      message: '解析成功',
      data: parsed
    });
  } catch (e) {
    console.error('课程表预览解析错误:', e);
    return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 确认导入（覆盖）
// ============================================
router.post('/import/commit', authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const text = req.body?.text;
    if (!text || String(text).trim().length < 10) {
      return res.status(400).json({ status: -1, message: '请粘贴课程表文本' });
    }

    const parsed = parseScheduleText(text);
    const { courses, meetings, stats, errors } = parsed;
    if (!courses || courses.length === 0) {
      return res.status(400).json({ status: -1, message: '未解析到任何课程，请检查粘贴内容' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 写导入日志（即使后续失败也便于排查）
      await conn.execute(
        'INSERT INTO timetable_import_logs (user_id, source, raw_text, parsed_course_count, parsed_meeting_count, error_count) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'text', String(text), Number(stats.courseCount || 0), Number(stats.meetingCount || 0), Number(stats.errorCount || 0)]
      );

      // 覆盖旧数据
      await conn.execute('DELETE FROM timetable_courses WHERE user_id = ?', [userId]);

      // 插入课程并建立 code -> courseId 映射
      const courseIdByCode = new Map();
      for (const c of courses) {
        const code = c.course_code;
        if (!code) continue;
        const [r] = await conn.execute(
          'INSERT INTO timetable_courses (user_id, course_code, course_name, credit, lecturer, raw_block) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, code, c.course_name || '', c.credit, c.lecturer, c.raw_block || null]
        );
        courseIdByCode.set(code, r.insertId);
      }

      // 插入上课时间
      for (const m of meetings) {
        const courseId = courseIdByCode.get(m.course_code);
        if (!courseId) continue;
        await conn.execute(
          'INSERT INTO timetable_meetings (course_id, day_of_week, start_time, end_time, venue, week_start, week_end, raw_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            courseId,
            m.day_of_week,
            m.start_time,
            m.end_time,
            m.venue,
            m.week_start,
            m.week_end,
            m.raw_line || null
          ]
        );
      }

      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }

    return res.status(200).json({
      status: 0,
      message: '导入成功',
      data: {
        ...parsed,
        // commit 时前端通常只关心统计 + errors（如果有）
        warnings: errors || []
      }
    });
  } catch (e) {
    console.error('课程表确认导入错误:', e);
    // 常见：未执行 009 迁移导致表不存在
    const code = e?.code || e?.errno;
    if (code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        status: -1,
        message: '课程表表不存在：请对当前连接的数据库执行 migrations/009_timetable_import.sql（如果你用 Railway，请确保脚本连接的是 Railway 的 DATABASE_URL）'
      });
    }
    if (e?.message?.includes('timetable_')) {
      return res.status(500).json({
        status: -1,
        message: '课程表功能后端未完成数据库升级：请先执行 migrations/009_timetable_import.sql'
      });
    }
    return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 查询某周课表（按天分组）
// ============================================
router.get('/week', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const week = normalizeWeekParam(req.query.week) || 1;

    const rows = await query(
      `SELECT
        c.course_code, c.course_name, c.credit, c.lecturer,
        m.day_of_week, m.start_time, m.end_time, m.venue, m.week_start, m.week_end
      FROM timetable_courses c
      INNER JOIN timetable_meetings m ON m.course_id = c.id
      WHERE c.user_id = ?
        AND (m.week_start IS NULL OR m.week_start <= ?)
        AND (m.week_end IS NULL OR m.week_end >= ?)
      ORDER BY m.day_of_week ASC, m.start_time ASC`,
      [userId, week, week]
    );

    const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const r of rows || []) {
      const d = Number(r.day_of_week);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push({
        course_code: r.course_code,
        course_name: r.course_name,
        credit: r.credit != null ? Number(r.credit) : null,
        lecturer: r.lecturer,
        day_of_week: d,
        start_time: r.start_time,
        end_time: r.end_time,
        venue: r.venue,
        week_start: r.week_start != null ? Number(r.week_start) : null,
        week_end: r.week_end != null ? Number(r.week_end) : null
      });
    }

    return res.status(200).json({
      status: 0,
      message: '获取成功',
      data: { week, days: byDay }
    });
  } catch (e) {
    console.error('课程表查询错误:', e);
    const code = e?.code || e?.errno;
    if (code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        status: -1,
        message: '课程表表不存在：请对当前连接的数据库执行 migrations/009_timetable_import.sql（如果你用 Railway，请确保脚本连接的是 Railway 的 DATABASE_URL）'
      });
    }
    if (e?.message?.includes('timetable_')) {
      return res.status(500).json({
        status: -1,
        message: '课程表功能后端未完成数据库升级：请先执行 migrations/009_timetable_import.sql'
      });
    }
    return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;

