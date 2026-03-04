/**
 * 帖子相关 API 封装（阶段 1.1）
 * 与后端 routes/posts.js 对应
 */

import { API_BASE_URL } from './config';

function getAuthHeaders(token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}//创建空对象headers,如果token存在，则添加Authorization字段，值为Bearer + token，最后返回headers对象,这就是getAuthHeaders函数的功能，方便在需要认证的API请求中使用。

/**
 * 帖子列表（分页）
 * @param {Object} options//这是干啥用的啊?,谁能回答我
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=10]//分页是啥意思,为什么要分页啊
 * @param {string} [options.token] - 可选，登录后传可影响可见性（如 admin 看被隐藏帖）
 * @returns {Promise<{ list: Array, hasMore: boolean, page: number, pageSize: number }>}
 */
export async function getPostList(options = {}) {//向外暴露一个异步函数getPostList，接受一个options对象作为参数，默认值为一个空对象。这个函数用于获取帖子列表，并支持分页和可选的认证token。
  const { page = 1, pageSize = 10, token } = options;
  const url = `${API_BASE_URL}/api/posts?page=${page}&pageSize=${pageSize}`;//这是个模板字符串，使用反引号包裹，可以在其中嵌入变量和表达式。这里构建了一个URL，包含了API_BASE_URL、页码和每页数量的查询参数。,这个URL将用于发送GET请求以获取帖子列表。
  const res = await fetch(url, {
    method: 'GET',
    headers: { ...getAuthHeaders(token) },
  });//使用fetch函数发送一个GET请求到上面构建的URL，并且在请求头中包含了认证信息（如果token存在）。fetch函数返回一个Promise，解析为Response对象，这里我们使用await等待这个Promise完成，并将结果存储在res变量中。
  const data = await res.json();//从Response对象中解析出JSON数据，这也是一个Promise，解析后的结果存储在data变量中。这个data对象应该包含了API返回的状态码、消息和数据等信息。
  if (data.status !== 0) {
    const err = new Error(data.message || '获取帖子列表失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }
  return data.data; // { list, hasMore, page, pageSize }//如果API返回的状态码不为0，说明请求失败，我们创建一个Error对象，设置错误消息和相关状态信息，然后抛出这个错误。否则，我们返回API返回的数据部分，包含了帖子列表、是否有更多数据、当前页码和每页数量等信息。
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
