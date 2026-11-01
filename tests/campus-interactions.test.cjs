'use strict';
// Pure memory: executes the real service/router against a SQL/row-lock model.
// This proves orchestration, not MySQL engine locking or browser behaviour.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');
const { createCampusInteractions, replyInteractionError } = require('../services/campusInteractions');
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
class Mutex {
  constructor() { this.tail = Promise.resolve(); }
  async acquire() {
    const previous = this.tail, release = deferred();
    this.tail = previous.then(() => release.promise);
    await previous;
    return () => release.resolve();
  }
}
function fixture(options = {}) {
  const state = { user: { id: 2, role: 'student', status: 'active' },
    post: { id: 15, source_kind: 'news', lifecycle_status: 'published', hidden_by_admin: 0,
      deleted_at: null, category: 'lecture', audience_scope: 'all', ...options.post },
    audiences: options.audiences ?? [{ college_id: 'test-college' }], likes: new Set(), comments: [], ...options.state };
  const log = [], mutex = new Mutex(); let connections = 0, commits = 0, rollbacks = 0, releases = 0, destroys = 0;
  const pool = { async getConnection() {
    const label = ++connections;
    let unlock, likes, comments;
    return {
      async beginTransaction() { log.push([label, 'BEGIN']); if (options.failBegin) throw new Error('begin failed'); },
      async execute(sql, params = []) {
        log.push([label, sql, params]);
        if (options.failQuery?.(sql)) throw Object.assign(new Error('fixture SQL failure'), { code: options.errorCode });
        if (sql.startsWith('SELECT id,role,status FROM users')) return [state.user ? [{ ...state.user }] : []];
        if (sql.startsWith('SELECT id,source_kind')) {
          options.postLockRequested?.();
          unlock = await mutex.acquire();
          likes = new Set(state.likes); comments = state.comments.map(c => ({ ...c }));
          return [state.post ? [{ ...state.post }] : []];
        }
        if (sql.startsWith('SELECT college_id')) return [state.audiences];
        if (sql.startsWith('SELECT post_id,COUNT(*)')) {
          return [params.map(post_id => ({ post_id, cnt: sql.includes('FROM campus_post_likes')
            ? [...likes].filter(key => key.startsWith(`${post_id}:`)).length
            : comments.filter(c => c.post_id === post_id && !c.deleted_at).length }))];
        }
        if (sql.startsWith('SELECT post_id FROM campus_post_likes')) return [params.slice(0, -1).filter(post_id => likes.has(`${post_id}:${params.at(-1)}`)).map(post_id => ({ post_id }))];
        if (sql.startsWith('SELECT 1 FROM campus_post_likes')) return [likes.has(`${params[0]}:${params[1]}`) ? [{}] : []];
        if (sql.startsWith('INSERT INTO campus_post_likes')) {
          likes.add(`${params[0]}:${params[1]}`); await options.afterWrite?.(); return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('DELETE FROM campus_post_likes')) {
          const changed = likes.delete(`${params[0]}:${params[1]}`); await options.afterWrite?.(); return [{ affectedRows: Number(changed) }];
        }
        if (sql.startsWith('SELECT COUNT')) return [[{ cnt: sql.includes('campus_post_comments') ? comments.filter(c=>c.post_id===params[0]&&!c.deleted_at).length : [...likes].filter(key => key.startsWith(`${params[0]}:`)).length }]];
        if (sql.startsWith('SELECT id FROM campus_post_comments')) return [comments.filter(c=>c.post_id===params[0]&&c.id===params[1])];
        if (sql.startsWith('SELECT id,parent_id FROM campus_post_comments')) return [comments.filter(c => c.id === params[0] && c.post_id === params[1] && !c.deleted_at)];
        if (sql.startsWith('INSERT INTO campus_post_comments')) {
          const comment = { id: comments.length + 100, post_id: params[0], user_id: params[1], parent_id: params[2], content: params[3], created_at: '2026-10-28' };
          comments.push(comment); await options.afterWrite?.(); return [{ affectedRows: 1, insertId: comment.id }];
        }
        if (sql.includes('LEFT JOIN users u')) return [comments.filter(c => c.post_id === params[0] && c.id === params[1]).map(c => ({ ...c, username: 'test-student', nickname: null, avatar: null }))];
        throw new Error(`Unmodelled SQL: ${sql}`);
      },
      async commit() {
        log.push([label, 'COMMIT']);
        if (options.failCommit) throw new Error('commit acknowledgement lost');
        if (likes) state.likes = likes;
        if (comments) state.comments = comments;
        commits++;
      },
      async rollback() { log.push([label, 'ROLLBACK']); rollbacks++; if (options.failRollback) throw new Error('rollback failed'); },
      release() { releases++; unlock?.(); },
      destroy() { destroys++; unlock?.(); },
    };
  } };
  const service = createCampusInteractions({ pool, cleanText: x => String(x ?? '').trim(), mapAuthor: r => ({ id: r.user_id, username: r.username, name: r.username, nickname: r.nickname, avatar: r.avatar }) });
  return { state, service, pool, log, mutex, stats: () => ({ connections, commits, rollbacks, releases, destroys }) };
}

