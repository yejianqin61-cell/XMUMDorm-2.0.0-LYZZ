/**
 * 帖子相关 API 封装（阶段 1.1）
 * 与后端 routes/posts.js 对应
 */

import { API_BASE_URL } from './config';

function getAuthHeaders(token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * 帖子列表（分页）
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=10]
 * @param {string} [options.token] - 可选，登录后传可影响可见性（如 admin 看被隐藏帖）
 * @returns {Promise<{ list: Array, hasMore: boolean, page: number, pageSize: number }>}
 */
export async function getPostList(options = {}) {
  const { page = 1, pageSize = 10, token } = options;
  const url = `${API_BASE_URL}/api/posts?page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { ...getAuthHeaders(token) },
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '获取帖子列表失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data; // { list, hasMore, page, pageSize }
}

/**
 * 帖子详情
 * @param {number|string} postId
 * @param {string} [token] - 可选
 * @returns {Promise<Object>} 帖子对象（含 author, images, like_count, comment_count 等）
 */
export async function getPostDetail(postId, token) {
  const url = `${API_BASE_URL}/api/posts/${postId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { ...getAuthHeaders(token) },
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '获取帖子详情失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data;
}

/**
 * 发布帖子（需要登录）
 * @param {string} token - 必填
 * @param {Object} body
 * @param {string} body.content - 正文，必填
 * @param {string} [body.type='normal'] - 'normal' | 'announcement'（公告仅 admin）
 * @param {File[]} [body.images] - 可选，最多 3 张（jpg/png/webp，单张≤5MB）
 * @returns {Promise<Object>} 发布成功后的帖子对象
 */
export async function createPost(token, body) {
  const { content, type = 'normal', images } = body || {};
  if (!content || !String(content).trim()) {
    throw new Error('内容不能为空');
  }

  const formData = new FormData();
  formData.append('content', String(content).trim());
  formData.append('type', type === 'announcement' ? 'announcement' : 'normal');
  if (images && images.length > 0) {
    const list = Array.isArray(images) ? images : [images];
    for (let i = 0; i < Math.min(3, list.length); i++) {
      formData.append('images', list[i]);
    }
  }

  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: formData,
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '发布失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data;
}

/**
 * 删除帖子（本人或 admin）
 * @param {string} token
 * @param {number|string} postId
 */
export async function deletePost(token, postId) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '删除失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data;
}

/**
 * 点赞 / 取消点赞
 * @param {string} token
 * @param {number|string} postId
 * @returns {Promise<{ liked: boolean }>}
 */
export async function toggleLike(token, postId) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '操作失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data; // { post_id, liked }
}

/**
 * 帖子评论列表（一级 + 二级，树形）
 * @param {number|string} postId
 * @returns {Promise<Array>} 一级评论，每项含 replies 数组
 */
export async function getPostComments(postId) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '获取评论失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data;
}

/**
 * 发表评论（一级或回复）
 * @param {string} token
 * @param {number|string} postId
 * @param {Object} body
 * @param {string} body.content - 评论内容
 * @param {number|string} [body.parent_id] - 回复时传父评论 id
 * @returns {Promise<Object>} 新评论对象
 */
export async function createComment(token, postId, body) {
  const { content, parent_id } = body || {};
  if (!content || !String(content).trim()) {
    throw new Error('评论内容不能为空');
  }
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({
      content: String(content).trim(),
      ...(parent_id != null && { parent_id }),
    }),
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '评论失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data;
}

/**
 * 删除评论（本人或 admin）
 * @param {string} token
 * @param {number|string} postId
 * @param {number|string} commentId
 */
export async function deleteComment(token, postId, commentId) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (data.status !== 0) {
    const err = new Error(data.message || '删除失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data;
}
