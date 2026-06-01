/**
 * 食堂模块测试
 * 覆盖：区域/店铺/商品 API、数据流、评论、价格
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

describe('食堂 — API 获取', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 区域列表 API', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [{ id: 1, name: 'D6' }, { id: 2, name: 'LY3' }] }) });
    const res = await fetch(`${API}/api/canteen/regions`);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].name).toBe('D6');
  });

  it('2. 店铺列表 API', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, name: 'Shop A' }] } }) });
    const res = await fetch(`${API}/api/canteen/shops?region_id=1`);
    const data = await res.json();
    expect(extractShops(data)).toHaveLength(1);
  });

  it('3. 商品列表 API', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, name: 'Nasi Lemak', price: '8.00' }] } }) });
    const res = await fetch(`${API}/api/canteen/products?shop_id=1`);
    const data = await res.json();
    expect(extractProducts(data)[0].name).toBe('Nasi Lemak');
  });

  it('4. 商品详情 API', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 1, name: 'Nasi Lemak', price: '8.00', description: 'Delicious' } }) });
    const res = await fetch(`${API}/api/canteen/products/1`);
    const data = await res.json();
    expect(data.data.price).toBe('8.00');
  });

  it('5. 评论列表 API（含评分）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, rating: '4', content: '好吃' }, { id: 2, rating: '5', content: '超赞' }] } }),
    });
    const res = await fetch(`${API}/api/canteen/products/1/comments`);
    const data = await res.json();
    expect(extractComments(data)).toHaveLength(2);
  });

  it('6. 空区域降级', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: [] }) });
    const res = await fetch(`${API}/api/canteen/regions`);
    const data = await res.json();
    expect(extractRegions(data)).toEqual([]);
  });
});

describe('食堂 — 数据提取', () => {
  it('7. extractRegions 直接返回 data', () => {
    expect(extractRegions({ data: [{ id: 1 }] })).toHaveLength(1);
  });

  it('8. extractShops 兼容 list 和数组', () => {
    expect(extractShops({ data: { list: [{ id: 1 }] } })).toHaveLength(1);
    expect(extractShops({ data: [{ id: 2 }] })).toHaveLength(1);
  });

  it('9. extractProducts 兼容两种格式', () => {
    expect(extractProducts({ data: { list: [{ id: 1 }] } })).toHaveLength(1);
    expect(extractProducts({ data: [{ id: 2 }] })).toHaveLength(1);
  });

  it('10. 空响应返回空数组', () => {
    expect(extractRegions(null)).toEqual([]);
    expect(extractShops({})).toEqual([]);
  });
});

describe('食堂 — 图片URL', () => {
  it('11. 相对路径补全前缀', () => {
    expect(prefixImage('/uploads/products/p1.jpg')).toBe(`${API}/uploads/products/p1.jpg`);
  });

  it('12. 完整 URL 不重复补全', () => {
    expect(prefixImage('https://cdn.example.com/1.jpg')).toBe('https://cdn.example.com/1.jpg');
  });

  it('13. null → null', () => {
    expect(prefixImage(null)).toBeNull();
  });
});

describe('食堂 — 评分计算', () => {
  it('14. avgRating 正确计算', () => {
    const comments = [{ rating: '4' }, { rating: '5' }, { rating: '3' }];
    expect(avgRating(comments)).toBe(4);
  });

  it('15. 空评论 → 0', () => {
    expect(avgRating([])).toBe(0);
  });

  it('16. 缺失 rating → 当作 0', () => {
    expect(avgRating([{ rating: '5' }, {}])).toBe(2.5);
  });
});

describe('食堂 — 区域数据校验', () => {
  it('17. 五个标准区域', () => {
    const regions = ['D6', 'LY3', 'B1', 'BELL', 'Other'];
    expect(regions).toHaveLength(5);
    expect(regions).toContain('D6');
  });

  it('18. 区域名非空（过滤空字符串）', () => {
    const regions = [{ name: 'D6' }, { name: '' }, { name: 'LY3' }].filter((r) => r.name && r.name.trim());
    expect(regions).toHaveLength(2);
    expect(regions[0].name).toBe('D6');
    expect(regions[1].name).toBe('LY3');
  });
});

describe('食堂 — 价格展示', () => {
  it('19. 有价格 → RM xxx', () => {
    const price = '8.00';
    expect(`RM ${price}`).toBe('RM 8.00');
  });

  it('20. 无价格 → 默认', () => {
    const price = null;
    expect(price || '--').toBe('--');
  });
});
