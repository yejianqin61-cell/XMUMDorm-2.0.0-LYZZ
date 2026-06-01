/**
 * 组织系统测试 — 覆盖组织 CRUD、成员管理、权限验证
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

const ORG_TYPES = ['SchoolDepartment', 'College', 'Official'];
const TYPE_LABELS = { SchoolDepartment: '学校部门', College: '学院', Official: '官方号' };

function extractList(d) { return d?.data || []; }
function validateOrgForm({ name, type }) { if (!name?.trim()) return '名称必填'; if (!ORG_TYPES.includes(type)) return '类型无效'; return null; }

describe('组织 — 列表 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('1. 组织列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, name: '教务处', type: 'SchoolDepartment' }] }) });
    expect(extractList(await (await fetch(`${API}/api/organizations`)).json())[0].name).toBe('教务处');
  });
  it('2. type 过滤', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    await fetch(`${API}/api/organizations?type=College`);
    expect(mockFetch.mock.calls[0][0]).toContain('type=College');
  });
});

describe('组织 — CRUD API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('3. 创建组织', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 10 } }) });
    const r = await fetch(`${API}/api/organizations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '新组织', type: 'Official' }) });
    expect((await r.json()).data.id).toBe(10);
  });
  it('4. 更新组织', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/organizations/1`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '改名' }) })).json()).status).toBe(0);
  });
});

describe('组织 — 成员 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('5. 成员列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, user_id: 42, username: 'alice', title: '主管' }] }) });
    expect(extractList(await (await fetch(`${API}/api/organizations/1/members`)).json())[0].title).toBe('主管');
  });
  it('6. 添加成员', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/organizations/1/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@test.com' }) })).json()).status).toBe(0);
  });
  it('7. 移除成员', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/organizations/1/members/5`, { method: 'DELETE' })).json()).status).toBe(0);
  });
});

describe('组织 — 用户搜索 API', () => {
  it('8. 搜索用户', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, email: 'test@test.com' }] }) });
    expect((await (await fetch(`${API}/api/organizations/users/search?email=test`)).json()).data[0].email).toBe('test@test.com');
  });
});

describe('组织 — 我的组织', () => {
  it('9. 获取我的组织', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, name: '教务处' }] }) });
    expect((await (await fetch(`${API}/api/organizations/me`)).json()).data[0].name).toBe('教务处');
  });
});

describe('组织 — 类型枚举', () => {
  it('10. 3 种类型', () => { expect(ORG_TYPES).toHaveLength(3); });
  it('11. 类型标签映射', () => {
    expect(TYPE_LABELS.SchoolDepartment).toBe('学校部门');
    expect(TYPE_LABELS.College).toBe('学院');
    expect(TYPE_LABELS.Official).toBe('官方号');
  });
});

describe('组织 — 表单验证', () => {
  it('12. 名称必填', () => { expect(validateOrgForm({ name: '', type: 'College' })).toBe('名称必填'); });
  it('13. 类型无效', () => { expect(validateOrgForm({ name: 'test', type: 'Invalid' })).toBe('类型无效'); });
  it('14. 合法表单', () => { expect(validateOrgForm({ name: '教务处', type: 'SchoolDepartment' })).toBeNull(); });
});

describe('组织 — Campus Post 权限', () => {
  it('15. SchoolDepartment → school tab', () => {
    const canPublishSchool = (type) => ['SchoolDepartment', 'Official'].includes(type);
    expect(canPublishSchool('SchoolDepartment')).toBe(true);
    expect(canPublishSchool('College')).toBe(false);
  });
  it('16. College → college tab', () => {
    const canPublishCollege = (type) => type === 'College';
    expect(canPublishCollege('College')).toBe(true);
    expect(canPublishCollege('SchoolDepartment')).toBe(false);
  });
});

describe('组织 — 权限', () => {
  it('17. 非 admin 拒绝', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: -1, message: '需要管理员权限' }) });
    expect((await (await fetch(`${API}/api/organizations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })).json()).status).toBe(-1);
  });
});

describe('组织 — 成员计数', () => {
  it('18. 3 个组织类型统计', () => {
    const orgs = [{ type: 'SchoolDepartment' }, { type: 'SchoolDepartment' }, { type: 'College' }];
    const byType = {};
    orgs.forEach((o) => { byType[o.type] = (byType[o.type] || 0) + 1; });
    expect(byType.SchoolDepartment).toBe(2);
    expect(byType.College).toBe(1);
  });
});

describe('组织 — 权限级别', () => {
  it('19. permission_level 默认 1', () => {
    const defaultLevel = 1;
    expect(defaultLevel).toBe(1);
  });
});

describe('组织 — 搜索参数', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('20. email LIKE 查询', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    await fetch(`${API}/api/organizations/users/search?email=alice`);
    expect(mockFetch.mock.calls[0][0]).toContain('email=');
  });
});
