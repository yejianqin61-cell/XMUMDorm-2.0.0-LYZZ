/** TanStack Query keys centralized to avoid inconsistent string literals. */

export const QK = {
  canteenRegions: () => ['canteen', 'regions'],
  canteenRegionShops: (regionId) => ['canteen', 'region', regionId, 'shops'],
  canteenRegionTopProducts: (regionId, limit) => ['canteen', 'region', regionId, 'topProducts', limit],
  canteenRegionTopProductsByCode: (code, limit) => ['canteen', 'regionCode', String(code), 'topProducts', limit],

  postsInfinite: (tokenKey, pageSize, tagSlug) => ['posts', 'infinite', tokenKey, pageSize, tagSlug ?? '_all'],
  postDetail: (postId, tokenKey) => ['posts', 'detail', postId, tokenKey],
  postComments: (postId) => ['posts', 'comments', postId],
  postTagsList: () => ['posts', 'tags'],
  postHotTags: (limit) => ['posts', 'hotTags', limit || 8],
  postTagsVisible: () => ['posts', 'tags', 'visible'],
  unreadAnnouncements: (tokenKey) => ['notifications', 'unreadAnnouncements', tokenKey],

  handbookTabs: () => ['handbook', 'tabs'],
  handbookTags: () => ['handbook', 'tags'],
  handbookArticles: (params) => ['handbook', 'articles', params || {}],
  handbookArticleDetail: (id, tokenKey) => ['handbook', 'article', id, tokenKey],
  handbookArticleComments: (id) => ['handbook', 'article', id, 'comments'],
  handbookMeSaved: (tokenKey, pageSize) => ['handbook', 'me', 'saved', tokenKey, pageSize],
  handbookMeChecklists: (tokenKey) => ['handbook', 'me', 'checklists', tokenKey],
  handbookMeCourseReviews: (tokenKey, pageSize) => ['handbook', 'me', 'courseReviews', tokenKey, pageSize],
  courseReviews: (params) => ['handbook', 'courseReviews', params || {}],
  courseReviewDetail: (id) => ['handbook', 'courseReview', id],
  courseReviewComments: (id) => ['handbook', 'courseReview', id, 'comments'],

  rankingsAll: () => ['rankings', 'all'],
  scheduleWeek: (week) => ['schedule', 'week', week],

  canteenShop: (shopId) => ['canteen', 'shop', shopId],
  canteenShopCategories: (shopId) => ['canteen', 'shop', shopId, 'categories'],
  canteenShopProducts: (shopId) => ['canteen', 'shop', shopId, 'products'],
  canteenShopHotProducts: (shopId) => ['canteen', 'shop', shopId, 'hotProducts'],

  canteenProduct: (productId) => ['canteen', 'product', productId],
  canteenProductComments: (productId) => ['canteen', 'product', productId, 'comments'],
  canteenProductFavorite: (productId) => ['canteen', 'product', productId, 'favorite'],

  marketplaceCategories: () => ['marketplace', 'categories'],
  marketplaceItems: (params) => ['marketplace', 'items', params || {}],
  marketplaceItemDetail: (id, tokenKey) => ['marketplace', 'item', id, tokenKey || '_guest'],

  errandsList: (params) => ['errands', 'list', params || {}],
  errandDetail: (id) => ['errands', 'detail', id],

  clubTabs: () => ['clubs', 'tabs'],
  clubFeed: (params) => ['clubs', 'feed', params || {}],
  clubActivities: (params) => ['clubs', 'activities', params || {}],
  clubsList: (params) => ['clubs', 'list', params || {}],
  clubPosts: (params) => ['clubs', 'posts', params || {}],
  clubProfile: (id) => ['clubs', 'profile', id],

  canteenSearch: (q, type) => ['canteen', 'search', q || '', type || 'all'],
  canteenBanners: () => ['canteen', 'banners'],
  canteenBannersAdmin: () => ['canteen', 'banners', 'admin'],
  canteenPickRandom: (excludeId) => ['canteen', 'pickRandom', excludeId || 0],
  canteenFoodArticles: (page, pageSize) => ['canteen', 'foodArticles', page, pageSize],

  myOrganizations: () => ['organizations', 'me'],
  organizationsList: (type) => ['organizations', 'list', type || ''],
  organizationMembers: (id) => ['organizations', 'members', id],

  squareHomeSummary: () => ['square', 'homeSummary'],
  squarePersonalizedSummary: () => ['square', 'personalizedSummary'],
  squareRecommendations: () => ['square', 'recommendations'],
  trendingTopics: () => ['square', 'trending'],
  trendingTopicDetail: (id) => ['square', 'trending', id],
  trendingPosts: (id, page) => ['square', 'trending', id, 'posts', page],
  trendingPostDetail: (postId, tokenKey) => ['square', 'trending', 'post', postId, tokenKey || '_guest'],
  trendingPostComments: (postId) => ['square', 'trending', 'post', postId, 'comments'],
  campusFeed: (tab, page) => ['square', 'campusFeed', tab, page],
  campusPostDetail: (id, tokenKey) => ['square', 'campusPost', id, tokenKey || '_guest'],
  campusPostComments: (id) => ['square', 'campusPost', id, 'comments'],
  squareBanners: () => ['square', 'banners'],

  todosList: (filters) => ['todos', 'list', filters],
  todosToday: () => ['todos', 'today'],
};