for (const source_kind of ['news', 'legacy']) {
  test(`${source_kind}: published classified visible campus keeps existing toggle/comment result`, async () => {
    const f = fixture({ post: { source_kind } });
    assert.deepEqual(await f.service.toggleLike(2, '15'), { liked: true, like_count: 1 });
    assert.deepEqual(await f.service.toggleLike(2, '15'), { liked: false, like_count: 0 });
    const comment = await f.service.comment(2, '15', { content: ' comment ' });
    assert.equal(comment.content, 'comment'); assert.equal(comment.user_id, '2'); assert.equal(comment.parent_id, null);
    assert.equal(f.state.comments.length, 1); assert.equal(f.stats().commits, 3);
  });
  for (const [name, change] of [
    ['draft', { lifecycle_status: 'draft' }], ['withdrawn', { lifecycle_status: 'withdrawn' }],
    ['hidden', { hidden_by_admin: 1 }], ['deleted', { deleted_at: '2026-10-28' }],
    ['unclassified', { category: null }], ['audience incomplete', { audience_scope: null }],
  ]) test(`${source_kind}: ${name} refuses both writes without any interaction change`, async () => {
    for (const operation of ['toggleLike', 'comment']) {
      const f = fixture({ post: { source_kind, ...change } });
      await assert.rejects(f.service[operation](2, 15, { content: 'fixture' }), e => e.status === 404);
      assert.equal(f.state.likes.size, 0); assert.equal(f.state.comments.length, 0); assert.equal(f.stats().commits, 0);
      assert.equal(f.log.some(entry => /^(INSERT|DELETE)/.test(entry[1])), false);
      assert.equal(f.stats().rollbacks, 1); assert.equal(f.stats().releases, 1);
    }
  });
}
test('No login, invalid/partial IDs, missing or inactive users fail closed', async () => {
  const f = fixture();
  await assert.rejects(f.service.toggleLike(null, 15), e => e.status === 401);
  for (const value of ['15posts', '15.1', '0', '-1', '2147483648']) await assert.rejects(f.service.toggleLike(2, value), e => e.status === 400);
  assert.equal(f.stats().connections, 0);
  for (const user of [null, { id: 2, role: 'admin', status: 'deactivated' }, { id: 2, role: 'student', status: 'banned' }]) {
    const x = fixture({ state: { user } });
    await assert.rejects(x.service.toggleLike(2, 15), e => [401, 403].includes(e.status));
    assert.equal(x.log.some(entry => entry[1].includes('FROM campus_posts')), false);
  }
});
test('No post, unknown source, incomplete college audience all refuse without admin override', async () => {
  for (const options of [{ state: { post: null } }, { post: { source_kind: 'posts' } }, { post: { audience_scope: 'colleges' }, audiences: [] }]) {
    const f = fixture(options); f.state.user.role = 'admin';
    await assert.rejects(f.service.toggleLike(2, 15), e => e.status === 404);
    assert.equal(f.stats().commits, 0);
  }
  const f = fixture({ post: { audience_scope: 'colleges' } });
  assert.equal((await f.service.toggleLike(2, 15)).liked, true);
});
test('Actor uses current DB identity; role revoke does not grant or remove student interaction rights', async () => {
  const f = fixture(); f.state.user.role = 'admin';
  await f.service.toggleLike(2, 15);
  f.state.user.role = 'student';
  await f.service.toggleLike(2, 15);
  f.state.post.hidden_by_admin = 1;
  await assert.rejects(f.service.toggleLike(2, 15), e => e.status === 404);
  assert.equal(f.state.likes.size, 0);
});
test('Same connection transaction order: current user, campus row lock, write, count, commit, release', async () => {
  const f = fixture(); await f.service.toggleLike(2, 15);
  const statements = f.log.map(e => e[1]);
  assert.equal(statements[0], 'BEGIN'); assert.match(statements[1], /FROM users WHERE id=\? FOR SHARE$/);
  assert.match(statements[2], /FROM campus_posts WHERE id=\? FOR UPDATE$/);
  assert.match(statements[4], /^INSERT INTO campus_post_likes/); assert.equal(statements.at(-1), 'COMMIT');
  assert.equal(new Set(f.log.map(e => e[0])).size, 1); assert.equal(f.stats().releases, 1);
});
test('Campus parent rule keeps same-post validation and refuses deleted or malformed threads', async () => {
  for (const parent of [{ id: 8, post_id: 99 }, { id: 8, post_id: 15, deleted_at: 'date' }, { id: 8, post_id: 15, parent_id: 7 }]) {
    const f = fixture({ state: { comments: [parent] } });
    await assert.rejects(f.service.comment(2, 15, { content: 'reply', parent_id: 8 }), e => [400, 404,409].includes(e.status));
    assert.equal(f.state.comments.length, 1);
  }
  const f = fixture({ state: { comments: [{ id: 8, post_id: 15, parent_id: null }] } });
  assert.equal((await f.service.comment(2, 15, { content: 'reply', parent_id: 8 })).parent_id, '8');
  assert.match(f.log.find(e => e[1].startsWith('SELECT id FROM campus_post_comments'))[1], /FOR UPDATE$/);
});
for (const operation of ['toggleLike', 'comment']) {
  test(`${operation}: later SQL failure rolls back the actual interaction`, async () => {
    const f = fixture({ failQuery: sql => sql.startsWith('SELECT COUNT') || sql.includes('LEFT JOIN users u') });
    await assert.rejects(f.service[operation](2, 15, { content: 'fixture' }), e => e.status === 503);
    assert.equal(f.state.likes.size, 0); assert.equal(f.state.comments.length, 0);
    assert.equal(f.stats().rollbacks, 1); assert.equal(f.stats().commits, 0);
  });
}
for (const errorCode of ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']) test(`${errorCode}: explicit busy response, rollback and no automatic retry`, async () => {
  const f = fixture({ failQuery: sql => sql.startsWith('SELECT id,source_kind'), errorCode });
  await assert.rejects(f.service.toggleLike(2, 15), e => e.status === 503 && e.code === 'CAMPUS_INTERACTION_BUSY');
  assert.equal(f.stats().connections, 1); assert.equal(f.stats().rollbacks, 1); assert.equal(f.stats().commits, 0);
});
test('Commit acknowledgement failure marks unknown outcome, rollback failure destroys connection', async () => {
  const f = fixture({ failCommit: true, failRollback: true });
  await assert.rejects(f.service.toggleLike(2, 15), e => e.code === 'CAMPUS_INTERACTION_OUTCOME_UNKNOWN' && e.reconcile);
  assert.equal(f.stats().destroys, 1); assert.equal(f.stats().releases, 0); assert.equal(f.stats().connections, 1);
});
test('Connection/begin/missing schema failures do not become success or start another transaction', async () => {
  for (const options of [{ failBegin: true }, { failQuery: () => true, errorCode: 'ER_NO_SUCH_TABLE' }]) {
    const f = fixture(options); await assert.rejects(f.service.toggleLike(2, 15), e => e.status === 503);
    assert.equal(f.stats().connections, 1); assert.equal(f.stats().commits, 0); assert.equal(f.stats().releases, 1);
  }
  const service = createCampusInteractions({ pool: { getConnection: async () => { throw new Error('offline'); } } });
  await assert.rejects(service.toggleLike(2, 15), e => e.status === 503);
});

