/**
 * 食堂相关 API（商品评论等）
 */
import { API_BASE_URL } from './config';

function authHeaders(token) {
  const h = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/** 商品评论列表：GET /api/canteen/products/:productId/comments，返回树形（一级带 replies） */
export async function getProductComments(productId, options = {}) {
  const { page = 1, pageSize = 50 } = options;
  const res = await fetch(
    `${API_BASE_URL}/api/canteen/products/${productId}/comments?page=${page}&pageSize=${pageSize}`
  );
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.message || '获取评论失败');
  const list = data.data?.list || [];
  const top = list.filter((c) => c.parent_id == null);
  const replyList = list.filter((c) => c.parent_id != null);
  return top.map((t) => ({
    id: t.id,
    authorName: t.author?.nickname || t.author?.username || '匿名',
    authorAvatar: t.author?.avatar ? (t.author.avatar.startsWith('http') ? t.author.avatar : `${API_BASE_URL}${t.author.avatar}`) : null,
    content: t.content,
    createdAt: t.created_at,
    image: (t.images && t.images[0]?.url) ? (t.images[0].url.startsWith('http') ? t.images[0].url : `${API_BASE_URL}${t.images[0].url}`) : null,
    replies: replyList
      .filter((r) => r.parent_id === t.id)
      .map((r) => ({
        id: r.id,
        authorName: r.author?.nickname || r.author?.username || '匿名',
        authorAvatar: r.author?.avatar ? (r.author.avatar.startsWith('http') ? r.author.avatar : `${API_BASE_URL}${r.author.avatar}`) : null,
        content: r.content,
        createdAt: r.created_at,
        image: (r.images && r.images[0]?.url) ? (r.images[0].url.startsWith('http') ? r.images[0].url : `${API_BASE_URL}${r.images[0].url}`) : null,
      })),
  }));
}

/** 发表商品评论（一级或二级）：POST multipart，rating 必填 */
export async function postProductComment(productId, { rating = '人上人', content, parent_id = null, imageFiles = [] }, token) {
  const form = new FormData();
  form.append('rating', rating);
  form.append('content', content.trim());
  if (parent_id != null) form.append('parent_id', String(parent_id));
  imageFiles.forEach((f) => form.append('images', f));

  const res = await fetch(`${API_BASE_URL}/api/canteen/products/${productId}/comments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  });
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.message || '评论失败');
  return data.data;
}
