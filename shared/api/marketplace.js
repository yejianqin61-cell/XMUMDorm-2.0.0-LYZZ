import { del, get, post, patch } from './request';

export function getMarketplaceCategories() {
  return get('/api/marketplace/categories');
}

export function listMarketplaceItems(params = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  if (params.priceMin != null && params.priceMin !== '') qs.set('priceMin', String(params.priceMin));
  if (params.priceMax != null && params.priceMax !== '') qs.set('priceMax', String(params.priceMax));
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/marketplace/items${query ? `?${query}` : ''}`);
}

export function listMarketplaceMyItems(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/marketplace/me/items${query ? `?${query}` : ''}`);
}

export function listMarketplaceMyWants(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/marketplace/me/wants${query ? `?${query}` : ''}`);
}

export function getMarketplaceItemDetail(id) {
  return get(`/api/marketplace/items/${id}`);
}

export function createMarketplaceItem(formData) {
  return post('/api/marketplace/items', formData);
}

export function updateMarketplaceItem(id, body) {
  return patch(`/api/marketplace/items/${id}`, body);
}

export function toggleMarketplaceWant(id) {
  return post(`/api/marketplace/items/${id}/want`, {});
}

/** Marketplace reports use the shared moderation contract, not a domain-only route. */
export function reportMarketplaceItem(id, { reason, detail, screenshots } = {}) {
  return post('/api/reports', {
    target_type: 'marketplace',
    target_id: id,
    reason,
    detail,
    screenshots,
  });
}

export function updateMarketplaceItemStatus(id, status) {
  return post(`/api/marketplace/items/${id}/status`, { status });
}

export function deleteMarketplaceItem(id) {
  return del(`/api/marketplace/items/${id}`);
}

// =========================
// Marketplace Chat
// =========================

// 首发按钮可能因双击或网络重试在同一事件循环内触发多次。
// 同一商品、同一内容复用进行中的请求；响应失败后删除锁，不替调用方猜测是否已写入。
const pendingBuyerMessages = new Map();

export function getMarketplaceMyThreadByItem(itemId) {
  return get(`/api/marketplace/items/${itemId}/chat/thread`);
}

export function buyerSendMarketplaceMessage(itemId, content) {
  const key = `${itemId}:${String(content)}`;
  const pending = pendingBuyerMessages.get(key);
  if (pending) return pending;
  const request = post(`/api/marketplace/items/${itemId}/chat/messages`, { content });
  pendingBuyerMessages.set(key, request);
  request.finally(() => {
    if (pendingBuyerMessages.get(key) === request) pendingBuyerMessages.delete(key);
  }).catch(() => undefined);
  return request;
}

export function sellerListItemChatThreads(itemId) {
  return get(`/api/marketplace/items/${itemId}/chat/threads`);
}

export function getMarketplaceThreadMessages(threadId, params = {}) {
  const query = params.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : '';
  return get(`/api/marketplace/chat/threads/${threadId}/messages${query}`);
}

export function sendMarketplaceThreadMessage(threadId, content) {
  return post(`/api/marketplace/chat/threads/${threadId}/messages`, { content });
}

export function markMarketplaceThreadRead(threadId) {
  return post(`/api/marketplace/chat/threads/${threadId}/read`, {});
}

/**
 * 我的**全部**私信会话（买家 + 卖家两侧合并，P2B-02）
 * 返回 `{ list: [{ thread_id, item:{id,title,available}, role, peer:{id,name,avatar}, last_message_at, last_content, unread_count }] }`
 */
export function listMyChatThreads(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return get(`/api/marketplace/chat/threads${query ? `?${query}` : ''}`);
}

