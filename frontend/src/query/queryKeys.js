/** TanStack Query 的 queryKey，与食堂相关接口一一对应，避免拼写不一致 */
export const QK = {
  canteenRegions: () => ['canteen', 'regions'],
  canteenRegionShops: (regionId) => ['canteen', 'region', regionId, 'shops'],
  canteenRegionTopProducts: (regionId, limit) => ['canteen', 'region', regionId, 'topProducts', limit],
  canteenRegionTopProductsByCode: (code, limit) => ['canteen', 'regionCode', String(code), 'topProducts', limit],
};
