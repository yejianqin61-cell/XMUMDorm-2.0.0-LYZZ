/**
 * 食堂系统 Mock 数据（第二阶段页面 UI 用，未接 API）
 */

/** 分区列表：B1, LY3, D6, BELL, others */
export const AREAS = ['B1', 'LY3', 'D6', 'BELL', 'others'];

/** 商家端「当前登录商家」Mock ID，用于 FoodManage；接 API 后由后端返回 */
export const MOCK_CURRENT_MERCHANT_ID = 1;

/** 按分区展示的商家 Mock；rating 评分(1-5)，status 营业状态 open|closed */
export const MOCK_MERCHANTS = [
  { id: 1, name: 'B1 食堂一楼', description: '早餐、午餐、晚餐', area: 'B1', logo: '', rating: 4.2, status: 'open', address: 'B1 楼 1F', openingHours: '07:00-21:00' },
  { id: 2, name: 'B1 便利店', description: '零食饮料日用品', area: 'B1', logo: '', rating: 4.5, status: 'open', address: 'B1 楼 1F 东侧', openingHours: '06:30-23:00' },
  { id: 3, name: 'LY3 咖啡角', description: '咖啡、轻食', area: 'LY3', logo: '', rating: 4.8, status: 'open', address: 'LY3 中庭', openingHours: '08:00-20:00' },
  { id: 4, name: 'LY3 面馆', description: '面食、小炒', area: 'LY3', logo: '', rating: 4.0, status: 'closed', address: 'LY3 2F', openingHours: '11:00-14:00, 17:00-20:00' },
  { id: 5, name: 'D6 自助餐', description: '自助取餐', area: 'D6', logo: '', rating: 4.3, status: 'open', address: 'D6 食堂', openingHours: '11:00-14:00' },
  { id: 6, name: 'BELL 西餐厅', description: '西式简餐', area: 'BELL', logo: '', rating: 4.6, status: 'open', address: 'BELL 1F', openingHours: '10:00-21:00' },
  { id: 7, name: '其他档口', description: '各类小吃', area: 'others', logo: '', rating: 3.9, status: 'open', address: '校内多档口', openingHours: '依档口而定' },
];

/** 按商家展示的菜品 Mock */
export const MOCK_FOODS = [
  { id: 101, name: '鸡排饭', price: 12.5, description: '香脆鸡排配米饭', merchantId: 1, image: '' },
  { id: 102, name: '牛肉面', price: 15.0, description: '红烧牛肉面', merchantId: 1, image: '' },
  { id: 103, name: '三明治', price: 8.0, description: '火腿芝士三明治', merchantId: 2, image: '' },
  { id: 104, name: '美式咖啡', price: 9.5, description: '现磨美式', merchantId: 3, image: '' },
  { id: 105, name: '拿铁', price: 11.0, description: '热/冰拿铁', merchantId: 3, image: '' },
  { id: 106, name: '炸酱面', price: 14.0, description: '老北京炸酱面', merchantId: 4, image: '' },
  { id: 107, name: '自助午餐', price: 18.0, description: '任选三菜一汤', merchantId: 5, image: '' },
  { id: 108, name: '意面', price: 22.0, description: '番茄肉酱意面', merchantId: 6, image: '' },
];

export function getMerchantsByArea(area) {
  return MOCK_MERCHANTS.filter((m) => m.area === area);
}

export function getFoodsByMerchantId(merchantId) {
  return MOCK_FOODS.filter((f) => f.merchantId === Number(merchantId));
}

export function getMerchantById(id) {
  return MOCK_MERCHANTS.find((m) => m.id === Number(id));
}

export function getFoodById(id) {
  return MOCK_FOODS.find((f) => f.id === Number(id));
}

/** 评级 1-5 对应文案 */
export const RATING_LABELS = {
  1: '拉完了',
  2: 'NPC',
  3: '顶尖',
  4: '人上人',
  5: '夯爆了',
};

/**
 * 菜品点评 Mock：一级点评含 rating、content、images（买家秀）、likeCount、replies（二级评论）
 */
export const MOCK_FOOD_REVIEWS = [
  {
    id: 1001,
    foodId: 101,
    userId: 10,
    userName: '匿名用户',
    avatar: '',
    rating: 5,
    content: '鸡排很脆，份量足，夯爆了！',
    images: ['https://via.placeholder.com/120x120?text=1', 'https://via.placeholder.com/120x120?text=2'],
    likeCount: 12,
    replies: [
      { id: 2001, reviewId: 1001, userId: 11, userName: '路人甲', content: '同感，下次还点', likeCount: 2 },
      { id: 2002, reviewId: 1001, userId: 12, userName: '吃货', content: '配的酱也不错', likeCount: 0 },
    ],
  },
  {
    id: 1002,
    foodId: 101,
    userId: 13,
    userName: '匿名用户',
    avatar: '',
    rating: 4,
    content: '人上人级别，推荐。',
    images: [],
    likeCount: 5,
    replies: [],
  },
  {
    id: 1003,
    foodId: 101,
    userId: 14,
    userName: '匿名用户',
    avatar: '',
    rating: 3,
    content: '中规中矩，有图有真相。',
    images: ['https://via.placeholder.com/120x120?text=pic'],
    likeCount: 0,
    replies: [],
  },
  {
    id: 1004,
    foodId: 101,
    userId: 15,
    userName: '干饭人',
    avatar: '',
    rating: 5,
    content: '每次来必点，米饭可以续，吃饱为止。',
    images: ['https://via.placeholder.com/120x120?text=meal'],
    likeCount: 8,
    replies: [
      { id: 2003, reviewId: 1004, userId: 16, userName: '小透明', content: '续饭要钱吗？', likeCount: 1 },
    ],
  },
  {
    id: 1005,
    foodId: 101,
    userId: 17,
    userName: '匿名用户',
    avatar: '',
    rating: 2,
    content: '今天发挥一般，希望改进。',
    images: [],
    likeCount: 0,
    replies: [],
  },
  {
    id: 1006,
    foodId: 101,
    userId: 18,
    userName: '匿名用户',
    avatar: '',
    rating: 4,
    content: '性价比高，上图。',
    images: ['https://via.placeholder.com/120x120?text=A', 'https://via.placeholder.com/120x120?text=B', 'https://via.placeholder.com/120x120?text=C'],
    likeCount: 3,
    replies: [],
  },
];

export function getReviewsByFoodId(foodId) {
  return MOCK_FOOD_REVIEWS.filter((r) => r.foodId === Number(foodId));
}
