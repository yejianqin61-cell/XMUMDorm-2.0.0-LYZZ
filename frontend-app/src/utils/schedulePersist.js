/**
 * 课表周数据持久化到 localStorage：配合 React Query staleTime: Infinity，
 * 仅在重新导入（invalidate）或用户点「刷新」时走网络。
 */
const keyForWeek = (week) => `dorm_schedule_cache_v1_w${Number(week)}`;

export function readPersistedScheduleWeek(week) {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(keyForWeek(week));
    if (raw == null || raw === '') return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writePersistedScheduleWeek(week, data) {
  if (typeof window === 'undefined' || data == null) return;
  try {
    localStorage.setItem(keyForWeek(week), JSON.stringify(data));
  } catch {
    // 配额满等
  }
}
