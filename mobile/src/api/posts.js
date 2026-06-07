/**
 * 帖子 API，与后端 /api/posts 对应
 * 统一使用 request 工具
 */
import { get, post, del, request } from '../utils/http';

export function getPostList(options = {}) {
  const { page = 1, pageSize = 10, token, q, tagId, tagSlug } = options;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (tagId != null && tagId !== '') params.set('tagId', String(tagId));
  if (tagSlug != null && String(tagSlug).trim()) params.set('tagSlug', String(tagSlug).trim());
  const path = `/api/posts?${params.toString()}`;
  return get(path, token ? { token } : {});
}

/** 帖子标签列表（按创建时间升序） */
export function getPostTagsList() {
  return get('/api/posts/tags');
}

/** 创建标签（管理员） */
export function createPostTag(body) {
  const { name_zh, name_en, slug } = body || {};
  return post('/api/posts/tags', { name_zh, name_en, slug });
}

/** 删除标签（管理员） */
export function deletePostTag(tagId) {
  return del(`/api/posts/tags/${tagId}`);
}

export function getPostDetail(postId, token) {
  return get(`/api/posts/${postId}`, token ? { token } : {});
}

/**
 * 发布帖子（FormData：content, type, images）
 */
export function createPost(body) {
  const { title, content, type = 'normal', images, tagIds } = body || {};
  if (!content || !String(content).trim()) throw new Error('内容不能为空');
  const form = new FormData();
  if (type !== 'announcement') {
    form.append('title', String(title || '').trim());
  }
  form.append('content', String(content).trim());
  form.append('type', type === 'announcement' ? 'announcement' : 'normal');
  if (images && Array.isArray(images)) {
    images.slice(0, 3).forEach((f) => form.append('images', f));
  }
  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    form.append('tag_ids', JSON.stringify(tagIds.slice(0, 3).map((id) => Number(id)).filter((n) => Number.isFinite(n))));
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
