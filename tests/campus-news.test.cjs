'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const { createNewsService } = require('../services/campusNews/service');
const { createRepository, Session } = require('../services/campusNews/repository');
const { createAssetService, normalize, localOnly } = require('../services/campusNews/assets');
const { createAdminRouter, createVisibilityGate } = require('../routes/campusNews');
const d = require('../services/campusNews/domain');
const { plan, validateSQL, apply } = require('../scripts/stage2-db/migrate.cjs');
const { validateTarget, TARGET } = require('../scripts/stage2-db/local-config.cjs');
const imageA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', imageB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const complete = () => ({ title: '校园讲座', content: '完整正文\n第二段', category: 'lecture', audience: { scope: 'all', collegeIds: [] }, imageAssetIds: [] });
const clone = value => structuredClone(value);
function memory() {
  let state = { users: { 1: { id: 1, role: 'admin', status: 'active', username: '管理员甲' }, 2: { id: 2, role: 'admin', status: 'active', username: '管理员乙' }, 3: { id: 3, role: 'student', status: 'active', username: '组织成员' } }, posts: {}, versions: [], audit: [], assetRows: {}, failAudit: false };
  let queue = Promise.resolve();
  const makeSession = data => ({
    admin: async actor => clone(data.users[actor]),
    colleges: async () => [{ id: 'cs', code: 'CS', name: '计算机学院' }, { id: 'eng', code: 'ENG', name: '工程学院' }],
    verifyColleges: async ids => { if (ids.some(id => !['cs','eng'].includes(id))) throw new d.NewsError(400, '学院不存在'); },
    assets: async ids => { if (ids.some(id => ![imageA,imageB].includes(id))) throw new d.NewsError(400, '图片不存在'); },
    get: async id => { if (!data.posts[id]) throw new d.NewsError(404, '不存在'); return clone(data.posts[id]); },
    list: async (_input, publicFeed, legacy) => ({ items: Object.values(data.posts).filter(post => publicFeed ? d.feedEligible(post) : legacy ? post.sourceKind === 'legacy' && !post.category : post.sourceKind === 'news' || post.category).map(clone), total: Object.keys(data.posts).length }),
    insert: async (actor, body, status) => {
      const id = String(Object.keys(data.posts).length + 1);
      data.posts[id] = { ...body, id, revision: 1, sourceKind: 'news', lifecycleStatus: status, createdBy: { id: String(actor), name: data.users[actor].username }, hiddenByAdmin: false, deletedAt: null, organizationId: null, feedTab: null, createdAt: '2026-01-01', publishedAt: status === 'published' ? '2026-01-01' : null, updatedAt: '2026-01-01', images: body.imageAssetIds.map(id => ({ id, url: `/image/${id}`, objectKey: id })) };
      delete data.posts[id].imageAssetIds;
      return clone(data.posts[id]);
    },
    update: async (post, changes) => {
      if (data.posts[post.id].revision !== post.revision) throw new d.NewsError(409, 'Conflict');
      const updated = { ...changes, revision: post.revision + 1 };
      if (changes.imageAssetIds) updated.images = changes.imageAssetIds.map(id => ({ id, url: `/image/${id}`, objectKey: id }));
      delete updated.imageAssetIds;
      data.posts[post.id] = clone(updated); return updated;
    },
    snapshot: async (post, actor, action) => {
      data.versions.push({ ...clone(post), actor: { id: actor.id, name: actor.username }, action, createdAt: '2026-01-01' });
      if (data.failAudit) throw new Error('simulated audit failure');
      data.audit.push({ postId: post.id, revision: post.revision, actorId: actor.id, action });
    },
    versions: async postId => ({ items: data.versions.filter(v => v.id === String(postId)).map(clone) }),
    sql: async (sql, params) => {
      if (sql.startsWith('INSERT INTO campus_news_assets')) data.assetRows[params[0]] = { id: params[0], state: 'pending', key: params[1] };
      else if (sql.includes("SET state='ready'")) data.assetRows[params[0]].state = 'ready';
      else if (sql.includes("SET state='failed'")) data.assetRows[params[0]].state = 'failed';
      else throw new Error('Unimplemented memory SQL');
      return { affectedRows: 1 };
    },
  });
  const repository = {
    transaction(work) {
      const operation = queue.then(async () => { const next = clone(state); const result = await work(makeSession(next)); state = next; return result; });
      queue = operation.catch(() => {}); return operation;
    },
    read: work => work(makeSession(state)),
  };
  return { repository, service: createNewsService(repository, () => '2026-10-28 12:00:00'), state: () => state };
}
test('Current DB role/status governs access, ignoring old JWT admin role and organization membership', async () => {
  const f = memory();
  await assert.rejects(f.service.createDraft(3, complete()), e => e.status === 403);
  f.state().users[1].role = 'student';
  await assert.rejects(f.service.createDraft(1, complete()), e => e.status === 403);
  f.state().users[2].status = 'deactivated';
  await assert.rejects(f.service.list(2, {}), e => e.status === 403);
  await assert.rejects(f.service.detail(999, 1), e => e.status === 401);
  assert.equal(Object.keys(f.state().posts).length, 0);
});
test('Incomplete drafts stay private; publishing validates complete content', async () => {
  const f = memory(); const body = { ...complete(), title: '', content: '', category: null };
  const post = await f.service.createDraft(1, body);
  assert.equal((await f.service.publicFeed(3, {})).items.length, 0);
  await assert.rejects(f.service.publicDetail(3, post.id), e => e.status === 404);
  await assert.rejects(f.service.mutate(1, post.id, { expectedRevision: 1 }, 'publish'), e => e.status === 400);
  assert.equal(f.state().versions.length, 1);
});
test('Published edits take immediate effect, shared admin ownership, revision increments once', async () => {
  const f = memory(); const post = await f.service.createPublished(1, complete());
  const updated = await f.service.mutate(2, post.id, { ...complete(), title: '已修改', expectedRevision: 1 }, 'update');
  assert.equal(updated.lifecycleStatus, 'published'); assert.equal(updated.revision, 2);
  assert.equal((await f.service.publicDetail(3, post.id)).title, '已修改');
  assert.equal(f.state().versions[0].title, '校园讲座'); assert.equal(f.state().versions[1].actor.id, 2);
});
test('Withdraw, edit while withdrawn, and republish preserve ID and initial publication time', async () => {
  const f = memory(); const p = await f.service.createPublished(1, complete());
  await f.service.mutate(1, p.id, { expectedRevision: 1 }, 'withdraw');
  await assert.rejects(f.service.publicDetail(3, p.id), e => e.status === 404);
  const changed = await f.service.mutate(2, p.id, { ...complete(), expectedRevision: 2 }, 'update');
  assert.equal(changed.lifecycleStatus, 'withdrawn');
  const published = await f.service.mutate(2, p.id, { expectedRevision: 3 }, 'publish');
  assert.equal(published.id, p.id); assert.equal(published.publishedAt, p.publishedAt); assert.equal(published.revision, 4);
});
test('Concurrent same-revision edits yield one success and one 409 without lost updates', async () => {
  const f = memory(); await f.service.createPublished(1, complete());
  const results = await Promise.allSettled([f.service.mutate(1, 1, { ...complete(), title: 'A', expectedRevision: 1 }, 'update'), f.service.mutate(2, 1, { ...complete(), title: 'B', expectedRevision: 1 }, 'update')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(f.state().versions.length, 2); assert.equal(f.state().posts[1].revision, 2);
});
test('Audit failure rolls back current content and complete snapshot together', async () => {
  const f = memory(); await f.service.createDraft(1, complete()); f.state().failAudit = true;
  await assert.rejects(f.service.mutate(1, 1, { ...complete(), title: 'must rollback', expectedRevision: 1 }, 'update'));
  assert.equal(f.state().posts[1].revision, 1); assert.equal(f.state().posts[1].title, '校园讲座');
  assert.equal(f.state().versions.length, 1); assert.equal(f.state().audit.length, 1);
});
test('Multiple colleges use directory IDs; unknown, duplicate and all+college input rejected', async () => {
  const f = memory(); const body = { ...complete(), audience: { scope: 'colleges', collegeIds: ['cs','eng'] } };
  assert.deepEqual((await f.service.createPublished(1, body)).audience.collegeIds, ['cs','eng']);
  for (const audience of [{ scope: 'all', collegeIds: ['cs'] }, { scope: 'colleges', collegeIds: ['unknown'] }, { scope: 'colleges', collegeIds: ['cs','cs'] }, { scope: 'colleges', collegeIds: [] }]) await assert.rejects(f.service.createPublished(1, { ...complete(), audience }), e => e.status === 400);
});
test('Source/status/visibility fields cannot be smuggled through create or update', async () => {
  const f = memory();
  for (const extra of [{ sourceKind: 'legacy' }, { source_kind: 'news' }, { hiddenByAdmin: false }, { lifecycleStatus: 'published' }, { deleted_at: null }]) await assert.rejects(f.service.createDraft(1, { ...complete(), ...extra }), e => e.status === 400);
  await f.service.createDraft(1, complete());
  await assert.rejects(f.service.mutate(1, 1, { ...complete(), expectedRevision: 1, sourceKind: 'news' }, 'update'), e => e.status === 400);
});
test('Hide/unhide is independent; soft deletion cannot be undone by unhide/publish', async () => {
  const f = memory(); await f.service.createPublished(1, complete());
  await f.service.mutate(1, 1, { expectedRevision: 1 }, 'hide');
  await assert.rejects(f.service.publicDetail(3, 1), e => e.status === 404);
  const visible = await f.service.mutate(2, 1, { expectedRevision: 2 }, 'unhide'); assert.equal(visible.lifecycleStatus, 'published');
  await f.service.mutate(1, 1, { expectedRevision: 3 }, 'delete');
  for (const action of ['unhide','publish','update']) await assert.rejects(f.service.mutate(1, 1, action === 'update' ? { ...complete(), expectedRevision: 4 } : { expectedRevision: 4 }, action), e => e.status === 409);
  assert.equal((await f.service.versions(2, 1)).items.length, 4);
});
test('Replacing image order preserves immutable old snapshots and referenced assets', async () => {
  const f = memory(); await f.service.createPublished(1, { ...complete(), imageAssetIds: [imageA,imageB] });
  await f.service.mutate(2, 1, { ...complete(), imageAssetIds: [imageB], expectedRevision: 1 }, 'update');
  assert.deepEqual(f.state().versions[0].images.map(i => i.id), [imageA,imageB]);
  assert.deepEqual(f.state().versions[1].images.map(i => i.id), [imageB]);
  const comparison = await f.service.compare(1, 1, '1', '2'); assert.ok(comparison.changes.some(c => c.field === 'images'));
  await assert.rejects(f.service.createPublished(1, { ...complete(), imageAssetIds: Array(11).fill(imageA) }), e => e.status === 400);
});
test('Historical classification preserves identity, chronology, images and hidden/withdrawn states; baseline r0 is retained', async () => {
  const f = memory(); await f.service.createPublished(1, complete());
  Object.assign(f.state().posts[1], { sourceKind: 'legacy', revision: 0, category: null, audience: { scope: 'unclassified', collegeIds: [] }, hiddenByAdmin: true, lifecycleStatus: 'withdrawn', createdAt: '2020-01-02', publishedAt: null, organizationId: 55, feedTab: 'school', images: [{ id: 'legacy-8', url: '/uploads/original.jpg' }] });
  f.state().versions = []; f.state().audit = [];
  const p = await f.service.mutate(2, 1, { expectedRevision: 0, category: 'competition', audience: { scope: 'colleges', collegeIds: ['cs'] } }, 'classify');
  assert.equal(p.createdAt, '2020-01-02'); assert.equal(p.publishedAt, null); assert.equal(p.organizationId, 55);
  assert.equal(p.createdBy.id, '1'); assert.equal(p.hiddenByAdmin, true); assert.equal(p.lifecycleStatus, 'withdrawn'); assert.equal(p.images[0].id, 'legacy-8');
  assert.deepEqual(f.state().versions.map(v => v.revision), [0,1]); assert.equal(f.state().versions[0].audience.scope, 'unclassified');
  assert.equal(d.feedEligible(p), false);
});
test('SQL repository wraps writes with transaction/rollback and guards revision in UPDATE', async () => {
  const calls = [];
  const connection = { beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'), execute: async sql => { calls.push(sql); return [{ affectedRows: 0 }]; } };
  const repo = createRepository({ getConnection: async () => connection }, x => x);
  await assert.rejects(repo.transaction(session => session.update({ id: 1, revision: 1 }, { ...complete(), audience: { scope: 'all', collegeIds: [] }, lifecycleStatus: 'published', hiddenByAdmin: false, deletedAt: null, publishedAt: null }, 'update')), e => e.status === 409);
  assert.deepEqual(calls.filter(x => ['begin','commit','rollback','release'].includes(x)), ['begin','rollback','release']);
  assert.ok(calls.some(x => x.includes('WHERE id=? AND revision=?')));
});
test('Real SQL snapshot path appends version + image references + audit; audit error rolls back', async () => {
  const calls = [];
  const connection = { beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'), execute: async (sql, params) => { calls.push(sql); if (sql.startsWith('INSERT INTO campus_news_audit')) throw new Error('audit failure'); if (sql.includes('campus_news_versions')) assert.equal(JSON.parse(params[2]).images[0].url.includes('imageToken'), false); return [{ insertId: 8 }]; } };
  const repo = createRepository({ getConnection: async () => connection }, x => x);
  await assert.rejects(repo.transaction(session => session.snapshot({ id: '1', revision: 1, images: [{ id: imageA, objectKey: 'campus-news/x.webp', url: '/image?imageToken=ephemeral' }] }, { id: 1, username: '管理员' }, 'update')));
  assert.ok(calls.some(sql => sql.includes('INSERT INTO campus_news_version_assets'))); assert.ok(calls.includes('rollback')); assert.ok(!calls.includes('commit'));
});
test('SQL feed uses stable historical time fallback, excludes unclassified/hidden/deleted/draft content', async () => {
  const calls = [];
  const session = new Session({ execute: async sql => { calls.push(sql); return [sql.includes('COUNT') ? [{ total: 0 }] : []]; } }, x => x);
  await session.list(d.filters({}), true);
  assert.ok(calls.every(sql => sql.includes("lifecycle_status='published'") && sql.includes('hidden_by_admin=0') && sql.includes('deleted_at IS NULL') && sql.includes('category IS NOT NULL')));
  assert.ok(calls.some(sql => sql.includes('COALESCE(published_at,created_at)')));
});

function invoke(router, method, url, body = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, headers: {}, body, query: Object.fromEntries(new URL(url, 'http://memory.test').searchParams), user: { id: 1, role: 'admin' } };
    const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, data }); return this; } };
    router.handle(req, res, error => error ? reject(error) : reject(new Error('Route not handled')));
  });
}
test('Actual Express router checks current admin before dispatch and returns 403 for revoked JWT admin', async () => {
  const f = memory(); f.state().users[1].role = 'student';
  const router = createAdminRouter({ authenticate: (_req, _res, next) => next(), service: f.service, assets: {} });
  const result = await invoke(router, 'POST', '/drafts', complete()); assert.equal(result.status, 403); assert.equal(Object.keys(f.state().posts).length, 0);
});
test('Actual Express routes use specific college/version paths and propagate 409 without fake success', async () => {
  const f = memory(); await f.service.createDraft(1, complete());
  const router = createAdminRouter({ authenticate: (_req, _res, next) => next(), service: f.service, assets: {} });
  assert.equal((await invoke(router, 'GET', '/colleges')).data.data.items.length, 2);
  assert.equal((await invoke(router, 'GET', '/1/versions')).data.data.items.length, 1);
  const result = await invoke(router, 'PUT', '/1', { ...complete(), expectedRevision: 0 }); assert.equal(result.status, 409); assert.equal(result.data.status, -1);
});
test('Old campus visibility gate rejects hidden/withdrawn/deleted across details/comments/likes; legacy anonymous stays allowed', async () => {
  for (const change of [{ hidden_by_admin: 1 }, { lifecycle_status: 'withdrawn' }, { deleted_at: 'date' }]) {
    const gate = createVisibilityGate({ query: async () => [{ source_kind: 'news', lifecycle_status: 'published', hidden_by_admin: 0, deleted_at: null, ...change }], authenticate: () => assert.fail('should stop before authentication') });
    const code = await new Promise(resolve => gate({ params: { id: '15' } }, { status(code) { resolve(code); return this; }, json() {} }, () => assert.fail('invisible content passed')));
    assert.equal(code, 404);
  }
  const gate = createVisibilityGate({ query: async () => [{ source_kind: 'legacy', lifecycle_status: 'published', hidden_by_admin: 0, deleted_at: null }], authenticate: () => assert.fail('legacy anonymous policy changed') });
  await new Promise((resolve, reject) => gate({ params: { id: '15' } }, {}, error => error ? reject(error) : resolve()));
});
test('Legacy organization publish still enforces membership and explicit server-owned legacy/published values', () => {
  const source = fs.readFileSync(require.resolve('../routes/square'), 'utf8');
  assert.match(source, /organization_memberships om JOIN organizations/);
  assert.match(source, /Number\(m.permission_level\) < 1/);
  assert.match(source, /VALUES \(\?, \?, \?, \?, \?, 'legacy', 'published'\)/);
  assert.match(source, /!\['organization_id','feed_tab','title','content'\]\.includes\(key\)/);
});
test('Image decoding validates actual format and size; Sharp uses only memory', async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
  const output = await normalize({ buffer: png, mimetype: 'image/png' }, imageA); assert.equal(output.contentType, 'image/webp');
  await assert.rejects(normalize({ buffer: png, mimetype: 'image/jpeg' }, imageA), e => e.status === 400);
  await assert.rejects(normalize({ buffer: Buffer.from('invalid'), mimetype: 'image/png' }, imageA));
  await assert.rejects(normalize({ buffer: Buffer.alloc(8 * 1024 * 1024 + 1), mimetype: 'image/png' }, imageA));
});
test('Local asset gate rejects remote/normal startup environment before file or storage access', () => {
  assert.throws(() => localOnly({}), e => e.status === 503);
  assert.throws(() => localOnly({ STAGE2_LOCAL_ISOLATED: '1', DB_HOST: 'remote', DB_NAME: 'xmumdorm_stage2_dev', DB_USER: 'xmumdorm_dev', DB_PORT: 3306 }));
});

