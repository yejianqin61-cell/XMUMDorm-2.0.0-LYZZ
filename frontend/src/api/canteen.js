/**
 * 食堂 API，与后端 /api/canteen 对应
 * 统一使用 request 工具
 */
import { API_BASE_URL, getUploadUrl } from './config';
import { get, post, patch, del, request } from './request';

// ---------- 区域与店铺 ----------
export function getRegions() {
  return get('/api/canteen/regions');
}

export function getShopsByRegion(regionId) {
  return get(`/api/canteen/regions/${regionId}/shops`);
}

export function getShop(shopId) {
  return get(`/api/canteen/shops/${shopId}`);
}

export function getShopMe() {
  return get('/api/canteen/shops/me');
}

export function createShop(body) {
  return post('/api/canteen/shops', body);
}

/**
 * 更新店铺信息。若传 logoFile 则用 FormData（name, opening_hours, logo），否则用 JSON。
 */
export function updateShop(shopId, body) {
  const { name, opening_hours, logoFile } = body || {};
  if (logoFile instanceof File || (typeof Blob !== 'undefined' && logoFile instanceof Blob)) {
    const form = new FormData();
    if (name != null) form.append('name', String(name).trim());
    if (opening_hours !== undefined) form.append('opening_hours', String(opening_hours).trim());
    form.append('logo', logoFile, logoFile instanceof File ? logoFile.name : undefined);
    return request(`/api/canteen/shops/${shopId}`, { method: 'PATCH', body: form });
  }
  return patch(`/api/canteen/shops/${shopId}`, { name, opening_hours });
}

export function deleteShop(shopId) {
  return del(`/api/canteen/shops/${shopId}`);
}

// ---------- 分类 ----------
export function getCategories(shopId) {
  return get(`/api/canteen/shops/${shopId}/categories`);
}

export function createCategory(shopId, body) {
  return post(`/api/canteen/shops/${shopId}/categories`, body);
}

export function updateCategory(categoryId, body) {
  return patch(`/api/canteen/categories/${categoryId}`, body);
}

export function deleteCategory(categoryId) {
  return del(`/api/canteen/categories/${categoryId}`);
}

// ---------- 商品 ----------
export function getProducts(shopId, options = {}) {
  const { category_id } = options;
  const q = category_id != null ? `?category_id=${category_id}` : '';
  return get(`/api/canteen/shops/${shopId}/products${q}`);
}

export function getProduct(productId) {
  return get(`/api/canteen/products/${productId}`);
}

/**
 * 创建商品（FormData: category_id, name, description, price?, images[]）
 * images 为 File 或 Blob 数组，保证逐个 append 同名字段以兼容 multipart
 */
export function createProduct(body) {
  const form = new FormData();
  if (body.category_id != null) form.append('category_id', String(body.category_id));
  if (body.name != null) form.append('name', String(body.name).trim());
  if (body.description != null) form.append('description', String(body.description).trim());
  if (body.price != null && body.price !== '') {
    form.append('price', String(Number(body.price)));
  }
  if (body.images && Array.isArray(body.images)) {
    body.images.forEach((f) => {
      if (f instanceof File || (typeof Blob !== 'undefined' && f instanceof Blob)) {
        form.append('images', f, f instanceof File ? f.name : undefined);
      }
    });
  }
  return request('/api/canteen/products', { method: 'POST', body: form });
}

export function updateProduct(productId, body) {
  return patch(`/api/canteen/products/${productId}`, body);
}

export function deleteProduct(productId) {
  return del(`/api/canteen/products/${productId}`);
}

// ---------- 商品点评 ----------
/** 原始列表（扁平），如需树形可在页面或此处再封装 */
export function getProductCommentsRaw(productId, options = {}) {
  const { page = 1, pageSize = 50 } = options;
  return get(`/api/canteen/products/${productId}/comments?page=${page}&pageSize=${pageSize}`);
}

/** 商品评论列表，转为树形并补全头像/图片 URL */
export async function getProductComments(productId, options = {}) {
  const data = await getProductCommentsRaw(productId, options);
  const list = data?.list || [];
  const top = list.filter((c) => c.parent_id == null);
  const replyList = list.filter((c) => c.parent_id != null);
  return top.map((t) => ({
    id: t.id,
    userId: t.user_id,
    authorName: t.author?.nickname || t.author?.username || '匿名 Anonymous',
    authorAvatar: t.author?.avatar ? getUploadUrl(t.author.avatar) : null,
    content: t.content,
    rating: t.rating,
    createdAt: t.created_at,
    images: (t.images || []).map((i) => (typeof i === 'string' ? i : i?.url ? getUploadUrl(i.url) : null)).filter(Boolean),
    replies: replyList
      .filter((r) => r.parent_id === t.id)
      .map((r) => ({
        id: r.id,
        userId: r.user_id,
        authorName: r.author?.nickname || r.author?.username || '匿名 Anonymous',
        authorAvatar: r.author?.avatar ? getUploadUrl(r.author.avatar) : null,
        content: r.content,
        createdAt: r.created_at,
        images: (r.images || []).map((i) => (typeof i === 'string' ? i : i?.url ? getUploadUrl(i.url) : null)).filter(Boolean),
      })),
  }));
}

/** 发表商品点评（一级或二级），FormData: rating, content, parent_id?, images[] */
export function postProductComment(productId, payload) {
  const { rating = '人上人', content = '', parent_id, imageFiles = [] } = payload || {};
  const form = new FormData();
  form.append('rating', rating);
  form.append('content', String(content).trim());
  if (parent_id != null) form.append('parent_id', String(parent_id));
  (imageFiles || []).forEach((f) => form.append('images', f));
  return request(`/api/canteen/products/${productId}/comments`, { method: 'POST', body: form });
}

export function deleteProductComment(productId, commentId) {
  return del(`/api/canteen/products/${productId}/comments/${commentId}`);
}

// ---------- 我的点评 ----------
export function getMyProductReviews(options = {}) {
  const { page = 1, pageSize = 10 } = options;
  return get(`/api/canteen/my-reviews?page=${page}&pageSize=${pageSize}`);
}

// ---------- 商品收藏 ----------
/** 当前用户是否已收藏该商品，返回 { favorited: boolean } */
export function getProductFavoriteStatus(productId) {
  return get(`/api/canteen/products/${productId}/favorite`);
}

export function addFavoriteProduct(productId) {
  return post(`/api/canteen/products/${productId}/favorite`, {});
}

export function removeFavoriteProduct(productId) {
  return del(`/api/canteen/products/${productId}/favorite`);
}

/** 我的收藏列表，用于个人主页收藏栏 */
export function getMyFavorites(options = {}) {
  const { page = 1, pageSize = 20 } = options;
  return get(`/api/canteen/my-favorites?page=${page}&pageSize=${pageSize}`);
}
