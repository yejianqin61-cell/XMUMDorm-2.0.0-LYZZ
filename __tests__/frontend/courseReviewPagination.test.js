/**
 * 课程评价列表分页回归测试 — M07
 *
 * 缺陷（2026-09-26）：线上 course_reviews 有 412 条未删除，网页只显示 20 条。
 * 后端分页是好的（page/pageSize + hasMore，pageSize 上限 30），
 * 前端却写死 `page: 1, pageSize: 20` 且不读 hasMore、没有加载更多 → 永久硬顶 20 条。
 *
 * 根 jest 配置是 testEnvironment: node，且 frontend/ 不能渲染 JSX，
 * 因此：分页纯逻辑在 shared/utils/infiniteList.js 里做真实单测，
 * 页面/接口的「契约」用读源码的结构断言锁住。
 */
const fs = require('fs');
const path = require('path');
const { flattenPages, nextPageParamFrom } = require('../../shared/utils/infiniteList');

const read = (...segments) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...segments), 'utf8');

describe('flattenPages：把无限查询的分页摊平成完整列表', () => {
  it('多页按顺序拼接', () => {
    const pages = [
      { list: [1, 2, 3], hasMore: true, page: 1 },
      { list: [4, 5], hasMore: false, page: 2 },
    ];
    expect(flattenPages(pages)).toEqual([1, 2, 3, 4, 5]);
  });

  it('还原「412 条」这个真实场景：20 页 × 20 条 + 最后 12 条', () => {
    const pages = [];
    for (let page = 1; page <= 21; page += 1) {
      const size = page === 21 ? 12 : 20;
      pages.push({ list: Array.from({ length: size }, (_, i) => (page - 1) * 20 + i + 1), hasMore: page < 21, page });
    }
    const flat = flattenPages(pages);
    expect(flat).toHaveLength(412);
    expect(flat[0]).toBe(1);
    expect(flat[411]).toBe(412);
  });

  it('容忍脏页与空值（缺 list / null 页）', () => {
    expect(flattenPages([{ list: [1] }, null, {}, { list: null }, { list: [2] }])).toEqual([1, 2]);
    expect(flattenPages(undefined)).toEqual([]);
    expect(flattenPages(null)).toEqual([]);
  });

  it('单页也不出错', () => {
    expect(flattenPages([{ list: [{ id: 1 }], hasMore: false, page: 1 }])).toEqual([{ id: 1 }]);
  });
});

describe('nextPageParamFrom：只有 hasMore 才继续翻页', () => {
  it('hasMore=true → 下一页', () => {
    expect(nextPageParamFrom({ hasMore: true, page: 1 })).toBe(2);
    expect(nextPageParamFrom({ hasMore: true, page: 20 })).toBe(21);
  });

  it('hasMore=false → 停止（undefined，加载更多按钮据此收起）', () => {
    expect(nextPageParamFrom({ hasMore: false, page: 21 })).toBeUndefined();
  });

  it('缺 hasMore / 空页 → 停止，不会无限请求', () => {
    expect(nextPageParamFrom({ page: 3 })).toBeUndefined();
    expect(nextPageParamFrom(undefined)).toBeUndefined();
    expect(nextPageParamFrom(null)).toBeUndefined();
    expect(nextPageParamFrom({})).toBeUndefined();
  });

  it('page 缺失时按第 1 页处理；非法 page 不产生 NaN 请求', () => {
    expect(nextPageParamFrom({ hasMore: true })).toBe(2);
    expect(nextPageParamFrom({ hasMore: true, page: 'abc' })).toBeUndefined();
    expect(nextPageParamFrom({ hasMore: true, page: 0 })).toBeUndefined();
    expect(nextPageParamFrom({ hasMore: true, page: -3 })).toBeUndefined();
  });

  it('字符串页码也能用（后端可能回字符串）', () => {
    expect(nextPageParamFrom({ hasMore: true, page: '7' })).toBe(8);
  });
});

describe('契约：分页列表页面必须用无限查询，不能只取第一页', () => {
  const page = read('frontend', 'src', 'pages', 'Handbook', 'CourseReviewPage.jsx');
  const me = read('frontend', 'src', 'pages', 'Handbook', 'HandbookMe.jsx');

  it('课程评价列表用 useInfiniteQuery + nextPageParamFrom + flattenPages', () => {
    expect(page).toContain('useInfiniteQuery');
    expect(page).not.toContain('useQuery(');
    expect(page).toContain('initialPageParam: 1');
    expect(page).toContain('getNextPageParam: nextPageParamFrom');
    expect(page).toContain('flattenPages(query.data?.pages)');
  });

  it('课程评价列表不再写死只取第 1 页', () => {
    expect(page).not.toContain('page: 1, pageSize: 20');
    expect(page).toContain('page: pageParam');
  });

  it('课程评价列表提供「加载更多」，到底后自动收起', () => {
    expect(page).toContain('handbook-loadmore');
    expect(page).toContain('query.hasNextPage ?');
    expect(page).toContain('query.fetchNextPage()');
    expect(page).toContain('query.isFetchingNextPage');
  });

  it('「我的课程点评 / 我的收藏」两个列表同样翻页（user 1 名下就有 407 条）', () => {
    const infiniteCount = (me.match(/useInfiniteQuery\(/g) || []).length;
    expect(infiniteCount).toBe(2);
    expect(me).not.toContain('useQuery(');
    expect(me).not.toContain('page: 1, pageSize: 20');
    expect(me).toContain('page: pageParam');
    expect((me.match(/getNextPageParam: nextPageParamFrom/g) || []).length).toBe(2);
    expect(me).toContain('flattenPages(savedQuery.data?.pages)');
    expect(me).toContain('flattenPages(myReviewsQuery.data?.pages)');
    expect(me).toContain('savedQuery.fetchNextPage()');
    expect(me).toContain('myReviewsQuery.fetchNextPage()');
  });
});

describe('契约：后端必须是分页接口（前端才有得翻）', () => {
  const route = read('routes', 'handbook.js');

  it('公开课程评价接口解析 page/pageSize 且 pageSize 上限 30', () => {
    expect(route).toContain("router.get('/course-reviews', async (req, res) => {");
    expect(route).toContain('clamp(toInt(req.query.page, 1), 1, 9999)');
    expect(route).toContain('clamp(toInt(req.query.pageSize, 10), 1, 30)');
  });

  it('公开课程评价接口返回 hasMore，并用 LIMIT/OFFSET 取下一页', () => {
    expect(route).toContain('const hasMore = (rows || []).length > pageSize;');
    expect(route).toContain('LIMIT ${limitCount} OFFSET ${offset}');
    expect(route).toContain('data: { list, hasMore, page, pageSize }');
  });

  it('「我的课程点评」接口同样分页', () => {
    expect(route).toContain("router.get('/me/course-reviews', authenticateToken");
    expect(route).toContain("cr.created_by = ?");
  });

  it('分页上限 30 意味着前端必须翻页，不能靠调大 pageSize 解决', () => {
    const cap = route.match(/clamp\(toInt\(req\.query\.pageSize, \d+\), 1, (\d+)\)/);
    expect(cap).not.toBeNull();
    expect(Number(cap[1])).toBeLessThan(412);
  });
});
