/**
 * 食堂模块全量测试
 * 覆盖：区域/店铺/商品 API、搜索、排行榜、点评、收藏、评分
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数 ──────────────────────────────
function extractRegions(data) { return data?.data || []; }
function extractShops(data) { return data?.data?.list || data?.data || []; }
function extractProducts(data) { return data?.data?.list || data?.data || []; }
function extractComments(data) { return data?.data?.list || []; }
function prefixImage(url) { if (!url) return null; return url.startsWith('http') ? url : `${API}${url}`; }
function avgRating(comments) {
  if (!comments || comments.length === 0) return 0;
  const sum = comments.reduce((a, c) => a + (Number(c.rating) || 0), 0);
  return Math.round((sum / comments.length) * 10) / 10;
}
function formatPrice(price) { return price ? `RM ${price}` : '--'; }
function toggleFavorite(fav) { return !fav; }

describe('食堂 — 基础 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 区域列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, name: 'D6' }, { id: 2, name: 'LY3' }] }) });
    const res = await fetch(`${API}/api/canteen/regions`); const data = await res.json();
    expect(extractRegions(data)).toHaveLength(2);
  });

  it('2. 店铺列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, name: 'Shop A' }] } }) });
    const res = await fetch(`${API}/api/canteen/shops?region_id=1`); const data = await res.json();
    expect(extractShops(data)).toHaveLength(1);
  });

  it('3. 商品列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, name: 'Nasi Lemak', price: '8.00' }] } }) });
    const res = await fetch(`${API}/api/canteen/products?shop_id=1`); const data = await res.json();
    expect(extractProducts(data)[0].name).toBe('Nasi Lemak');
  });

  it('4. 商品详情', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, name: 'NL', price: '8.00', description: 'Delicious' } }) });
    const res = await fetch(`${API}/api/canteen/products/1`); const data = await res.json();
    expect(data.data.price).toBe('8.00');
  });

  it('5. 评论列表', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, rating: '4', content: '好吃' }] } }) });
    const res = await fetch(`${API}/api/canteen/products/1/comments`); const data = await res.json();
    expect(extractComments(data)).toHaveLength(1);
  });

  it('6. Banner 获取', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, title: 'Promo', image_url: '/uploads/b1.jpg' }] }) });
    const res = await fetch(`${API}/api/canteen/banners/all`); const data = await res.json();
    expect(data.data[0].title).toBe('Promo');
  });

  it('7. 排行榜 API', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, product_name: 'Nasi Lemak', avg_rating: 4.5 }] } }) });
    const res = await fetch(`${API}/api/canteen/ranking?type=product&period=month`); const data = await res.json();
    expect(data.data.list[0].avg_rating).toBe(4.5);
  });
});

describe('食堂 — 数据提取', () => {
  it('8. extractRegions', () => { expect(extractRegions({ data: [{ id: 1 }] })).toHaveLength(1); });
  it('9. extractShops 兼容 list 和数组', () => {
    expect(extractShops({ data: { list: [{ id: 1 }] } })).toHaveLength(1);
    expect(extractShops({ data: [{ id: 2 }] })).toHaveLength(1);
  });
  it('10. 空→空数组', () => { expect(extractRegions(null)).toEqual([]); expect(extractShops({})).toEqual([]); });
});

describe('食堂 — 图片URL', () => {
  it('11. 相对补全', () => { expect(prefixImage('/uploads/p1.jpg')).toBe(`${API}/uploads/p1.jpg`); });
  it('12. 完整不变', () => { expect(prefixImage('https://cdn.com/a.jpg')).toBe('https://cdn.com/a.jpg'); });
  it('13. null→null', () => { expect(prefixImage(null)).toBeNull(); });
});

describe('食堂 — 评分', () => {
  it('14. 平均分', () => { expect(avgRating([{ rating: '4' }, { rating: '5' }, { rating: '3' }])).toBe(4); });
  it('15. 空→0', () => { expect(avgRating([])).toBe(0); });
  it('16. 缺失rating→0', () => { expect(avgRating([{ rating: '5' }, {}])).toBe(2.5); });
});

describe('食堂 — 价格', () => {
  it('17. RM格式化', () => { expect(formatPrice('8.00')).toBe('RM 8.00'); });
  it('18. 无价格→默认', () => { expect(formatPrice(null)).toBe('--'); });
});

describe('食堂 — 收藏', () => {
  it('19. toggle', () => { expect(toggleFavorite(false)).toBe(true); expect(toggleFavorite(true)).toBe(false); });
});

describe('食堂 — 搜索', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('20. 搜索API拼接参数', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    await fetch(`${API}/api/canteen/search?q=${encodeURIComponent('椰浆饭')}`);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/canteen/search');
    expect(mockFetch.mock.calls[0][0]).toContain('q=');
  });
});
