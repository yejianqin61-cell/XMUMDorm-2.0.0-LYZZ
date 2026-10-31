/**
 * 学习日历（Web /myzone/calendar）的纯函数 —— 把「个人待办 + 课表 + 公共假期」投影到月历上，
 * 并给出「今天还有 N 项待办」的统计。
 *
 * 口径（与现有页面保持一致，⛔ 不另造规则）：
 * - 「今天」与「逾期」沿用待办页的本地日期口径（`localTodayDateStr` / `due_date < today`）；
 * - 周次只来自 `shared/config/semesters.js` 的学期日历（未覆盖的日期返回 null，不猜周次）；
 * - 假期只来自 `shared/config/holidays.js`，多天假期按 [start, end] 闭区间逐日展开；
 * - 课表数据形状即 `GET /api/schedule/week` 的 `data.days`（键为 1–7，周一 = 1）。
 *
 * Moodle DDL 不在此列：Web 端拿不到 Moodle 数据（校方 Moodle 只在 App 内经 WebView 同步）。
 */

import { SEMESTERS, findSemesterContaining, ymdToDayNumber, dayNumberToYmd, parseYmd } from '../config/semesters.js';
import { ALL_HOLIDAYS } from '../config/holidays.js';
import { normalizeTodoDueDate, normalizeTodoDueTime } from './formatTodoDue.js';

/** 「快到期」= 今天之后的 1–3 天内（含第 3 天） */
export const DUE_SOON_DAYS = 3;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 把本地日期对象转成 `YYYY-MM-DD`（与待办页 localTodayDateStr 同口径） */
export function localYmd(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `YYYY-MM-DD` 是星期几：1 = 周一 … 7 = 周日（与课表接口的 day_of_week 一致） */
export function isoWeekday(ymd) {
  const n = ymdToDayNumber(ymd);
  if (!Number.isFinite(n)) return null;
  // 1970-01-01 是周四（ISO 4）
  return ((((n + 3) % 7) + 7) % 7) + 1;
}

/**
 * 某月的月历格子（周一开头）。只返回需要的行数（4–6 行），每格：
 * `{ ymd, day, inMonth, weekday }`
 * @param {number} year
 * @param {number} monthIndex 0–11
 */
export function monthGrid(year, monthIndex) {
  const first = `${year}-${pad2(monthIndex + 1)}-01`;
  const firstNum = ymdToDayNumber(first);
  if (!Number.isFinite(firstNum)) return [];
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = isoWeekday(first) - 1;
  const rows = Math.ceil((leading + daysInMonth) / 7);
  const cells = [];
  for (let i = 0; i < rows * 7; i += 1) {
    const ymd = dayNumberToYmd(firstNum - leading + i);
    const p = parseYmd(ymd);
    cells.push({ ymd, day: p.d, inMonth: p.m === monthIndex + 1 && p.y === year, weekday: (i % 7) + 1 });
  }
  return cells;
}

/**
 * 某天属于哪个学期的第几教学周；不在任何学期内返回 null。
 * @returns {{ semesterId: string, week: number } | null}
 */
export function teachingWeekOf(ymd, semesters = SEMESTERS) {
  const semester = findSemesterContaining(ymd, semesters);
  if (!semester) return null;
  const diff = ymdToDayNumber(ymd) - ymdToDayNumber(semester.startDate);
  if (!Number.isFinite(diff) || diff < 0) return null;
  return { semesterId: semester.id, week: Math.floor(diff / 7) + 1 };
}

/** 月历上出现的教学周（去重、升序），用于决定要拉哪几周的课表 */
export function teachingWeeksIn(cells, semesters = SEMESTERS) {
  const weeks = new Set();
  for (const cell of cells) {
    const tw = teachingWeekOf(cell.ymd, semesters);
    if (tw) weeks.add(tw.week);
  }
  return [...weeks].sort((a, b) => a - b);
}

/** 某天的公共假期（多天假期覆盖区间内每一天） */
export function holidaysOn(ymd, holidays = ALL_HOLIDAYS) {
  return holidays.filter((holiday) => holiday.start <= ymd && ymd <= holiday.end);
}

/**
 * 某天的课：从对应教学周的课表里取当天（weekday）那一列，按开始时间排序。
 * @param {string} ymd
 * @param {Record<number, { days?: Record<number, any[]> }>} weekData 以周次为键的 `/api/schedule/week` 数据
 */
export function classesOn(ymd, weekData, semesters = SEMESTERS) {
  const tw = teachingWeekOf(ymd, semesters);
  if (!tw) return [];
  const days = weekData?.[tw.week]?.days;
  const list = days?.[isoWeekday(ymd)];
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
}

/**
 * 单条待办相对今天的状态。
 * @returns {'done' | 'overdue' | 'today' | 'soon' | 'later' | 'undated'}
 */
export function todoState(todo, todayYmd) {
  if (todo?.is_completed) return 'done';
  const due = normalizeTodoDueDate(todo?.due_date);
  if (!due) return 'undated';
  if (due < todayYmd) return 'overdue';
  if (due === todayYmd) return 'today';
  const diff = ymdToDayNumber(due) - ymdToDayNumber(todayYmd);
  return diff <= DUE_SOON_DAYS ? 'soon' : 'later';
}

/**
 * 「今天还有 N 项待办」：未完成的待办全部计入（含无截止日期的），
 * 另外分出逾期 / 今天截止 / 3 天内截止 的数量。
 */
export function summarizeTodos(todos, todayYmd) {
  const summary = { open: 0, overdue: 0, dueToday: 0, dueSoon: 0, undated: 0 };
  for (const todo of Array.isArray(todos) ? todos : []) {
    const state = todoState(todo, todayYmd);
    if (state === 'done') continue;
    summary.open += 1;
    if (state === 'overdue') summary.overdue += 1;
    else if (state === 'today') summary.dueToday += 1;
    else if (state === 'soon') summary.dueSoon += 1;
    else if (state === 'undated') summary.undated += 1;
  }
  return summary;
}

/** 待办在一天内的排序：未完成在前，再按时间（无时间排最后），再按优先级高到低 */
function compareTodosInDay(a, b) {
  if (!!a.is_completed !== !!b.is_completed) return a.is_completed ? 1 : -1;
  const ta = normalizeTodoDueTime(a.due_time) || '99:99';
  const tb = normalizeTodoDueTime(b.due_time) || '99:99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return (Number(b.priority) || 0) - (Number(a.priority) || 0);
}

/** 按截止日期把待办分到每一天；没有截止日期的不进月历 */
export function groupTodosByDate(todos) {
  const map = new Map();
  for (const todo of Array.isArray(todos) ? todos : []) {
    const due = normalizeTodoDueDate(todo?.due_date);
    if (!due) continue;
    if (!map.has(due)) map.set(due, []);
    map.get(due).push(todo);
  }
  for (const list of map.values()) list.sort(compareTodosInDay);
  return map;
}

/** 月份前后翻：返回 `{ year, monthIndex }` */
export function shiftMonth(year, monthIndex, delta) {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}
