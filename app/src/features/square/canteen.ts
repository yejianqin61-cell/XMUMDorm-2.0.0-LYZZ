/**
 * 食堂（P1-17 · `S-07`…`S-10`）—— 纯逻辑、规范化与缓存口径
 *
 * ## 接口都是**公开**的（无需登录）
 * `routes/canteen.js` 里这些读接口**没有** `authenticateToken`：`/regions`、
 * `/regions/:id/shops`、`/regions/:id/top-products`、`/shops/:id`、`/shops/:id/products`、
 * `/shops/:id/hot-products`、`/products/:id`、`/products/:id/comments`。
 * 所以本切片**不依赖** P1-13 的令牌；写路径（发评论、收藏）才需要（本轮不做，见 §风险）。
 *
 * ## ⚠️ 三处"文档与数据模型不符"（README §7-2/3/4/13）
 * | 页面清单写的 | 实际 |
 * |---|---|
 * | `/regions/:id/ranking` | `GET /regions/:regionId/top-products?limit=`（`routes/canteen.js:545`） |
 * | `/shops/:id/hot` | `GET /shops/:shopId/hot-products`（`:1054`） |
 * | `/products/:id/reviews` | `GET /products/:productId/comments`（`:1539`）—— **详情接口本身就带第一页评论** |
 * | `S-10` 的 `StarRating`（1–5 星） | 评论的评分是**五档中文枚举** `RATING_ENUM`（`:37`），权重 `10/7/4/1/−1` 由服务端算综合分 |
 * → 所以评分**不画星星**，画**档位标签**（`canteen.rating.*` 词条已存在）。
 *
 * ## `null` 是常态（登记项 `G17`）
 * `price` / `comprehensive_score` / `review_count` **都可能是 `null`**：既有数据原因为 `null`，
 * 也因为 `/shops/:shopId/products` 在缺列时会**换一条不含这些列的 SQL**（`:1009`）——
 * 也就是说这几个字段**可能整个不存在**。⛔ 不假设它们有值，⛔ 不用 0 冒充"没有"。
 */

import type { MessageKey } from '@/i18n/zh';

/* ────────────────────────── 评分档位 ────────────────────────── */

/** 服务端 `RATING_ENUM`（`routes/canteen.js:37`）的镜像 —— 五档，顺序即由高到低 */
export const CANTEEN_RATING_TIERS = ['夯爆了', '顶级', '人上人', 'NPC', '拉完了'] as const;
export type CanteenRatingTier = (typeof CANTEEN_RATING_TIERS)[number];

/** 各档权重（服务端算综合分用的 `CASE`，`:313`）—— 界面用它排序/展示权重 */
export const CANTEEN_RATING_WEIGHTS: Record<CanteenRatingTier, number> = {
  夯爆了: 10,
  顶级: 7,
  人上人: 4,
  NPC: 1,
  拉完了: -1,
};

const TIER_KEYS: Record<CanteenRatingTier, MessageKey> = {
  夯爆了: 'canteen.rating.hot',
  顶级: 'canteen.rating.top',
  人上人: 'canteen.rating.above',
  NPC: 'canteen.rating.npc',
  拉完了: 'canteen.rating.dead',
};

export function isRatingTier(value: unknown): value is CanteenRatingTier {
  return typeof value === 'string' && (CANTEEN_RATING_TIERS as readonly string[]).includes(value);
}

/** 档位 → 词条 key（纯函数）；⛔ 不是合法档位就返回 `null`（由调用方决定不显示） */
export function ratingTierLabelKey(value: unknown): MessageKey | null {
  return isRatingTier(value) ? TIER_KEYS[value] : null;
}

/* ────────────────────────── 通用取值护栏 ────────────────────────── */

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function asId(value: unknown): number | null {
  const n = asNumber(value);
  return n === null ? null : Math.trunc(n);
}
function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/* ────────────────────────── S-07：区域 ────────────────────────── */

export type CanteenRegion = {
  id: number;
  code: string | null;
  name: string;
};

