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

export function postTrendingPost(id, body, files) {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', body.content || '');
    files.forEach((f) => form.append('images', f));
    return post(`/api/square/trending/${id}/posts`, form);
  }
  return post(`/api/square/trending/${id}/posts`, body);
}

// 热搜帖子详情
export function getTrendingPostDetail(postId) {
  return get(`/api/square/trending/posts/${postId}`);
}

// 热搜帖子评论
export function getTrendingPostComments(postId) {
  return get(`/api/square/trending/posts/${postId}/comments`);
}

export function postTrendingPostComment(postId, body) {
  return post(`/api/square/trending/posts/${postId}/comments`, body);
}

// 热搜帖子点赞
export function likeTrendingPost(postId) {
  return post(`/api/square/trending/posts/${postId}/like`, {});
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

export function postCampusPost(body, files) {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('organization_id', body.organization_id);
    form.append('feed_tab', body.feed_tab);
    form.append('title', body.title || '');
    form.append('content', body.content || '');
    files.forEach((f) => form.append('images', f));
    return post('/api/square/campus-posts', form);
  }
  return post('/api/square/campus-posts', body);
}

export function getCampusPostDetail(id) {
  return get(`/api/square/campus-posts/${id}`);
}

export function getCampusPostComments(postId) {
  return get(`/api/square/campus-posts/${postId}/comments`);
}

export function postCampusPostComment(postId, body) {
  return post(`/api/square/campus-posts/${postId}/comments`, body);
}

export function likeCampusPost(postId) {
  return post(`/api/square/campus-posts/${postId}/like`, {});
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

export function createSquareBannerForm(payload, imageFile) {
  if (imageFile) {
    const form = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v != null && v !== '') form.append(k, v);
    });
    form.append('image', imageFile);
    return post('/api/square/banners', form);
  }
  return post('/api/square/banners', payload);
}

export function updateSquareBannerForm(id, payload, imageFile) {
  if (imageFile) {
    const form = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v != null && v !== '') form.append(k, v);
    });
    form.append('image', imageFile);
    return patch(`/api/square/banners/${id}`, form);
  }
  return patch(`/api/square/banners/${id}`, payload);
}
