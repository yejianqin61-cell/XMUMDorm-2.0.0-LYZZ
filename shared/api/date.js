import { del, get, post, request } from './request';

/** 交友模块（routes/date.js）。联系方式只会出现在 getMyDateProfile 和 listDateMatches 里。 */

export const DATE_LOOKING_FOR = ['friends', 'study', 'activity', 'dating'];

export function getMyDateProfile() {
  return get('/api/date/me');
}

/** body: { content(自我介绍), contact, looking_for, tags: string[], visible: boolean } */
export function saveMyDateProfile(body) {
  return request('/api/date/me', { method: 'PUT', body });
}

export function deleteMyDateProfile() {
  return del('/api/date/me');
}

export function listDateCards({ lookingFor, cursor } = {}) {
  const qs = new URLSearchParams();
  if (lookingFor) qs.set('looking_for', lookingFor);
  if (cursor) qs.set('cursor', cursor);
  const query = qs.toString();
  return get(`/api/date/cards${query ? `?${query}` : ''}`);
}

export function sayHiToDateCard(userId) {
  return post(`/api/date/cards/${userId}/like`, {});
}

export function listDateMatches() {
  return get('/api/date/matches');
}

export function blockDateUser(userId) {
  return post(`/api/date/blocks/${userId}`, {});
}

/** 后端要求先挂出自己的名片：用于识别这类 403 */
export function isNeedProfileError(err) {
  return err?.status === 403 && err?.body?.code === 'NEED_PROFILE';
}