/** `GET /regions` → `[{id, code, name, sort_order}]`（按 `sort_order` 已排序） */
export function normalizeRegions(data: unknown): readonly CanteenRegion[] {
  return asArray(data)
    .map((item) => {
      const region = (item ?? {}) as Record<string, unknown>;
      const id = asId(region.id);
      const name = asString(region.name);
      if (id === null || name === null) return null;
      return { id, code: asString(region.code), name };
    })
    .filter((region): region is CanteenRegion => region !== null);
}

/* ────────────────────────── S-08：区域内的店铺 ────────────────────────── */

export type CanteenShop = {
  id: number;
  name: string;
  regionId: number | null;
  regionName: string | null;
  /**
   * ⚠️ **可能没有**：`/regions/:regionId/shops` 会先试"带 logo/opening_hours 的列"，
   * 失败就回落到不含它们的查询（`routes/canteen.js:573-584`）→ 这两个字段是**可选**的。
   */
  logo: string | null;
  openingHours: string | null;
};

export function normalizeShops(data: unknown): readonly CanteenShop[] {
  return asArray(data)
    .map((item) => {
      const shop = (item ?? {}) as Record<string, unknown>;
      const id = asId(shop.id);
      const name = asString(shop.name);
      if (id === null || name === null) return null;
      return {
        id,
        name,
        regionId: asId(shop.region_id),
        regionName: asString(shop.region_name),
        logo: asString(shop.logo),
        openingHours: asString(shop.opening_hours),
      };
    })
    .filter((shop): shop is CanteenShop => shop !== null);
}

/* ────────────────────────── 商品（`S-08`/`S-09` 共用） ────────────────────────── */

export type CanteenProduct = {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  /** `null` = **没有这个信息**（⛔ 不是 0 元） */
  price: number | null;
  /** `null` = 还没有人评分 */
  score: number | null;
  reviewCount: number | null;
  images: readonly string[];
};

export function normalizeProducts(data: unknown): readonly CanteenProduct[] {
  return asArray(data)
    .map((item): CanteenProduct | null => {
      const product = (item ?? {}) as Record<string, unknown>;
      const id = asId(product.id);
      const name = asString(product.name);
      if (id === null || name === null) return null;
      const images = asArray(product.images)
        .map((image) => asString((image as Record<string, unknown>)?.url))
        .filter((url): url is string => url !== null);
      return {
        id,
        name,
        description: asString(product.description),
        categoryId: asId(product.category_id),
        categoryName: asString(product.category_name),
        price: asNumber(product.price),
        score: asNumber(product.comprehensive_score),
        reviewCount: asNumber(product.review_count),
        images,
      };
    })
    .filter((product): product is CanteenProduct => product !== null);
}

/* ────────────────────────── S-09：店铺详情 + 分类 ────────────────────────── */

export type CanteenCategory = { id: number; name: string };

export type CanteenShopDetail = {
  id: number;
  name: string;
  regionName: string | null;
  logo: string | null;
  openingHours: string | null;
  categories: readonly CanteenCategory[];
  productCount: number | null;
};

export function normalizeShopDetail(data: unknown): CanteenShopDetail | null {
  if (data === null || typeof data !== 'object') return null;
  const shop = data as Record<string, unknown>;
  const id = asId(shop.id);
  const name = asString(shop.name);
  if (id === null || name === null) return null;
  const categories = asArray(shop.categories)
    .map((item) => {
      const category = (item ?? {}) as Record<string, unknown>;
      const categoryId = asId(category.id);
      const categoryName = asString(category.name);
      return categoryId === null || categoryName === null
        ? null
        : { id: categoryId, name: categoryName };
    })
    .filter((category): category is CanteenCategory => category !== null);
  return {
    id,
    name,
    regionName: asString(shop.region_name),
    logo: asString(shop.logo),
    openingHours: asString(shop.opening_hours),
    categories,
    productCount: asNumber(shop.product_count),
  };
}

/* ────────────────────────── S-10：评论（匿名投影） ────────────────────────── */

export type CanteenComment = {
  id: number;
  /** 五档枚举之一；`null` = 这条是**商家回复**或没带评分（回复也不带评分） */
  rating: CanteenRatingTier | null;
  content: string;
  createdAt: string | null;
  /** ⚠️ **普通用户恒为 `null`**（宪法 4.1.1 匿名投影）：服务端只对**商家回复**回填昵称/头像 */
  authorNickname: string | null;
  authorAvatar: string | null;
  /** `true` = 这是商家回复（它才显示昵称/头像） */
  isMerchantReply: boolean;
  images: readonly string[];
};

