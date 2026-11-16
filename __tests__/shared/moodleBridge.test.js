import {
  MOODLE_BRIDGE_NS,
  MOODLE_BRIDGE_VERSION,
  acceptBridgeReply,
  groupMoodleByDate,
  moodleDueTime,
  moodleDueYmd,
  moodleState,
  requestMoodleDeadlines,
  sanitizeMoodleItems,
  summarizeMoodle,
} from '../../shared/utils/moodleBridge';

const core = require('../../shared/moodle/moodle-core');

function fakeWindow(origin = 'https://www.xmumdorm.com') {
  const listeners = new Set();
  const win = {
    location: { origin },
    posted: [],
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    postMessage(data, targetOrigin) { win.posted.push({ data, targetOrigin }); },
    dispatch(event) { for (const fn of [...listeners]) fn(event); },
    listenerCount: () => listeners.size,
  };
  return win;
}

const ITEM = { id: 'moodle:101:901', title: 'Lab 3 report', courseName: 'EEE203', dueAt: Date.UTC(2026, 10, 21, 15, 59), url: 'https://l.xmu.edu.my/mod/assign/view.php?id=11', done: false };

describe('协议常量与扩展一致', () => {
  it('命名空间和版本', () => {
    expect(MOODLE_BRIDGE_NS).toBe(core.BRIDGE_NS);
    expect(MOODLE_BRIDGE_VERSION).toBe(core.BRIDGE_VERSION);
  });
  it('两边的清洗结果一致', () => {
    const list = [ITEM, { ...ITEM, id: 'x' }, { ...ITEM, id: 'moodle:1:2', url: 'https://evil.example/mod/a/view.php?id=1' }];
    expect(sanitizeMoodleItems(list)).toEqual(core.sanitizeProjection(list));
  });
});

describe('acceptBridgeReply', () => {
  const win = fakeWindow();
  const good = { source: win, origin: win.location.origin, data: { ns: MOODLE_BRIDGE_NS, v: 1, type: 'reply', id: 'r1', status: 'ok', syncedAt: 1700000000000, items: [ITEM] } };

  it('合法回复：清洗后返回', () => {
    expect(acceptBridgeReply(good, { id: 'r1', win })).toEqual({ installed: true, status: 'ok', syncedAt: 1700000000000, items: [ITEM] });
  });
  it.each([
    ['来自别的窗口（iframe）', { ...good, source: {} }],
    ['来自别的 origin', { ...good, origin: 'https://evil.example' }],
    ['命名空间不对', { ...good, data: { ...good.data, ns: 'other' } }],
    ['版本不对', { ...good, data: { ...good.data, v: 2 } }],
    ['请求 id 对不上', { ...good, data: { ...good.data, id: 'r2' } }],
    ['是请求不是回复', { ...good, data: { ...good.data, type: 'request' } }],
  ])('拒绝：%s', (_name, event) => {
    expect(acceptBridgeReply(event, { id: 'r1', win })).toBeNull();
  });
  it('脏数据被洗掉：非法链接置空、坏条目丢掉', () => {
    const event = { ...good, data: { ...good.data, status: 'weird', items: [{ ...ITEM, url: 'javascript:alert(1)' }, { id: 'moodle:1:2' }, 'x'] } };
    const out = acceptBridgeReply(event, { id: 'r1', win });
    expect(out.status).toBe('unknown');
    expect(out.items).toEqual([{ ...ITEM, url: null }]);
  });
});

describe('requestMoodleDeadlines', () => {
  it('发请求给本 origin，收到回复就返回并移除监听', async () => {
    const win = fakeWindow();
    const promise = requestMoodleDeadlines({ win, timeoutMs: 1000 });
    const { data, targetOrigin } = win.posted[0];
    expect(targetOrigin).toBe('https://www.xmumdorm.com');
    expect(data).toMatchObject({ ns: MOODLE_BRIDGE_NS, v: 1, type: 'request' });
    win.dispatch({ source: win, origin: win.location.origin, data: { ns: MOODLE_BRIDGE_NS, v: 1, type: 'reply', id: data.id, status: 'ok', items: [ITEM] } });
    await expect(promise).resolves.toMatchObject({ installed: true, items: [ITEM] });
    expect(win.listenerCount()).toBe(0);
  });
  it('没装扩展：超时返回 installed=false', async () => {
    const win = fakeWindow();
    await expect(requestMoodleDeadlines({ win, timeoutMs: 10 })).resolves.toEqual({ installed: false, items: [] });
    expect(win.listenerCount()).toBe(0);
  });
});

describe('日历投影（吉隆坡时区）', () => {
  it('23:59 截止落在当天，不会因为 UTC 跑到前一天', () => {
    expect(moodleDueYmd(ITEM.dueAt)).toBe('2026-11-21');
    expect(moodleDueTime(ITEM.dueAt)).toBe('23:59');
  });
  it('状态与统计：已完成不计入', () => {
    const now = Date.UTC(2026, 10, 19, 4, 0);
    const items = [
      ITEM, // 11-21 → 3 天内
      { ...ITEM, id: 'moodle:1:1', dueAt: Date.UTC(2026, 10, 19, 10, 0) }, // 今天
      { ...ITEM, id: 'moodle:1:2', dueAt: Date.UTC(2026, 10, 18, 10, 0) }, // 逾期
      { ...ITEM, id: 'moodle:1:3', dueAt: Date.UTC(2026, 10, 18, 10, 0), done: true },
    ];
    expect(moodleState(items[0], '2026-11-19', now)).toBe('soon');
    expect(summarizeMoodle(items, '2026-11-19', now)).toEqual({ open: 3, overdue: 1, dueToday: 1, dueSoon: 1 });
    expect([...groupMoodleByDate(items).keys()].sort()).toEqual(['2026-11-18', '2026-11-19', '2026-11-21']);
  });
});
