/**
 * 广场系统 API（热搜 + 校园此刻）
 */
import { get, post, patch, del, request } from './request';

export function getSquareHomeSummary() {
  return get('/api/square/home-summary');
}

export function getSquarePersonalizedSummary() {
  return get('/api/square/personalized-summary');
}

export function getSquareRecommendations() {
  return get('/api/square/recommendations');
}

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

export function getCampusPostComments(postId, options = {}) {
  const { cursor, limit = 20, ...requestOptions } = options;
  const params = new URLSearchParams({view:'threads',limit:String(limit)});
  if(cursor) params.set('cursor',cursor);
  return get(`/api/square/campus-posts/${encodeURIComponent(postId)}/comments?${params}`,requestOptions);
}

export function postCampusPostComment(postId, body, requestKey, options = {}) {
  if(!requestKey) throw new TypeError('评论提交必须提供稳定请求UUID');
  return post(`/api/square/campus-posts/${encodeURIComponent(postId)}/comments`,body,{...options,headers:{...options.headers,'Idempotency-Key':requestKey}});
}
export function getCampusCommentReplies(postId,rootId,options={}) {
  const {cursor,limit=20,...requestOptions}=options;
  const params=new URLSearchParams({limit:String(limit)});if(cursor)params.set('cursor',cursor);
  return get(`/api/square/campus-posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(rootId)}/replies?${params}`,requestOptions);
}
export function deleteCampusComment(postId,commentId,reason,options={}) {
  return request(`/api/square/campus-posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,{...options,method:'DELETE',body:reason?{reason}:{}});
}

/** @deprecated External transition only: non-idempotent. Use setCampusLike. */
export function likeCampusPost(postId) {
  return post(`/api/square/campus-posts/${postId}/like`, {});
}

export function getCampusInteractions(postId, options = {}) {
  return get(`/api/square/campus-posts/${encodeURIComponent(postId)}/interactions`, options);
}

export function setCampusLike(postId, liked, options = {}) {
  if (typeof liked !== 'boolean') throw new TypeError('点赞状态必须为布尔值');
  const path = `/api/square/campus-posts/${encodeURIComponent(postId)}/like`;
  return request(path, { ...options, method: liked ? 'PUT' : 'DELETE' });
}

// ---------- 广场轮播 ----------
export function getSquareBanners() {
  return get('/api/square/banners');
}

export function getSquareBannersAdmin() {
  return get('/api/square/banners/admin');
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
