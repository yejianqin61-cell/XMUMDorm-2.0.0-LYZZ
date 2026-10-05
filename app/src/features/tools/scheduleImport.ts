/**
 * 课表导入（P1-15 · `T-03`）—— 纯逻辑
 *
 * ## 链路（页面清单 `T-03`）
 * ```
 * T-05 读表（客户端，无后端） ── 制表符文本 ──┐
 *                                          ├─▶ POST /schedule/import/preview ──▶ 预览
 * 用户直接粘贴文本（兜底） ──────────────────┘                                  │
 *                                                        AlertDialog(整表覆盖) ──▶ POST /schedule/import/commit
 * ```
 * ⚠️ README §7-1 更正过：文档写 `POST /api/schedule/import`，**实际是 `/import/commit`**
 *    （`routes/schedule.js:53`）。这里用的是**实际路径**，包在 `shared/api/schedule.js` 里。
 *
 * ## 两条来自服务端的硬事实（读代码确认，不是猜的）
 * 1. 文本长度 < **10** 就被拒（`routes/schedule.js:35/57`）→ 客户端**镜像**这条规则
 *    （§3.2.2-②：客户端校验只为减少一次失败往返，**服务端始终是权威**）；
 * 2. `commit` 是**整表覆盖**（`:77` 起删旧数据）→ 必须 `O03 AlertDialog(danger)` 二次确认，
 *    ⛔ 不能"点了就覆盖"。
 */

import type { AppError } from '@/i18n/errors';
import type { MessageKey } from '@/i18n/zh';

/* ────────────────────────── 服务端规则的镜像 ────────────────────────── */

/** 服务端最小文本长度（`routes/schedule.js` 两处都判 10） */
export const IMPORT_MIN_TEXT_LENGTH = 10;

export type ImportTextProblem = 'tooShort' | null;

/** 客户端镜像校验（纯函数）：只挡"肯定会被拒"的输入 */
export function validateImportText(text: string): ImportTextProblem {
  return text.trim().length < IMPORT_MIN_TEXT_LENGTH ? 'tooShort' : null;
}

/* ────────────────────────── 服务端返回的规范化 ────────────────────────── */

export type ScheduleImportCourse = {
  courseCode: string;
  courseName: string | null;
  credit: number | null;
  lecturer: string | null;
};

export type ScheduleImportMeeting = {
  courseCode: string | null;
  /** 1=周一 … 7=周日（后端 `DAY_MAP`） */
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
};

export type ScheduleImportPreview = {
  courses: readonly ScheduleImportCourse[];
  meetings: readonly ScheduleImportMeeting[];
  /** ⚠️ 服务端给的是**中文串**（如"课程号解析失败：…"）—— 见 §风险 */
  errors: readonly string[];
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * 把 `POST /import/preview` 的 `data` **规范化**成可用的类型（纯函数）。
 * ⚠️ 为什么必须做：`shared/api/request.js` 返回的是**未类型化的 JSON**，
 *    字段缺失/改名在运行期才会暴露；渲染层直接读会得到 `undefined` 并画出空行。
 *    ⛔ 非法输入返回 `null`（⛔ 不在渲染路径上抛）。
 */
export function normalizeImportPreview(data: unknown): ScheduleImportPreview | null {
  if (data === null || typeof data !== 'object') return null;
  const raw = data as { courses?: unknown; meetings?: unknown; errors?: unknown };
  if (!Array.isArray(raw.courses)) return null;

  const courses: ScheduleImportCourse[] = raw.courses.map((item) => {
    const course = (item ?? {}) as Record<string, unknown>;
    return {
      courseCode: asString(course.course_code) ?? '',
      courseName: asString(course.course_name),
      credit: asNumber(course.credit),
      lecturer: asString(course.lecturer),
    };
  });

  const meetings: ScheduleImportMeeting[] = Array.isArray(raw.meetings)
    ? raw.meetings.map((item) => {
        const meeting = (item ?? {}) as Record<string, unknown>;
        return {
          courseCode: asString(meeting.course_code),
          dayOfWeek: asNumber(meeting.day_of_week),
          startTime: asString(meeting.start_time),
          endTime: asString(meeting.end_time),
          venue: asString(meeting.venue),
        };
      })
    : [];

  const errors = Array.isArray(raw.errors)
    ? raw.errors.map((e) => String(e)).filter((e) => e.trim() !== '')
    : [];

  return { courses, meetings, errors };
}

/** 预览摘要（纯函数）：给页面显示"几门课 / 几段课 / 几行没解析" */
export function summarizePreview(preview: ScheduleImportPreview): {
  courseCount: number;
  meetingCount: number;
  errorCount: number;
} {
  return {
    courseCount: preview.courses.length,
    meetingCount: preview.meetings.length,
    errorCount: preview.errors.length,
  };
}

/** `day_of_week` → 词条 key（纯函数）；⛔ 越界不猜，返回 `null` 由调用方决定不显示 */
export function weekdayLabelKey(dayOfWeek: number | null): MessageKey | null {
  if (dayOfWeek === null || !Number.isInteger(dayOfWeek)) return null;
  if (dayOfWeek < 1 || dayOfWeek > 7) return null;
  return `weekday.${dayOfWeek}` as MessageKey;
}

/* ────────────────────────── 导入流程状态机（纯函数） ────────────────────────── */

export type ImportPhase = 'idle' | 'previewing' | 'previewed' | 'committing' | 'committed';

export type ImportState = {
  phase: ImportPhase;
  /** 预览结果（`previewed` 之后才有） */
  preview: ScheduleImportPreview | null;
  /** 表单级错误（进 `K04` 摘要） */
  error: AppError | null;
};

export const INITIAL_IMPORT_STATE: ImportState = {
  phase: 'idle',
  preview: null,
  error: null,
};

export type ImportAction =
  | { type: 'text:changed' }
  | { type: 'preview:start' }
  | { type: 'preview:success'; preview: ScheduleImportPreview }
  | { type: 'preview:failure'; error: AppError }
  | { type: 'commit:start' }
  | { type: 'commit:success' }
  | { type: 'commit:failure'; error: AppError };

/**
 * 三条不变量：
 * - **改文本即作废预览**（`text:changed` → `idle`）：否则用户改完内容还能按"确认导入"
 *   把**旧文本**提交上去 —— 那是最危险的一类脏状态；
 * - `previewing`/`committing` 期间不重复进入（防重复请求）；
 * - 任一新动作开始即清掉上一次错误。
 */
export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'text:changed':
      if (state.phase === 'committing') return state;
      return INITIAL_IMPORT_STATE;
    case 'preview:start':
      if (state.phase === 'previewing' || state.phase === 'committing') return state;
      return { phase: 'previewing', preview: null, error: null };
    case 'preview:success':
      return { phase: 'previewed', preview: action.preview, error: null };
    case 'preview:failure':
      return { phase: 'idle', preview: null, error: action.error };
    case 'commit:start':
      if (state.phase !== 'previewed') return state;
      return { ...state, phase: 'committing', error: null };
    case 'commit:success':
      return { phase: 'committed', preview: state.preview, error: null };
    case 'commit:failure':
      return { ...state, phase: 'previewed', error: action.error };
    default:
      return state;
  }
}

/** 只有"已预览 **且** 解析出课程"才允许覆盖式导入（纯函数） */
export function canCommit(state: ImportState): boolean {
  return state.phase === 'previewed' && (state.preview?.courses.length ?? 0) > 0;
}
