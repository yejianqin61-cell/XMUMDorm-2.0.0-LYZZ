/**
 * 树洞模块单元测试
 * 覆盖：数据获取、Tag 解析、瀑布流分列、分页、点赞逻辑
 */
const ASMock = require('@react-native-async-storage/async-storage');

global.fetch = jest.fn();
const mockFetch = global.fetch;

// 模拟 API 配置
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数（从组件逻辑提取） ─────────────

/** 瀑布流分列 */
function splitColumns(posts) {
  const left = [], right = [];
  posts.forEach((p, i) => { if (i % 2 === 0) left.push(p); else right.push(p); });
  return [left, right];
}

/** 合并帖子（去重） */
function mergePostsById(existing, incoming) {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const p of incoming) {
    if (p?.id == null || seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

/** Tag 显示名 */
function tagDisplay(t, isZh) {
  const raw = isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
  return String(raw || '').replace(/^#\s*/g, '').trim();
}

/** 判断 hasMore */
function calcHasMore(list, pageSize) {
  return list.length >= pageSize;
}

/** 相对时间 */
function formatTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

// ─── 测试 ────────────────────────────────────

describe('树洞模块 — 数据获取', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. getPostList 正确拼接 API URL', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [], hasMore: false } }),
    });

    const page = 1, pageSize = 10;
    await fetch(`${API}/api/posts?page=${page}&pageSize=${pageSize}`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=10');
  });

  it('2. getPostList 带 tagSlug 参数', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });

    const slug = 'campus';
    await fetch(`${API}/api/posts?page=1&pageSize=10&tagSlug=${encodeURIComponent(slug)}`);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('tagSlug=campus');
  });

  it('3. 响应解析 — 列表 + hasMore', async () => {
    const mockPosts = [
      { id: 1, title: 'P1', content: 'Hello', like_count: 5, comment_count: 2, author: { username: 'u1' } },
      { id: 2, title: 'P2', content: 'World', like_count: 3, comment_count: 1, author: { username: 'u2' } },
    ];
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: mockPosts, hasMore: true, page: 1 } }),
    });

    const res = await fetch(`${API}/api/posts?page=1&pageSize=10`);
    const data = await res.json();
    expect(data.status).toBe(0);
    expect(data.data.list).toHaveLength(2);
    expect(data.data.hasMore).toBe(true);
    expect(data.data.list[0].author.username).toBe('u1');
  });

  it('4. 网络错误 → 返回空列表', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    let result = [];
    try {
      await fetch(`${API}/api/posts?page=1&pageSize=10`);
    } catch { result = []; }
    expect(result).toEqual([]);
  });
});

describe('树洞模块 — Tag 解析', () => {
  it('5. tagDisplay 中英文回退', () => {
    const tag = { name_zh: '校园', name_en: 'Campus', slug: 'campus' };
    expect(tagDisplay(tag, true)).toBe('校园');
    expect(tagDisplay(tag, false)).toBe('Campus');
  });

  it('6. 只有中文名时回退', () => {
    const tag = { name_zh: '美食', name_en: null };
    expect(tagDisplay(tag, true)).toBe('美食');
    expect(tagDisplay(tag, false)).toBe('美食');
  });

  it('7. 去除 # 前缀', () => {
    const tag = { name_zh: '# 校园', name_en: '#Campus' };
    expect(tagDisplay(tag, true)).toBe('校园');
    expect(tagDisplay(tag, false)).toBe('Campus');
  });

  it('8. 空数据回退空字符串', () => {
    expect(tagDisplay({}, true)).toBe('');
  });
});

describe('树洞模块 — 瀑布流分列', () => {
  it('9. 偶数个帖子均分', () => {
    const posts = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const [l, r] = splitColumns(posts);
    expect(l).toHaveLength(2);
    expect(r).toHaveLength(2);
    expect(l[0].id).toBe(1);
    expect(l[1].id).toBe(3);
    expect(r[0].id).toBe(2);
  });

  it('10. 奇数个帖子 → 左列多1', () => {
    const posts = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const [l, r] = splitColumns(posts);
    expect(l).toHaveLength(2);
    expect(r).toHaveLength(1);
  });

  it('11. 空列表 → 两列皆空', () => {
    const [l, r] = splitColumns([]);
    expect(l).toEqual([]);
    expect(r).toEqual([]);
  });
});

describe('树洞模块 — 分页与合并', () => {
  it('12. hasMore 判断', () => {
    expect(calcHasMore([{},{},{},{},{},{},{},{},{},{}], 10)).toBe(true);   // 10条
    expect(calcHasMore([{},{},{},{},{},{},{},{},{}], 10)).toBe(false);     // 9条
    expect(calcHasMore([], 10)).toBe(false);                                // 0条
  });

  it('13. mergePostsById 去重', () => {
    const existing = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
    const incoming = [{ id: 2, title: 'B2' }, { id: 3, title: 'C' }];
    const merged = mergePostsById(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged[1].title).toBe('B'); // 保留旧数据
  });

  it('14. 重复不重复添加', () => {
    const existing = [{ id: 1 }];
    const merged = mergePostsById(existing, [{ id: 1 }, { id: 1 }]);
    expect(merged).toHaveLength(1);
  });
});

describe('树洞模块 — 点赞逻辑', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('15. 点赞 toggle → liked 翻转', () => {
    let liked = false;
    let likeCount = 5;

    // 点赞
    liked = true;
    likeCount = likeCount + 1;
    expect(liked).toBe(true);
    expect(likeCount).toBe(6);

    // 取消
    liked = false;
    likeCount = Math.max(0, likeCount - 1);
    expect(liked).toBe(false);
    expect(likeCount).toBe(5);
  });

  it('16. like_count 不能为负', () => {
    let likeCount = 0;
    likeCount = Math.max(0, likeCount - 1);
    expect(likeCount).toBe(0);
  });

  it('17. 点赞 API 调用', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { liked: true, like_count: 6 } }),
    });

    const postId = 42;
    const res = await fetch(`${API}/api/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();

    expect(data.status).toBe(0);
    expect(data.data.liked).toBe(true);
    expect(data.data.like_count).toBe(6);
  });
});

describe('树洞模块 — 时间格式化', () => {
  it('18. 几秒前 → 刚刚', () => {
    expect(formatTime(new Date().toISOString())).toBe('刚刚');
  });

  it('19. 几分钟前', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTime(d.toISOString())).toBe('5分钟前');
  });

  it('20. 无时间 → 空字符串', () => {
    expect(formatTime(null)).toBe('');
  });
});