for (const [stateName, change] of [['hide', { hidden_by_admin: 1 }], ['withdraw', { lifecycle_status: 'withdrawn' }], ['delete', { deleted_at: 'date' }]]) {
  for (const operation of ['toggleLike', 'comment']) test(`Memory lock model: ${stateName} commits before ${operation}; late write denied`, async () => {
    const requested = deferred();
    const f = fixture({ postLockRequested: requested.resolve });
    const unlock = await f.mutex.acquire();
    const pending = f.service[operation](2, 15, { content: 'late' });
    await requested.promise;
    Object.assign(f.state.post, change); unlock();
    await assert.rejects(pending, e => e.status === 404);
    assert.equal(f.state.likes.size, 0); assert.equal(f.state.comments.length, 0);
  });
  test(`Memory lock model: interaction obtains lock first; ${stateName} waits until commit`, async () => {
    const written = deferred(), proceed = deferred();
    const f = fixture({ afterWrite: async () => { written.resolve(); await proceed.promise; } });
    const interaction = f.service.toggleLike(2, 15); await written.promise;
    let changed = false;
    const moderation = (async () => { const unlock = await f.mutex.acquire(); Object.assign(f.state.post, change); changed = true; unlock(); })();
    await Promise.resolve(); assert.equal(changed, false);
    proceed.resolve(); await interaction; await moderation;
    assert.equal(f.state.likes.size, 1); assert.equal(changed, true);
    await assert.rejects(f.service.toggleLike(2, 15), e => e.status === 404);
    assert.equal(f.state.likes.size, 1);
  });
}
test('Concurrent old toggles serialize without duplicate rows, still intentionally toggle rather than idempotent', async () => {
  const f = fixture(); const outcomes = await Promise.all([f.service.toggleLike(2, 15), f.service.toggleLike(2, 15)]);
  assert.deepEqual(outcomes.map(r => r.liked), [true, false]); assert.equal(f.state.likes.size, 0);
});
test('No new DDL, notification, reward or ordinary post SQL is reachable in campus service', async () => {
  const f = fixture(); await f.service.toggleLike(2, 15); await f.service.comment(2, 15, { content: 'fixture' });
  for (const [, sql] of f.log) assert.doesNotMatch(sql, /\b(posts|trending_posts|notifications|exp_logs)\b|\b(CREATE|ALTER|DROP)\b/);
  const source = fs.readFileSync(require.resolve('../services/campusInteractions'), 'utf8');
  assert.doesNotMatch(source, /require\(['"].*(notification|expService|objectStorage)/);
  const repo = fs.readFileSync(require.resolve('../services/campusNews/repository'), 'utf8');
  assert.match(repo, /FROM users WHERE id=\?.*FOR SHARE/);
  assert.match(repo, /FROM campus_posts WHERE id=\?.*FOR UPDATE/);
  const service = fs.readFileSync(require.resolve('../services/campusNews/service'), 'utf8');
  assert.ok(service.indexOf('session.admin(actor, writing)') < service.indexOf('session.get(postId, true)'));
});

function routeFixture({ actor = { id: 2, role: 'admin' }, model = fixture(), afterGate, trending = false } = {}) {
  let trendingLiked = false, notices = 0, rewards = 0;
  const query = async (sql) => {
    if (sql.startsWith('SELECT source_kind')) { const result = [{ ...model.state.post }]; afterGate?.(); return result; }
    if (sql.startsWith('SELECT status FROM users')) return model.state.user ? [{ status: model.state.user.status }] : [];
    if (!trending) throw new Error(`Campus query escaped connection: ${sql}`);
    if (sql.includes('SELECT id FROM trending_posts')) return [{ id: 15 }];
    if (sql.includes('SELECT user_id FROM trending_posts')) return [{ user_id: 9 }];
    if (sql.includes('SELECT 1 FROM trending_post_likes')) return trendingLiked ? [{}] : [];
    if (sql.includes('INSERT INTO trending_post_likes')) { trendingLiked = true; return { affectedRows: 1 }; }
    if (sql.includes('DELETE FROM trending_post_likes')) { trendingLiked = false; return { affectedRows: 1 }; }
    if (sql.includes('COUNT(*) AS cnt FROM trending_post_likes')) return [{ cnt: Number(trendingLiked) }];
    throw new Error(`Unmodelled route query: ${sql}`);
  };
  const noop = (_req, _res, next) => next();
  const auth = (req, res, next) => { if (!actor) return res.status(401).json({ status: -1 }); req.user = actor; next(); };
  const dependencies = {
    express, path: require('node:path'), jsonwebtoken: require('jsonwebtoken'), '../database': { query, pool: model.pool },
    '../services/campusInteractions': require('../services/campusInteractions'), '../services/campusLikeStats': require('../services/campusLikeStats'),
    '../middleware/checkSanction': { checkSanction: noop, checkCampusSanction: noop },
    '../scripts/stage2-local/http-boundary.cjs': { rejectLegacyCampusImages: noop },
    '../middleware/sensitiveWordFilter': Object.assign(noop, { strict: noop }),
    '../services/notificationService': { createNotification: async () => { notices++; if (!trending) throw new Error('Campus notification forbidden'); } },
    '../middleware/auth': auth, '../middleware/upload': { bannerImageUpload: noop, postImagesUpload: noop },
    '../services/auditLog': { logAudit() {} }, '../utils/assets': { assetUrl: x => x },
    '../services/objectStorage': {}, '../services/imageProcessing': {}, '../utils/simpleCache': {},
    'sanitize-html': require('sanitize-html'), '../services/expService': { grantExp: async () => { rewards++; }, revokeByRef: async () => { rewards++; }, checkAndGrantPostPopularRewards: async () => { rewards++; } },
    '../utils/expResponse': { attachExp: x => x }, '../utils/expEligibility': {}, '../services/advertisementTarget': {},
    '../services/squareHomeService': {}, '../services/squareRecommendationService': {}, './campusNews': require('../routes/campusNews'),
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/square'), 'utf8'), {
    module, exports: module.exports, require: key => { if (!Object.hasOwn(dependencies, key)) throw new Error(`Unmocked dependency ${key}`); return dependencies[key]; },
    console: { error() {} }, process: { env: {} }, Buffer, URL,
  });
  function invoke(url, body = {}, method = 'POST', requestHeaders = {}) {
    return new Promise((resolve, reject) => {
      const req = { method, url, headers: requestHeaders, query: Object.fromEntries(new URL(url,'http://localhost').searchParams), body };
      const headers = {};
      const res = { statusCode: 200, setHeader(k, v) { headers[k] = v; }, status(v) { this.statusCode = v; return this; }, json(data) { resolve({ status: this.statusCode, data, headers }); } };
      module.exports.handle(req, res, e => reject(e || new Error('Route not handled')));
    });
  }
  return { invoke, effects: () => ({ notices, rewards }), model };
}
test('Actual old route preserves success envelope and marks toggle deprecated/non-retry-safe', async () => {
  const f = routeFixture({ model: fixture({ post: { source_kind: 'legacy' } }) });
  const liked = await f.invoke('/campus-posts/15/like');
  assert.equal(liked.status, 200); assert.equal(liked.data.status, 0); assert.equal(liked.data.message, '点赞成功');
  assert.deepEqual(liked.data.data, { liked: true, like_count: 1 });
  assert.equal(liked.headers['X-API-Deprecated'], 'true'); assert.equal(liked.headers['X-API-Retry-Safe'], 'false');
  const comment = await f.invoke('/campus-posts/15/comments', { content: 'hello' });
  assert.equal(comment.status, 200); assert.equal(comment.data.message, '评论成功'); assert.equal(comment.data.data.content, 'hello');
  assert.deepEqual(f.effects(), { notices: 0, rewards: 0 });
});
test('Actual route unauthenticated request cannot obtain a transaction', async () => {
  const f = routeFixture({ actor: null });
  assert.equal((await f.invoke('/campus-posts/15/like')).status, 401);
  assert.equal(f.model.stats().connections, 0);
});
test('Actual route ignores stale JWT admin; current DB account/status governs writes', async () => {
  const f = routeFixture({ model: fixture({ state: { user: { id: 2, role: 'student', status: 'deactivated' } } }) });
  assert.equal((await f.invoke('/campus-posts/15/like')).status, 403);
  assert.equal(f.model.state.likes.size, 0);
});
test('Actual route rechecks latest state even if outer gate already passed', async () => {
  for (const change of [{ hidden_by_admin: 1 }, { lifecycle_status: 'withdrawn' }, { deleted_at: 'date' }, { category: null }]) {
    const model = fixture(); const f = routeFixture({ model, afterGate: () => Object.assign(model.state.post, change) });
    assert.equal((await f.invoke('/campus-posts/15/like')).status, 404); assert.equal(model.state.likes.size, 0);
  }
});
test('Actual ordinary square toggle keeps its original independent behaviour, same numeric ID does not touch campus', async () => {
  const f = routeFixture({ trending: true });
  assert.equal((await f.invoke('/trending/posts/15/like')).data.data.liked, true);
  assert.equal((await f.invoke('/trending/posts/15/like')).data.data.liked, false);
  assert.equal(f.model.stats().connections, 0); assert.equal(f.model.state.likes.size, 0);
  assert.equal(f.effects().notices, 1); assert.ok(f.effects().rewards > 0);
});
test('Error responses identify busy/unknown outcomes without leaking SQL or enabling auto retry', () => {
  const res = { status(v) { this.code = v; return this; }, json(data) { this.data = data; } };
  replyInteractionError(new Error('secret SQL'), res);
  assert.equal(res.code, 503); assert.equal(res.data.retry_safe, false); assert.equal(JSON.stringify(res.data).includes('secret SQL'), false);
});

for (const source_kind of ['news', 'legacy']) test(`04D ${source_kind}: PUT/DELETE desired state repeats without inversions`, async () => {
  const f = fixture({ post: { source_kind } });
  const first = await f.service.setLike(2, 15, true), second = await f.service.setLike(2, 15, true);
  assert.equal(first.changed, true); assert.equal(second.changed, false);
  assert.equal(second.liked, true); assert.equal(second.like_count, 1);
  assert.equal(second.post_id, '15'); assert.equal(second.target_type, 'campus_post');
  assert.equal((await f.service.setLike(2, 15, false)).changed, true);
  const repeated = await f.service.setLike(2, 15, false);
  assert.equal(repeated.changed, false); assert.equal(repeated.liked, false); assert.equal(repeated.like_count, 0);
});
test('04D concurrent same user requests are idempotent and different users contribute separately', async () => {
  const f = fixture();
  await Promise.all([f.service.setLike(2, 15, true), f.service.setLike(2, 15, true), f.service.setLike(3, 15, true)]);
  assert.equal(f.state.likes.size, 2); assert.equal((await f.service.interactions(2, 15)).like_count, 2);
  await Promise.all([f.service.setLike(2, 15, false), f.service.setLike(2, 15, false)]);
  assert.equal(f.state.likes.size, 1);
});
test('04D opposing desired states use lock acquisition order, without toggle retry', async () => {
  const f = fixture();
  await Promise.all([f.service.setLike(2, 15, true), f.service.setLike(2, 15, false)]);
  assert.equal(f.state.likes.size, 0);
});
test('04D stats include live roots and replies, exclude tombstones, keep target namespaces', async () => {
  const f = fixture({ state: { comments: [{ id: 1, post_id: 15, parent_id: null }, { id: 2, post_id: 15, parent_id: 1 }, { id: 3, post_id: 15, deleted_at: 'date' }, { id: 4, post_id: 99 }] } });
  await f.service.setLike(2, 15, true);
  const data = await f.service.interactions(2, 15);
  assert.equal(data.liked, true); assert.equal(data.like_count, 1); assert.equal(data.comment_count, 2);
  assert.match(f.log.find(e => e[1].startsWith('SELECT id,source_kind') && e[1].endsWith('FOR SHARE'))[1], /WHERE id=\? FOR SHARE/);
});
test('04D guest legacy state is null, news requires login, unclassified legacy remains read-only', async () => {
  const f = fixture({ post: { source_kind: 'legacy', category: null } });
  const data = await f.service.interactions(null, 15);
  assert.equal(data.liked, null); assert.equal(data.can_like, false);
  await assert.rejects(f.service.setLike(2, 15, true), e => e.status === 404);
  await assert.rejects(fixture().service.interactions(null, 15), e => e.status === 401);
});
for (const change of [{ lifecycle_status: 'draft' }, { lifecycle_status: 'withdrawn' }, { hidden_by_admin: 1 }, { deleted_at: 'date' }, { category: null }]) test(`04D desired state preserves 04C rejection: ${JSON.stringify(change)}`, async () => {
  const f = fixture({ post: change });
  for (const desired of [true, false]) await assert.rejects(f.service.setLike(2, 15, desired), e => e.status === 404);
  assert.equal(f.state.likes.size, 0);
});
test('04D post-write statistics failure rolls back desired state, unknown commit remains reconcilable', async () => {
  const f = fixture({ failQuery: sql => sql.startsWith('SELECT post_id,COUNT') });
  await assert.rejects(f.service.setLike(2, 15, true), e => e.status === 503);
  assert.equal(f.state.likes.size, 0);
  await assert.rejects(fixture({ failCommit: true }).service.setLike(2, 15, true), e => e.reconcile === true);
});
test('04D real router wires explicit verbs, returns changed, ignores JWT role and blocks overrides', async () => {
  const f = routeFixture();
  const first = await f.invoke('/campus-posts/15/like', {}, 'PUT');
  assert.equal(first.status, 200); assert.equal(first.data.data.changed, true);
  assert.equal((await f.invoke('/campus-posts/15/like', {}, 'PUT')).data.data.changed, false);
  assert.equal((await f.invoke('/campus-posts/15/interactions', {}, 'GET')).data.data.liked, true);
  assert.equal((await f.invoke('/campus-posts/15/like', {}, 'DELETE')).data.data.liked, false);
  assert.equal((await f.invoke('/campus-posts/15/like', { liked: false }, 'PUT')).status, 400);
  assert.equal((await routeFixture({ actor: null }).invoke('/campus-posts/15/like', {}, 'PUT')).status, 401);
  assert.deepEqual(f.effects(), { notices: 0, rewards: 0 });
});
test('04D compatibility POST accepts explicit desired state but never silently executes keyed toggle', async () => {
  const f = routeFixture();
  assert.equal((await f.invoke('/campus-posts/15/like', { liked: true })).status, 200);
  assert.equal((await f.invoke('/campus-posts/15/like', { liked: true })).data.data.like_count, 1);
  assert.equal((await f.invoke('/campus-posts/15/like')).status, 409);
  const blocked = await f.invoke('/campus-posts/15/like', {}, 'POST', { 'idempotency-key': 'fixture' });
  assert.equal(blocked.status, 503); assert.equal(blocked.data.code, 'CAMPUS_TOGGLE_RECEIPTS_UNAVAILABLE');
  assert.equal(f.model.state.likes.size, 1);
});
test('04D batch read model uses at most three parameterized queries, never per-post loops', async () => {
  const { campusLikeStats } = require('../services/campusLikeStats');
  const calls = [];
  const data = await campusLikeStats(async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('COUNT') && sql.includes('campus_post_likes')) return [{ post_id: 15, cnt: '2' }];
    if (sql.includes('COUNT')) return [{ post_id: 16, cnt: '3' }];
    return [{ post_id: 16 }];
  }, [15, 16, 15], 2);
  assert.equal(calls.length, 3); assert.equal(data.get('15').like_count, 2); assert.equal(data.get('16').liked, true);
  assert.equal(data.get('16').comment_count, 3); assert.deepEqual(calls[0].params, [15, 16]);
  assert.equal((await campusLikeStats(async () => assert.fail(), [], 2)).size, 0);
});

