/**
 * P1-17 · 食堂切片（`S-07` → `S-10`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：六个规范化器、**五档评分枚举**、**`null` 是常态（G17）**、评论合并去重、分页夹紧
 *   S-1 页面：四页链路（区域 → 店铺 → 菜品 → 详情）、**匿名投影**、筛选 vs 导航、翻页
 *   S-5 结构约束：⛔ 不用 `StarRating`（§7-13）、⛔ 不拼接口路径、⛔ 分类不当导航
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor, within } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { ToastProvider } from '@/components/ui/Toast';
import { Text } from '@/components/ui/Text';

import {
  CANTEEN_CACHE_TTL_MS,
  CANTEEN_RATING_TIERS,
  CANTEEN_RATING_WEIGHTS,
  COMMENT_PAGE_SIZE_MAX,
  canteenCacheKey,
  commentPageParams,
  isRatingTier,
  mergeCommentPages,
  normalizeCommentPage,
  normalizeComments,
  normalizeProductDetail,
  normalizeProducts,
  normalizeRegions,
  normalizeShopDetail,
  normalizeShops,
  ratingTierLabelKey,
} from '@/features/square/canteen';

jest.mock('../../../shared/api/canteen', () => ({
  getRegions: jest.fn(),
  getShopsByRegion: jest.fn(),
  getRegionTopProducts: jest.fn(),
  getShop: jest.fn(),
  getProducts: jest.fn(),
  getShopHotProducts: jest.fn(),
  getProduct: jest.fn(),
  getProductCommentsRaw: jest.fn(),
  pickRandomMeal: jest.fn(),
}));
jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[], params: {} as Record<string, string> };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      back: () => undefined,
      canGoBack: () => false,
      replace: () => undefined,
    }),
    useLocalSearchParams: () => state.params,
  };
});

const api = require('../../../shared/api/canteen') as Record<string, jest.Mock>;
const routerState = require('expo-router').__state as {
  pushed: unknown[];
  params: Record<string, string>;
};

const SQUARE_DIR = path.resolve(__dirname, '../features/square');
const readSquare = (file: string): string => fs.readFileSync(path.join(SQUARE_DIR, file), 'utf8');
const APP_DIR = path.resolve(__dirname, '../app');
const readApp = (file: string): string => fs.readFileSync(path.join(APP_DIR, file), 'utf8');

const CanteenHome = require('../features/square/CanteenHome').CanteenHome as () => React.ReactElement;
const RegionShops = require('../features/square/RegionShops').RegionShops as () => React.ReactElement;
const ShopMenu = require('../features/square/ShopMenu').ShopMenu as () => React.ReactElement;
const DishDetail = require('../features/square/DishDetail').DishDetail as () => React.ReactElement;

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <ToastProvider>{node}</ToastProvider>
);

/** 一条普通评论：**服务端对普通用户强制匿名**（昵称/头像恒为 null） */
const ANON_COMMENT = {
  id: 1,
  product_id: 7,
  user_id: 3,
  parent_id: null,
  rating: '夯爆了',
  content: '很好吃',
  created_at: '2026-10-01 12:00:00',
  author: { nickname: null, avatar: null },
  images: [],
};

/** 商家回复：**只有它**才带昵称/头像 */
const MERCHANT_REPLY = {
  id: 2,
  product_id: 7,
  user_id: 9,
  parent_id: 1,
  rating: null,
  content: '谢谢支持',
  created_at: '2026-10-01 13:00:00',
  author: { nickname: '王老板', avatar: 'https://cdn.example.com/a.png' },
  images: [],
};

const PRODUCT = {
  id: 7,
  shop_id: 2,
  category_id: 1,
  category_name: '主食',
  name: '麻辣香锅',
  description: '够辣',
  price: 12.5,
  comprehensive_score: 8.2,
  review_count: 3,
  images: [{ url: 'https://cdn.example.com/p.png', sort_order: 0 }],
};

beforeEach(() => {
  for (const key of Object.keys(api)) api[key].mockReset();
  routerState.pushed.length = 0;
  routerState.params = {};
});

