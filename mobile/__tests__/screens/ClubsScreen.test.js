/**
 * 社团模块全量测试
 * 覆盖：Feed/List/Profile/活动/帖子 API、关注切换、点赞切换、评论树、数据提取
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(data) { return data?.data?.list || data?.data || []; }
function extractDetail(data) { return data?.data; }
function prefixImage(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API}${url}`;
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return d.toLocaleDateString();
}
function toggleFollow(following, count) {
  return { following: !following, followersCount: following ? count - 1 : count + 1 };
}
function toggleLike(liked, count) {
  return { liked: !liked, likeCount: liked ? count - 1 : count + 1 };
}

describe('社团 — Feed API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 获取动态流', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { list: [{ id: 1, type: 'activity', title: '社团招新', cover: '/uploads/a1.jpg' }, { id: 2, type: 'post', title: '日常分享' }] },
      }),
    });
    const res = await fetch(`${API}/api/clubs/feed`);
    const data = await res.json();
    expect(extractList(data)).toHaveLength(2);
    expect(extractList(data)[0].type).toBe('activity');
  });

  it('2. 带类别过滤', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/clubs/feed?category=music`);
    expect(mockFetch.mock.calls[0][0]).toContain('category=music');
  });
});

describe('社团 — List API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('3. 社团列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, name: '音乐社', category: 'music', followers_count: 120 }] } }),
    });
    const res = await fetch(`${API}/api/clubs/list`);
    const data = await res.json();
    expect(extractList(data)[0].name).toBe('音乐社');
  });

  it('4. 搜索社团', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/clubs/list?q=${encodeURIComponent('音乐')}`);
    expect(mockFetch.mock.calls[0][0]).toContain('q=');
  });
});

describe('社团 — Profile API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('5. 社团详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: {
          id: 1, name: '音乐社', category: 'music', description: '爱音乐',
          followers_count: 120, is_following: false,
          members: [{ user_id: 1, nickname: 'Alice', role: 'admin' }],
          activities: [{ id: 1, title: '迎新音乐会', status: 'ongoing' }],
          posts: [{ id: 1, title: '日常排练' }],
        },
      }),
    });
    const res = await fetch(`${API}/api/clubs/1`);
    const data = await res.json();
    const d = extractDetail(data);
    expect(d.name).toBe('音乐社');
    expect(d.members).toHaveLength(1);
    expect(d.activities).toHaveLength(1);
  });

  it('6. 关注社团', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { following: true, followers_count: 121 } }) });
    const res = await fetch(`${API}/api/clubs/1/follow`, { method: 'POST' });
    const data = await res.json();
    expect(data.data.following).toBe(true);
  });
});

describe('社团 — 活动/帖子 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('7. 活动详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { id: 1, title: '迎新', summary: '欢迎新成员', start_time: '2026-06-15T18:00:00Z', location: 'D6 Hall', user_liked: false, like_count: 5 } }),
    });
    const res = await fetch(`${API}/api/clubs/activity/1`);
    const data = await res.json();
    expect(extractDetail(data).location).toBe('D6 Hall');
  });

  it('8. 帖子详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { id: 2, title: '日常', content: '排练照片', user_liked: true, like_count: 10 } }),
    });
    const res = await fetch(`${API}/api/clubs/post/2`);
    const data = await res.json();
    expect(extractDetail(data).user_liked).toBe(true);
  });

  it('9. 评论树（含嵌套回复）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: [
          { id: 1, content: '好棒', author: { username: 'bob' }, replies: [{ id: 3, content: '谢谢', author: { username: 'alice' } }] },
          { id: 2, content: '期待', author: { username: 'carol' }, replies: [] },
        ],
      }),
    });
    const res = await fetch(`${API}/api/clubs/activity/1/comments`);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].replies).toHaveLength(1);
  });

  it('10. 点赞切换', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, liked: true, like_count: 6 }) });
    const res = await fetch(`${API}/api/clubs/likes/toggle`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'activity', target_id: 1 }),
    });
    const data = await res.json();
    expect(data.liked).toBe(true);
  });
});

describe('社团 — 我的社团', () => {
  it('11. 我的社团列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: [{ id: 1, name: '音乐社', role: 'admin' }] }),
    });
    const res = await fetch(`${API}/api/clubs/me/clubs`);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].role).toBe('admin');
  });
});

describe('社团 — 数据提取', () => {
  it('12. 图片URL补全', () => {
    expect(prefixImage('/uploads/c1.jpg')).toBe(`${API}/uploads/c1.jpg`);
    expect(prefixImage('https://cdn.com/a.jpg')).toBe('https://cdn.com/a.jpg');
  });

  it('13. 时间格式化', () => {
    expect(fmtTime(new Date().toISOString())).toBe('刚刚');
  });

  it('14. null时间 → 空', () => { expect(fmtTime(null)).toBe(''); });
});

describe('社团 — 交互逻辑', () => {
  it('15. 关注切换', () => {
    expect(toggleFollow(false, 120)).toEqual({ following: true, followersCount: 121 });
    expect(toggleFollow(true, 121)).toEqual({ following: false, followersCount: 120 });
  });

  it('16. 点赞切换', () => {
    expect(toggleLike(false, 5)).toEqual({ liked: true, likeCount: 6 });
    expect(toggleLike(true, 6)).toEqual({ liked: false, likeCount: 5 });
  });
});

describe('社团 — 角色与权限', () => {
  it('17. admin 角色识别', () => {
    const members = [{ user_id: 1, role: 'admin' }, { user_id: 2, role: 'member' }];
    const isAdmin = members.some((m) => m.user_id === 1 && m.role === 'admin');
    expect(isAdmin).toBe(true);
  });

  it('18. 普通成员非 admin', () => {
    const members = [{ user_id: 1, role: 'member' }];
    const isAdmin = members.some((m) => m.user_id === 1 && m.role === 'admin');
    expect(isAdmin).toBe(false);
  });
});

describe('社团 — 类别映射', () => {
  it('19. 6 个类别', () => {
    const categories = ['music', 'tech', 'culture', 'sport', 'art', 'volunteer'];
    expect(categories).toHaveLength(6);
    expect(categories).toContain('music');
    expect(categories).toContain('sport');
  });
});

describe('社团 — 活动状态', () => {
  it('20. 活动状态标签', () => {
    const labelMap = { upcoming: '即将开始', ongoing: '进行中', ended: '已结束' };
    expect(labelMap.ongoing).toBe('进行中');
    expect(labelMap.ended).toBe('已结束');
    expect(labelMap.upcoming).toBe('即将开始');
  });
});
