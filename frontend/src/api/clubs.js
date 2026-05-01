import { get, post, patch } from './request';

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

export function createClubActivity(clubId, body) {
  return post(`/api/clubs/${clubId}/activities`, body);
}

export function updateClubActivityStatus(activityId, status) {
  return patch(`/api/clubs/activities/${activityId}/status`, { status });
}