describe('TC-P1-17-1A · 五个档位与 `null` 是常态（纯函数）', () => {
  it('档位镜像服务端 `RATING_ENUM`，权重与服务端 `CASE` 一致', () => {
    expect(CANTEEN_RATING_TIERS).toEqual(['夯爆了', '顶级', '人上人', 'NPC', '拉完了']);
    expect(CANTEEN_RATING_WEIGHTS['夯爆了']).toBe(10);
    expect(CANTEEN_RATING_WEIGHTS['拉完了']).toBe(-1);
    expect(isRatingTier('顶级')).toBe(true);
    expect(isRatingTier('五星')).toBe(false);
  });

  it('档位 → 词条 key；⛔ 非法档位返回 `null`（不硬塞一个默认档）', () => {
    expect(ratingTierLabelKey('夯爆了')).toBe('canteen.rating.hot');
    expect(ratingTierLabelKey('拉完了')).toBe('canteen.rating.dead');
    expect(ratingTierLabelKey('五星')).toBeNull();
    expect(ratingTierLabelKey(null)).toBeNull();
  });

  it('⛔ **`price`/`comprehensive_score`/`review_count` 全可能是 `null`**（G17）→ 保留 `null`，⛔ 不变成 0', () => {
    const [product] = normalizeProducts([
      { id: 1, name: 'A', price: null, comprehensive_score: null, review_count: null },
    ]);
    expect(product.price).toBeNull();
    expect(product.score).toBeNull();
    expect(product.reviewCount).toBeNull();
    // ⚠️ **整个字段可以不存在**（服务端缺列时会换一条不含这些列的 SQL）
    const [bare] = normalizeProducts([{ id: 2, name: 'B' }]);
    expect(bare.price).toBeNull();
    expect(bare.score).toBeNull();
  });

  it('`normalizeRegions`/`normalizeShops`：缺 id/name 的项被丢掉（⛔ 不画空行）', () => {
    expect(normalizeRegions([{ id: 1, code: 'D6', name: 'D6 区' }, { name: 'x' }])).toEqual([
      { id: 1, code: 'D6', name: 'D6 区' },
    ]);
    const shops = normalizeShops([{ id: 2, name: '阿婆粉' }, { id: null, name: 'x' }]);
    expect(shops).toHaveLength(1);
    // ⚠️ `logo`/`opening_hours` **可能整个没有**（服务端会回落到不含它们的查询）
    expect(shops[0].logo).toBeNull();
    expect(shops[0].openingHours).toBeNull();
  });

  it('`normalizeShopDetail`：分类列表与 `product_count` 都可缺', () => {
    const shop = normalizeShopDetail({
      id: 2,
      name: '阿婆粉',
      categories: [{ id: 1, name: '主食' }, { name: 'x' }],
    });
    expect(shop?.categories).toEqual([{ id: 1, name: '主食' }]);
    expect(shop?.productCount).toBeNull();
    expect(normalizeShopDetail(null)).toBeNull();
  });
});

