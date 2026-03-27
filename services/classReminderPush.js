/**
 * 课前约 30 分钟 Web Push（吉隆坡时区，与课表 week 字段一致）
 * 由 server 定时调用 runClassReminderTick（默认每分钟）
 */
const { query } = require('../database');
const { configureWebPush, sendPushToUser } = require('./pushSend');

/** API 周几：1=周一 … 7=周日（与 timetable_meetings.day_of_week 一致） */
function kualaLumpurCalendarParts() {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const m = {};
  for (const p of parts) {
    if (p.type !== 'literal') m[p.type] = p.value;
  }
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dayOfWeek = map[m.weekday];
  const ymd = `${m.year}-${m.month}-${m.day}`;
  return { dayOfWeek, ymd };
}

function classStartInstantMs(ymd, startTimeSql) {
  const t = String(startTimeSql || '09:00:00');
  const hm = t.length >= 5 ? t.slice(0, 8) : `${t}:00`;
  return new Date(`${ymd}T${hm}+08:00`).getTime();
}

async function runClassReminderTick() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  if (!configureWebPush()) return;

  const week = Math.max(1, Math.min(60, parseInt(process.env.CLASS_REMINDER_WEEK, 10) || 1));
  const { dayOfWeek, ymd } = kualaLumpurCalendarParts();
  const now = Date.now();

  let candidates;
  try {
    candidates = await query(
      `SELECT m.id AS meeting_id, m.day_of_week, m.start_time, m.venue,
              c.user_id, c.course_code, c.course_name
       FROM timetable_meetings m
       INNER JOIN timetable_courses c ON c.id = m.course_id
       INNER JOIN push_subscriptions ps ON ps.user_id = c.user_id
       WHERE m.day_of_week = ?
         AND (m.week_start IS NULL OR m.week_start <= ?)
         AND (m.week_end IS NULL OR m.week_end >= ?)`,
      [dayOfWeek, week, week]
    );
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return;
    console.error('[class-reminder] query:', e.message || e);
    return;
  }

  for (const row of candidates || []) {
    const classStart = classStartInstantMs(ymd, row.start_time);
    const remindAt = classStart - 30 * 60 * 1000;
    if (now < remindAt || now >= remindAt + 7 * 60 * 1000) continue;

    const timeStr = String(row.start_time).slice(0, 5);
    const venue = row.venue ? ` · ${row.venue}` : '';
    const title = `上课提醒 Class · ${row.course_code}`;
    const body = ` ${row.course_name}｜${timeStr}${venue}（约 30 分钟后 / ~30 min）`;

    const payload = {
      title,
      body,
      url: '/about/schedule',
      tag: `class-${row.meeting_id}-${ymd}`,
    };

    try {
      const { ok } = await sendPushToUser(row.user_id, payload);
      if (ok) {
        await query(
          'INSERT IGNORE INTO class_reminder_sent (user_id, meeting_id, remind_at_date) VALUES (?, ?, ?)',
          [row.user_id, row.meeting_id, ymd]
        );
      }
    } catch (e) {
      if (e.code === 'ER_NO_SUCH_TABLE') return;
      console.error('[class-reminder] send:', e.message || e);
    }
  }
}

module.exports = {
  runClassReminderTick,
  kualaLumpurCalendarParts,
};