test('Real multipart parser accepts one image, rejects extra files and fields (stream only, no sockets)', async () => {
  const { Readable } = require('node:stream');
  const router = createAdminRouter({ authenticate: (req, _res, next) => { req.user = { id: 1 }; next(); }, service: { assertAdmin: async () => {} }, assets: { upload: async (_actor, file) => ({ size: file.buffer.length }) } });
  const boundary = 'stage2-in-memory-multipart';
  async function submit(parts) {
    const body = Buffer.from(parts.map(part => `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.file ? '; filename="test.png"\r\nContent-Type: image/png' : ''}\r\n\r\npng-fixture\r\n`).join('') + `--${boundary}--\r\n`);
    return new Promise((resolve, reject) => {
      const req = Readable.from([body]); Object.assign(req, { method: 'POST', url: '/images', headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(body.length) } });
      const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ code: this.statusCode, data }); } };
      router.handle(req, res, reject);
    });
  }
  assert.equal((await submit([{ name: 'image', file: true }])).code, 200);
  assert.equal((await submit([{ name: 'image', file: true }, { name: 'image', file: true }])).code, 400);
  assert.equal((await submit([{ name: 'text', file: false }])).code, 400);
});
test('Failed upload is discoverable; compensation never deletes or overwrites an object', async () => {
  const f = memory(); let deletes = 0;
  const assets = createAssetService(f.repository, { put: async () => { throw new Error('disk failure'); }, delete: async () => deletes++ }, async (_file, id) => ({ key: `campus-news/${id}.webp`, contentType: 'image/webp', body: Buffer.from('processed') }), () => {});
  await assert.rejects(assets.upload(1, {}));
  assert.equal(Object.values(f.state().assetRows)[0].state, 'failed'); assert.equal(deletes, 0);
});
test('Migration target validation refuses remote/wrong database/user and connection strings', () => {
  validateTarget(TARGET);
  for (const options of [{ ...TARGET, host: 'localhost' }, { ...TARGET, database: 'jack_campus' }, { ...TARGET, user: 'root' }, { ...TARGET, socketPath: 'x' }, { ...TARGET, uri: 'mysql://bad' }, { ...TARGET, multipleStatements: true }]) assert.throws(() => validateTarget(options));
});
test('Candidate migration is allowlisted, seed-free and cannot switch database or alter original FK rules', () => {
  const candidate = plan(); assert.equal(candidate.statements.length, 21);
  for (const sql of ['USE jack_campus', 'DROP TABLE users', 'CREATE TABLE otherdb.users (id INT)', 'ALTER TABLE users DROP COLUMN role', 'CREATE TABLE surprise (id INT)']) assert.throws(() => validateSQL(sql));
  assert.ok(candidate.statements.every(s => !/^(INSERT|UPDATE|DELETE)/.test(s.sql)));
  const extension = candidate.statements.find(s => s.sql.startsWith('ALTER TABLE campus_posts')).sql;
  assert.doesNotMatch(extension, /DROP FOREIGN|ADD CONSTRAINT|RESTRICT/);
});
test('Migration executor refuses missing approval and wrong live identity with zero write statements', async () => {
  const calls = []; const connection = { query: async sql => { calls.push(sql); return [[{ db: 'production', account: 'xmumdorm_dev@localhost', port: 3306, version: '8.0.46' }]]; } };
  await assert.rejects(apply(connection, plan(), 'not-approved')); assert.equal(calls.length, 0);
  await assert.rejects(apply(connection, plan(), plan().hash)); assert.equal(calls.length, 1); assert.ok(calls[0].startsWith('SELECT'));
});
test('Existing frontend API adapter and actual Express routes agree across save/publish/withdraw/history (memory only)', async () => {
  const { createCampusNewsApi, NEWS_API } = await import('../frontend/src/features/admin-campus-news/apiClient.js');
  const f = memory(); const router = createAdminRouter({ authenticate: (_req, _res, next) => next(), service: f.service, assets: {} });
  const api = createCampusNewsApi(async (url, options = {}) => {
    const relative = url.replace(NEWS_API, '') || '/';
    const result = await invoke(router, options.method || 'GET', relative.startsWith('?') ? `/${relative}` : relative, options.body);
    return { ...result.data, __httpStatus: result.status };
  });
  const created = await api.createDraft(complete());
  const updated = await api.update(created.id, { ...complete(), title: '真实契约', expectedRevision: 1 }, 'draft');
  await api.publish(updated.id, 2);
  assert.equal((await api.detail(updated.id)).lifecycleStatus, 'published');
  await api.withdraw(updated.id, 3);
  assert.equal((await api.versions(updated.id)).items.length, 4);
  assert.equal((await api.compare(updated.id, 1, 2)).changes[0].field, 'title');
  assert.equal((await api.list({ page: 1 })).items.length, 1);
});
test('Image capability is asset-scoped and rechecks current role/content, without file or network access', async () => {
  const jwt = require('jsonwebtoken');
  // Test process only; never reads .env or ignored local secrets.
  process.env.JWT_SECRET = 'memory-test-signing-key-never-used-for-real-accounts';
  const user = { id: 3, role: 'admin', status: 'active' }; let publicImage = false;
  const assets = createAssetService({ read: work => work({ admin: async () => user, sql: async sql => sql.includes('FROM campus_news_assets') ? [{ object_key: `campus-news/${imageA}.webp`, storage_kind: 'local' }] : publicImage ? [{ ok: 1 }] : [] }) }, { file: () => '/memory/never-read.webp' });
  const token = jwt.sign({ purpose: 'campus-news-image', assetId: imageA, viewerId: 3 }, process.env.JWT_SECRET, { expiresIn: '1m' });
  assert.equal(jwt.verify(token, process.env.JWT_SECRET).id, undefined);
  assert.equal(await assets.signedImage(imageA, token), '/memory/never-read.webp');
  user.role = 'student'; await assert.rejects(assets.signedImage(imageA, token), e => e.status === 404);
  publicImage = true; assert.equal(await assets.signedImage(imageA, token), '/memory/never-read.webp');
  publicImage = false; await assert.rejects(assets.signedImage(imageA, token), e => e.status === 404);
  await assert.rejects(assets.signedImage(imageB, token), e => e.status === 401);
  user.status = 'deactivated'; await assert.rejects(assets.signedImage(imageA, token), e => e.status === 403);
  delete process.env.JWT_SECRET;
});
