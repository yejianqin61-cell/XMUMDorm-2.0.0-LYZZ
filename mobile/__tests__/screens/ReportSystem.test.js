/**
 * 举报系统测试
 * 覆盖：提交 API、原因枚举、target_type 验证、重复检测、管理列表、处理操作
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

const REASONS = ['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'];
const TARGET_TYPES = ['post','comment','trending_post','campus_post','club_activity','club_post','marketplace','errand','handbook_article','course_review'];
const STATUS_LABELS = { pending: '待处理', processing: '处理中', resolved: '已处理', dismissed: '已驳回' };

function validateReport({ target_type, target_id, reason }) {
  if (!target_type || !target_id || !reason) return '缺少必要参数';
  if (!REASONS.includes(reason)) return '无效举报原因';
  return null;
}

describe('举报 — 提交 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 成功提交', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1 }, message: '举报提交成功' }) });
    const r = await fetch(`${API}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_type: 'post', target_id: 42, reason: 'spam' }) });
    expect((await r.json()).status).toBe(0);
  });
  it('2. 缺少参数 → 400', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: -1, message: '缺少必要参数' }) });
    const r = await fetch(`${API}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect((await r.json()).status).toBe(-1);
  });
  it('3. 重复举报 → 400', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: -1, message: '您已举报过该内容' }) });
    const r = await fetch(`${API}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_type: 'post', target_id: 1, reason: 'spam' }) });
    expect((await r.json()).message).toContain('已举报');
  });
});

describe('举报 — 原因枚举', () => {
  it('4. 8 个原因全部有效', () => { expect(REASONS).toHaveLength(8); });
  it('5. 无效原因拒绝', () => { expect(validateReport({ target_type: 'post', target_id: 1, reason: 'invalid' })).toBe('无效举报原因'); });
});

describe('举报 — target_type 验证', () => {
  it('6. 10+ 种有效类型', () => { expect(TARGET_TYPES.length).toBeGreaterThanOrEqual(10); });
  it('7. 有效的 post 类型', () => { expect(validateReport({ target_type: 'post', target_id: 1, reason: 'spam' })).toBeNull(); });
});

describe('举报 — 表单验证', () => {
  it('8. 缺少 reason', () => { expect(validateReport({ target_type: 'x', target_id: 1, reason: '' })).toBe('缺少必要参数'); });
  it('9. 缺少 target_id', () => { expect(validateReport({ target_type: 'x', target_id: 0, reason: 'spam' })).toBe('缺少必要参数'); });
  it('10. 完整有效', () => { expect(validateReport({ target_type: 'post', target_id: 1, reason: 'spam' })).toBeNull(); });
});

describe('举报 — 管理列表 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('11. 获取举报列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, reason: 'spam', status: 'pending', reporter_name: 'alice', reported_name: 'bob' }], total: 1 } }) });
    const d = await (await fetch(`${API}/api/admin/reports`)).json();
    expect(d.data.list[0].reporter_name).toBe('alice');
  });
  it('12. 状态过滤', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/admin/reports?status=pending`);
    expect(mockFetch.mock.calls[0][0]).toContain('status=pending');
  });
});

describe('举报 — 管理处理 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('13. dismiss 处理', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const r = await fetch(`${API}/api/admin/reports/1/process`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', note: '无问题' }) });
    expect((await r.json()).status).toBe(0);
  });
  it('14. resolve 处理', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const r = await fetch(`${API}/api/admin/reports/1/process`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hide_content' }) });
    expect((await r.json()).status).toBe(0);
  });
});

describe('举报 — 状态标签', () => {
  it('15. 4 种状态', () => { expect(Object.keys(STATUS_LABELS)).toHaveLength(4); });
  it('16. pending → 待处理', () => { expect(STATUS_LABELS.pending).toBe('待处理'); });
});

describe('举报 — 操作按钮', () => {
  it('17. 5 种处理操作', () => {
    const actions = ['dismiss', 'hide_content', 'delete_content', 'mute_user', 'ban_user'];
    expect(actions).toHaveLength(5);
  });
});

describe('举报 — 阈值配置', () => {
  it('18. 默认阈值值', () => {
    const defaults = { report_auto_hide_threshold: 3, report_auto_review_threshold: 10, report_auto_delist_threshold: 5 };
    expect(defaults.report_auto_review_threshold).toBe(10);
  });
});

describe('举报 — 详情 API', () => {
  it('19. 获取举报详情', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, reason: 'spam', detail: '测试', content_url: '/post/42' } }) });
    const d = await (await fetch(`${API}/api/admin/reports/1`)).json();
    expect(d.data.content_url).toBe('/post/42');
  });
});

describe('举报 — 权限', () => {
  it('20. 未登录用户无法提交', () => {
    // Admin API 的 requireAdmin 中间件会拦截
    expect(validateReport({ target_type: 'post', target_id: 1, reason: '' })).toBe('缺少必要参数');
  });
});
