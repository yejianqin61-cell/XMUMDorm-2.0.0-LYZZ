import { STATUSES, CATEGORIES } from './model.js';
export const NEWS_API = '/api/admin/campus-news';
const contractError = () => new Error('快讯接口响应不符合约定，无法确认操作结果。请核对服务器后再重试。');
const isId = id => (typeof id === 'string' || typeof id === 'number') && String(id).length > 0;
export function unwrap(body) {
  if (!body || body.__httpStatus < 200 || body.__httpStatus >= 300 || body.status !== 0) {
    const error = new Error(body?.message || '快讯请求失败，请检查服务状态后重试。');
    error.status = body?.__httpStatus;
    throw error;
  }
  if (!Number.isInteger(body.__httpStatus)) throw contractError();
  return body.data;
}
export function assertContent(data) {
  if (!data || typeof data.title !== 'string' || typeof data.content !== 'string'
    || !(data.category === null || CATEGORIES.some(c => c.code === data.category))
    || !['all', 'colleges', 'unclassified'].includes(data.audience?.scope) || !Array.isArray(data.audience?.collegeIds)
    || !data.audience.collegeIds.every(id => typeof id === 'string')
    || (['all', 'unclassified'].includes(data.audience.scope) && data.audience.collegeIds.length)
    || !Array.isArray(data.images) || data.images.length > 10
    || data.images.some(i => !isId(i.id) || typeof i.url !== 'string')) throw contractError();
  return data;
}
export function assertNews(data) {
  assertContent(data);
  if (data.sourceKind === 'news' && data.audience.scope === 'unclassified') throw contractError();
  if (!isId(data.id) || !Object.hasOwn(STATUSES, data.lifecycleStatus)
    || !['news', 'legacy'].includes(data.sourceKind) || !Number.isInteger(data.revision) || data.revision < 0
    || typeof data.hiddenByAdmin !== 'boolean' || !(data.deletedAt === null || typeof data.deletedAt === 'string')
    || typeof data.createdBy?.name !== 'string' || typeof data.updatedAt !== 'string'
    || !(data.publishedAt === null || typeof data.publishedAt === 'string')) throw contractError();
  return data;
}
const encodeId = id => {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('快讯 ID 无效，不接受模拟帖子 ID。');
  return encodeURIComponent(id);
};

/** Pure transport adapter: unit tests inject in-memory transport; production uses requestRaw. */
export function createCampusNewsApi(transport) {
  const read = async (path, options) => unwrap(await transport(path, options));
  const write = async (path, body, status, previousRevision, headers) => {
    const result = assertNews(await read(path, { method: 'POST', body, ...(headers ? {headers} : {}) }));
    if (result.sourceKind !== 'news' || result.lifecycleStatus !== status
      || result.hiddenByAdmin || result.deletedAt
      || (previousRevision !== undefined && result.revision !== previousRevision + 1)) throw contractError();
    return result;
  };
  return {
    async list(filters) {
      const query = new URLSearchParams(Object.entries({ pageSize: 20, ...filters }).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, String(v)]));
      const data = await read(`${NEWS_API}?${query}`);
      if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || data.total < 0) throw contractError();
      data.items.forEach(assertNews);
      return data;
    },
    async detail(id) { return assertNews(await read(`${NEWS_API}/${encodeId(id)}`)); },
    createDraft: body => write(`${NEWS_API}/drafts`, body, 'draft'),
    createPublished: (body, key = crypto.randomUUID()) => write(`${NEWS_API}/publish`, body, 'published', undefined, { 'Idempotency-Key': key }),
    async update(id, body, previousStatus) {
      const data = assertNews(await read(`${NEWS_API}/${encodeId(id)}`, { method: 'PUT', body }));
      if (data.sourceKind !== 'news' || data.lifecycleStatus !== previousStatus || data.revision !== body.expectedRevision + 1) throw contractError();
      return data;
    },
    publish: (id, expectedRevision) => write(`${NEWS_API}/${encodeId(id)}/publish`, { expectedRevision }, 'published', expectedRevision),
    withdraw: (id, expectedRevision) => write(`${NEWS_API}/${encodeId(id)}/withdraw`, { expectedRevision }, 'withdrawn', expectedRevision),
    async colleges() {
      const data = await read('/api/admin/campus-news/colleges');
      if (!Array.isArray(data?.items) || data.items.some(c => typeof c.id !== 'string' || !c.id || typeof c.code !== 'string' || typeof c.name !== 'string')) throw contractError();
      return data;
    },
    async versions(id) {
      const data = await read(`${NEWS_API}/${encodeId(id)}/versions`);
      if (!Array.isArray(data?.items)) throw contractError();
      data.items.forEach(v => {
        assertContent(v);
        if (!Number.isInteger(v.revision) || v.revision < 0 || typeof v.actor?.name !== 'string' || typeof v.action !== 'string' || typeof v.createdAt !== 'string') throw contractError();
      });
      return data;
    },
    async compare(id, from, to) {
      const data = await read(`${NEWS_API}/${encodeId(id)}/versions/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (data?.fromRevision !== Number(from) || data?.toRevision !== Number(to) || !Array.isArray(data.changes)
        || data.changes.some(c => ['field', 'before', 'after'].some(k => typeof c[k] !== 'string'))) throw contractError();
      return data;
    },
  };
}
