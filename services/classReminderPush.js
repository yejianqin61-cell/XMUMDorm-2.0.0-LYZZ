/**
 * 课前约 30 分钟 Web Push（吉隆坡时区）
 * 由 server 定时调用 runClassReminderTick（默认每分钟）
 *
 * 周次来源：shared/config/semesters.js（与前端课表页同一个学期日历）。
 * 历史缺陷：这里原先用环境变量 CLASS_REMINDER_WEEK（默认 1）固定按第 1 周过滤，
 * 导致 (Week 9-14) 的课**永远收不到提醒**，而 (Week 1-14) 的课在学期结束后还在推。
 * 现在改为按「今天属于第几周」动态计算；未开学 / 学期结束后直接不发。
 */
const { query } = require('../database');
const { configureWebPush, sendPushToUser } = require('./pushSend');
const { kualaLumpurCalendarParts, resolveSemesterContext } = require('../shared/config/semesters');

function classStartInstantMs(ymd, startTimeSql) {
  const t = String(startTimeSql || '09:00:00');
  const hm = t.length >= 5 ? t.slice(0, 8) : `${t}:00`;
  return new Date(`${ymd}T${hm}+08:00`).getTime();
}

/**
 * 跑一次课前提醒检查。
 * @param {object} [options]
 * @param {Date}   [options.now]  注入当前时间（测试用）
 * @param {number} [options.week] 覆盖周次（仅排查问题用，正常不传）
 */
async function runClassReminderTick(options = {}) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  if (!configureWebPush()) return;

  const nowDate = options.now instanceof Date ? options.now : new Date();
  const { dayOfWeek, ymd } = kualaLumpurCalendarParts(nowDate);

  // 「今天算第几周」——没开学或学期结束就不发提醒
  const context = resolveSemesterContext(nowDate);
  const week = Number.isFinite(Number(options.week))
    ? Math.max(1, Math.min(60, Math.floor(Number(options.week))))
    : context.status === 'during'
      ? context.week
      : null;
  if (!week) return;

  const now = nowDate.getTime();

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
      url: '/myzone/schedule',
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
