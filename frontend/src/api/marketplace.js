import { del, get, post, patch } from './request';

export function getMarketplaceCategories() {
  return get('/api/marketplace/categories');
}

export function listMarketplaceItems(params = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.status) qs.set('status', params.status);
  if (params.priceMin != null && params.priceMin !== '') qs.set('priceMin', String(params.priceMin));
  if (params.priceMax != null && params.priceMax !== '') qs.set('priceMax', String(params.priceMax));
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/marketplace/items${query ? `?${query}` : ''}`);
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

export function updateMarketplaceItemStatus(id, status) {
  return post(`/api/marketplace/items/${id}/status`, { status });
}

export function deleteMarketplaceItem(id) {
  return del(`/api/marketplace/items/${id}`);
}

