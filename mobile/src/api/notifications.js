/**
 * 通知 API，与后端 /api/notifications 对应
 */
import { del, get, patch } from '../utils/http';

export function getNotifications(options = {}) {
  const { page = 1, pageSize = 20, type, is_read, module: mod } = options;
  const params = new URLSearchParams({ page, pageSize });
  if (mod) params.set('module', mod);
  else if (type) params.set('type', type);
  if (is_read !== undefined && is_read !== '') params.set('is_read', is_read);
  return get(`/api/notifications?${params.toString()}`);
}

export function clearNotificationsByModule(moduleName) {
  return del(`/api/notifications/clear?module=${encodeURIComponent(moduleName)}`);
}

export function getUnreadAnnouncements() {
  return get('/api/notifications/unread-announcements');
}

export function getUnreadSummary() {
  return get('/api/notifications/unread-summary');
}

export function clearNotifications(scope) {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  return del(`/api/notifications/clear${qs}`);
}

export function markNotificationRead(id) {
  return patch(`/api/notifications/${id}/read`, {});
}

export function markNotificationsReadBatch(ids) {
  return patch('/api/notifications/read-batch', { ids });
}
