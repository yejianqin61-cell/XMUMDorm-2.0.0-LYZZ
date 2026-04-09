/** TanStack Query 的 queryKey，集中定义避免拼写不一致 */

export const QK = {
  canteenRegions: () => ['canteen', 'regions'],
  canteenRegionShops: (regionId) => ['canteen', 'region', regionId, 'shops'],
  canteenRegionTopProducts: (regionId, limit) => ['canteen', 'region', regionId, 'topProducts', limit],
  canteenRegionTopProductsByCode: (code, limit) => ['canteen', 'regionCode', String(code), 'topProducts', limit],

  /** 树洞无限滚动：token 用占位字符串区分登录态 */
  postsInfinite: (tokenKey, pageSize) => ['posts', 'infinite', tokenKey, pageSize],
  postDetail: (postId, tokenKey) => ['posts', 'detail', postId, tokenKey],
  postComments: (postId) => ['posts', 'comments', postId],

  /** 食堂总榜五合一 */
  rankingsAll: () => ['rankings', 'all'],

  /** 课表周次 */
  scheduleWeek: (week) => ['schedule', 'week', week],
};
