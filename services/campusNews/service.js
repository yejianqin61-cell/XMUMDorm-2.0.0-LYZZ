'use strict';
const d = require('./domain');
const { resolveCollege } = require('./collegeIdentity');
function createNewsService(repository, clock = () => new Date()) {
  const authorized = (actor, work, writing = false, exclusive = false) => repository[writing ? 'transaction' : 'read'](async session => {
    const user = d.currentAdmin(await session.admin(actor, exclusive ? 'exclusive' : writing));
    return work(session, user);
  });
  async function verify(session, body) { await session.verifyColleges(body.audience.collegeIds); await session.assets(body.imageAssetIds); }
  async function create(actor, body, state, publicationKey) {
    const data = d.content(body, state === 'published');
    return authorized(actor, async (session, user) => {
      let publicationRequest;
      if (publicationKey) {
        const normalized = { ...data, audience: { ...data.audience, collegeIds: [...data.audience.collegeIds].sort() } };
        const fingerprint = require('node:crypto').createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
        publicationRequest = { key: publicationKey, fingerprint };
        const previous = session.findPublication ? await session.findPublication(actor, publicationKey) : null;
        if (previous) {
          if (previous.request.fingerprint !== fingerprint) throw new d.NewsError(409, '发布请求标识已用于不同内容');
          return session.get(previous.postId);
        }
      }
      await verify(session, data);
      const post = await session.insert(user.id, data, state);
      await session.snapshot(publicationRequest ? { ...post, publicationRequest } : post, user, state === 'draft' ? 'create_draft' : 'create_publish');
      return post;
    }, true, Boolean(publicationKey));
  }
  async function mutate(actor, postId, body, action) {
    postId = d.id(postId);
    const extras = action === 'update' ? ['title','content','category','audience','imageAssetIds'] : action === 'classify' ? ['category','audience'] : [];
    const expected = d.revision(body, extras);
    return authorized(actor, async (session, user) => {
      const post = await session.get(postId, true);
      if (post.revision !== expected) throw new d.NewsError(409, '版本冲突，请刷新后重新编辑');
      if (post.deletedAt) throw new d.NewsError(409, '已软删除内容不可修改或恢复');
      if (post.revision === 4294967295) throw new d.NewsError(409, '版本号已达到上限');
      const changes = { ...post };
      if (action === 'classify') {
        if (post.sourceKind !== 'legacy') throw new d.NewsError(409, '仅历史帖子可补录');
        if (!d.CATEGORIES.includes(body.category)) throw new d.NewsError(400, '必须人工选择分类');
        changes.category = body.category; changes.audience = d.audience(body.audience, true);
        await session.verifyColleges(changes.audience.collegeIds);
      } else {
        if (post.sourceKind !== 'news') throw new d.NewsError(409, '旧组织帖子不能通过快讯写入入口编辑');
        if (action === 'update') {
          Object.assign(changes, d.content(body, post.lifecycleStatus === 'published', true));
          await verify(session, changes);
        } else if (action === 'publish') {
          if (post.hiddenByAdmin || !['draft','withdrawn'].includes(post.lifecycleStatus)) throw new d.NewsError(409, '当前状态不能发布');
          const data = { title: post.title, content: post.content, category: post.category, audience: post.audience, imageAssetIds: post.images.map(i => i.id) };
          d.content(data, true); await verify(session, data);
          changes.lifecycleStatus = 'published'; changes.publishedAt = post.publishedAt || clock();
        } else if (action === 'withdraw') {
          if (post.hiddenByAdmin || post.lifecycleStatus !== 'published') throw new d.NewsError(409, '当前状态不能撤回');
          changes.lifecycleStatus = 'withdrawn';
        } else if (action === 'hide') changes.hiddenByAdmin = true;
        else if (action === 'unhide') changes.hiddenByAdmin = false;
        else if (action === 'delete') changes.deletedAt = clock();
        else throw new d.NewsError(400, '不支持的操作');
      }
      // First manual classification preserves a complete baseline before revision 1.
      if (post.sourceKind === 'legacy' && post.revision === 0) await session.snapshot(post, user, 'legacy_baseline');
      const updated = await session.update(post, changes, action);
      await session.snapshot(updated, user, action);
      return updated;
    }, true);
  }
  return {
    assertAdmin: actor => authorized(actor, () => true),
    createDraft: (actor, body) => create(actor, body, 'draft'),
    createPublished: (actor, body, publicationKey) => create(actor, body, 'published', publicationKey), mutate,
    list: (actor, query) => authorized(actor, session => session.list(d.filters(query))),
    legacyList: (actor, query) => authorized(actor, session => session.list(d.filters(query), false, true)),
    detail: (actor, postId) => authorized(actor, session => session.get(d.id(postId))),
    colleges: actor => authorized(actor, async session => ({ items: await session.colleges() })),
    versions: (actor, postId) => authorized(actor, session => session.versions(d.id(postId))),
    compare: (actor, postId, from, to) => authorized(actor, async session => {
      if (!/^\d+$/.test(String(from)) || !/^\d+$/.test(String(to))) throw new d.NewsError(400, '版本参数无效');
      const { items } = await session.versions(d.id(postId));
      const before = items.find(v => v.revision === Number(from)), after = items.find(v => v.revision === Number(to));
      if (!before || !after) throw new d.NewsError(404, '版本不存在');
      const stableImages = version => ({ ...version, images: version.images.map(image => ({ id: image.id, key: image.objectKey || image.legacyPath || image.url })) });
      const stableBefore = stableImages(before), stableAfter = stableImages(after);
      const fields = ['title','content','category','audience','images','lifecycleStatus','hiddenByAdmin','deletedAt'];
      return { fromRevision: Number(from), toRevision: Number(to), changes: fields.filter(k => JSON.stringify(stableBefore[k]) !== JSON.stringify(stableAfter[k])).map(field => ({ field, before: typeof stableBefore[field] === 'string' ? stableBefore[field] : JSON.stringify(stableBefore[field]), after: typeof stableAfter[field] === 'string' ? stableAfter[field] : JSON.stringify(stableAfter[field]) })) };
    }),
    publicFeed: (actor, query) => repository.read(async session => {
      const user = await session.admin(actor);
      if (user?.status !== 'active' || (session.readerAllowed && !await session.readerAllowed(actor))) throw new d.NewsError(403, '当前账号无效');
      if (query.collegeId) throw new d.NewsError(400, '学生相关性由服务端资料映射确定');
      const input = d.filters(query);
      if (input.related) input.relatedCollegeId = (require('../academicIdentity').COLLEGE_IDS.includes(user.college_id) && (await session.colleges()).some(c => c.id === user.college_id) ? user.college_id : resolveCollege(user.college, await session.colleges()));
      return session.list(input, true);
    }),
    publicContext: actor => repository.read(async session => {
      const user = await session.admin(actor);
      if (user?.status !== 'active') throw new d.NewsError(403, '当前账号无效');
      const items = await session.colleges();
      return { items, collegeId: (require('../academicIdentity').COLLEGE_IDS.includes(user.college_id) && items.some(c => c.id === user.college_id) ? user.college_id : resolveCollege(user.college, items)) };
    }),
    publicDetail: (actor, postId) => repository.read(async session => {
      if ((await session.admin(actor))?.status !== 'active' || (session.readerAllowed && !await session.readerAllowed(actor))) throw new d.NewsError(403, '当前账号无效');
      const post = await session.get(d.id(postId), false, true); if (!d.visible(post)) throw new d.NewsError(404, '校园帖子不存在'); return post;
    }),
  };
}
module.exports = { createNewsService };
