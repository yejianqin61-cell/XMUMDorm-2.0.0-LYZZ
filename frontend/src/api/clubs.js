import { get, post } from './request';

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

export function getClubPostDetail(id) {
  return get(`/api/clubs/post/${id}`);
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

