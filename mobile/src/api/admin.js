/**
 * 管理员后台 API
 * 所有接口需要管理员权限，后端会校验
 */
import { get, post, patch, del } from './request';

// ─── Dashboard ────────────────────────────────────────────

export function getDashboard() {
  return get('/api/admin/dashboard');
}

// ─── 用户管理 ────────────────────────────────────────────

export function getAdminUsers({ page, pageSize, search, role, status } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const qs = params.toString();
  return get(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export function getAdminUserDetail(userId) {
  return get(`/api/admin/users/${userId}`);
}

export function banUser(userId, { duration, reason } = {}) {
  return post(`/api/admin/users/${userId}/ban`, { duration, reason });
}

export function unbanUser(userId) {
  return post(`/api/admin/users/${userId}/unban`);
}

export function muteUser(userId, { duration, reason } = {}) {
  return post(`/api/admin/users/${userId}/mute`, { duration, reason });
}

export function unmuteUser(userId) {
  return post(`/api/admin/users/${userId}/unmute`);
}

export function deleteUser(userId) {
  return del(`/api/admin/users/${userId}`);
}

// ─── 举报中心 ────────────────────────────────────────────

export function getAdminReports({ page, pageSize, status } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  if (status) params.set('status', status);
  const qs = params.toString();
  return get(`/api/admin/reports${qs ? `?${qs}` : ''}`);
}

export function getAdminReportDetail(reportId) {
  return get(`/api/admin/reports/${reportId}`);
}

export function processReport(reportId, { action, note } = {}) {
  return patch(`/api/admin/reports/${reportId}/process`, { action, note });
}

// ─── 用户举报提交 ────────────────────────────────────────

export function submitReport({ target_type, target_id, reason, detail, screenshots }) {
  return post('/api/reports', { target_type, target_id, reason, detail, screenshots });
}

// ─── 公告管理 ────────────────────────────────────────────

export function getAdminAnnouncements({ page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  const qs = params.toString();
  return get(`/api/admin/announcements${qs ? `?${qs}` : ''}`);
}

export function createAnnouncement({ title, content }) {
  return post('/api/admin/announcements', { title, content });
}

export function updateAnnouncement(id, { title, content }) {
  return patch(`/api/admin/announcements/${id}`, { title, content });
}

export function deleteAnnouncement(id) {
  return del(`/api/admin/announcements/${id}`);
}

// ─── 操作日志 ────────────────────────────────────────────

export function getAdminAuditLogs({ page, pageSize, userId, action } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  if (userId) params.set('userId', String(userId));
  if (action) params.set('action', action);
  const qs = params.toString();
  return get(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`);
}
