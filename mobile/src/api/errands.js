import { del, get, post } from '../utils/http';

export function listErrands(params = {}) {
  const qs = new URLSearchParams();
  if (params.type && params.type !== 'all') qs.set('type', params.type);
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return get(`/api/errands${query ? `?${query}` : ''}`);
}

export function getErrandDetail(id) {
  return get(`/api/errands/${id}`);
}

export function createErrand(body) {
  return post('/api/errands', body);
}

export function takeErrand(id) {
  return post(`/api/errands/${id}/take`, {});
}

export function doneErrand(id) {
  return post(`/api/errands/${id}/done`, {});
}

export function reportErrand(id, body = {}) {
  return post(`/api/errands/${id}/report`, body);
}

export function deleteErrand(id) {
  return del(`/api/errands/${id}`);
}

