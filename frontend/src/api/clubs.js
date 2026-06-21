import { get, post, patch, del } from './request';

/** 删除社团活动（社团管理员 / 站管理员） */
export function deleteClubActivity(activityId) {
  return del(`/api/clubs/activity/${activityId}`);
}

/** 删除社团日常帖（社团管理员 / 站管理员） */
export function deleteClubPost(postId) {
  return del(`/api/clubs/post/${postId}`);
}

export function getClubTabs() {
  return get('/api/clubs/tabs');
}

export function getClubFeed(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/clubs/feed${query ? `?${query}` : ''}`);
}

export function listClubActivities(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/clubs/activities${query ? `?${query}` : ''}`);
}

export function listClubs(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', String(params.q));
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/clubs/list${query ? `?${query}` : ''}`);
}

export function listClubPosts(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/clubs/posts${query ? `?${query}` : ''}`);
}

export function getClubProfile(id) {
  return get(`/api/clubs/${id}`);
}

export function getActivityDetail(id) {
  return get(`/api/clubs/activity/${id}`);
}

export function getActivityRegistrationStatus(id) {
  return get(`/api/clubs/activities/${id}/registration-status`);
}

export function registerClubActivity(id) {
  return post(`/api/clubs/activities/${id}/register`, {});
}

export function cancelClubActivityRegistration(id) {
  return del(`/api/clubs/activities/${id}/register`);
}

export function getClubPostDetail(id) {
  return get(`/api/clubs/post/${id}`);
}

/** 社团活动评论列表（树形：一级 + replies） */
export function getClubActivityComments(activityId) {
  return get(`/api/clubs/activity/${activityId}/comments`);
}

/** 社团日常帖评论列表 */
export function getClubPostComments(postId) {
  return get(`/api/clubs/post/${postId}/comments`);
}

/** 发表评论：一级不传 parent_id；回复一级传 parent_id 为该条 id */
export function createClubActivityComment(activityId, body) {
  const { content, parent_id } = body || {};
  if (!content || !String(content).trim()) throw new Error('评论内容不能为空');
  const payload = { content: String(content).trim() };
  if (parent_id != null) payload.parent_id = parent_id;
  return post(`/api/clubs/activity/${activityId}/comments`, payload);
}

export function createClubPostComment(postId, body) {
  const { content, parent_id } = body || {};
  if (!content || !String(content).trim()) throw new Error('评论内容不能为空');
  const payload = { content: String(content).trim() };
  if (parent_id != null) payload.parent_id = parent_id;
  return post(`/api/clubs/post/${postId}/comments`, payload);
}

export function deleteClubActivityComment(activityId, commentId) {
  return del(`/api/clubs/activity/${activityId}/comments/${commentId}`);
}

export function deleteClubPostComment(postId, commentId) {
  return del(`/api/clubs/post/${postId}/comments/${commentId}`);
}

export function trackClubView(targetType, targetId) {
  return post('/api/clubs/views', { targetType, targetId });
}

export function toggleClubLike(targetType, targetId) {
  return post('/api/clubs/likes/toggle', { targetType, targetId });
}

export function toggleClubFollow(clubId) {
  return post(`/api/clubs/${clubId}/follow`, {});
}

export function listMyClubs() {
  return get('/api/clubs/me/clubs');
}

export function searchUsersByEmailForClub(clubId, email) {
  const qs = new URLSearchParams();
  if (email) qs.set('email', String(email));
  const query = qs.toString();
  return get(`/api/clubs/${clubId}/users/search${query ? `?${query}` : ''}`);
}

export function createClub(formData) {
  return post('/api/clubs', formData);
}

export function updateClub(clubId, formData) {
  return patch(`/api/clubs/${clubId}`, formData);
}

export function addClubMember(clubId, email, role = 'member') {
  return post(`/api/clubs/${clubId}/members`, { email, role });
}

/**
 * 发布社团活动。支持 JSON（无图）或 FormData（字段 + 最多 4 张 images 文件）。
 * @param {number} clubId
 * @param {Record<string, string|undefined>} fields - title, summary, location, signupLink, tag, time, endTime, status
 * @param {File[]} [imageFiles]
 */
export function createClubActivity(clubId, fields, imageFiles = []) {
  const files = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
  if (files.length === 0) {
    return post(`/api/clubs/${clubId}/activities`, fields);
  }
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v != null && v !== '') fd.append(k, String(v));
  });
  files.slice(0, 4).forEach((f) => fd.append('images', f));
  return post(`/api/clubs/${clubId}/activities`, fd);
}

export function updateClubActivityStatus(activityId, status) {
  return patch(`/api/clubs/activities/${activityId}/status`, { status });
}

/**
 * 发布社团日常帖（管理员）。无图走 JSON，有图走 FormData + images。
 */
export function createClubPost(clubId, fields, imageFiles = []) {
  const files = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
  if (files.length === 0) {
    return post(`/api/clubs/${clubId}/posts`, fields);
  }
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v != null && v !== '') fd.append(k, String(v));
  });
  files.slice(0, 4).forEach((f) => fd.append('images', f));
  return post(`/api/clubs/${clubId}/posts`, fd);
}

