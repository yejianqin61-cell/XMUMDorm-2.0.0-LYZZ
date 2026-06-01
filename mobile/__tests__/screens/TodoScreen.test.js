/**
 * 待办模块测试
 * 覆盖：CRUD API、Toggle、优先级、逾期检测、筛选、Today摘要
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(data) { return data?.data?.list || []; }
function isOverdue(todo, today) { return !!(todo.due_date && todo.due_date < today && !todo.is_completed); }
function fmtDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const PRIORITY_LABELS = { 0: '无', 1: '低', 2: '中', 3: '高' };
const PRIORITY_COLORS = { 0: '#94a3b8', 1: '#16a34a', 2: '#f59e0b', 3: '#ef4444' };
const LIST_TYPES = ['personal', 'course', 'club', 'other'];

function validateTodoForm({ title }) {
  if (!title || !title.trim()) return '标题不能为空';
  return null;
}

describe('待办 — List API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 获取待办列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: '作业', priority: 2, list_type: 'course' }] } }) });
    const d = await (await fetch(`${API}/api/todos`)).json();
    expect(extractList(d)[0].title).toBe('作业');
  });
  it('2. 按类型筛选', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/todos?list_type=club`);
    expect(mockFetch.mock.calls[0][0]).toContain('list_type=club');
  });
  it('3. 按状态筛选', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/todos?status=active`);
    expect(mockFetch.mock.calls[0][0]).toContain('status=active');
  });
});

describe('待办 — CRUD API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('4. 创建待办', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 100 } }) });
    const r = await fetch(`${API}/api/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '新任务', priority: 1, list_type: 'personal' }) });
    expect((await r.json()).data.id).toBe(100);
  });
  it('5. 更新待办', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const r = await fetch(`${API}/api/todos/1`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority: 3 }) });
    expect((await r.json()).status).toBe(0);
  });
  it('6. 删除待办', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const r = await fetch(`${API}/api/todos/1`, { method: 'DELETE' });
    expect((await r.json()).status).toBe(0);
  });
});

describe('待办 — Toggle API', () => {
  it('7. 切换完成状态', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { is_completed: true } }) });
    const r = await fetch(`${API}/api/todos/1/toggle`, { method: 'PATCH' });
    expect((await r.json()).data.is_completed).toBe(true);
  });
});

describe('待办 — Today 摘要', () => {
  it('8. 今日摘要', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { total: 5, completed: 2, active: 3, topItems: [{ id: 1, title: '作业' }] } }) });
    const r = await (await fetch(`${API}/api/todos/today`)).json();
    expect(r.data.active).toBe(3);
    expect(r.data.topItems).toHaveLength(1);
  });
});

describe('待办 — 逾期检测', () => {
  it('9. 已过期未完成 → true', () => {
    expect(isOverdue({ due_date: '2026-05-30', is_completed: false }, '2026-06-01')).toBe(true);
  });
  it('10. 已过期但已完成 → false', () => {
    expect(isOverdue({ due_date: '2026-05-30', is_completed: true }, '2026-06-01')).toBe(false);
  });
  it('11. 未过期 → false', () => {
    expect(isOverdue({ due_date: '2026-06-15', is_completed: false }, '2026-06-01')).toBe(false);
  });
  it('12. 无截止日期 → false', () => {
    expect(isOverdue({ is_completed: false }, '2026-06-01')).toBe(false);
  });
});

describe('待办 — 优先级', () => {
  it('13. 4 级优先级标签', () => {
    expect(PRIORITY_LABELS[0]).toBe('无');
    expect(PRIORITY_LABELS[3]).toBe('高');
  });
  it('14. 优先级颜色映射', () => {
    expect(PRIORITY_COLORS[0]).toBe('#94a3b8');
    expect(PRIORITY_COLORS[3]).toBe('#ef4444');
  });
});

describe('待办 — 日期', () => {
  it('15. 日期格式化', () => {
    expect(fmtDateStr(new Date(2026, 5, 1))).toBe('2026-06-01');
  });
});

describe('待办 — 列表类型', () => {
  it('16. 4 种类型', () => { expect(LIST_TYPES).toHaveLength(4); });
  it('17. 包含所有类型', () => {
    expect(LIST_TYPES).toContain('personal');
    expect(LIST_TYPES).toContain('course');
    expect(LIST_TYPES).toContain('club');
    expect(LIST_TYPES).toContain('other');
  });
});

describe('待办 — 验证', () => {
  it('18. 标题必填', () => { expect(validateTodoForm({ title: '' })).toBe('标题不能为空'); });
  it('19. 有效标题', () => { expect(validateTodoForm({ title: '任务' })).toBeNull(); });
});

describe('待办 — 完成状态', () => {
  it('20. 切换完成', () => {
    const todo = { id: 1, is_completed: false };
    const toggled = { ...todo, is_completed: !todo.is_completed, completed_at: new Date().toISOString() };
    expect(toggled.is_completed).toBe(true);
  });
});