test('04E actual router keyed comments, thread reads and deletes use protected campus service',async()=>{
  process.env.JWT_SECRET='route-test-only-comment-secret';
  const {fixture:commentsFixture}=require('./helpers/campusCommentMemory.cjs');
  const f=routeFixture({model:commentsFixture(),actor:{id:2,role:'admin'}});
  const key=require('node:crypto').randomUUID(),headers={'idempotency-key':key};
  const created=await f.invoke('/campus-posts/15/comments',{content:'route root'},'POST',headers);
  assert.equal(created.status,200);assert.equal(created.data.data.parent_id,null);
  assert.equal((await f.invoke('/campus-posts/15/comments',{content:'route root'},'POST',headers)).data.data.id,created.data.data.id);
  assert.equal((await f.invoke('/campus-posts/15/comments',{content:'different'},'POST',headers)).status,409);
  const page=await f.invoke('/campus-posts/15/comments?view=threads',{},'GET');assert.equal(page.status,200);assert.equal(page.data.data.items.length,1);
  const replies=await f.invoke(`/campus-posts/15/comments/${created.data.data.id}/replies`,{},'GET');assert.equal(replies.status,200);
  const deleted=await f.invoke(`/campus-posts/15/comments/${created.data.data.id}`,{},'DELETE');assert.equal(deleted.status,200);assert.equal(deleted.data.data.content,null);
  assert.deepEqual(f.effects(),{notices:0,rewards:0});
});
