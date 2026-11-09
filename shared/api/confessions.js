/**
 * 万能墙（Confession Wall）API 封装 — M09
 *
 * 设计与契约见 docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §6。
 * 后端路由：routes/confessions.js，挂载于 /api/confessions。
 *
 * 注意：所有响应都是**匿名**的，后端不会下发 user_id / username / nickname / avatar，
 * 前端也不应尝试推断作者身份。
 */
import { get, post, patch, del } from './request';

/** 窗口大小的服务端钳制范围（与 routes/confessions.js 保持一致） */
export const CONFESSION_WINDOW_LIMIT = 5;
const WALL_REQUEST = { timeoutMs: 15000 };

/**
 * 翻页窗口（游标分页）。
 *
 * @param {Object} [opts]
 * @param {number|null} [opts.cursor]    锚点帖子 ID；省略/null 表示取最新一窗
 * @param {'older'|'newer'} [opts.direction='older']  older = 更旧，newer = 更新
 * @param {number} [opts.limit=CONFESSION_WINDOW_LIMIT]
 * @returns {Promise<{items:Array,has_older:boolean,has_newer:boolean,oldest_cursor:number|null,newest_cursor:number|null,total:number}>}
 */
export function getConfessionWindow({ cursor = null, direction = 'older', limit = CONFESSION_WINDOW_LIMIT } = {}) {
  const params = new URLSearchParams();
  if (cursor != null) params.set('cursor', String(cursor));
  params.set('direction', direction);
  params.set('limit', String(limit));
  return get(`/api/confessions/window?${params.toString()}`, WALL_REQUEST);
}

/** 总篇数（供「第 n 篇 / 共 m 篇」） */
export function getConfessionMeta() {
  return get('/api/confessions/meta', WALL_REQUEST);
}

/** 单篇详情 */
export function getConfession(id) {
  return get(`/api/confessions/${id}`, WALL_REQUEST);
}

/**
 * 投稿
 * @param {{content: string, template_key: string} | {content: string, poster_style: {version: number, layoutId: string, colorId: string}, publish_key: string}} body
 */
export function createConfession(body) {
  return post('/api/confessions', body, WALL_REQUEST);
}

/** 保存作者修改，revision 用于拒绝覆盖较新的版本。 */
export function updateConfession(id, body) {
  return patch(`/api/confessions/${id}`, body, WALL_REQUEST);
}

/** 删除自己的投稿（后端同时允许 admin） */
export function deleteConfession(id) {
  return del(`/api/confessions/${id}`, WALL_REQUEST);
}

/** 点赞 / 取消点赞（切换语义），返回 { confession_id, liked, like_count } */
export function toggleConfessionLike(id) {
  return post(`/api/confessions/${id}/like`, {});
}

/** 收藏 / 取消收藏（切换语义），返回 { confession_id, favorited } */
export function toggleConfessionFavorite(id) {
  return post(`/api/confessions/${id}/favorite`, {});
}

/**
 * 评论列表（一级 + 扁平 replies）。
 * 不传 sort 时保留旧顺序（created_at ASC，Web 口径）；App 显式传 latest/hot。
 */
export function getConfessionComments(id, { sort } = {}) {
  const query = sort === 'latest' || sort === 'hot' ? `?sort=${sort}` : '';
  return get(`/api/confessions/${id}/comments${query}`);
}

/** 评论点赞 / 取消（切换语义），返回 { comment_id, liked, like_count } */
export function toggleConfessionCommentLike(id, commentId) {
  return post(`/api/confessions/${id}/comments/${commentId}/like`, {});
}

/** 楼主精选 / 取消（仅帖子作者；每帖最多 3 条），返回 { comment_id, featured, featured_at } */
export function featureConfessionComment(id, commentId, featured) {
  return patch(`/api/confessions/${id}/comments/${commentId}/feature`, { featured });
}

/**
 * 发表评论 / 回复
 * @param {number} id
 * @param {{content: string, parent_id?: number|null}} body
 */
export function createConfessionComment(id, body) {
  return post(`/api/confessions/${id}/comments`, body);
}

/** 删除自己的评论（后端同时允许 admin） */
export function deleteConfessionComment(id, commentId) {
  return del(`/api/confessions/${id}/comments/${commentId}`);
}
