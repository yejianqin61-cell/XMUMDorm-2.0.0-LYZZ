/**
 * 排行榜 Mock 数据（未接 API 时展示用）
 * 数据结构与后端 rankings 接口返回一致，便于后续替换为 API
 */

/** 最夯单品 Top 5 */
export const MOCK_HOT_PRODUCTS = [
  { rank: 1, product_id: 101, product_name: '鸡排饭', shop_name: 'B1 食堂一楼', comprehensive_score: 8.92, review_count: 24 },
  { rank: 2, product_id: 104, product_name: '美式咖啡', shop_name: 'LY3 咖啡角', comprehensive_score: 8.65, review_count: 18 },
  { rank: 3, product_id: 108, product_name: '意面', shop_name: 'BELL 西餐厅', comprehensive_score: 8.20, review_count: 12 },
  { rank: 4, product_id: 105, product_name: '拿铁', shop_name: 'LY3 咖啡角', comprehensive_score: 7.85, review_count: 15 },
  { rank: 5, product_id: 102, product_name: '牛肉面', shop_name: 'B1 食堂一楼', comprehensive_score: 7.50, review_count: 20 },
];

/** 门庭若市商家 Top 5（当周点评量） */
export const MOCK_BUSY_SHOPS = [
  { rank: 1, shop_id: 1, shop_name: 'B1 食堂一楼', region_name: 'B1', weekly_review_count: 56 },
  { rank: 2, shop_id: 3, shop_name: 'LY3 咖啡角', region_name: 'LY3', weekly_review_count: 42 },
  { rank: 3, shop_id: 6, shop_name: 'BELL 西餐厅', region_name: 'BELL', weekly_review_count: 38 },
  { rank: 4, shop_id: 2, shop_name: 'B1 便利店', region_name: 'B1', weekly_review_count: 28 },
  { rank: 5, shop_id: 5, shop_name: 'D6 自助餐', region_name: 'D6', weekly_review_count: 22 },
];

/** 最夯商家 Top 5（综合评分） */
export const MOCK_TOP_SHOPS = [
  { rank: 1, shop_id: 3, shop_name: 'LY3 咖啡角', region_name: 'LY3', comprehensive_score: 8.45, review_count: 120 },
  { rank: 2, shop_id: 6, shop_name: 'BELL 西餐厅', region_name: 'BELL', comprehensive_score: 8.12, review_count: 88 },
  { rank: 3, shop_id: 1, shop_name: 'B1 食堂一楼', region_name: 'B1', comprehensive_score: 7.95, review_count: 256 },
  { rank: 4, shop_id: 2, shop_name: 'B1 便利店', region_name: 'B1', comprehensive_score: 7.68, review_count: 64 },
  { rank: 5, shop_id: 5, shop_name: 'D6 自助餐', region_name: 'D6', comprehensive_score: 7.50, review_count: 45 },
];

/** 爆款新品 Top 3 */
export const MOCK_NEW_HIT_PRODUCTS = [
  { rank: 1, product_id: 115, product_name: '咖喱鸡套餐', shop_name: 'B1 食堂一楼', comprehensive_score: 8.80, review_count: 12 },
  { rank: 2, product_id: 118, product_name: '芝士焗饭', shop_name: 'B1 食堂一楼', comprehensive_score: 8.20, review_count: 8 },
  { rank: 3, product_id: 120, product_name: '酸辣粉', shop_name: 'B1 食堂一楼', comprehensive_score: 7.90, review_count: 6 },
];

/** 点评达人 Top 5（当周点评数） */
export const MOCK_ACTIVE_USERS = [
  { rank: 1, user_id: 10, username: 'foodie_xmum', nickname: '干饭王', avatar: null, weekly_comment_count: 15 },
  { rank: 2, user_id: 11, username: 'taste_tester', nickname: '舌尖上的宿舍', avatar: null, weekly_comment_count: 12 },
  { rank: 3, user_id: 12, username: 'canteen_fan', nickname: '食堂常客', avatar: null, weekly_comment_count: 10 },
  { rank: 4, user_id: 13, username: 'review_master', nickname: '点评小能手', avatar: null, weekly_comment_count: 8 },
  { rank: 5, user_id: 14, username: 'eat_drink', nickname: '吃喝不愁', avatar: null, weekly_comment_count: 7 },
];

export const MOCK_RANKINGS = {
  'hot-products': MOCK_HOT_PRODUCTS,
  'busy-shops': MOCK_BUSY_SHOPS,
  'top-shops': MOCK_TOP_SHOPS,
  'new-hit-products': MOCK_NEW_HIT_PRODUCTS,
  'active-users': MOCK_ACTIVE_USERS,
};
