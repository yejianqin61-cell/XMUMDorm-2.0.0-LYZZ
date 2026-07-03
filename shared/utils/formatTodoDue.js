/**
 * 待办截止日期/时间：MySQL DATE/TIME 经 JSON 后可能是 ISO 或 1970 年时间戳，需规范化
 */

export function localTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 供 input[type=date] 与展示：YYYY-MM-DD */
export function normalizeTodoDueDate(dueDate) {
  if (dueDate == null || dueDate === '') return '';
  if (dueDate instanceof Date) {
    if (Number.isNaN(dueDate.getTime())) return '';
    const y = dueDate.getFullYear();
    const m = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(dueDate).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const mo = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return '';
}

/** 供 input[type=time] 与展示：HH:mm */
export function normalizeTodoDueTime(dueTime) {
  if (dueTime == null || dueTime === '') return '';
  if (dueTime instanceof Date) {
    if (Number.isNaN(dueTime.getTime())) return '';
    const h = String(dueTime.getHours()).padStart(2, '0');
    const min = String(dueTime.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  const s = String(dueTime).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return '';
}

/** 列表展示用 */
export function formatTodoDueDisplay(dueDate, dueTime) {
  const d = normalizeTodoDueDate(dueDate);
  const t = normalizeTodoDueTime(dueTime);
  if (d && t) return `${d} ${t}`;
  return d || t || '';
}
