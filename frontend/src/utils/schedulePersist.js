/**
 * 课表周数据持久化到 localStorage：配合 React Query staleTime: Infinity，
 * 仅在重新导入（invalidate）或用户点「刷新」时走网络。
 *
 * 周次是可变的（第 1 周 ~ 第 N 周各自的课表不同），所以缓存按周分开存；
 * 重新导入课表会覆盖所有周次，此时用 clearPersistedScheduleWeeks() 全部清掉。
 */
const KEY_PREFIX = 'dorm_schedule_cache_v1_w';

const keyForWeek = (week) => `${KEY_PREFIX}${Number(week)}`;

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

/** 清掉所有周次的缓存（重新导入课表后调用） */
export function clearPersistedScheduleWeeks() {
  if (typeof window === 'undefined') return;
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    // 忽略
  }
}