describe('TC-P1-17-2A · 评论：匿名投影 + 分页 + 合并去重', () => {
  it('普通评论**没有**昵称/头像（宪法 4.1.1 匿名投影）；商家回复才有', () => {
    const [anon, reply] = normalizeComments([ANON_COMMENT, MERCHANT_REPLY]);
    expect(anon.authorNickname).toBeNull();
    expect(anon.isMerchantReply).toBe(false);
    expect(reply.authorNickname).toBe('王老板');
    expect(reply.isMerchantReply).toBe(true);
    // 回复没有评分（服务端就是这么存的）
    expect(reply.rating).toBeNull();
  });

  it('评分只认五档枚举：非法值归 `null`（⛔ 不显示成档位）', () => {
    const [comment] = normalizeComments([{ ...ANON_COMMENT, rating: '五星好评' }]);
    expect(comment.rating).toBeNull();
  });

  it('详情接口**自带第一页评论**（形状与分页接口相同）', () => {
    const detail = normalizeProductDetail({
      ...PRODUCT,
      comments: { list: [ANON_COMMENT], hasMore: true, page: 1, pageSize: 10 },
    });
    expect(detail?.product.name).toBe('麻辣香锅');
    expect(detail?.comments.list).toHaveLength(1);
    expect(detail?.comments.hasMore).toBe(true);
  });

  it('`comments` 缺失时给空页（⛔ 不 null 掉整个详情）', () => {
    const detail = normalizeProductDetail({ ...PRODUCT });
    expect(detail?.comments).toEqual({ list: [], hasMore: false, page: 1, pageSize: 10 });
  });

  it('`normalizeCommentPage`：畸形 → `null`', () => {
    expect(normalizeCommentPage(null)).toBeNull();
    expect(normalizeCommentPage({ list: 'x' })).toBeNull();
    expect(normalizeCommentPage({ list: [] })?.page).toBe(1);
  });

  it('⛔ 合并去重：`created_at ASC` 的列表在翻页时会整体后移 → 必须按 id 去重', () => {
    const first = normalizeComments([ANON_COMMENT]);
    const second = normalizeComments([ANON_COMMENT, MERCHANT_REPLY]);
    const merged = mergeCommentPages(first, second);
    expect(merged.map((c) => c.id)).toEqual([1, 2]);
  });

  it('分页参数夹紧：`page ≥ 1`、`pageSize ≤ 50`（服务端 `Math.min(50, …)`）', () => {
    expect(COMMENT_PAGE_SIZE_MAX).toBe(50);
    expect(commentPageParams(0, 999)).toEqual({ page: 1, pageSize: 50 });
    expect(commentPageParams(3, 20)).toEqual({ page: 3, pageSize: 20 });
  });

  it('缓存 TTL **镜像服务端**（区域 10min / 榜单 30s），key 带作用域', () => {
    expect(CANTEEN_CACHE_TTL_MS.regions).toBe(10 * 60 * 1000);
    expect(CANTEEN_CACHE_TTL_MS.rankings).toBe(30 * 1000);
    expect(canteenCacheKey('regions')).toBe('canteen:regions:all');
    expect(canteenCacheKey('shop', 2)).toBe('canteen:shop:2');
  });
});

