/**
 * Format utilities — shared across all screens.
 */

/** Relative time: 刚刚 / 3分钟前 / 2小时前 / 5天前 / locale date */
export function fmtTime(ts?: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString();
}

/** Time-of-day: "14:00:00" → "14:00" */
export function fmtClock(t?: string | null): string {
  return t ? t.substring(0, 5) : '--:--';
}

/** Date to "YYYY-MM-DD" */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date to "YYYY.M.D" */
export function fmtLabel(d: Date): string {
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

/** Deadline: "2026-06-02T18:00:00Z" → "6-02 18:00" */
export function fmtDeadline(ts?: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Price: 8.5 → "RM 8.50" */
export function fmtPrice(val?: number | string | null): string {
  const n = Number(val ?? 0);
  return `RM ${n.toFixed(2)}`;
}

/** Date to "YYYY-MM-DD" shorthand (alias) */
export const fmtDateStr = fmtDate;
