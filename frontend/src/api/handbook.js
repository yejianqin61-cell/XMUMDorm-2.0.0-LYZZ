/**
 * Handbook API（/api/handbook）
 */
import { get, post, patch, del, request } from './request';

export function getHandbookTabs() {
  return get('/api/handbook/tabs');
}

export function getHandbookTags() {
  return get('/api/handbook/tags');
}

export function listHandbookArticles(params = {}) {
  const {
    tab,
    tag,
    q,
    sort,
    page = 1,
    pageSize = 10,
    includeMine,
    includeDraft,
  } = params;
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));
  if (tab) sp.set('tab', String(tab));
  if (tag) sp.set('tag', String(tag));
  if (q) sp.set('q', String(q));
  if (sort) sp.set('sort', String(sort));
  if (includeMine) sp.set('includeMine', '1');
  if (includeDraft) sp.set('includeDraft', '1');
  return get(`/api/handbook/articles?${sp.toString()}`);
}

export function getHandbookArticleDetail(id) {
  return get(`/api/handbook/articles/${id}`);
}

export function createHandbookArticle(body) {
  return post('/api/handbook/articles', body || {});
}

export function updateHandbookArticle(id, body) {
  return patch(`/api/handbook/articles/${id}`, body || {});
}

export function deleteHandbookArticle(id) {
  return del(`/api/handbook/articles/${id}`);
}

export function toggleHandbookLike(id) {
  return post(`/api/handbook/articles/${id}/like`, {});
}

export function toggleHandbookSave(id) {
  return post(`/api/handbook/articles/${id}/save`, {});
}

export function bumpHandbookShare(id) {
  return post(`/api/handbook/articles/${id}/share`, {});
}

export function listHandbookComments(id) {
  return get(`/api/handbook/articles/${id}/comments`);
}

export function createHandbookComment(id, body) {
  return post(`/api/handbook/articles/${id}/comments`, body || {});
}

export function deleteHandbookComment(articleId, commentId) {
  return del(`/api/handbook/articles/${articleId}/comments/${commentId}`);
}

export async function uploadHandbookImage(file) {
  const form = new FormData();
  form.append('image', file);
  return request('/api/handbook/upload/image', { method: 'POST', body: form });
}

export function getMySavedHandbookArticles(params = {}) {
  const { page = 1, pageSize = 10 } = params;
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));
  return get(`/api/handbook/me/saved?${sp.toString()}`);
}

export function getMyCourseReviews(params = {}) {
  const { page = 1, pageSize = 10 } = params;
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));
  return get(`/api/handbook/me/course-reviews?${sp.toString()}`);
}

export function listMyHandbookChecklists() {
  return get('/api/handbook/me/checklists');
}

export function createMyHandbookChecklist(body) {
  return post('/api/handbook/me/checklists', body || {});
}

export function updateMyHandbookChecklist(id, body) {
  return patch(`/api/handbook/me/checklists/${id}`, body || {});
}

export function deleteMyHandbookChecklist(id) {
  return del(`/api/handbook/me/checklists/${id}`);
}

export function createMyHandbookChecklistItem(checklistId, body) {
  return post(`/api/handbook/me/checklists/${checklistId}/items`, body || {});
}

export function updateMyHandbookChecklistItem(checklistId, itemId, body) {
  return patch(`/api/handbook/me/checklists/${checklistId}/items/${itemId}`, body || {});
}

export function deleteMyHandbookChecklistItem(checklistId, itemId) {
  return del(`/api/handbook/me/checklists/${checklistId}/items/${itemId}`);
}

export function listCourseReviews(params = {}) {
  const { q, page = 1, pageSize = 10 } = params;
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('pageSize', String(pageSize));
  if (q) sp.set('q', String(q));
  return get(`/api/handbook/course-reviews?${sp.toString()}`);
}

export function getCourseReviewDetail(id) {
  return get(`/api/handbook/course-reviews/${id}`);
}

export function createCourseReview(body) {
  return post('/api/handbook/course-reviews', body || {});
}

export function deleteCourseReview(id) {
  return del(`/api/handbook/course-reviews/${id}`);
}

export function listCourseReviewComments(id) {
  return get(`/api/handbook/course-reviews/${id}/comments`);
}

export function createCourseReviewComment(id, body) {
  return post(`/api/handbook/course-reviews/${id}/comments`, body || {});
}

export function deleteCourseReviewComment(reviewId, commentId) {
  return del(`/api/handbook/course-reviews/${reviewId}/comments/${commentId}`);
}

