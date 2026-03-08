/**
 * 帖子 API，与后端 /api/posts 对应
 * 统一使用 request 工具
 */
import { get, post, del, request } from './request';

export function getPostList(options = {}) {
  const { page = 1, pageSize = 10, token } = options;
  const path = `/api/posts?page=${page}&pageSize=${pageSize}`;
  return get(path, token ? { token } : {});
}

export function getPostDetail(postId, token) {
  return get(`/api/posts/${postId}`, token ? { token } : {});
}

/**
 * 发布帖子（FormData：content, type, images）
 */
export function createPost(body) {
  const { content, type = 'normal', images } = body || {};
  if (!content || !String(content).trim()) throw new Error('内容不能为空');
  const form = new FormData();
  form.append('content', String(content).trim());
  form.append('type', type === 'announcement' ? 'announcement' : 'normal');
  if (images && Array.isArray(images)) {
    images.slice(0, 3).forEach((f) => form.append('images', f));
  }
  return request('/api/posts', { method: 'POST', body: form });
}

export function deletePost(postId) {
  return del(`/api/posts/${postId}`);
}

export function toggleLike(postId) {
  return post(`/api/posts/${postId}/like`, {});
}

export function getPostComments(postId) {
  return get(`/api/posts/${postId}/comments`);
}

export function createComment(postId, body) {
  const { content, parent_id } = body || {};
  if (!content || !String(content).trim()) throw new Error('评论内容不能为空');
  const payload = { content: String(content).trim() };
  if (parent_id != null) payload.parent_id = parent_id;
  return post(`/api/posts/${postId}/comments`, payload);
}

export function deleteComment(postId, commentId) {
  return del(`/api/posts/${postId}/comments/${commentId}`);
}
