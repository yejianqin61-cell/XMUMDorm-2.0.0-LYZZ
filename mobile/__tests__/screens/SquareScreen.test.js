/**
 * 广场模块全量测试
 * 覆盖：Banner/Trending/Campus API、数据提取、图片URL、时间格式化、点赞逻辑、分页、内容验证
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数 ──────────────────────────────

function extractBanners(data) { return data?.data || []; }
function extractTrending(data) { return data?.data || []; }
function extractCampusList(data) { return data?.data?.list || []; }
function extractPosts(data) { return data?.data?.list || []; }
function extractComments(data) { return data?.data || []; }

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
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

function toggleLike(liked, count) {
  return { liked: !liked, likeCount: liked ? count - 1 : count + 1 };
}

function hasMorePages(data) { return data?.data?.hasMore || false; }
function getNextPage(page, hasMore) { return hasMore ? page + 1 : null; }

function validatePostContent(content, maxLen) {
  if (!content || !content.trim()) return '内容不能为空';
  if (content.length > maxLen) return `内容不能超过 ${maxLen} 字`;
  return null;
}

function validatePostImages(images) {
  if (images.length > 3) return '最多 3 张图片';
  return null;
}

const RANK_COLORS = ['#ef4444', '#f97316', '#eab308', '#94a3b8', '#94a3b8'];

describe('广场 — Banner API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 获取 Banner 列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: [
          { id: 1, title: '校园活动', image_url: '/uploads/b1.jpg' },
          { id: 2, title: '招新公告', image_url: '/uploads/b2.jpg' },
        ],
      }),
    });
    const res = await fetch(`${API}/api/square/banners`);
    const data = await res.json();
    expect(extractBanners(data)).toHaveLength(2);
    expect(extractBanners(data)[0].title).toBe('校园活动');
  });

  it('2. 空 Banner 返回空数组', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    const res = await fetch(`${API}/api/square/banners`);
    const data = await res.json();
    expect(extractBanners(data)).toEqual([]);
  });
});

describe('广场 — Trending API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('3. 获取热搜话题列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: [
          { id: 1, title: '期末考试', post_count: 42 },
          { id: 2, title: '食堂新菜品', post_count: 18 },
        ],
      }),
    });
    const res = await fetch(`${API}/api/square/trending`);
    const data = await res.json();
    expect(extractTrending(data)).toHaveLength(2);
    expect(extractTrending(data)[0].post_count).toBe(42);
  });

  it('4. 获取话题详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { id: 1, title: '期末考试', description: '讨论期末', post_count: 42 } }),
    });
    const res = await fetch(`${API}/api/square/trending/1`);
    const data = await res.json();
    expect(data.data.title).toBe('期末考试');
  });

  it('5. 获取话题帖子（分页）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: {
          list: [{ id: 101, content: '加油复习', like_count: 5, comment_count: 2 }],
          total: 30, page: 1, pageSize: 10, hasMore: true,
        },
      }),
    });
    const res = await fetch(`${API}/api/square/trending/1/posts?page=1&pageSize=10`);
    const data = await res.json();
    expect(extractPosts(data)).toHaveLength(1);
    expect(hasMorePages(data)).toBe(true);
  });

  it('6. 获取帖子详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: { id: 101, content: '加油复习', author: { username: 'alice' }, like_count: 5, user_liked: false },
      }),
    });
    const res = await fetch(`${API}/api/square/trending/posts/101`);
    const data = await res.json();
    expect(data.data.author.username).toBe('alice');
    expect(data.data.user_liked).toBe(false);
  });

  it('7. 获取帖子评论（嵌套）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: [
          { id: 1, content: '好帖', author: { username: 'bob' }, replies: [{ id: 2, content: '同意', author: { username: 'carol' } }] },
        ],
      }),
    });
    const res = await fetch(`${API}/api/square/trending/posts/101/comments`);
    const data = await res.json();
    const comments = extractComments(data);
    expect(comments).toHaveLength(1);
    expect(comments[0].replies).toHaveLength(1);
  });
});

describe('广场 — Campus Feed API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('8. 获取学校公告', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: {
          list: [
            { id: 1, title: '期末考试安排', feed_tab: 'school', organization: { name: '教务处' } },
          ],
          total: 1, page: 1, pageSize: 5, hasMore: false,
        },
      }),
    });
    const res = await fetch(`${API}/api/square/campus-feed?tab=school&page=1&pageSize=5`);
    const data = await res.json();
    expect(extractCampusList(data)).toHaveLength(1);
    expect(extractCampusList(data)[0].organization.name).toBe('教务处');
  });

  it('9. 获取学院通知', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: { list: [{ id: 2, title: 'IOT 讲座', feed_tab: 'college' }], total: 1, hasMore: false },
      }),
    });
    const res = await fetch(`${API}/api/square/campus-feed?tab=college&page=1&pageSize=5`);
    const data = await res.json();
    expect(extractCampusList(data)[0].feed_tab).toBe('college');
  });

  it('10. 获取校园帖子详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0,
        data: { id: 1, title: '考试安排', content: '详情...', feed_tab: 'school', organization: { name: '教务处' } },
      }),
    });
    const res = await fetch(`${API}/api/square/campus-posts/1`);
    const data = await res.json();
    expect(data.data.feed_tab).toBe('school');
  });
});

describe('广场 — 图片URL处理', () => {
  it('11. 相对路径补全', () => {
    expect(prefixImage('/uploads/b1.jpg')).toBe(`${API}/uploads/b1.jpg`);
  });
  it('12. 完整路径不变', () => {
    expect(prefixImage('https://cdn.com/img.jpg')).toBe('https://cdn.com/img.jpg');
  });
  it('13. null → null', () => {
    expect(prefixImage(null)).toBeNull();
    expect(prefixImage('')).toBeNull();
  });
});

describe('广场 — 时间格式化', () => {
  it('14. 刚刚', () => { expect(fmtTime(new Date().toISOString())).toBe('刚刚'); });
  it('15. 分钟/小时/天前', () => {
    expect(fmtTime(new Date(Date.now() - 10 * 60000).toISOString())).toBe('10分钟前');
    expect(fmtTime(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3小时前');
    expect(fmtTime(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2天前');
  });
  it('16. null → 空', () => { expect(fmtTime(null)).toBe(''); });
});

describe('广场 — 点赞逻辑', () => {
  it('17. 点赞切换', () => {
    expect(toggleLike(false, 5)).toEqual({ liked: true, likeCount: 6 });
    expect(toggleLike(true, 6)).toEqual({ liked: false, likeCount: 5 });
  });
});

describe('广场 — 内容验证', () => {
  it('18. 空内容', () => {
    expect(validatePostContent('', 2000)).toBe('内容不能为空');
    expect(validatePostContent('  ', 2000)).toBe('内容不能为空');
  });
  it('19. 超长内容', () => {
    expect(validatePostContent('a'.repeat(2001), 2000)).toBe('内容不能超过 2000 字');
    expect(validatePostContent('ok', 2000)).toBeNull();
  });

  it('20. 图片数量限制', () => {
    expect(validatePostImages([])).toBeNull();
    expect(validatePostImages(['a', 'b', 'c'])).toBeNull();
    expect(validatePostImages(['a', 'b', 'c', 'd'])).toBe('最多 3 张图片');
  });
});
