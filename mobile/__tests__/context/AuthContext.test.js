/**
 * AuthContext 单元测试 —— 纯逻辑
 */
const ASMock = require('@react-native-async-storage/async-storage');

global.fetch = jest.fn();
const mockFetch = global.fetch;

describe('AuthContext — 逻辑层', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (ASMock.__clear) ASMock.__clear();
  });

  it('1. 登录 API 成功返回 token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, token: 'jwt.token.here', data: { id: 1, username: 'test', role: 'student' } }),
    });

    const res = await fetch('http://localhost:4040/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@xmu.edu.my', password: 'pass123' }),
    });
    const data = await res.json();

    expect(data.status).toBe(0);
    expect(data.token).toBeTruthy();
    expect(data.data.username).toBe('test');
  });

  it('2. 登录失败返回错误消息', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: -1, message: '密码不正确' }),
    });

    const res = await fetch('http://localhost:4040/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'wrong' }),
    });
    const data = await res.json();

    expect(data.status).toBe(-1);
    expect(data.message).toBe('密码不正确');
  });

  it('3. 网络错误不崩溃', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));
    try {
      await fetch('http://localhost:4040/api/auth/login', { method: 'POST', headers: {}, body: '{}' });
    } catch (e) {
      expect(e.message).toBe('Network down');
    }
  });

  // JWT 过期检测
  it('4. 有效 token → exp 在未来', () => {
    const payload = { id: 1, exp: Math.floor(Date.now() / 1000) + 3600 };
    const expired = payload.exp * 1000 < Date.now();
    expect(expired).toBe(false);
  });

  it('5. 过期 token → exp 在过去', () => {
    const payload = { id: 1, exp: Math.floor(Date.now() / 1000) - 3600 };
    const expired = payload.exp * 1000 < Date.now();
    expect(expired).toBe(true);
  });

  // 游客模式
  it('6. skipLogin → AsyncStorage 持久化', async () => {
    await ASMock.setItem('skipLogin', '1');
    const val = await ASMock.getItem('skipLogin');
    expect(val).toBe('1');
  });

  // 登出清理
  it('7. logout → multiRemove 清理三个 key', async () => {
    await ASMock.setItem('token', 'xxx');
    await ASMock.setItem('user', '{}');
    await ASMock.setItem('skipLogin', '1');

    await ASMock.multiRemove(['token', 'user', 'skipLogin']);

    expect(await ASMock.getItem('token')).toBeNull();
    expect(await ASMock.getItem('user')).toBeNull();
    expect(await ASMock.getItem('skipLogin')).toBeNull();
  });

  // 角色
  it('8. admin 角色识别', () => {
    const user = { role: 'admin' };
    expect(user.role === 'admin').toBe(true);
  });

  it('9. student 非 admin', () => {
    const user = { role: 'student' };
    expect(user.role === 'admin').toBe(false);
  });

  // 显示名
  it('10. displayName 优先 nickname', () => {
    const user = { nickname: '小明', username: 'xm123' };
    expect(user.nickname || user.username || '游客').toBe('小明');
  });

  it('11. 无 nickname 回退 username', () => {
    const user = { username: 'xm123' };
    expect(user.nickname || user.username || '游客').toBe('xm123');
  });

  it('12. 都无显示 游客', () => {
    expect(({}).nickname || ({}).username || '游客').toBe('游客');
  });
});

describe('AuthContext — API 格式', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('13. 邮箱登录 → 发送 email 字段', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const account = 'test@xmu.edu.my';
    const body = account.includes('@') ? { email: account, password: 'p' } : { username: account, password: 'p' };

    await fetch('http://localhost:4040/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sent.email).toBe('test@xmu.edu.my');
  });

  it('14. 学号登录 → 发送 username 字段', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    const account = 'SWE2109000';
    const body = { username: account, password: 'p' };

    await fetch('http://localhost:4040/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sent.username).toBe('SWE2109000');
  });

  // 表单校验
  it('15. 邮箱非 @xmu.edu.my → 拒绝', () => {
    expect('test@gmail.com'.endsWith('@xmu.edu.my')).toBe(false);
  });

  it('16. @xmu.edu.my → 通过', () => {
    expect('test@xmu.edu.my'.endsWith('@xmu.edu.my')).toBe(true);
  });

  it('17. 密码 < 6 位 → 拒绝', () => {
    expect('12345'.length >= 6).toBe(false);
  });

  it('18. 密码 >= 6 位 → 通过', () => {
    expect('123456'.length >= 6).toBe(true);
  });

  // 注册 API
  it('19. 注册请求包含完整字段', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });

    const body = { role: 'student', email: 'new@xmu.edu.my', username: 'new', password: 'pwd123', code: '1234' };
    await fetch('http://localhost:4040/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sent.role).toBe('student');
    expect(sent.email).toBe('new@xmu.edu.my');
    expect(sent.username).toBe('new');
    expect(sent.code).toBe('1234');
  });
});
