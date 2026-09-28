/**
 * 分页列表（无限查询）的公共纯逻辑 —— 可单测
 *
 * 背景：后端「课程评价 / 我的课程点评 / 手册文章 / 我的收藏」等列表接口都是
 * `page` + `pageSize`（上限 30）分页，并在响应里给 `hasMore`。
 * 前端只要写成「取第一页 + 只读 data.list」，列表就会被**永久硬顶在 pageSize 条**——
 * 库里 412 条也只能看到 20 条（2026-09-26 的真实缺陷）。
 *
 * 所以约定：所有分页列表一律 useInfiniteQuery + 本模块的两个函数，
 * 由 hasMore 驱动下一页，把 pages 摊平成完整列表。
 */

/** 把 useInfiniteQuery 的 pages 摊平成一个列表（容忍缺字段的脏页） */
export function flattenPages(pages) {
  if (!Array.isArray(pages)) return [];
  return pages.flatMap((page) => (page && Array.isArray(page.list) ? page.list : []));
}

/**
 * getNextPageParam：只有后端说还有下一页（hasMore）时才继续。
 *
 * @param {{ hasMore?: boolean, page?: number|string }|undefined} lastPage
 * @returns {number|undefined} 下一页页码；undefined 表示到底了（按钮/自动加载据此收起）
 */
export function nextPageParamFrom(lastPage) {
  if (!lastPage || !lastPage.hasMore) return undefined;
  const raw = lastPage.page;
  // 只把「真的没给页码」当成第 1 页；显式给了 0 / 负数 / 非数字，说明数据不对，停止翻页更安全
  const page = raw === undefined || raw === null || raw === '' ? 1 : Number(raw);
  if (!Number.isFinite(page) || page <= 0) return undefined;
  return page + 1;
}
