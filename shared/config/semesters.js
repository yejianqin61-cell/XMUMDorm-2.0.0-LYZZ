/**
 * 学期日历 —— 「现在是第几周」的唯一来源
 * ============================================
 * 课表里的每一条上课安排都带 week_start / week_end（例如 `(Week 9-14)`），
 * 但「今天属于第几周」这件事原先没有任何地方知道：前端写死 week=1，
 * 课前提醒用环境变量 CLASS_REMINDER_WEEK（默认也是 1）。
 *
 * 这个模块把「学期什么时候开始、一共几周」集中成一份数据，并提供纯函数式的
 * 日期运算，让 Web / App / 后端定时任务共用同一个答案。
 *
 * 约定：
 * - 第 1 周的第 1 天就是 startDate，必须是**周一**
 * - 时区固定按吉隆坡（UTC+8）算，与课前提醒的推送时间一致
 * - weeks 是学期总周数，也就是课表里会出现的最大周次
 *
 * 维护方式：每次开学前，把新学期作为一项加进 SEMESTERS 即可（可以提前写，
 * 到点自动切换）。若忘了加，行为是「学期已结束」而不会算出一个错的周次。
 */

/** 吉隆坡时区（与 services/classReminderPush.js 的推送时间一致） */
export const KL_TIME_ZONE = 'Asia/Kuala_Lumpur';

/**
 * 学期日历。按 startDate 升序排列（resolveSemesterContext 内部也会自行排序）。
 * @type {{ id: string, nameZh: string, nameEn: string, startDate: string, weeks: number }[]}
 */
export const SEMESTERS = [
  {
    id: '2026-09',
    nameZh: '2026/27 学年第一学期',
    nameEn: '2026/27 Semester 1',
    // 第 1 周第一天（周一）。9.28 开学 → 第 1 周 = 9/28 ~ 10/4
    startDate: '2026-09-28',
    weeks: 14,
  },
];

/** 没有任何学期匹配时，前端最多允许翻到第几周（避免出现「第 999 周」） */
export const FALLBACK_TOTAL_WEEKS = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 解析 `YYYY-MM-DD`，并拒绝 2026-02-31 这种会被 Date 自动进位的假日期。
 * @returns {{ y: number, m: number, d: number, ms: number } | null}
 */
export function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const dt = new Date(ms);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d, ms };
}

/** `YYYY-MM-DD` → 自 1970-01-01 起的天数（用 UTC 中午前的整数，避免时区/夏令时误差） */
export function ymdToDayNumber(ymd) {
  const p = parseYmd(ymd);
  return p ? p.ms / DAY_MS : NaN;
}

/** 天数 → `YYYY-MM-DD` */
export function dayNumberToYmd(dayNumber) {
  const n = Math.round(Number(dayNumber));
  if (!Number.isFinite(n)) return null;
  const dt = new Date(n * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** `YYYY-MM-DD` 加减天数 */
export function addDaysYmd(ymd, days) {
  const n = ymdToDayNumber(ymd);
  if (!Number.isFinite(n)) return null;
  return dayNumberToYmd(n + Number(days));
}

/**
 * 吉隆坡时区下的「今天」与「周几」。
 * 不直接用 `new Date()` 的本地年月日：服务器/浏览器时区未必是 UTC+8，
 * 而周次边界必须按学校所在地的周一 00:00 切。
 * @param {Date} [now]
 * @returns {{ ymd: string, dayOfWeek: number }} dayOfWeek: 1=周一 … 7=周日
 */
export function kualaLumpurCalendarParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);
  const p = {};
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    dayOfWeek: map[p.weekday] ?? null,
  };
}

/** 学期最后一天（第 weeks 周的最后一天） */
export function semesterEndYmd(semester) {
  if (!semester) return null;
  const weeks = Math.floor(Number(semester.weeks));
  if (!Number.isFinite(weeks) || weeks < 1) return null;
  return addDaysYmd(semester.startDate, weeks * 7 - 1);
}

