import { request } from './request';

export function getCampusFavorite(postId, options = {}) {
  return request(`/api/campus-news/${encodeURIComponent(postId)}/favorite`, options);
}
export function setCampusFavorite(postId, desired, options = {}) {
  return request(`/api/campus-news/${encodeURIComponent(postId)}/favorite`, { ...options, method: desired ? 'PUT' : 'DELETE' });
}
export function getMyCampusFavorites({ page = 1, pageSize = 10 } = {}, options = {}) {
  return request(`/api/campus-news/me/favorites?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`, options);
}
