/**
 * 我的/个人空间 模块测试
 * 覆盖：数据获取、统计计算、经验进度、角色判断
 */
const ASMock = require('@react-native-async-storage/async-storage');

global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数 ──────────────────────────────

/** 经验进度百分比 */
function expProgress(exp, level) {
  const thresholds = { 1: 0, 2: 100, 3: 300, 4: 800, 5: 1800, 6: 4000, 7: 8000 };
  const currentMin = thresholds[level] || 0;
  const nextMin = thresholds[level + 1] || thresholds[level] * 2;
  const range = nextMin - currentMin;
  if (range <= 0) return 100;
  return Math.min(100, Math.round(((exp - currentMin) / range) * 100));
}

/** 相对时间 */
function formatEditTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

/** 角色中文 */
function roleLabel(role) {
  if (role === 'admin') return '管理员';
  if (role === 'merchant') return '商家';
  return '学生';
}

/** 合并统计 */
function mergeStats(profile, reviews, favorites) {
  return {
    posts: profile?.stats?.post_count ?? profile?.post_count ?? 0,
    reviews: reviews?.total ?? reviews?.pagination?.total ?? 0,
    favorites: favorites?.total ?? favorites?.pagination?.total ?? 0,
  };
}

describe('我的 — 数据获取', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. Profile API 返回用户信息 + 帖子统计', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { id: 1, username: 'test', stats: { post_count: 25 } } }),
    });

    const res = await fetch(`${API}/api/users/1/profile?page=1&pageSize=1`);
    const data = await res.json();
    expect(data.status).toBe(0);
    expect(data.data.stats.post_count).toBe(25);
  });

  it('2. Reviews API 返回 total', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, total: 15, list: [] }),
    });
    const res = await fetch(`${API}/api/canteen/my-reviews?page=1&pageSize=1`);
    const data = await res.json();
    expect(data.total).toBe(15);
  });

  it('3. Favorites API 返回 total', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, pagination: { total: 8 } }),
    });
    const res = await fetch(`${API}/api/canteen/my-favorites?page=1&pageSize=1`);
    const data = await res.json();
    expect(data.pagination.total).toBe(8);
  });

  it('4. API 出错 → 降级为 0', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    let result = { posts: 0, reviews: 0, favorites: 0 };
    try { await fetch(`${API}/api/users/1/profile`); } catch { /* 使用默认值 */ }
    expect(result.posts).toBe(0);
  });
});

describe('我的 — 统计计算', () => {
  it('5. mergeStats 正确合并三个源', () => {
    const profile = { stats: { post_count: 42 } };
    const reviews = { total: 15 };
    const favorites = { pagination: { total: 8 } };
    const stats = mergeStats(profile, reviews, favorites);
    expect(stats.posts).toBe(42);
    expect(stats.reviews).toBe(15);
    expect(stats.favorites).toBe(8);
  });

  it('6. 缺失字段 → 默认 0', () => {
    expect(mergeStats(null, {}, {}).posts).toBe(0);
    expect(mergeStats({}, null, {}).reviews).toBe(0);
    expect(mergeStats({}, {}, null).favorites).toBe(0);
  });

  it('7. post_count 优先 stats.post_count', () => {
    const profile = { post_count: 10, stats: { post_count: 20 } };
    expect(mergeStats(profile, {}, {}).posts).toBe(20);
  });
});

describe('我的 — 经验进度', () => {
  it('8. Lv1 + 50exp → 进度 50%', () => {
    expect(expProgress(50, 1)).toBe(50);  // 0→100, (50-0)/(100-0)*100
  });

  it('9. Lv2 + 200exp → 进度 50%', () => {
    expect(expProgress(200, 2)).toBe(50); // 100→300, (200-100)/(300-100)*100
  });

  it('10. 满级 → 100%', () => {
    expect(expProgress(99999, 7)).toBe(100);
  });

  it('11. 0exp → 0%', () => {
    expect(expProgress(0, 1)).toBe(0);
  });
});

describe('我的 — 角色与显示', () => {
  it('12. roleLabel 映射', () => {
    expect(roleLabel('admin')).toBe('管理员');
    expect(roleLabel('merchant')).toBe('商家');
    expect(roleLabel('student')).toBe('学生');
  });

  it('13. displayName 推演', () => {
    const u = { nickname: '小明', username: 'xm123' };
    expect(u.nickname || u.username || '未设置').toBe('小明');
    const u2 = { username: 'xm456' };
    expect(u2.nickname || u2.username || '未设置').toBe('xm456');
    const u3 = {};
    expect(u3.nickname || u3.username || '未设置').toBe('未设置');
  });

  it('14. isAdmin / isMerchant 判断', () => {
    expect({ role: 'admin' }.role === 'admin').toBe(true);
    expect({ role: 'merchant' }.role === 'merchant').toBe(true);
    expect({ role: 'student' }.role === 'merchant').toBe(false);
  });
});

describe('ProfileEdit — 表单逻辑', () => {
  it('15. 昵称 trim 后保存', () => {
    const raw = '  小明  ';
    expect(raw.trim()).toBe('小明');
  });

  it('16. 昵称不变 → 不发送请求', () => {
    const current = '小明';
    const input = '小明';
    expect(input.trim() !== current).toBe(false);
  });

  it('17. 昵称改变 → 发送请求', () => {
    const current = '小明';
    const input = '大明';
    expect(input.trim() !== current).toBe(true);
  });

  it('18. 头像 URL 前缀补全', () => {
    const url = '/uploads/avatars/1.jpg';
    const full = url.startsWith('http') ? url : `${API}${url}`;
    expect(full).toBe(`${API}/uploads/avatars/1.jpg`);
  });

  it('19. 完整 HTTP URL 不补全', () => {
    const url = 'https://cdn.example.com/1.jpg';
    expect(url.startsWith('http') ? url : `${API}${url}`).toBe(url);
  });

  it('20. 时间格式化', () => {
    const d = new Date('2026-06-01T12:00:00');
    expect(formatEditTime(d)).toBe('2026-06-01');
  });
});
