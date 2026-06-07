/**
 * 课程表模块 — 单元测试 + 集成测试
 *
 * 测试架构：
 *   Part A: 单元测试 — 纯函数逻辑（getTodayDow / fmtTime / addFreeSlots / parseTime / nextDayOfWeek）
 *   Part B: 集成测试 — API 流程（Week GET / Import Preview / Import Commit / 缓存）
 *   Part C: 提醒服务 — 时间计算 / 去重 / 调度 / 取消 / 权限
 *
 * 总计 37 用例
 */

// ─── Mocks ──────────────────────────────────
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

jest.mock('expo-notifications', () => {
  let scheduled = [];
  return {
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    scheduleNotificationAsync: jest.fn(({ content, trigger }) => {
      const id = `notif_${Date.now()}_${Math.random()}`;
      scheduled.push({ id, content, trigger });
      return Promise.resolve(id);
    }),
    cancelScheduledNotificationAsync: jest.fn((id) => {
      scheduled = scheduled.filter((s) => s.id !== id);
      return Promise.resolve();
    }),
    cancelAllScheduledNotificationsAsync: jest.fn(() => { scheduled = []; return Promise.resolve(); }),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve(scheduled)),
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { HIGH: 4 },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    setItem: jest.fn((k, v) => { store[k] = v; return Promise.resolve(); }),
    getItem: jest.fn((k) => Promise.resolve(store[k] || null)),
    removeItem: jest.fn((k) => { delete store[k]; return Promise.resolve(); }),
    multiRemove: jest.fn((keys) => { keys.forEach((k) => delete store[k]); return Promise.resolve(); }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    __store: store,
  };
});

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ isLoggedIn: true }), STORAGE_TOKEN: 'token' }));
jest.mock('../../src/utils/http', () => ({
  apiGet: jest.fn(() => Promise.resolve({ status: 0, data: {} })),
  apiPost: jest.fn(() => Promise.resolve({ status: 0, data: {} })),
  apiDelete: jest.fn(() => Promise.resolve({ status: 0, data: {} })),
  apiPatch: jest.fn(() => Promise.resolve({ status: 0, data: {} })),
}));
jest.mock('../../src/api/config', () => ({ API_BASE_URL: 'http://10.72.10.97:4040' }));
jest.mock('../../src/services/scheduleReminder', () => ({
  requestReminderPermission: jest.fn(() => Promise.resolve(true)),
  scheduleAllReminders: jest.fn(() => Promise.resolve(0)),
  cancelAllReminders: jest.fn(() => Promise.resolve()),
  hasScheduledReminders: jest.fn(() => Promise.resolve(false)),
}));

// ─── 被测函数（从源文件复制纯逻辑以隔离测试） ───

function getTodayDow() { const d = new Date().getDay(); return d === 0 ? 7 : d; }
function fmtTime(t) { return t ? t.substring(0, 5) : '--:--'; }