describe('TC-P1-17-3A · S-07 食堂首页', () => {
  it('区域网格：渲染并按 id 跳 `S-08`', async () => {
    api.getRegions.mockResolvedValue([{ id: 1, code: 'D6', name: 'D6 区' }]);
    const view = await renderApp(withProviders(<CanteenHome />));
    await waitFor(() => expect(view.getByTestId('canteen-regions')).toBeTruthy());
    expect(view.getByText('D6 区')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('canteen-regions-1'));
    expect(routerState.pushed[0]).toEqual({
      pathname: '/canteen/region/[id]',
      params: { id: '1', name: 'D6 区' },
    });
  });

  it('没有区域 → 空态（⛔ 不留死屏）', async () => {
    api.getRegions.mockResolvedValue([]);
    const view = await renderApp(withProviders(<CanteenHome />));
    await waitFor(() => expect(view.getByTestId('canteen-empty')).toBeTruthy());
  });

  it('「今天吃什么」抽到菜 → 跳详情', async () => {
    api.getRegions.mockResolvedValue([]);
    api.pickRandomMeal.mockResolvedValue({ id: 7, name: '麻辣香锅' });
    const view = await renderApp(withProviders(<CanteenHome />));
    await waitFor(() => expect(view.getByTestId('canteen-pick')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('canteen-pick'));
    await waitFor(() =>
      expect(routerState.pushed).toContainEqual({
        pathname: '/canteen/product/[id]',
        params: { id: '7' },
      })
    );
  });

  it('⛔ 抽不到（返回空）→ **不假装跳转**，如实给回执', async () => {
    api.getRegions.mockResolvedValue([]);
    api.pickRandomMeal.mockResolvedValue(null);
    const view = await renderApp(withProviders(<CanteenHome />));
    await waitFor(() => expect(view.getByTestId('canteen-pick')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('canteen-pick'));
    await waitFor(() => expect(api.pickRandomMeal).toHaveBeenCalled());
    expect(routerState.pushed).toHaveLength(0);
  });

  it('⛔ 本轮不做广告位（`/banners`）：本页**代码**里不引用 `BannerSlot`（避免第二套 link_type 解析）', () => {
    // ⚠️ 先剥注释：源码注释里正是在**解释"为什么不做广告位"**
    const code = stripComments(readSquare('CanteenHome.tsx'));
    expect(code).not.toContain('BannerSlot');
    expect(code).not.toContain('getCanteenBanners');
  });
});

describe('TC-P1-17-4A · S-08 区域店铺', () => {
  beforeEach(() => {
    routerState.params = { id: '1' };
  });

  it('店铺列表 + 本区热销（两个接口都会打）', async () => {
    api.getShopsByRegion.mockResolvedValue([
      { id: 2, name: '阿婆粉', region_id: 1, region_name: 'D6 区', opening_hours: '10:00-20:00' },
    ]);
    api.getRegionTopProducts.mockResolvedValue([
      { id: 7, name: '麻辣香锅', rank: 1, comprehensive_score: 8.2, shop_name: '阿婆粉' },
    ]);
    const view = await renderApp(withProviders(<RegionShops />));
    await waitFor(() => expect(view.getByTestId('region-shops-list')).toBeTruthy());
    expect(api.getShopsByRegion).toHaveBeenCalledWith(1);
    expect(api.getRegionTopProducts).toHaveBeenCalledWith(1, { limit: 10 });
    // ⚠️ 店名会同时出现在列表项与榜单行的副标题里 → **按卡片范围**断言，⛔ 不全局找文本
    expect(within(view.getByTestId('region-shop-2')).getByText('阿婆粉')).toBeTruthy();
    expect(within(view.getByTestId('region-top-7')).getByText('阿婆粉')).toBeTruthy();
    expect(view.getByTestId('region-top-7')).toBeTruthy();
  });

  it('⛔ 榜单里分数为 `null` → 显示"暂无评分"，⛔ 不显示 0 分', async () => {
    api.getShopsByRegion.mockResolvedValue([]);
    api.getRegionTopProducts.mockResolvedValue([{ id: 9, name: '冷面', rank: 1, comprehensive_score: null }]);
    const view = await renderApp(withProviders(<RegionShops />));
    await waitFor(() => expect(view.getByTestId('region-top-9')).toBeTruthy());
    const row = within(view.getByTestId('region-top-9'));
    expect(row.getByText('暂无评分')).toBeTruthy();
    expect(row.queryByText('0 分')).toBeNull();
  });

  it('点店铺 → 跳 `S-09`', async () => {
    api.getShopsByRegion.mockResolvedValue([{ id: 2, name: '阿婆粉' }]);
    api.getRegionTopProducts.mockResolvedValue([]);
    const view = await renderApp(withProviders(<RegionShops />));
    await waitFor(() => expect(view.getByTestId('region-shop-2')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('region-shop-2'));
    expect(routerState.pushed).toContainEqual({
      pathname: '/canteen/shop/[id]',
      params: { id: '2' },
    });
  });

  it('⛔ 非法 id 不发请求（直接在渲染期打接口会打出一个 400）', async () => {
    routerState.params = { id: 'abc' };
    api.getShopsByRegion.mockResolvedValue([]);
    api.getRegionTopProducts.mockResolvedValue([]);
    const view = await renderApp(withProviders(<RegionShops />));
    // 等它落到空态（说明首屏已经结束），再断言**两个接口都没被打**
    await waitFor(() => expect(view.getByTestId('region-shops-list')).toBeTruthy());
    expect(api.getShopsByRegion).not.toHaveBeenCalled();
    expect(api.getRegionTopProducts).not.toHaveBeenCalled();
  });
});

describe('TC-P1-17-5A · S-09 店铺菜品：分类是**筛选**不是导航', () => {
  beforeEach(() => {
    routerState.params = { id: '2' };
    api.getShop.mockResolvedValue({
      id: 2,
      name: '阿婆粉',
      opening_hours: '10:00-20:00',
      categories: [{ id: 1, name: '主食' }, { id: 2, name: '饮料' }],
      product_count: 2,
    });
    api.getShopHotProducts.mockResolvedValue([]);
  });

  it('店铺信息 + 分类 + 菜品列表', async () => {
    api.getProducts.mockResolvedValue([PRODUCT]);
    const view = await renderApp(withProviders(<ShopMenu />));
    await waitFor(() => expect(view.getByTestId('shop-products')).toBeTruthy());
    expect(view.getByText('阿婆粉')).toBeTruthy();
    expect(view.getByText('10:00-20:00')).toBeTruthy();
    expect(view.getByTestId('shop-product-7')).toBeTruthy();
  });

  it('⛔ 切分类**不改路由**，只把 `category_id` 传给同一个接口（导航 Tab ≠ 筛选）', async () => {
    api.getProducts.mockResolvedValue([PRODUCT]);
    const view = await renderApp(withProviders(<ShopMenu />));
    await waitFor(() => expect(view.getByTestId('shop-category-1')).toBeTruthy());
    expect(api.getProducts).toHaveBeenLastCalledWith(2, {});
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('shop-category-1'));
    await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(2, { category_id: 1 }));
    // ⛔ 没有发生任何路由跳转
    expect(routerState.pushed).toHaveLength(0);
  });

  it('「全部」把筛选清回去', async () => {
    api.getProducts.mockResolvedValue([PRODUCT]);
    const view = await renderApp(withProviders(<ShopMenu />));
    await waitFor(() => expect(view.getByTestId('shop-category-all')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('shop-category-2'));
    await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(2, { category_id: 2 }));
    await user.press(view.getByTestId('shop-category-all'));
    await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(2, {}));
  });

  it('本店热门用 `/hot-products`，且分数 `null` → "暂无评分"', async () => {
    api.getProducts.mockResolvedValue([]);
    api.getShopHotProducts.mockResolvedValue([{ id: 7, name: '麻辣香锅', rank: 1 }]);
    const view = await renderApp(withProviders(<ShopMenu />));
    await waitFor(() => expect(view.getByTestId('shop-hot-7')).toBeTruthy());
    expect(within(view.getByTestId('shop-hot-7')).getByText('暂无评分')).toBeTruthy();
  });

  it('点菜品 → 跳 `S-10`', async () => {
    api.getProducts.mockResolvedValue([PRODUCT]);
    const view = await renderApp(withProviders(<ShopMenu />));
    await waitFor(() => expect(view.getByTestId('shop-product-7')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('shop-product-7'));
    expect(routerState.pushed).toContainEqual({
      pathname: '/canteen/product/[id]',
      params: { id: '7' },
    });
  });
});

describe('TC-P1-17-6A · S-10 菜品详情', () => {
  beforeEach(() => {
    routerState.params = { id: '7' };
    api.getProduct.mockResolvedValue({
      ...PRODUCT,
      comments: { list: [ANON_COMMENT, MERCHANT_REPLY], hasMore: false, page: 1, pageSize: 10 },
    });
  });

  it('⛔ 进详情页**只打一次**请求（详情接口自带第一页评论）', async () => {
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-images')).toBeTruthy());
    expect(api.getProduct).toHaveBeenCalledTimes(1);
    expect(api.getProductCommentsRaw).not.toHaveBeenCalled();
  });

  it('评分显示为**档位标签**（⛔ 不是星星 —— §7-13）', async () => {
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-comment-1-tier')).toBeTruthy());
    expect(within(view.getByTestId('dish-comment-1-tier')).getByText('夯爆了')).toBeTruthy();
  });

  it('⛔ **匿名投影**：普通评论显示"匿名"，商家回复才显示昵称', async () => {
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-comment-1')).toBeTruthy());
    const anon = within(view.getByTestId('dish-comment-1'));
    expect(anon.getByText('匿名')).toBeTruthy();
    const reply = within(view.getByTestId('dish-comment-2'));
    expect(reply.getByText('王老板')).toBeTruthy();
  });

  it('⛔ 指标为 `null` 时显示"暂无"，⛔ 不显示 0 / RM 0', async () => {
    api.getProduct.mockResolvedValue({
      ...PRODUCT,
      price: null,
      comprehensive_score: null,
      review_count: null,
      comments: { list: [], hasMore: false, page: 1, pageSize: 10 },
    });
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-price')).toBeTruthy());
    // ⚠️ testID 就挂在 `Text` 上 → 断言它自己的文本，⛔ 不用 `within` 找子节点
    expect(view.getByTestId('dish-price').props.children).toBe('暂无');
    expect(view.getByTestId('dish-score').props.children).toBe('暂无评分');
    expect(view.getByTestId('dish-review-count').props.children).toBe('暂无');
  });

  it('没有评论 → 空态文案（⛔ 不留白）', async () => {
    api.getProduct.mockResolvedValue({
      ...PRODUCT,
      comments: { list: [], hasMore: false, page: 1, pageSize: 10 },
    });
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-no-comments')).toBeTruthy());
  });

  it('还有更多 → 出现「加载更多」，点了打**分页接口**并追加去重', async () => {
    api.getProduct.mockResolvedValue({
      ...PRODUCT,
      comments: { list: [ANON_COMMENT], hasMore: true, page: 1, pageSize: 10 },
    });
    api.getProductCommentsRaw.mockResolvedValue({
      list: [ANON_COMMENT, MERCHANT_REPLY],
      hasMore: false,
      page: 2,
      pageSize: 10,
    });
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-load-more')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('dish-load-more'));
    await waitFor(() => expect(api.getProductCommentsRaw).toHaveBeenCalledWith(7, { page: 2, pageSize: 10 }));
    await waitFor(() => expect(view.getByTestId('dish-comment-2')).toBeTruthy());
    // 去重：第 1 条不会出现两次
    expect(view.getAllByTestId('dish-comment-1')).toHaveLength(1);
  });

  it('没有更多 → **不显示**「加载更多」', async () => {
    const view = await renderApp(withProviders(<DishDetail />));
    await waitFor(() => expect(view.getByTestId('dish-images')).toBeTruthy());
    expect(view.queryByTestId('dish-load-more')).toBeNull();
  });
});

describe('TC-P1-17-7A · 入口与结构约束', () => {
  it('`S-01` 服务入口能进食堂（出口门 E2：路由可进入）', async () => {
    const SquareScreen = require('../app/(tabs)/index').default as () => React.ReactElement;
    const view = await renderApp(<SquareScreen />);
    await waitFor(() => expect(view.getByTestId('square-services')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('square-services-canteen'));
    expect(routerState.pushed[0]).toBe('/canteen');
  });

  it('四个路由文件都在', () => {
    for (const file of [
      'canteen/index.tsx',
      'canteen/region/[id].tsx',
      'canteen/shop/[id].tsx',
      'canteen/product/[id].tsx',
    ]) {
      expect(fs.existsSync(path.join(APP_DIR, file))).toBe(true);
    }
  });

  it('⛔ 页面不拼接口路径（全走 `shared/api/canteen`）', () => {
    for (const file of ['CanteenHome.tsx', 'RegionShops.tsx', 'ShopMenu.tsx', 'DishDetail.tsx']) {
      const code = stripComments(readSquare(file));
      expect(code).toContain('shared/api/canteen');
      // ⚠️ 不能直接判 `not.toContain('/api/canteen')`：**`shared/api/canteen` 自己就含这个子串**！
      //    要判的是"有没有以 `/api/canteen` 开头的**字符串字面量**"（即自己拼路径）
      expect(code).not.toMatch(/['"`]\/api\/canteen/);
    }
  });

  it('⛔ 不用 `StarRating`（§7-13：评分是五档枚举，没有星级字段）', () => {
    for (const file of ['DishDetail.tsx', 'ShopMenu.tsx', 'RegionShops.tsx']) {
      const code = stripComments(readSquare(file));
      expect(code).not.toContain('StarRating');
    }
  });

  it('⛔ 分类走 `filterChips` 槽位，⛔ 不塞进 `tabs`（导航 Tab ≠ 筛选 Chips）', () => {
    const src = readSquare('ShopMenu.tsx');
    expect(src).toContain('filterChips');
    expect(src).not.toMatch(/\btabs=\{/);
  });

  it('⛔ 0 处 hex / 数字字号 / 自造浮层', () => {
    for (const file of ['CanteenHome.tsx', 'RegionShops.tsx', 'ShopMenu.tsx', 'DishDetail.tsx', 'canteen.ts']) {
      const src = readSquare(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
  });

  it('⛔ 去注释后 0 处中文字面量（档位值除外：它们是**服务端枚举**，必须原样比对）', () => {
    const code = stripComments(readSquare('canteen.ts')).replace(
      /'夯爆了'|'顶级'|'人上人'|'NPC'|'拉完了'|夯爆了:|顶级:|人上人:|NPC:|拉完了:/g,
      "''"
    );
    expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
  });

  it('⛔ 不新建第二套取数机制（四页共用 `useCanteenResource`）', () => {
    for (const file of ['CanteenHome.tsx', 'RegionShops.tsx', 'ShopMenu.tsx', 'DishDetail.tsx']) {
      const src = readSquare(file);
      expect(src).toContain('useCanteenResource');
      expect(src).not.toContain('useQuery');
      expect(src).not.toContain('fetch(');
    }
  });
});