function semesterStartNumber(semester) {
  return ymdToDayNumber(semester?.startDate);
}

function sortedSemesters(semesters) {
  return (Array.isArray(semesters) ? [...semesters] : [])
    .filter((s) => s && typeof s === 'object')
    .sort((a, b) => semesterStartNumber(a) - semesterStartNumber(b));
}

/** 某个日期落在哪个学期内（含首尾），不在任何学期内返回 null */
export function findSemesterContaining(ymd, semesters = SEMESTERS) {
  const n = ymdToDayNumber(ymd);
  if (!Number.isFinite(n)) return null;
  return (
    sortedSemesters(semesters).find((s) => {
      const start = semesterStartNumber(s);
      const end = ymdToDayNumber(semesterEndYmd(s));
      return Number.isFinite(start) && Number.isFinite(end) && n >= start && n <= end;
    }) || null
  );
}

/**
 * 某个时间点对应的学期与周次。
 *
 * @param {Date} [now]
 * @param {typeof SEMESTERS} [semesters]
 * @returns {{
 *   status: 'during' | 'before' | 'after' | 'unknown',
 *   semester: object | null,
 *   week: number | null,
 *   totalWeeks: number,
 *   defaultWeek: number,
 *   daysUntilStart: number | null,
 *   daysSinceEnd: number | null,
 *   startDate: string | null,
 *   endDate: string | null,
 *   today: string,
 * }}
 *   - during：week 是当前周；defaultWeek = week
 *   - before：semester 是即将开学的那个；daysUntilStart 是距开学天数
 *   - after ：semester 是刚结束的那个；daysSinceEnd 是已结束天数
 *   - 两种情况 defaultWeek 都是 1（课表从第 1 周开始看，可手动翻周）
 */
export function resolveSemesterContext(now = new Date(), semesters = SEMESTERS) {
  const { ymd: today } = kualaLumpurCalendarParts(now);
  const todayNum = ymdToDayNumber(today);
  const list = sortedSemesters(semesters);

  const base = {
    status: 'unknown',
    semester: null,
    week: null,
    totalWeeks: FALLBACK_TOTAL_WEEKS,
    defaultWeek: 1,
    daysUntilStart: null,
    daysSinceEnd: null,
    startDate: null,
    endDate: null,
    today,
  };

  const current = list.find((s) => {
    const start = semesterStartNumber(s);
    const end = ymdToDayNumber(semesterEndYmd(s));
    return Number.isFinite(start) && Number.isFinite(end) && todayNum >= start && todayNum <= end;
  });

  if (current) {
    const week = Math.floor((todayNum - semesterStartNumber(current)) / 7) + 1;
    return {
      ...base,
      status: 'during',
      semester: current,
      week,
      totalWeeks: current.weeks,
      defaultWeek: week,
      startDate: current.startDate,
      endDate: semesterEndYmd(current),
    };
  }

  // 还没开学：取最近的一个「将来」的学期
  const upcoming = list.find((s) => todayNum < semesterStartNumber(s));
  if (upcoming) {
    return {
      ...base,
      status: 'before',
      semester: upcoming,
      totalWeeks: upcoming.weeks,
      daysUntilStart: semesterStartNumber(upcoming) - todayNum,
      startDate: upcoming.startDate,
      endDate: semesterEndYmd(upcoming),
    };
  }

  // 学期已结束：取最近的一个「过去」的学期
  const past = [...list].reverse().find((s) => todayNum > ymdToDayNumber(semesterEndYmd(s)));
  if (past) {
    const end = ymdToDayNumber(semesterEndYmd(past));
    return {
      ...base,
      status: 'after',
      semester: past,
      totalWeeks: past.weeks,
      daysSinceEnd: Number.isFinite(end) ? todayNum - end : null,
      startDate: past.startDate,
      endDate: semesterEndYmd(past),
    };
  }

  return base;
}

