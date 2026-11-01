'use strict';
class NewsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = message => { throw new NewsError(400, message); };
const CATEGORIES = ['competition', 'lecture', 'campus-life'];
const ownKeys = (body, allowed) => {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !allowed.includes(key))) fail('包含不允许修改的字段');
};
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) fail('无效的校园帖子 ID');
  return Number(value);
}
function revision(body, extras = []) {
  ownKeys(body, ['expectedRevision', ...extras]);
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || body.expectedRevision > 4294967294) fail('必须提交有效 expectedRevision');
  return body.expectedRevision;
}
function audience(value, complete) {
  ownKeys(value, ['scope', 'collegeIds']);
  if (!['all', 'colleges'].includes(value.scope) || !Array.isArray(value.collegeIds) || value.collegeIds.length > 100
    || value.collegeIds.some(key => typeof key !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(key))
    || new Set(value.collegeIds).size !== value.collegeIds.length
    || (value.scope === 'all' && value.collegeIds.length) || (complete && value.scope === 'colleges' && !value.collegeIds.length)) fail('受众无效：全体与学院互斥，发布时须明确选择学院');
  return { scope: value.scope, collegeIds: [...value.collegeIds] };
}
function content(body, complete = false, updating = false) {
  ownKeys(body, ['title', 'content', 'category', 'audience', 'imageAssetIds', ...(updating ? ['expectedRevision'] : [])]);
  if (typeof body.title !== 'string' || body.title.length > 200 || typeof body.content !== 'string' || body.content.length > 50000) fail('标题或正文长度无效（标题最多 200 字，正文最多 50000 字）');
  if (body.category !== null && !CATEGORIES.includes(body.category)) fail('分类无效');
  if (complete && (!body.title.trim() || !body.content.trim() || !body.category)) fail('发布必须填写标题、正文和分类');
  if (!Array.isArray(body.imageAssetIds) || body.imageAssetIds.length > 10 || new Set(body.imageAssetIds).size !== body.imageAssetIds.length
    || body.imageAssetIds.some(key => typeof key !== 'string' || !/^[0-9a-f-]{36}$/i.test(key))) fail('图片资产无效，最多十张且不得重复');
  return { title: body.title, content: body.content, category: body.category, audience: audience(body.audience, complete), imageAssetIds: [...body.imageAssetIds] };
}
function currentAdmin(user) {
  if (!user) throw new NewsError(401, '当前账号不存在');
  if (user.status !== 'active') throw new NewsError(403, '当前账号无效或已停用');
  if (user.role !== 'admin') throw new NewsError(403, '需要数据库当前有效管理员身份');
  return user;
}
function visible(post) {
  return Boolean(post && !post.deletedAt && !post.hiddenByAdmin && post.lifecycleStatus === 'published');
}
function feedEligible(post) {
  return visible(post) && CATEGORIES.includes(post.category) && ['all', 'colleges'].includes(post.audience?.scope)
    && (post.audience.scope === 'all' || post.audience.collegeIds.length > 0);
}
function filters(query) {
  const page = Number(query.page || 1), pageSize = Number(query.pageSize || 20);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) fail('分页参数无效');
  if (query.category && !CATEGORIES.includes(query.category)) fail('分类筛选无效');
  if (query.status && !['draft','published','withdrawn'].includes(query.status)) fail('状态筛选无效');
  if (query.search && (typeof query.search !== 'string' || query.search.length > 200)) fail('搜索内容无效');
  if (query.collegeId && (typeof query.collegeId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(query.collegeId))) fail('学院筛选无效');
  if (query.related != null && !['0','1'].includes(String(query.related))) fail('相关性筛选无效');
  return { page, pageSize, search: query.search || '', category: query.category || '', status: query.status || '', collegeId: query.collegeId || '', related: String(query.related) === '1' };
}
module.exports = { NewsError, CATEGORIES, id, revision, audience, content, currentAdmin, visible, feedEligible, filters, ownKeys };