export function normalizeComments(data: unknown): readonly CanteenComment[] {
  return asArray(data)
    .map((item): CanteenComment | null => {
      const comment = (item ?? {}) as Record<string, unknown>;
      const id = asId(comment.id);
      if (id === null) return null;
      const author = (comment.author ?? {}) as Record<string, unknown>;
      const images = asArray(comment.images)
        .map((image) => asString((image as Record<string, unknown>)?.url))
        .filter((url): url is string => url !== null);
      const nickname = asString(author.nickname);
      const avatar = asString(author.avatar);
      return {
        id,
        rating: isRatingTier(comment.rating) ? comment.rating : null,
        content: asString(comment.content) ?? '',
        createdAt: asString(comment.created_at),
        authorNickname: nickname,
        authorAvatar: avatar,
        // 服务端只在"商家回复"时回填昵称/头像 → 拿它反推而不是另加字段
        isMerchantReply: nickname !== null || avatar !== null,
        images,
      };
    })
    .filter((comment): comment is CanteenComment => comment !== null);
}

export type CommentPage = {
  list: readonly CanteenComment[];
  hasMore: boolean;
  page: number;
  pageSize: number;
};

/** `comments: {list, hasMore, page, pageSize}`（**详情接口与分页接口是同一个形状**） */
export function normalizeCommentPage(data: unknown): CommentPage | null {
  if (data === null || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  if (!Array.isArray(raw.list)) return null;
  const page = asNumber(raw.page) ?? 1;
  return {
    list: normalizeComments(raw.list),
    hasMore: raw.hasMore === true,
    page: Math.max(1, Math.trunc(page)),
    pageSize: asNumber(raw.pageSize) ?? 10,
  };
}

/* ────────────────────────── S-10：菜品详情 ────────────────────────── */

export type CanteenProductDetail = {
  product: CanteenProduct;
  /** **详情接口自带第一页评论**（`routes/canteen.js:1238`）→ 进详情页只需**一次**请求 */
  comments: CommentPage;
};

export function normalizeProductDetail(data: unknown): CanteenProductDetail | null {
  if (data === null || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const product = normalizeProducts([raw])[0];
  if (!product) return null;
  const comments = normalizeCommentPage(raw.comments) ?? {
    list: [],
    hasMore: false,
    page: 1,
    pageSize: 10,
  };
  return { product, comments };
}

/* ────────────────────────── 缓存与分页口径 ────────────────────────── */

/**
 * 客户端缓存时长 —— **镜像服务端**（`routes/canteen.js` 的 `CACHE_*_TTL_MS`）：
 * 区域 10min（`:251`）、榜单 30s（见 `CACHE_RANKING_TTL_MS`）。
 * ⚠️ 为什么要镜像：服务端有缓存，客户端再用更长的 TTL 会"看起来永远不变"。
 */
export const CANTEEN_CACHE_TTL_MS = {
  regions: 10 * 60 * 1000,
  rankings: 30 * 1000,
} as const;

export function canteenCacheKey(scope: string, id: string | number = 'all'): string {
  return `canteen:${scope}:${id}`;
}

/** 服务端评论分页上限（`routes/canteen.js:1544`：`Math.min(50, …)`） */
export const COMMENT_PAGE_SIZE_MAX = 50;

/** 评论页码 → 请求参数（⛔ 不越界：`page ≥ 1`、`pageSize ≤ 50`） */
export function commentPageParams(page: number, pageSize: number): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(page)),
    pageSize: Math.max(1, Math.min(COMMENT_PAGE_SIZE_MAX, Math.trunc(pageSize))),
  };
}

/** 合并"加载更多"的评论（纯函数）：**按 id 去重**，避免服务端插入新评论导致的重复 */
export function mergeCommentPages(
  previous: readonly CanteenComment[],
  next: readonly CanteenComment[]
): readonly CanteenComment[] {
  const seen = new Set(previous.map((comment) => comment.id));
  return [...previous, ...next.filter((comment) => !seen.has(comment.id))];
}