/**
 * 「该查第几周」的便捷入口：不在教学周内（未开学 / 学期已结束 / 没配置日历）返回 null。
 * MyZone、侧边栏「今日课程」这类只关心当下有没有课的调用方用它。
 */
export function currentTeachingWeek(now = new Date(), semesters = SEMESTERS) {
  const context = resolveSemesterContext(now, semesters);
  return context.status === 'during' ? context.week : null;
}

/** 把周次夹到 [1, totalWeeks] 内（非法输入回落到第 1 周） */
export function clampWeek(week, totalWeeks = FALLBACK_TOTAL_WEEKS) {
  const w = Math.floor(Number(week));
  const total = Math.max(1, Math.floor(Number(totalWeeks)) || FALLBACK_TOTAL_WEEKS);
  if (!Number.isFinite(w)) return 1;
  return Math.min(Math.max(w, 1), total);
}

/** 第 week 周的起止日期（周一 ~ 周日） */
export function weekDateRange(semester, week) {
  if (!semester) return null;
  const w = Math.floor(Number(week));
  if (!Number.isFinite(w) || w < 1) return null;
  const start = addDaysYmd(semester.startDate, (w - 1) * 7);
  if (!start) return null;
  return { start, end: addDaysYmd(start, 6) };
}

/**
 * 单个日期的文案，例如「9月28日」/「Sep 28」
 * @param {string} ymd
 * @param {boolean} [isZh]
 */
export function formatYmdLabel(ymd, isZh = true) {
  const p = parseYmd(ymd);
  if (!p) return '';
  return isZh ? `${p.m}月${p.d}日` : `${MONTHS_EN[p.m - 1]} ${p.d}`;
}

/**
 * 第 week 周的日期范围文案，例如「9月28日 – 10月4日」/「Sep 28 – Oct 4」
 * @param {object} semester
 * @param {number} week
 * @param {boolean} [isZh]
 */
export function formatWeekDateRangeLabel(semester, week, isZh = true) {
  const range = weekDateRange(semester, week);
  if (!range) return '';
  return `${formatYmdLabel(range.start, isZh)} – ${formatYmdLabel(range.end, isZh)}`;
}

/**
 * 自查学期日历是否写对（startDate 必须是周一、区间不能重叠等）。
 * 返回问题列表，空数组表示健康。给测试用，也可在排查时手动调用。
 */
export function validateSemesterCalendar(semesters = SEMESTERS) {
  const problems = [];
  if (!Array.isArray(semesters) || semesters.length === 0) {
    problems.push('学期日历为空');
    return problems;
  }
  const seen = new Set();
  for (const s of semesters) {
    if (!s || typeof s !== 'object') {
      problems.push('存在非对象的学期项');
      continue;
    }
    const label = s.id || '(缺少 id)';
    if (!s.id) problems.push('存在缺少 id 的学期项');
    else if (seen.has(s.id)) problems.push(`id 重复：${s.id}`);
    else seen.add(s.id);

    const p = parseYmd(s.startDate);
    if (!p) {
      problems.push(`${label} 的 startDate 非法：${s.startDate}`);
    } else if (new Date(p.ms).getUTCDay() !== 1) {
      problems.push(`${label} 的 startDate 不是周一：${s.startDate}`);
    }
    if (!Number.isInteger(s.weeks) || s.weeks < 1) {
      problems.push(`${label} 的 weeks 非法：${s.weeks}`);
    }
  }

  const list = sortedSemesters(semesters);
  for (let i = 1; i < list.length; i += 1) {
    const prevEnd = ymdToDayNumber(semesterEndYmd(list[i - 1]));
    const curStart = semesterStartNumber(list[i]);
    if (Number.isFinite(prevEnd) && Number.isFinite(curStart) && curStart <= prevEnd) {
      problems.push(`${list[i - 1].id} 与 ${list[i].id} 的周次区间重叠`);
    }
  }
  return problems;
}
