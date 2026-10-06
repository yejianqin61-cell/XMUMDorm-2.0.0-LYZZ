/**
 * 课表周视图（P1-16 · `T-02`）—— 纯逻辑与本地优先缓存
 *
 * ## 数据来源（`GET /api/schedule/week?week=N`，需鉴权）
 * 响应 `data`：
 * ```
 * { week, days: { 1..7: Meeting[] }, currentWeek: number|null,
 *   semesterStatus, totalWeeks, semester: {...}|null }
 * ```
 * ⚠️ **周次必须显式传**：第 1 周和第 10 周的课表不一样（`shared/api/schedule.js` 的注释：
 *    早先默认 1 导致整站永远只显示第 1 周）。所以本页**不允许**省略周次。
 *
 * ## 三处"复用"而不是重造
 * 1. **周次/学期/时区** 全部用 `shared/config/semesters.js`：`clampWeek` 夹紧、
 *    `kualaLumpurCalendarParts` 取**吉隆坡时区**的今天（⛔ 不用设备本地时区 ——
 *    学生在别处或漫游时会高亮错行）；
 * 2. **本地优先**：先给缓存再打远端，失败**不清空已有内容**（与 `P1-12` 同一条纪律，宪法 10.6）；
 * 3. **分段切换**用 `C14 SegmentedControl`（页面清单指定），它**上限 5 项** → 周次只能给"窗口"。
 */

import * as React from 'react';

import { getItem, setItem } from '@/shared/storage';
import { FALLBACK_TOTAL_WEEKS, clampWeek, kualaLumpurCalendarParts } from '../../../../shared/config/semesters';
import type { AppError } from '@/i18n/errors';

/* ────────────────────────── 类型与规范化 ────────────────────────── */

export type TimetableMeeting = {
  courseCode: string;
  courseName: string | null;
  credit: number | null;
  lecturer: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
};

/** `1..7` → 该天的课（后端就是这么分组的） */
export type TimetableDays = Record<number, readonly TimetableMeeting[]>;

