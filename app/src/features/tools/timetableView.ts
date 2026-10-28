/**
 * 课表页的展示规则（纯函数）—— 2026-10-18 所有者重做要求：
 * 「同一门课程颜色可以一样，不同课程颜色可以不一样」「卡片必须显示上课地点与课程名称」。
 * 2026-10-18 追加（所有者有色弱）：「色差可以大一点」→ 换成**色弱友好的课程色板**。
 *
 * ## 课程色从哪来
 * 专用语义令牌 `course-*`（见 `tokens/design-tokens.css` §2.3'）：
 *   · 取 CUD / Okabe-Ito 取向的 6 个高差异色（蓝 / 橙 / 青绿 / 品红 / 天蓝 / 黄），
 *     相邻色在**色相 + 明度**上同时拉开，红绿色弱也能靠明度区分；
 *   · 每个填充自带 `course-N-on` 承载文字色，逐对实测 ≥4.5:1（`gen-tokens` 门禁）。
 * ⛔ 不得拿课程色表达状态语义（状态仍用 `state-*`）。
 *
 * ## 颜色怎么分配
 * 按课程身份键稳定映射到 6 色：
 *   · 同一课程（同一 `courseCode`，不论周次、时间和地点）→ 同色；
 *   · 色板数量有限，不同课程可能使用同色。
 */

import type { DarkColorTokenName } from '@/design-system/tokens';
import type { TimetableMeeting, TimetableWeek } from './timetable';

export const VISIBLE_WEEKDAYS = [1, 2, 3, 4, 5] as const;

export function visibleTimetableWeekdays(week: TimetableWeek): readonly number[] {
  return [...VISIBLE_WEEKDAYS, ...[6, 7].filter((day) => (week.days[day]?.length ?? 0) > 0
    || (week.days[day - 1] ?? []).some(isOvernightMeeting))];
}

export function isOvernightMeeting(meeting: TimetableMeeting): boolean {
  const start = clockMinutes(meeting.startTime), end = clockMinutes(meeting.endTime);
  return start !== null && end !== null && end > 0 && end < start;
}

export type CourseAccent = {
  /** 卡片底色令牌（实心课程色） */
  fill: DarkColorTokenName;
  /** 卡片文字色令牌（与该填充成对，已实测 ≥4.5:1） */
  ink: DarkColorTokenName;
};

/** 6 个课程色（顺序即分配顺序；色弱友好的高差异色板） */
export const COURSE_ACCENTS: readonly CourseAccent[] = [
  { fill: 'course-1-fill', ink: 'course-1-on' },
  { fill: 'course-2-fill', ink: 'course-2-on' },
  { fill: 'course-3-fill', ink: 'course-3-on' },
  { fill: 'course-4-fill', ink: 'course-4-on' },
  { fill: 'course-5-fill', ink: 'course-5-on' },
  { fill: 'course-6-fill', ink: 'course-6-on' },
];

/** 课程身份键：代码优先，没有代码时才退到名称（两侧去空白） */
export function courseKey(meeting: TimetableMeeting): string {
  return meeting.courseCode.trim() || (meeting.courseName ?? '').trim();
}

/** 本周「课程码 → 课程色」的唯一分配处；颜色不依赖其他课程。 */
export function courseAccentMap(week: TimetableWeek): ReadonlyMap<string, CourseAccent> {
  const keys = new Set<string>();
  for (const day of Object.keys(week.days)) {
    for (const meeting of week.days[Number(day)] ?? []) {
      const key = courseKey(meeting);
      if (key !== '') keys.add(key);
    }
  }
  for (const meeting of week.previousSunday ?? []) {
    const key = courseKey(meeting);
    if (key !== '') keys.add(key);
  }
  return new Map(
    [...keys]
      .sort()
      .map((key) => {
        let hash = 2166136261;
        for (let index = 0; index < key.length; index += 1) {
          hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
        }
        return [key, COURSE_ACCENTS[(hash >>> 0) % COURSE_ACCENTS.length]];
      })
  );
}

/** 调色板兜底（无数据/空代码时不崩：永远给第一色） */
export const FALLBACK_COURSE_ACCENT: CourseAccent = COURSE_ACCENTS[0];

/** Filter display data only; the shared cached week retains all seven days. */
export function weekdayTimetableWeek(week: TimetableWeek): TimetableWeek {
  return { ...week, days: Object.fromEntries(visibleTimetableWeekdays(week).map((day) => [day, week.days[day] ?? []])) };
}

/* ───────────────────────── 时间轴（08:00–21:00 固定窗口） ───────────────────────── */

/** 时间轴起止小时（所有者 2026-10-18：从早上 8 点到晚上 9 点都要画出来） */
export const TIMETABLE_AXIS_START_HOUR = 8;
export const TIMETABLE_AXIS_END_HOUR = 21;
/** 轴上一共多少个小时格（08–09 … 20–21） */
export const TIMETABLE_AXIS_HOURS = TIMETABLE_AXIS_END_HOUR - TIMETABLE_AXIS_START_HOUR;
/** 轴上的整点标签：08:00 … 21:00（含末端，共 15 个） */
export const TIMETABLE_AXIS_LABELS: readonly number[] = Array.from(
  { length: TIMETABLE_AXIS_HOURS + 1 },
  (_, index) => TIMETABLE_AXIS_START_HOUR + index
);

/** `"HH:MM[:SS]"` → 当天分钟数；非法返回 `null`（⛔ 不猜） */
export function clockMinutes(value: string | null | undefined): number | null {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) : null;
  if (match === null) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export type TimetableCardLayout = {
  /** 相对时间轴顶部的偏移（按小时比例算出） */
  top: number;
  /** 卡片高度（至少 `minCardHeight`，保证两行文字放得下） */
  height: number;
};

/**
 * 把一节课摆进固定时间轴（纯函数）。
 * - 起止时间非法 → `null`（不画这张卡）；
 * - 与 08:00–21:00 无交集 → `null`；
 * - 跨出窗口的部分钳到窗口内（保证看得见，且不撑破时间轴）；
 * - 一小时的课高度 = `hourHeight`，半小时课也有 `minCardHeight` 的可读高度。
 */
export function layoutTimetableCard(
  meeting: TimetableMeeting,
  hourHeight: number,
  minCardHeight: number,
  startHour = TIMETABLE_AXIS_START_HOUR,
  endHour = TIMETABLE_AXIS_END_HOUR
): TimetableCardLayout | null {
  const start = clockMinutes(meeting.startTime);
  if (start === null) return null;
  const rawEnd = clockMinutes(meeting.endTime);
  const end = rawEnd === null || rawEnd === start ? start + 60 : rawEnd < start ? 24 * 60 : rawEnd;
  const axisStart = startHour * 60;
  const axisEnd = endHour * 60;
  if (end <= axisStart || start >= axisEnd) return null;
  const clampedStart = Math.max(axisStart, Math.min(start, axisEnd - 1));
  const clampedEnd = Math.min(axisEnd, Math.max(end, clampedStart + 15));
  const top = ((clampedStart - axisStart) / 60) * hourHeight;
  const rawHeight = ((clampedEnd - clampedStart) / 60) * hourHeight;
  const height = Math.max(minCardHeight, rawHeight);
  return { top, height };
}
