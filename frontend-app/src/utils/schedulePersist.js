/**
 * 课表周数据持久化到 localStorage：配合 React Query staleTime: Infinity，
 * 仅在重新导入（invalidate）或用户点「刷新」时走网络。
 */
const keyForWeek = (userId, week) => `dorm_schedule_cache_v2_u${Number(userId) || 0}_w${Number(week)}`;

export function readPersistedScheduleWeek(userId, week) {
  if (typeof window === 'undefined' || !userId) return undefined;
  try {
    const raw = localStorage.getItem(keyForWeek(userId, week));
    if (raw == null || raw === '') return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writePersistedScheduleWeek(userId, week, data) {
  if (typeof window === 'undefined' || !userId || data == null) return;
  try {
    localStorage.setItem(keyForWeek(userId, week), JSON.stringify(data));
  } catch {
    // 配额满等
  }
}