export type TimetableWeek = {
  week: number;
  days: TimetableDays;
  /** 服务端算出的当前教学周（未开学/已结束时为 `null`） */
  currentWeek: number | null;
  totalWeeks: number;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const EMPTY_DAYS = (): TimetableDays => ({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });

/**
 * 规范化响应（纯函数）：字段改名、缺字段给空、**非法返回 `null`**（⛔ 不在渲染路径上抛）。
 * ⚠️ 为什么要做：`shared/api/request.js` 返回的是未类型化 JSON，
 *    直接读会得到 `undefined` 并把网格画成空白。
 */
export function normalizeTimetableWeek(data: unknown): TimetableWeek | null {
  if (data === null || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const week = asNumber(raw.week);
  if (week === null) return null;

  const days = EMPTY_DAYS();
  const rawDays = raw.days;
  if (rawDays !== null && typeof rawDays === 'object') {
    for (const key of Object.keys(rawDays as Record<string, unknown>)) {
      const day = Number(key);
      if (!Number.isInteger(day) || day < 1 || day > 7) continue;
      const list = (rawDays as Record<string, unknown>)[key];
      if (!Array.isArray(list)) continue;
      days[day] = list.map((item) => {
        const meeting = (item ?? {}) as Record<string, unknown>;
        return {
          courseCode: asString(meeting.course_code ?? meeting.courseCode) ?? '',
          courseName: asString(meeting.course_name ?? meeting.courseName),
          credit: asNumber(meeting.credit),
          lecturer: asString(meeting.lecturer),
          dayOfWeek: asNumber(meeting.day_of_week ?? meeting.dayOfWeek) ?? day,
          startTime: asString(meeting.start_time ?? meeting.startTime),
          endTime: asString(meeting.end_time ?? meeting.endTime),
          venue: asString(meeting.venue),
        };
      });
    }
  }

  const totalWeeks = asNumber(raw.totalWeeks) ?? FALLBACK_TOTAL_WEEKS;
  return {
    week,
    days,
    currentWeek: asNumber(raw.currentWeek),
    totalWeeks: totalWeeks > 0 ? Math.floor(totalWeeks) : FALLBACK_TOTAL_WEEKS,
  };
}

/** 这一周有没有课（纯函数） */
export function weekHasMeetings(week: TimetableWeek): boolean {
  return Object.values(week.days).some((list) => list.length > 0);
}

/* ────────────────────────── 网格行（"节次"的落地） ────────────────────────── */

export type TimetableRow = {
  /** 该行的开始时间（后端只给时间，没有"节次"字段 —— 见 README §7-12） */
  startTime: string;
  /** 星期 → 该时段开始的课 */
  cells: Record<number, readonly TimetableMeeting[]>;
};

/**
 * 把 `days` 折成**按开始时间的行**（纯函数）。
 * ⚠️ §2.7 说 `P11` 是"星期 × **节次**"，但接口只给 `start_time`/`end_time`，
 *    **没有节次编号**，也没有节次表 → 只能用**开始时间**当行键（⛔ 不猜"第几节"）。
 *    时间字符串统一按 `HH:MM` 排序（后端给的就是这个格式）。
 */
export function buildTimetableRows(days: TimetableDays): readonly TimetableRow[] {
  const byStart = new Map<string, TimetableRow>();
  for (const dayKey of Object.keys(days)) {
    const day = Number(dayKey);
    for (const meeting of days[day] ?? []) {
      const startTime = meeting.startTime ?? '';
      if (startTime === '') continue;
      let row = byStart.get(startTime);
      if (!row) {
        row = { startTime, cells: {} };
        byStart.set(startTime, row);
      }
      const cell = row.cells[day] ?? [];
      row.cells[day] = [...cell, meeting];
    }
  }
  return [...byStart.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/* ────────────────────────── 周次窗口与"今天" ────────────────────────── */

/** `C14 SegmentedControl` 的硬上限（§2.2：2–5 项） */
export const WEEK_WINDOW_SIZE = 5;

/**
 * 周次窗口（纯函数）：给 `C14` 用。
 * 语义：以 `center` 结尾的 `size` 周窗口，并夹在 `1..totalWeeks` 内。
 * ⚠️ 一学期 20 周，而 `C14` 最多 5 项 → **必须**有窗口 + 平移（用左右按钮），
 *    ⛔ 不能把 20 项塞进去（`C14` 会在 dev 下报警告，那正是它的用途）。
 */
export function weekWindow(
  center: number,
  totalWeeks: number,
  size: number = WEEK_WINDOW_SIZE
): readonly number[] {
  const total = Math.max(1, Math.floor(totalWeeks));
  const safeSize = Math.max(1, Math.min(size, total));
  const clampedCenter = clampWeek(center, total);
  // 尽量让中心靠中间（不够就往两边贴）
  let start = clampedCenter - Math.floor(safeSize / 2);
  if (start < 1) start = 1;
  if (start + safeSize - 1 > total) start = total - safeSize + 1;
  return Array.from({ length: safeSize }, (_, index) => start + index);
}

/**
 * 今天是周几（纯函数）：**吉隆坡时区**，1=周一 … 7=周日。
 * ⛔ 不用设备本地时区：学校在马来西亚，学生漫游/跨时区时会高亮错行。
 */
export function todayWeekday(now: Date = new Date()): number | null {
  return kualaLumpurCalendarParts(now).dayOfWeek ?? null;
}

/**
 * 要不要高亮"今天"（纯函数）：**只有显示的就是当前教学周时**才高亮。
 * 否则用户翻到第 3 周时，今天那一列会被点亮 —— 那是误导。
 */
export function shouldHighlightToday(shownWeek: number, currentWeek: number | null): boolean {
  return currentWeek !== null && shownWeek === currentWeek;
}

/* ────────────────────────── 本地优先缓存（宪法 10.6） ────────────────────────── */

export function timetableCacheKey(week: number): string {
  return `timetable:week:${week}`;
}

export async function readCachedWeek(week: number): Promise<TimetableWeek | null> {
  const cached = await getItem<unknown>(timetableCacheKey(week));
  return cached === null ? null : normalizeTimetableWeek(cached);
}

export async function writeCachedWeek(week: number, data: TimetableWeek): Promise<void> {
  await setItem(timetableCacheKey(week), data);
}

export type WeekSource = 'remote' | 'cache';

export type TimetableWeekState = {
  week: TimetableWeek | null;
  source: WeekSource | null;
  loading: boolean;
  error: AppError | null;
};

/**
 * 离线优先取某一周：**先给缓存，再打远端，失败不清空已有内容**。
 * （与 `P1-12` 的 `useStaticDoc` 同一条纪律；⛔ 不引第三方缓存策略 ——
 * 页面要按周缓存，用 query 的 key 也行，但"离线优先"的判定必须在同一处。）
 */
export function useTimetableWeek(
  week: number,
  fetchWeek: (week: number) => Promise<unknown>
): TimetableWeekState & { reload: () => void } {
  const [state, setState] = React.useState<TimetableWeekState>({
    week: null,
    source: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = React.useState(0);
  const fetchRef = React.useRef(fetchWeek);
  fetchRef.current = fetchWeek;

  React.useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    void (async () => {
      // ① 缓存先上（立刻有东西看）
      const cached = await readCachedWeek(week);
      if (cancelled) return;
      if (cached !== null) {
        setState({ week: cached, source: 'cache', loading: true, error: null });
      }

      // ② 再打远端
      try {
        const data = await fetchRef.current(week);
        if (cancelled) return;
        const normalized = normalizeTimetableWeek(data);
        if (normalized === null) {
          setState((prev) => ({ ...prev, loading: false, error: { kind: 'unknown' } }));
          return;
        }
        setState({ week: normalized, source: 'remote', loading: false, error: null });
        await writeCachedWeek(week, normalized);
      } catch (error) {
        if (cancelled) return;
        // ③ 失败：**保留已有内容**（这就是"离线优先"的全部意义）
        setState((prev) => ({
          ...prev,
          loading: false,
          error: (error as AppError | undefined) ?? { kind: 'unknown' },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [week, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
