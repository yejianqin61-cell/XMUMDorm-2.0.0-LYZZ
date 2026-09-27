/**
 * 食堂共建写入后的统一缓存刷新。
 *
 * 商铺名称、分类、菜品、价格、图片的变更会同时影响：商铺详情、菜单、分区商铺列表、
 * 分区/全站排行榜、搜索结果与菜品详情。这些视图分散在多个 query key 下，
 * 逐个枚举容易漏刷，所以这里按前缀刷新整个食堂域，外加独立的 rankings 域。
 * TanStack Query 默认只重取当前挂载中的查询，不会造成额外网络请求风暴。
 */
export function invalidateCanteenContent(queryClient, { productId } = {}) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: ['canteen'] });
  queryClient.invalidateQueries({ queryKey: ['rankings'] });
  if (productId) {
    queryClient.invalidateQueries({ queryKey: ['canteen', 'product', productId] });
  }
}
