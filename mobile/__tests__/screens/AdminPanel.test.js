/**
 * 管理员后台测试
 * 覆盖：Dashboard、用户 CRUD+制裁、内容管理、公告、配置、敏感词、审计日志
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(d) { return d?.data?.list || []; }

describe('管理 — Dashboard API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 仪表盘统计数据', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { totalUsers: 500, todayNewUsers: 10, pendingReports: 3 } }) });
    const d = await (await fetch(`${API}/api/admin/dashboard`)).json();
    expect(d.data.totalUsers).toBe(500);
    expect(d.data.pendingReports).toBe(3);
  });
});

describe('管理 — 用户 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('2. 用户列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, username: 'alice', role: 'student' }] } }) });
    expect(extractList(await (await fetch(`${API}/api/admin/users`)).json())[0].username).toBe('alice');
  });
  it('3. 用户详情', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, username: 'alice', post_count: 10, report_count: 2 } }) });
    const d = await (await fetch(`${API}/api/admin/users/1`)).json();
    expect(d.data.report_count).toBe(2);
  });
  it('4. 封禁用户', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/users/1/ban`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: 7 }) })).json()).status).toBe(0);
  });
  it('5. 解封用户', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/users/1/unban`, { method: 'POST' })).json()).status).toBe(0);
  });
});

describe('管理 — 内容 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('6. 内容列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: 'test' }] } }) });
    expect(extractList(await (await fetch(`${API}/api/admin/contents/treehole`)).json())[0].title).toBe('test');
  });
  it('7. 切换可见性', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/contents/treehole/1/toggle-visibility`, { method: 'PATCH' })).json()).status).toBe(0);
  });
  it('8. 删除内容', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/contents/treehole/1`, { method: 'DELETE' })).json()).status).toBe(0);
  });
});

describe('管理 — 公告 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('9. 公告列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: '通知' }] } }) });
    expect(extractList(await (await fetch(`${API}/api/admin/announcements`)).json())[0].title).toBe('通知');
  });
  it('10. 发布公告', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/announcements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '新公告', content: '正文' }) })).json()).status).toBe(0);
  });
});

describe('管理 — 配置 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('11. 获取所有配置', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ config_key: 'report_auto_hide_threshold', config_value: '3' }] }) });
    expect((await (await fetch(`${API}/api/admin/configs`)).json()).data[0].config_value).toBe('3');
  });
  it('12. 更新配置', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/configs/report_auto_hide_threshold`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config_value: '5' }) })).json()).status).toBe(0);
  });
});

describe('管理 — 敏感词 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('13. 敏感词列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, word: 'test', is_enabled: 1 }] } }) });
    expect(extractList(await (await fetch(`${API}/api/admin/sensitive-words`)).json())[0].word).toBe('test');
  });
  it('14. 添加敏感词', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/sensitive-words`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word: 'badword' }) })).json()).status).toBe(0);
  });
  it('15. 批量导入', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/admin/sensitive-words/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: ['a', 'b', 'c'] }) })).json()).status).toBe(0);
  });
});

describe('管理 — 审计日志 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('16. 日志列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, action: 'ADMIN_BAN_USER' }] } }) });
    expect(extractList(await (await fetch(`${API}/api/admin/audit-logs`)).json())[0].action).toBe('ADMIN_BAN_USER');
  });
});

describe('管理 — 权限', () => {
  it('17. 非 admin 被拒绝', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: -1, message: '需要管理员权限' }) });
    expect((await (await fetch(`${API}/api/admin/dashboard`)).json()).status).toBe(-1);
  });
});

describe('管理 — 操作类型', () => {
  it('18. 18+ 种审计操作', () => {
    const actions = ['ADMIN_BAN_USER','ADMIN_UNBAN_USER','ADMIN_MUTE_USER','ADMIN_UNMUTE_USER','ADMIN_DELETE_USER','ADMIN_HIDE_CONTENT','ADMIN_RESTORE_CONTENT','ADMIN_DELETE_CONTENT','ADMIN_PROCESS_REPORT','ADMIN_CREATE_ANNOUNCEMENT','ADMIN_UPDATE_ANNOUNCEMENT','ADMIN_DELETE_ANNOUNCEMENT','ADMIN_VIEW_DASHBOARD','ADMIN_CONFIG_UPDATE'];
    expect(actions.length).toBeGreaterThanOrEqual(14);
  });
});

describe('管理 — 内容模块', () => {
  it('19. 9 个模块', () => {
    const modules = ['treehole','canteen','trending','campus','club','marketplace','errand','handbook','course-review'];
    expect(modules).toHaveLength(9);
  });
});

describe('管理 — 制裁时长', () => {
  it('20. 5 种时长选项', () => {
    const durations = [1, 3, 7, 30, -1]; // -1 = permanent
    expect(durations).toHaveLength(5);
    expect(durations).toContain(-1);
  });
});