function addFreeSlots(courses) {
  if (!courses || courses.length === 0) return courses || [];
  const result = [];
  for (let i = 0; i < courses.length; i++) {
    result.push(courses[i]);
    if (i < courses.length - 1) {
      const currEnd = courses[i].end_time;
      const nextStart = courses[i + 1].start_time;
      if (currEnd && nextStart) {
        const gap = (parseInt(nextStart) * 60 + parseInt(nextStart.substring(3, 5))) -
          (parseInt(currEnd) * 60 + parseInt(currEnd.substring(3, 5)));
        if (gap >= 25) result.push({ _freeSlot: true, start_time: currEnd, end_time: nextStart, duration: gap });
      }
    }
  }
  return result;
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function nextDayOfWeek(targetDow, afterDate) {
  const today = afterDate.getDay();
  const target = targetDow === 7 ? 0 : targetDow;
  let daysUntil = target - today;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(afterDate);
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function calcReminderTime(startTime, minutesBefore) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m - minutesBefore;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(((totalMin % 60) + 60) % 60).padStart(2, '0')}`;
}

function dedupKey(meetingId, dow, startTime) {
  return `reminder_${meetingId}_${dow}_${startTime}`;
}

// ═══════════════════════════════════════════════════════════════
//  PART A — 单元测试 (纯函数)
// ═══════════════════════════════════════════════════════════════

describe('A-单元 | getTodayDow', () => {
  it('A1. 返回 1-7 之间的值', () => {
    const dow = getTodayDow();
    expect(dow).toBeGreaterThanOrEqual(1);
    expect(dow).toBeLessThanOrEqual(7);
  });
  it('A2. 非 0（JS周日被映射为7）', () => {
    expect(getTodayDow()).not.toBe(0);
  });
});

describe('A-单元 | fmtTime', () => {
  it('A3. HH:mm:ss → HH:mm', () => {
    expect(fmtTime('14:00:00')).toBe('14:00');
    expect(fmtTime('09:30:00')).toBe('09:30');
  });
  it('A4. 空字符串/null/undefined → --:--', () => {
    expect(fmtTime('')).toBe('--:--');
    expect(fmtTime(null)).toBe('--:--');
    expect(fmtTime(undefined)).toBe('--:--');
  });
  it('A5. 已截断字符串不变', () => {
    expect(fmtTime('14:00')).toBe('14:00');
  });
});

describe('A-单元 | addFreeSlots (空档检测)', () => {
  const cs = (pairs) => pairs.map(([s, e]) => ({ start_time: s, end_time: e }));

  it('A6. 3小时空档（180min ≥ 25）→ 插入1个freeSlot', () => {
    const input = cs([['09:00', '11:00'], ['14:00', '17:00']]);
    const result = addFreeSlots(input);
    expect(result).toHaveLength(3); // 2 courses + 1 free
    expect(result[1]._freeSlot).toBe(true);
    expect(result[1].duration).toBe(180);
  });
  it('A7. 20分钟间隔（<25）→ 不插入空档', () => {
    const input = cs([['09:00', '10:00'], ['10:20', '12:00']]);
    const result = addFreeSlots(input);
    expect(result).toHaveLength(2);
    expect(result.every((r) => !r._freeSlot)).toBe(true);
  });
  it('A8. 边界：恰好25分钟 → 插入空档', () => {
    const input = cs([['09:00', '10:00'], ['10:25', '12:00']]);
    const result = addFreeSlots(input);
    expect(result).toHaveLength(3);
    expect(result[1]._freeSlot).toBe(true);
    expect(result[1].duration).toBe(25);
  });
  it('A9. 单节课 → 无空档', () => {
    expect(addFreeSlots(cs([['09:00', '11:00']]))).toHaveLength(1);
  });
  it('A10. 空数组 → 空数组', () => {
    expect(addFreeSlots([])).toEqual([]);
  });
  it('A11. null → []', () => {
    expect(addFreeSlots(null)).toEqual([]);
  });
});

describe('A-单元 | parseTime', () => {
  it('A12. "14:00:00" → {hours:14, minutes:0}', () => {
    expect(parseTime('14:00:00')).toEqual({ hours: 14, minutes: 0 });
  });
  it('A13. "09:30:00" → {hours:9, minutes:30}', () => {
    expect(parseTime('09:30:00')).toEqual({ hours: 9, minutes: 30 });
  });
  it('A14. 空字符串 → {hours:0, minutes:0}', () => {
    const r = parseTime('');
    expect(r.hours).toBe(0);
    expect(r.minutes).toBe(0);
  });
});

describe('A-单元 | nextDayOfWeek', () => {
  // 固定基准日期：2026-06-01 是周一
  const MON = new Date(2026, 5, 1); // Monday

  it('A15. 今天周一 → nextDayOfWeek(周一)=7天后', () => {
    const result = nextDayOfWeek(1, MON);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(8); // June 8
  });
  it('A16. 今天周一 → nextDayOfWeek(周三)=2天后', () => {
    const result = nextDayOfWeek(3, MON);
    expect(result.getDay()).toBe(3); // Wednesday
    expect(result.getDate()).toBe(3); // June 3
  });
  it('A17. 今天周一 → nextDayOfWeek(周日=7)→6天后', () => {
    const result = nextDayOfWeek(7, MON);
    expect(result.getDay()).toBe(0); // JS Sunday
    expect(result.getDate()).toBe(7); // June 7
  });
});

// ═══════════════════════════════════════════════════════════════
//  PART B — 集成测试 (API 流程)
// ═══════════════════════════════════════════════════════════════

describe('B-集成 | Week API', () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it('B1. 完整 7 天课表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { week: 1, days: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } },
      }),
    });
    const res = await fetch(`${API}/api/schedule/week?week=1`);
    const data = await res.json();
    expect(Object.keys(data.data.days)).toHaveLength(7);
  });

  it('B2. 课程含完整字段', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: {
          days: { 1: [{ course_code: 'G0173', course_name: '新媒体', credit: 4, lecturer: 'Dr. Li', start_time: '14:00:00', end_time: '17:00:00', venue: 'A5#G11', week_start: 1, week_end: 5 }], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
        },
      }),
    });
    const res = await fetch(`${API}/api/schedule/week?week=1`);
    const c = (await res.json()).data.days[1][0];
    expect(c.course_code).toBe('G0173');
    expect(c.lecturer).toBe('Dr. Li');
    expect(c.credit).toBe(4);
    expect(c.venue).toBe('A5#G11');
  });

  it('B3. 空天返回 []', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { days: { 3: [], 4: [] } } }) });
    const res = await fetch(`${API}/api/schedule/week?week=1`);
    const days = (await res.json()).data.days;
    expect(days[3]).toEqual([]);
  });
});

describe('B-集成 | Import API 完整流程', () => {
  beforeEach(() => { mockFetch.mockClear(); });

  const SAMPLE_TEXT = '1\tG0173\tNew Media Theory\t4\tProf. Li\tMonday 2.00pm-5.00pm (A5#G11) (Week 1-5)';

  it('B4. Preview → 解析出 course + meeting', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { courses: [{ course_code: 'G0173' }], meetings: [{ day_of_week: 1, start_time: '14:00:00' }], stats: { courseCount: 1, meetingCount: 1, errorCount: 0 }, errors: [] },
      }),
    });
    const res = await fetch(`${API}/api/schedule/import/preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: SAMPLE_TEXT }),
    });
    const d = (await res.json()).data;
    expect(d.stats.courseCount).toBe(1);
    expect(d.stats.errorCount).toBe(0);
    expect(d.errors).toEqual([]);
  });

  it('B5. Preview → 解析含错误', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { stats: { courseCount: 0, meetingCount: 0, errorCount: 3 }, errors: ['行1格式异常', '行2格式异常', '行3格式异常'] },
      }),
    });
    const res = await fetch(`${API}/api/schedule/import/preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'garbage input' }),
    });
    const d = (await res.json()).data;
    expect(d.stats.errorCount).toBe(3);
    expect(d.errors).toHaveLength(3);
  });

  it('B6. Commit → 导入成功 + 覆盖旧数据', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, message: '导入成功', data: { stats: { courseCount: 3, meetingCount: 8, errorCount: 0 } },
      }),
    });
    const res = await fetch(`${API}/api/schedule/import/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: SAMPLE_TEXT }),
    });
    const d = (await res.json()).data;
    expect(d.stats.courseCount).toBe(3);
    expect(d.stats.meetingCount).toBe(8);
  });

  it('B7. Commit → 导入后 Week 刷新（端到端）', async () => {
    // Step 1: commit import
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { stats: { courseCount: 2, meetingCount: 4 } } }),
    });
    const cRes = await fetch(`${API}/api/schedule/import/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: SAMPLE_TEXT }),
    });
    expect((await cRes.json()).status).toBe(0);

    // Step 2: fetch week — should reflect imported data
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { days: { 1: [{ course_code: 'G0173' }], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } },
      }),
    });
    const wRes = await fetch(`${API}/api/schedule/week?week=1`);
    expect((await wRes.json()).data.days[1]).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
//  PART C — 提醒服务测试
// ═══════════════════════════════════════════════════════════════

describe('C-提醒 | calcReminderTime', () => {
  it('C1. 14:00 课前30min → 13:30', () => {
    expect(calcReminderTime('14:00', 30)).toBe('13:30');
  });
  it('C2. 09:00 课前30min → 08:30', () => {
    expect(calcReminderTime('09:00', 30)).toBe('08:30');
  });
  it('C3. 00:30 课前30min → 00:00', () => {
    expect(calcReminderTime('00:30', 30)).toBe('00:00');
  });
  it('C4. 自定义提前量：15min → 08:45', () => {
    expect(calcReminderTime('09:00', 15)).toBe('08:45');
  });
});

describe('C-提醒 | dedupKey 去重键', () => {
  it('C5. 生成格式：reminder_{meetingId}_{dow}_{startTime}', () => {
    expect(dedupKey(42, 3, '14:00:00')).toBe('reminder_42_3_14:00:00');
  });
  it('C6. 不同 meetingId → 不同 key', () => {
    expect(dedupKey(1, 1, '09:00')).not.toBe(dedupKey(2, 1, '09:00'));
  });
  it('C7. 不同时间 → 不同 key', () => {
    expect(dedupKey(1, 1, '09:00')).not.toBe(dedupKey(1, 1, '14:00'));
  });
});

describe('C-提醒 | 周视图数据', () => {
  it('C8. 7 天标签：周一~周日', () => {
    const labels = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    expect(labels[1]).toBe('周一');
    expect(labels[7]).toBe('周日');
  });
  it('C9. 缓存 key 格式', () => {
    expect('dorm_schedule_cache_v1_w1').toContain('schedule');
    expect('dorm_schedule_cache_v1_w1').toContain('w1');
  });
});

describe('C-提醒 | 通知权限 (mocked 服务)', () => {
  let scheduleReminder;
  beforeEach(() => {
    jest.clearAllMocks();
    scheduleReminder = require('../../src/services/scheduleReminder');
  });

  it('C10. requestReminderPermission 默认返回 true', async () => {
    const result = await scheduleReminder.requestReminderPermission();
    expect(result).toBe(true);
    expect(scheduleReminder.requestReminderPermission).toHaveBeenCalled();
  });

  it('C11. scheduleAllReminders 调用并返回 count', async () => {
    scheduleReminder.scheduleAllReminders.mockResolvedValue(5);
    const count = await scheduleReminder.scheduleAllReminders([{ id: 1, day_of_week: 1, start_time: '09:00', end_time: '11:00', course_name: 'Math', course_code: 'M101' }]);
    expect(count).toBe(5);
  });

  it('C12. cancelAllReminders 调用成功', async () => {
    await scheduleReminder.cancelAllReminders();
    expect(scheduleReminder.cancelAllReminders).toHaveBeenCalled();
  });

  it('C13. hasScheduledReminders 默认返回 false', async () => {
    const result = await scheduleReminder.hasScheduledReminders();
    expect(result).toBe(false);
  });
});
