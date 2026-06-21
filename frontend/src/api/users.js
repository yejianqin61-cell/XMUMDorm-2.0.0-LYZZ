/**
 * 用户 API，与后端 /api/users 对应
 */
import { get, patch, request } from './request';

export function getMe() {
  return get('/api/users/me');
}

/**
 * 个人空间：用户资料 + 帖子列表
 * @param {number|string} userId
 * @param {{ page?: number, pageSize?: number }} [options]
 */
export function getProfile(userId, options = {}) {
  const { page = 1, pageSize = 30 } = options;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return get(`/api/users/${userId}/profile?${params.toString()}`);
}

/**
 * 更新当前用户资料
 * @param {{ nickname?: string, username?: string, college?: string, grade?: string, major?: string, show_college?: boolean, show_grade?: boolean, show_major?: boolean }} body
 */
export function updateProfileInfo(body) {
  return patch('/api/users/me', body);
}

/**
 * 上传头像（FormData，字段名 avatar）
 * @param {File} file
 */
export function updateAvatar(file) {
  const form = new FormData();
  form.append('avatar', file);
  return patch('/api/users/me/avatar', form);
}
