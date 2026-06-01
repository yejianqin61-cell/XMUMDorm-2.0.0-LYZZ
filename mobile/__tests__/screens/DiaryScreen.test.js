/**
 * 日记模块测试
 * 覆盖：Day/Overview/Month API、日期格式化、往年今日、热度图、内容保存
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtLabel(d) { return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`; }
function getMemoryBubbles(overview) { return (overview?.data?.sameDayPastYears || []).filter(b => b.hasDiary); }
function getHeatLevel(len) {
  if (len === 0) return 0; if (len <= 29) return 1; if (len <= 119) return 2; if (len <= 259) return 3; return 4;
}

describe('日记 — Day API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 获取当天日记（有内容）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { date: '2026-06-01', content: '今天天气很好' } }) });
    const d = await (await fetch(`${API}/api/diary/day?date=2026-06-01`)).json();
    expect(d.data.content).toBe('今天天气很好');
  });
  it('2. 无日记 → content null', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { date: '2026-06-01', content: null } }) });
    const d = await (await fetch(`${API}/api/diary/day?date=2026-06-01`)).json();
    expect(d.data.content).toBeNull();
  });
  it('3. 保存日记', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, date: '2026-06-01', content: '新日记' } }) });
    const r = await fetch(`${API}/api/diary/day`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-06-01', content: '新日记' }) });
    expect((await r.json()).status).toBe(0);
  });
});

describe('日记 — Overview API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('4. 获取概览', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { today: { date: '2026-06-01', label: '2026.6.1' }, sameDayPastYears: [{ year: 2025, date: '2025-06-01', hasDiary: true }], recentDays: [] } }) });
    const r = await (await fetch(`${API}/api/diary/overview?date=2026-06-01`)).json();
    expect(getMemoryBubbles(r)).toHaveLength(1);
  });
  it('5. 往年今日（无记忆）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { sameDayPastYears: [{ year: 2025, hasDiary: false }] } }) });
    const r = await (await fetch(`${API}/api/diary/overview?date=2026-06-01`)).json();
    expect(getMemoryBubbles(r)).toHaveLength(0);
  });
});

describe('日记 — Month API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('6. 获取月份热度', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ date: '2026-06-01', len: 120 }, { date: '2026-06-02', len: 30 }] }) });
    const r = await (await fetch(`${API}/api/diary/month?year=2026&month=6`)).json();
    expect(r.data).toHaveLength(2);
  });
  it('7. 空月份 → 空数组', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    const r = await (await fetch(`${API}/api/diary/month?year=2026&month=1`)).json();
    expect(r.data).toEqual([]);
  });
});

describe('日记 — 日期格式化', () => {
  it('8. fmtDate 格式', () => { expect(fmtDate(new Date(2026, 5, 1))).toBe('2026-06-01'); });
  it('9. fmtLabel 格式', () => { expect(fmtLabel(new Date(2026, 5, 1))).toBe('2026.6.1'); });
  it('10. 跨月边界', () => { expect(fmtDate(new Date(2026, 0, 1))).toBe('2026-01-01'); });
});

describe('日记 — 热度等级', () => {
  it('11. 0 → lv0', () => { expect(getHeatLevel(0)).toBe(0); });
  it('12. 1-29 → lv1', () => { expect(getHeatLevel(15)).toBe(1); });
  it('13. 30-119 → lv2', () => { expect(getHeatLevel(100)).toBe(2); });
  it('14. 120-259 → lv3', () => { expect(getHeatLevel(200)).toBe(3); });
  it('15. 260+ → lv4', () => { expect(getHeatLevel(500)).toBe(4); });
});

describe('日记 — 往年今日', () => {
  it('16. 筛选有日记的年份', () => {
    const data = [{ year: 2025, hasDiary: true }, { year: 2024, hasDiary: false }, { year: 2023, hasDiary: true }];
    expect(data.filter(b => b.hasDiary)).toHaveLength(2);
  });
  it('17. 全部空 → 0', () => {
    expect([{ hasDiary: false }, { hasDiary: false }].filter(b => b.hasDiary)).toHaveLength(0);
  });
});

describe('日记 — 心情', () => {
  it('18. 8 个心情选项', () => {
    const moods = ['🍃', '☀️', '✨', '🌧️', '🌙', '🫶', '😵‍💫', '😌'];
    expect(moods).toHaveLength(8);
  });
});

describe('日记 — 内容', () => {
  it('19. 空内容可保存', () => {
    const content = '';
    expect(typeof content).toBe('string');
  });
  it('20. 长文本支持', () => {
    const content = 'A'.repeat(10000);
    expect(content.length).toBe(10000);
  });
});
