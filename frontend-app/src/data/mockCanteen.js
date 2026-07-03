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

/** 按商家展示的分类 Mock：id, name, merchantId, sortOrder（按创建顺序即 sortOrder 升序） */
export const MOCK_CATEGORIES = [
  { id: 1, name: '主食', merchantId: 1, sortOrder: 0 },
  { id: 2, name: '面食', merchantId: 1, sortOrder: 1 },
  { id: 10, name: '套餐', merchantId: 1, sortOrder: 2 },
  { id: 11, name: '小食', merchantId: 1, sortOrder: 3 },
  { id: 12, name: '饮料', merchantId: 1, sortOrder: 4 },
  { id: 3, name: '零食', merchantId: 2, sortOrder: 0 },
  { id: 4, name: '饮料', merchantId: 2, sortOrder: 1 },
  { id: 5, name: '咖啡', merchantId: 3, sortOrder: 0 },
  { id: 6, name: '轻食', merchantId: 3, sortOrder: 1 },
  { id: 7, name: '面食', merchantId: 4, sortOrder: 0 },
  { id: 8, name: '自助', merchantId: 5, sortOrder: 0 },
  { id: 9, name: '西餐', merchantId: 6, sortOrder: 0 },
];

/** 按商家展示的菜品 Mock；categoryId 对应 MOCK_CATEGORIES.id。B1 一楼(merchantId:1) 商品较多以便看瀑布流 */
export const MOCK_FOODS = [
  /* B1 食堂一楼 merchantId: 1 */
  { id: 101, name: '鸡排饭', price: 12.5, description: '香脆鸡排配米饭', merchantId: 1, categoryId: 1, image: '' },
  { id: 102, name: '牛肉面', price: 15.0, description: '红烧牛肉面', merchantId: 1, categoryId: 2, image: '' },
  { id: 109, name: '卤肉饭', price: 11.0, description: '台式卤肉配卤蛋', merchantId: 1, categoryId: 1, image: '' },
  { id: 110, name: '炒饭', price: 10.5, description: '蛋炒饭/扬州炒饭', merchantId: 1, categoryId: 1, image: '' },
  { id: 111, name: '盖浇饭', price: 13.0, description: '多种浇头可选', merchantId: 1, categoryId: 1, image: '' },
  { id: 112, name: '炸酱面', price: 12.0, description: '老北京炸酱', merchantId: 1, categoryId: 2, image: '' },
  { id: 113, name: '刀削面', price: 14.0, description: '现削现煮', merchantId: 1, categoryId: 2, image: '' },
  { id: 114, name: '酸辣粉', price: 11.5, description: '酸辣开胃', merchantId: 1, categoryId: 2, image: '' },
  { id: 115, name: '咖喱鸡套餐', price: 16.0, description: '咖喱鸡+饭+饮料', merchantId: 1, categoryId: 10, image: '' },
  { id: 116, name: '排骨套餐', price: 18.0, description: '红烧排骨+两菜一汤', merchantId: 1, categoryId: 10, image: '' },
  { id: 117, name: '鸡腿套餐', price: 15.5, description: '炸鸡腿+配菜', merchantId: 1, categoryId: 10, image: '' },
  { id: 118, name: '芝士焗饭', price: 17.0, description: '拉丝芝士焗饭', merchantId: 1, categoryId: 10, image: '' },
  { id: 119, name: '双拼饭', price: 14.5, description: '任选两种主菜', merchantId: 1, categoryId: 10, image: '' },
  { id: 120, name: '酸辣粉', price: 11.5, description: '酸辣粉单点', merchantId: 1, categoryId: 11, image: '' },
  { id: 121, name: '煎饺', price: 8.0, description: '6只/份', merchantId: 1, categoryId: 11, image: '' },
  { id: 122, name: '春卷', price: 6.5, description: '4条/份', merchantId: 1, categoryId: 11, image: '' },
  { id: 123, name: '茶叶蛋', price: 2.5, description: '卤香入味', merchantId: 1, categoryId: 11, image: '' },
  { id: 124, name: '烤肠', price: 5.0, description: '台式烤肠', merchantId: 1, categoryId: 11, image: '' },
  { id: 125, name: '豆浆', price: 3.0, description: '热/冰 甜/淡', merchantId: 1, categoryId: 12, image: '' },
  { id: 126, name: '柠檬茶', price: 5.5, description: '现调柠檬茶', merchantId: 1, categoryId: 12, image: '' },
  { id: 127, name: '酸梅汤', price: 4.0, description: '冰镇酸梅汤', merchantId: 1, categoryId: 12, image: '' },
  { id: 128, name: '绿豆汤', price: 4.5, description: '夏日消暑', merchantId: 1, categoryId: 12, image: '' },
  { id: 129, name: '冬瓜茶', price: 4.0, description: '台式冬瓜茶', merchantId: 1, categoryId: 12, image: '' },
  { id: 130, name: '米饭', price: 2.0, description: '单点白饭', merchantId: 1, categoryId: 1, image: '' },
  { id: 131, name: '番茄蛋面', price: 12.0, description: '番茄炒蛋盖面', merchantId: 1, categoryId: 2, image: '' },
  { id: 132, name: '牛肉炒面', price: 14.0, description: '嫩牛肉炒面', merchantId: 1, categoryId: 2, image: '' },
  /* 其他商家 */
  { id: 103, name: '三明治', price: 8.0, description: '火腿芝士三明治', merchantId: 2, categoryId: 3, image: '' },
  { id: 104, name: '美式咖啡', price: 9.5, description: '现磨美式', merchantId: 3, categoryId: 5, image: '' },
  { id: 105, name: '拿铁', price: 11.0, description: '热/冰拿铁', merchantId: 3, categoryId: 5, image: '' },
  { id: 106, name: '炸酱面', price: 14.0, description: '老北京炸酱面', merchantId: 4, categoryId: 7, image: '' },
  { id: 107, name: '自助午餐', price: 18.0, description: '任选三菜一汤', merchantId: 5, categoryId: 8, image: '' },
  { id: 108, name: '意面', price: 22.0, description: '番茄肉酱意面', merchantId: 6, categoryId: 9, image: '' },
];

export function getMerchantsByArea(area) {
  return MOCK_MERCHANTS.filter((m) => m.area === area);
}

/** 某商家的分类列表（按 sortOrder 升序） */
export function getCategoriesByMerchantId(merchantId) {
  return (MOCK_CATEGORIES || []).filter((c) => c.merchantId === Number(merchantId)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getFoodsByMerchantId(merchantId) {
  return MOCK_FOODS.filter((f) => f.merchantId === Number(merchantId));
}

/** 某商家按分类分组的菜品：[{ category: { id, name }, foods }]，顺序与分类顺序一致 */
export function getFoodGroupsByMerchantId(merchantId) {
  const categories = getCategoriesByMerchantId(merchantId);
  const foods = getFoodsByMerchantId(merchantId);
  return categories.map((cat) => ({
    category: { id: cat.id, name: cat.name },
    foods: foods.filter((f) => f.categoryId === cat.id),
  }));
}

export function getMerchantById(id) {
  return MOCK_MERCHANTS.find((m) => m.id === Number(id));
}

export function getFoodById(id) {
  return MOCK_FOODS.find((f) => f.id === Number(id));
}

/** 评级 1-5 对应文案 */
export const RATING_LABELS = {
  1: '拉完了 just soso',
  2: 'NPC ordinary',
  3: '顶级 excellent',
  4: '人上人 great',
  5: '夯爆了 amazing',
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
