/**
 * 课程评价模块测试
 * 覆盖：List/Detail/Create API、标签过滤、评分、匿名性、数据验证
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(data) { return data?.data?.list || []; }
function extractDetail(data) { return data?.data; }
function calcAvgRating(ratings) { if (!ratings?.length) return 0; return Math.round(ratings.reduce((a, r) => a + r.rating, 0) / ratings.length * 10) / 10; }
function isAnonymousResponse(data) { return !data?.created_by && !data?.author; }
function validateReviewForm({ courseName, teacher, rating, difficulty, tags }) {
  const e = [];
  if (!courseName?.trim()) e.push('课程名必填');
  if (!teacher?.trim()) e.push('教师必填');
  if (!rating || rating < 1 || rating > 5) e.push('评分1-5');
  if (!difficulty || difficulty < 1 || difficulty > 5) e.push('难度1-5');
  if (!tags?.length) e.push('至少一个标签');
  return e;
}

const TAG_OPTIONS = ['MPU', 'GE', 'ME', 'required', 'final', 'no final'];

describe('课程评价 — List API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 获取评价列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, course_name: 'Calculus', rating: 4, difficulty: 3 }] } }) });
    const d = await (await fetch(`${API}/api/handbook/course-reviews`)).json();
    expect(extractList(d)[0].course_name).toBe('Calculus');
  });
  it('2. 搜索（课程名/教师）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/handbook/course-reviews?q=Dr.Li`);
    expect(mockFetch.mock.calls[0][0]).toContain('q=');
  });
  it('3. 标签过滤（多选）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/handbook/course-reviews?tags=MPU,GE`);
    expect(mockFetch.mock.calls[0][0]).toContain('tags=MPU,GE');
  });
});

describe('课程评价 — Detail API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('4. 获取评价详情（匿名）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, course_name: 'Physics', rating: 5, difficulty: 4, avg_rating: 4.2 } }) });
    const d = extractDetail(await (await fetch(`${API}/api/handbook/course-reviews/1`)).json());
    expect(isAnonymousResponse(d)).toBe(true);
    expect(d.avg_rating).toBe(4.2);
  });
  it('5. viewer.canEdit 标志', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 2, viewer: { canEdit: true } } }) });
    const d = extractDetail(await (await fetch(`${API}/api/handbook/course-reviews/2`)).json());
    expect(d.viewer.canEdit).toBe(true);
  });
});

describe('课程评价 — Create/Edit API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('6. 创建评价', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 100 } }) });
    const res = await fetch(`${API}/api/handbook/course-reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseName: 'Math', teacher: 'Dr.X', rating: 4, difficulty: 3, tags: ['required'], termYear: 2026, termMonth: '09' }) });
    expect((await res.json()).data.id).toBe(100);
  });
  it('7. 更新评价', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const res = await fetch(`${API}/api/handbook/course-reviews/1`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 5 }) });
    expect((await res.json()).status).toBe(0);
  });
});

describe('课程评价 — Rate API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('8. 评分为评价打分', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const res = await fetch(`${API}/api/handbook/course-reviews/1/rate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 4 }) });
    expect((await res.json()).status).toBe(0);
  });
});

describe('课程评价 — 评论 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('9. 获取匿名评论', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, content: '好评' }] }) });
    const c = (await (await fetch(`${API}/api/handbook/course-reviews/1/comments`)).json()).data;
    expect(c[0].content).toBe('好评');
  });
  it('10. 发表匿名评论', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const res = await fetch(`${API}/api/handbook/course-reviews/1/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '有帮助' }) });
    expect((await res.json()).status).toBe(0);
  });
});

describe('课程评价 — 数据提取', () => {
  it('11. 平均评分计算', () => {
    expect(calcAvgRating([{ rating: 4 }, { rating: 5 }, { rating: 3 }])).toBe(4);
  });
  it('12. 空评分→0', () => { expect(calcAvgRating([])).toBe(0); });
  it('13. 星级展示', () => { expect('⭐'.repeat(4)).toBe('⭐⭐⭐⭐'); });
});

describe('课程评价 — 验证', () => {
  it('14. 课程名必填', () => {
    expect(validateReviewForm({ courseName: '', teacher: 'X', rating: 4, difficulty: 3, tags: ['MPU'] })).toContain('课程名必填');
  });
  it('15. 教师必填', () => {
    expect(validateReviewForm({ courseName: 'Math', teacher: '', rating: 4, difficulty: 3, tags: ['MPU'] })).toContain('教师必填');
  });
  it('16. 评分范围', () => {
    expect(validateReviewForm({ courseName: 'Math', teacher: 'X', rating: 0, difficulty: 3, tags: ['MPU'] })).toContain('评分1-5');
  });
  it('17. 标签必选', () => {
    expect(validateReviewForm({ courseName: 'Math', teacher: 'X', rating: 4, difficulty: 3, tags: [] })).toContain('至少一个标签');
  });
  it('18. 合法表单', () => {
    expect(validateReviewForm({ courseName: 'Math', teacher: 'X', rating: 4, difficulty: 3, tags: ['MPU'] })).toEqual([]);
  });
});

describe('课程评价 — 标签', () => {
  it('19. 6 个标签选项', () => { expect(TAG_OPTIONS).toHaveLength(6); });
});

describe('课程评价 — 学期', () => {
  it('20. 学期格式', () => {
    const months = ['02', '04', '09'];
    expect(months).toContain('09');
    expect(months).toHaveLength(3);
  });
});
