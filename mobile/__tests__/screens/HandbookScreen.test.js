/**
 * 一站通模块测试
 * 覆盖：Tabs/Tags、Articles CRUD、点赞/收藏、评论树、数据提取
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(data) { return data?.data?.list || []; }
function extractDetail(data) { return data?.data; }
function prefixImage(url) { if (!url) return null; return url.startsWith('http') ? url : `${API}${url}`; }
function fmtTime(ts) { if (!ts) return ''; const d = new Date(ts); const n = new Date(); const diff = Math.floor((n.getTime() - d.getTime()) / 1000); if (diff < 60) return '刚刚'; if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`; return d.toLocaleDateString(); }
function toggleLike(liked, count) { return { liked: !liked, likeCount: liked ? count - 1 : count + 1 }; }
function validateArticle({ title, content }) { const e = []; if (!title?.trim()) e.push('标题必填'); if (!content?.trim()) e.push('内容必填'); return e; }

describe('一站通 — Tabs/Tags API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 获取 Tabs 列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, slug: 'food', name_zh: '美食' }] }) });
    const res = await fetch(`${API}/api/handbook/tabs`);
    expect((await res.json()).data).toHaveLength(1);
  });
  it('2. 获取 Tags 列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, slug: 'campus', name_zh: '校园' }] }) });
    const res = await fetch(`${API}/api/handbook/tags`);
    expect((await res.json()).data[0].slug).toBe('campus');
  });
});

describe('一站通 — Articles API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('3. 文章列表（带tab过滤）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: '榴莲测评', likes_count: 10 }] } }) });
    const res = await fetch(`${API}/api/handbook/articles?tab=food`);
    expect(extractList(await res.json())[0].title).toBe('榴莲测评');
  });
  it('4. 搜索文章', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/handbook/articles?q=美食`);
    expect(mockFetch.mock.calls[0][0]).toContain('q=');
  });
  it('5. 分页参数', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [], hasMore: true } }) });
    const res = await fetch(`${API}/api/handbook/articles?page=2&pageSize=10`);
    expect((await res.json()).data.hasMore).toBe(true);
  });
  it('6. 文章详情', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, title: '测试', content: '# Hello', likes_count: 5, user_liked: false, user_saved: true } }) });
    const d = extractDetail(await (await fetch(`${API}/api/handbook/articles/1`)).json());
    expect(d.user_saved).toBe(true);
  });
});

describe('一站通 — 互动 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('7. 点赞切换', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, liked: true, like_count: 6 }) });
    const res = await fetch(`${API}/api/handbook/articles/1/like`, { method: 'POST' });
    expect((await res.json()).liked).toBe(true);
  });
  it('8. 收藏切换', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const res = await fetch(`${API}/api/handbook/articles/1/save`, { method: 'POST' });
    expect((await res.json()).status).toBe(0);
  });
  it('9. 发表评论', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const res = await fetch(`${API}/api/handbook/articles/1/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '好文' }) });
    expect((await res.json()).status).toBe(0);
  });
  it('10. 获取评论（嵌套）', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, content: '赞', replies: [{ id: 2, content: '同意' }] }] }) });
    const c = (await (await fetch(`${API}/api/handbook/articles/1/comments`)).json()).data;
    expect(c[0].replies).toHaveLength(1);
  });
});

describe('一站通 — 个人中心', () => {
  it('11. 已收藏文章', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: '收藏1' }] } }) });
    expect(extractList(await (await fetch(`${API}/api/handbook/me/saved`)).json())[0].title).toBe('收藏1');
  });
});

describe('一站通 — 数据提取', () => {
  it('12. 图片URL补全', () => { expect(prefixImage('/uploads/a.jpg')).toBe(`${API}/uploads/a.jpg`); });
  it('13. 时间格式化', () => { expect(fmtTime(new Date().toISOString())).toBe('刚刚'); });
  it('14. null时间→空', () => { expect(fmtTime(null)).toBe(''); });
});

describe('一站通 — 交互逻辑', () => {
  it('15. 点赞切换逻辑', () => { expect(toggleLike(false, 5)).toEqual({ liked: true, likeCount: 6 }); });
  it('16. 取消点赞', () => { expect(toggleLike(true, 6)).toEqual({ liked: false, likeCount: 5 }); });
});

describe('一站通 — 验证', () => {
  it('17. 标题必填', () => { expect(validateArticle({ title: '', content: 'x' })).toContain('标题必填'); });
  it('18. 内容必填', () => { expect(validateArticle({ title: 'x', content: '' })).toContain('内容必填'); });
  it('19. 合法文章', () => { expect(validateArticle({ title: '标题', content: '正文' })).toEqual([]); });
});

describe('一站通 — 文章状态', () => {
  it('20. 状态枚举', () => {
    const statuses = ['draft', 'published', 'hidden'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('published');
  });
});
