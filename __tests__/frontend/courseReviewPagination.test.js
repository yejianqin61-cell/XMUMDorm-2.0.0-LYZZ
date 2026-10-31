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

describe('我的收藏分页', () => {
  it('保留分页加载', () => {
    const me = read('frontend', 'src', 'pages', 'Handbook', 'HandbookMe.jsx');
    expect(me).toContain('getNextPageParam: nextPageParamFrom');
    expect(me).toContain('savedQuery.fetchNextPage()');
  });
});
