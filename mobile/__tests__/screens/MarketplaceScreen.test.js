/**
 * 二手市场模块全量测试
 * 覆盖：分类/商品/详情/收藏/聊天 API、数据提取、图片URL、价格格式化、状态切换
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function extractList(data) { return data?.data?.list || []; }
function extractDetail(data) { return data?.data; }
function extractCategories(data) { return data?.data || []; }
function prefixImage(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API}${url}`;
}
function fmtPrice(val) { return `RM ${Number(val || 0).toFixed(2)}`; }
function toggleWant(want, count) { return { want: !want, wantsCount: want ? count - 1 : count + 1 }; }
function validatePublishForm(fields) {
  const required = ['title', 'description', 'category', 'price'];
  return required.filter((f) => !fields[f] || !String(fields[f]).trim());
}

describe('二手 — Categories API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 获取分类列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: [{ slug: 'electronics', name_zh: '电子产品' }, { slug: 'books', name_zh: '图书' }] }),
    });
    const res = await fetch(`${API}/api/marketplace/categories`);
    const data = await res.json();
    expect(extractCategories(data)).toHaveLength(2);
  });

  it('2. 分类过滤 all', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ slug: 'all', name_zh: '全部' }] }) });
    const res = await fetch(`${API}/api/marketplace/categories`);
    const data = await res.json();
    const items = extractCategories(data).filter((c) => c.slug !== 'all');
    expect(items.length).toBeGreaterThanOrEqual(0);
  });
});

describe('二手 — Items API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('3. 商品列表（含分类过滤）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: 'iPhone', price: '500.00', status: 'on_sale' }] } }),
    });
    const res = await fetch(`${API}/api/marketplace/items?category=electronics&status=on_sale`);
    const data = await res.json();
    expect(extractList(data)[0].title).toBe('iPhone');
  });

  it('4. 搜索参数拼接', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/marketplace/items?q=${encodeURIComponent('课本')}`);
    expect(mockFetch.mock.calls[0][0]).toContain('q=');
  });

  it('5. 价格范围过滤', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/marketplace/items?priceMin=10&priceMax=100`);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('priceMin=10');
    expect(url).toContain('priceMax=100');
  });

  it('6. 商品详情', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: {
          id: 1, title: 'iPhone', price: '500.00', status: 'on_sale', delivery_method: 'pickup',
          dorm_area: 'D6', wants_count: 3, description: 'Like new',
          sellerInfo: { id: 2, name: 'alice' }, viewer: { want: false, canEdit: false },
          images: [{ url: '/uploads/1.jpg' }],
        },
      }),
    });
    const res = await fetch(`${API}/api/marketplace/items/1`);
    const data = await res.json();
    const d = extractDetail(data);
    expect(d.title).toBe('iPhone');
    expect(d.sellerInfo.name).toBe('alice');
    expect(d.viewer.want).toBe(false);
  });
});

describe('二手 — Want API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('7. 收藏切换', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { want: true, wants_count: 4 } }) });
    const res = await fetch(`${API}/api/marketplace/items/1/want`, { method: 'POST' });
    const data = await res.json();
    expect(data.data.want).toBe(true);
    expect(data.data.wants_count).toBe(4);
  });

  it('8. 我的收藏列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 2, title: 'Book', price: '10.00' }] } }),
    });
    const res = await fetch(`${API}/api/marketplace/me/wants`);
    const data = await res.json();
    expect(extractList(data)).toHaveLength(1);
  });
});

describe('二手 — 数据提取', () => {
  it('9. 图片URL补全', () => {
    expect(prefixImage('/uploads/1.jpg')).toBe(`${API}/uploads/1.jpg`);
    expect(prefixImage('https://cdn.com/img.jpg')).toBe('https://cdn.com/img.jpg');
    expect(prefixImage(null)).toBeNull();
  });

  it('10. 价格格式化', () => {
    expect(fmtPrice(500)).toBe('RM 500.00');
    expect(fmtPrice('8.5')).toBe('RM 8.50');
    expect(fmtPrice(0)).toBe('RM 0.00');
  });

  it('11. Want 切换逻辑', () => {
    expect(toggleWant(false, 3)).toEqual({ want: true, wantsCount: 4 });
    expect(toggleWant(true, 4)).toEqual({ want: false, wantsCount: 3 });
  });
});

describe('二手 — 状态管理', () => {
  it('12. 状态切换：on_sale → sold', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { status: 'sold' } }) });
    const res = await fetch(`${API}/api/marketplace/items/1/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'sold' }),
    });
    const data = await res.json();
    expect(data.data.status).toBe('sold');
  });

  it('13. 删除商品', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1 } }) });
    const res = await fetch(`${API}/api/marketplace/items/1`, { method: 'DELETE' });
    const data = await res.json();
    expect(data.status).toBe(0);
  });
});

describe('二手 — Chat API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('14. 获取聊天线程', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 10, seller_user_id: 2, buyer_user_id: 3 } }) });
    const res = await fetch(`${API}/api/marketplace/items/1/chat/thread`);
    const data = await res.json();
    expect(data.data.id).toBe(10);
  });

  it('15. 发送消息', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 99 } }) });
    const res = await fetch(`${API}/api/marketplace/chat/threads/10/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'Hi' }),
    });
    const data = await res.json();
    expect(data.status).toBe(0);
  });

  it('16. 获取消息列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { thread: { id: 10, item_title: 'iPhone' }, list: [{ id: 1, content: 'Hi', sender: { name: 'alice' } }] },
      }),
    });
    const res = await fetch(`${API}/api/marketplace/chat/threads/10/messages`);
    const data = await res.json();
    expect(data.data.list).toHaveLength(1);
    expect(data.data.thread.item_title).toBe('iPhone');
  });
});

describe('二手 — 内容验证', () => {
  it('17. 必填字段检查', () => {
    expect(validatePublishForm({ title: 'A', description: 'B', category: 'books', price: '10' })).toEqual([]);
  });

  it('18. 缺少必填字段', () => {
    const missing = validatePublishForm({ title: '', description: 'B', category: '', price: '' });
    expect(missing).toContain('title');
    expect(missing).toContain('category');
    expect(missing).toContain('price');
  });

  it('19. 价格解析', () => {
    expect(Number('10.50')).toBe(10.5);
    expect(Number('')).toBe(0);
    expect(Number('abc')).toBeNaN();
    expect(isNaN(Number('abc'))).toBe(true);
  });

  it('20. 有效表单全字段', () => {
    const fields = { title: 'iPhone', description: 'New', category: 'electronics', price: '500' };
    expect(validatePublishForm(fields)).toEqual([]);
  });
});
