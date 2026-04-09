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
  /** 帖子标签列表（全站共用，管理员增删后 invalidate） */
  postTagsList: () => ['posts', 'tags'],
  /** 未读全站公告（按 token 区分，避免串缓存） */
  unreadAnnouncements: (tokenKey) => ['notifications', 'unreadAnnouncements', tokenKey],

  /** 食堂总榜五合一 */
  rankingsAll: () => ['rankings', 'all'],

  /** 课表周次 */
  scheduleWeek: (week) => ['schedule', 'week', week],

  /** 商家页：店铺信息 / 分类 / 全部商品 */
  canteenShop: (shopId) => ['canteen', 'shop', shopId],
  canteenShopCategories: (shopId) => ['canteen', 'shop', shopId, 'categories'],
  canteenShopProducts: (shopId) => ['canteen', 'shop', shopId, 'products'],
  /** 本店热门 Top */
  canteenShopHotProducts: (shopId) => ['canteen', 'shop', shopId, 'hotProducts'],

  /** 用户端菜品详情 */
  canteenProduct: (productId) => ['canteen', 'product', productId],
  canteenProductComments: (productId) => ['canteen', 'product', productId, 'comments'],
  canteenProductFavorite: (productId) => ['canteen', 'product', productId, 'favorite'],
};
