/**
 * 广场系统 API（热搜 + 校园此刻）
 */
import { get, post, patch, del } from './request';

// ---------- 热搜 ----------
export function getTrendingTopics() {
  return get('/api/square/trending');
}

export function getTrendingTopicDetail(id) {
  return get(`/api/square/trending/${id}`);
}

export function getTrendingPosts(id, options = {}) {
  const { page = 1, pageSize = 10 } = options;
  return get(`/api/square/trending/${id}/posts?page=${page}&pageSize=${pageSize}`);
}

export function postTrendingPost(id, body) {
  return post(`/api/square/trending/${id}/posts`, body);
}

// Admin
export function createTrendingTopic(body) {
  return post('/api/square/trending', body);
}

export function updateTrendingTopic(id, body) {
  return patch(`/api/square/trending/${id}`, body);
}

export function deleteTrendingTopic(id) {
  return del(`/api/square/trending/${id}`);
}

// ---------- 校园此刻 ----------
export function getCampusFeed(options = {}) {
  const { tab = 'school', page = 1, pageSize = 10 } = options;
  return get(`/api/square/campus-feed?tab=${tab}&page=${page}&pageSize=${pageSize}`);
}

export function postCampusPost(body) {
  return post('/api/square/campus-posts', body);
}

export function getCampusPostDetail(id) {
  return get(`/api/square/campus-posts/${id}`);
}

// ---------- 广场轮播 ----------
export function getSquareBanners() {
  return get('/api/square/banners');
}

export function createSquareBanner(body) {
  return post('/api/square/banners', body);
}

export function updateSquareBanner(id, body) {
  return patch(`/api/square/banners/${id}`, body);
}

export function deleteSquareBanner(id) {
  return del(`/api/square/banners/${id}`);
}
