'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');
const { localHttpBoundary, rejectLegacyCampusImages } = require('../scripts/stage2-local/http-boundary.cjs');
function load(filename, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve(filename), 'utf8'), {
    module, exports: module.exports, require: name => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unmocked import ${name}`);
      return dependencies[name];
    }, console: { error() {}, warn() {}, log() {} }, process: { env: {} }, Buffer, URL, setTimeout, clearTimeout,
  }, { filename });
  return module.exports;
}
function response() {
  return { statusCode: 200, data: null, status(value) { this.statusCode = value; return this; }, json(value) { this.data = value; return this; } };
}
function missing() { const error = new Error('fixture missing dependency'); error.code = 'ER_NO_SUCH_TABLE'; throw error; }
test('Campus sanction missing table, query failure or malformed result refuses request; valid empty and active rows behave normally', async () => {
  for (const query of [async () => missing(), async () => { throw new Error('connection failure'); }, async () => null]) {
    const api = load('../middleware/checkSanction.js', { '../database': { query } }); const res = response(); let next = 0;
    await api.checkCampusSanction({ user: { id: 3 } }, res, () => next++);
    assert.equal(res.statusCode, 503); assert.equal(next, 0);
  }
  for (const [rows, code] of [[[], 200], [[{ type: 'ban', ends_at: null }], 403], [[{ type: 'mute', ends_at: '2030-01-01' }], 403]]) {
    const api = load('../middleware/checkSanction.js', { '../database': { query: async () => rows } }); const res = response(); let next = 0;
    await api.checkCampusSanction({ user: { id: 3 } }, res, () => next++);
    assert.equal(res.statusCode, code); assert.equal(next, code === 200 ? 1 : 0);
  }
});
test('Campus filter distinguishes empty table from query failure, including warm or empty-body requests', async () => {
  let fail = false, queries = 0;
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => { queries++; if (fail) missing(); return []; } } });
  let next = 0; const req = { body: { title: 'fixture', content: '正文' } };
  await filter.strict(req, response(), () => next++); assert.equal(next, 1); assert.equal(queries, 1);
  fail = true;
  for (const body of [req.body, {}]) {
    const res = response(); await filter.strict({ body }, res, () => next++); assert.equal(res.statusCode, 503);
  }
  assert.equal(next, 1); assert.equal(queries, 3);
});
test('Failed cache refresh does not reuse previously successful nonempty words for campus writes', async () => {
  let fail = false;
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => { if (fail) throw new Error('offline'); return [{ word: 'spam' }]; } } });
  const blocked = response(); await filter.strict({ body: { content: 'spam' } }, blocked, () => assert.fail()); assert.equal(blocked.statusCode, 400);
  fail = true; const unavailable = response(); await filter.strict({ body: { content: 'clean' } }, unavailable, () => assert.fail()); assert.equal(unavailable.statusCode, 503);
});
test('Valid word list retains ASCII word boundaries, Chinese matching and safe failure on malformed rows', async () => {
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => [{ word: 'sb' }, { word: '违规' }] } });
  let next = 0; await filter.strict({ body: { content: 'USB ISBN base64' } }, response(), () => next++); assert.equal(next, 1);
  for (const text of ['sb', '中文违规内容']) { const res = response(); await filter.strict({ body: { content: text } }, res, () => assert.fail()); assert.equal(res.statusCode, 400); }
  const invalid = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => ({}) } }); const res = response();
  await invalid.strict({ body: { content: 'fixture' } }, res, () => assert.fail()); assert.equal(res.statusCode, 503);
});
test('Unrelated middleware consumers retain their existing policy and exported helper contracts', async () => {
  const sanctions = load('../middleware/checkSanction.js', { '../database': { query: async () => missing() } }); let next = 0;
  await sanctions.checkSanction({ user: { id: 3 } }, response(), () => next++);
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => missing() } });
  await filter({ body: { content: 'fixture' } }, response(), () => next++);
  assert.equal(next, 2); assert.equal(typeof sanctions.checkBan, 'function'); assert.equal(typeof sanctions.checkMute, 'function');
  for (const name of ['refreshCache','getSensitiveWords','checkText']) assert.equal(typeof filter[name], 'function');
});
test('Strict campus middleware is Express normal middleware, not an accidental four-argument error handler', () => {
  const sanctions = load('../middleware/checkSanction.js', { '../database': { query: async () => [] } });
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query: async () => [] } });
  assert.equal(sanctions.checkCampusSanction.length, 3); assert.equal(filter.strict.length, 3);
});
function squareFixture({ member = { permission_level: 1, org_type: 'Official' }, body, files = [], failSanction = false, failWords = false, words = [] } = {}) {
  const queries = [], uploads = []; let parsed = 0;
  const query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('FROM user_sanctions')) return failSanction ? missing() : [];
    if (sql.includes('FROM sensitive_words')) return failWords ? missing() : words;
    if (sql.includes('organization_memberships om JOIN organizations')) return member ? [member] : [];
    if (sql.startsWith('INSERT INTO campus_posts')) return { insertId: 15 };
    throw new Error(`Unexpected fixture SQL ${sql}`);
  };
  const sanctions = load('../middleware/checkSanction.js', { '../database': { query } });
  const filter = load('../middleware/sensitiveWordFilter.js', { '../database': { query } });
  const noop = async () => {};
  const dependencies = {
    express, path: require('node:path'), jsonwebtoken: require('jsonwebtoken'), '../database': { query },
    '../middleware/checkSanction': sanctions, '../middleware/sensitiveWordFilter': filter,
    '../services/notificationService': { createNotification: async () => { throw new Error('Notification path must not be reached'); } },
    '../middleware/auth': (req, _res, next) => { req.user = { id: 3, role: 'student' }; next(); },
    '../middleware/upload': { postImagesUpload: (req, _res, next) => { parsed++; req.body = body || { organization_id: '7', feed_tab: 'school', title: '校园通知', content: '正文' }; req.files = files; next(); }, bannerImageUpload: (_req, _res, next) => next() },
    '../scripts/stage2-local/http-boundary.cjs': { rejectLegacyCampusImages },
    '../services/auditLog': { logAudit: noop }, '../utils/assets': { assetUrl: x => x },
    '../services/objectStorage': { uploadBuffer: async () => { uploads.push(1); throw new Error('Remote storage fixture forbidden'); } },
    '../services/imageProcessing': { prepareImageUpload: async value => value },
    '../utils/simpleCache': { simpleCache: { getOrSet: (_key, _ttl, work) => work(), delete() {} } },
    'sanitize-html': require('sanitize-html'),
    '../services/expService': { grantExp: noop, revokeByRef: noop, checkAndGrantPostPopularRewards: noop },
    '../utils/expResponse': { attachExp: value => value },
    '../utils/expEligibility': { isPostContentEligible: () => true, isCommentEligible: () => true },
    '../services/advertisementTarget': { validateAdvertisementTarget: noop },
    '../services/squareHomeService': { getSquareHomeSummary: noop },
    '../services/squareRecommendationService': { getSquarePersonalizedSummary: noop, getSquareRecommendations: noop },
    './campusNews': require('../routes/campusNews'),
    '../services/campusInteractions': require('../services/campusInteractions'),
    '../services/campusLikeStats': require('../services/campusLikeStats'),
  };
  const router = load('../routes/square.js', dependencies);
  return { queries, uploads, parsed: () => parsed, router };
}
function invoke(router) {
  return new Promise((resolve, reject) => {
    const req = { method: 'POST', url: '/campus-posts', headers: {}, query: {}, body: undefined };
    const res = { ...response(), json(data) { resolve({ status: this.statusCode, data }); return this; } };
    router.handle(req, res, error => reject(error || new Error('Not handled')));
  });
}
test('Actual legacy route still checks organization membership, permission and feed/type mapping', async () => {
  for (const member of [null, { permission_level: 0, org_type: 'Official' }, { permission_level: 1, org_type: 'College' }]) {
    const f = squareFixture({ member }); const result = await invoke(f.router); assert.equal(result.status, 403);
    assert.equal(f.queries.some(q => q.sql.startsWith('INSERT')), false);
  }
  const f = squareFixture(); const result = await invoke(f.router); assert.equal(result.status, 200); assert.equal(result.data.status, 0);
  const insertion = f.queries.find(q => q.sql.startsWith('INSERT'));
  assert.match(insertion.sql, /'legacy', 'published'/); assert.deepEqual(Array.from(insertion.params), [7, 3, 'school', '校园通知', '正文']);
});
test('Actual legacy route checks parsed multipart fields, not an empty pre-parser body', async () => {
  const f = squareFixture({ body: { organization_id: '7', feed_tab: 'school', title: '违规标题', content: '正文' }, words: [{ word: '违规' }] });
  const result = await invoke(f.router); assert.equal(result.status, 400); assert.equal(f.parsed(), 1);
  assert.equal(f.queries.some(q => q.sql.startsWith('INSERT')), false);
});
test('Actual legacy route refuses missing safety dependencies and protected fields before business writes', async () => {
  for (const options of [{ failSanction: true }, { failWords: true }]) {
    const f = squareFixture(options); assert.equal((await invoke(f.router)).status, 503);
    assert.equal(f.queries.some(q => q.sql.startsWith('INSERT')), false);
  }
  const f = squareFixture({ body: { organization_id: '7', feed_tab: 'school', title: '标题', content: '正文', source_kind: 'news' } });
  assert.equal((await invoke(f.router)).status, 400); assert.equal(f.queries.some(q => q.sql.startsWith('INSERT')), false);
});
test('Local legacy images are rejected after memory parsing and before INSERT/upload', async () => {
  process.env.STAGE2_LOCAL_ISOLATED = '1';
  try {
    const f = squareFixture({ files: [{ mimetype: 'image/png', buffer: Buffer.from('in-memory fixture only') }] });
    assert.equal((await invoke(f.router)).status, 503); assert.equal(f.parsed(), 1);
    assert.equal(f.queries.some(q => q.sql.startsWith('INSERT')), false); assert.equal(f.uploads.length, 0);
  } finally { delete process.env.STAGE2_LOCAL_ISOLATED; }
});
test('Non-isolated legacy image gate leaves the existing upload policy untouched', () => {
  let next = 0; rejectLegacyCampusImages({ files: [{}] }, response(), () => next++); assert.equal(next, 1);
});
const blockedPaths = [
  ['GET','/api/admin/dashboard'], ['GET','/api/admin/users'], ['POST','/api/admin/users/3/ban'],
  ['POST','/api/reports'], ['GET','/api/admin/reports'],
  ['POST','/api/notifications/read'], ['POST','/api/notifications'], ['GET','/api/notifications/1/unsupported'],
  ['POST','/api/auth/register'], ['POST','/api/materials'], ['POST','/api/posts'],
  ['GET','/api/admin/campus-news/../../users'], ['GET','/api/admin/campus-news/%2e%2e/%2e%2e/users'],
  ['POST','/api/square/campus-posts%2f15%2fcomments'],
];
for (const [method, url] of blockedPaths) test(`Local boundary stops ${method} ${url} before any business handler`, () => {
  const res = response(); let next = 0; localHttpBoundary({ method, url }, res, () => next++);
  assert.equal(res.statusCode, 503); assert.equal(res.data.status, -1); assert.equal(next, 0);
});
test('Local boundary preserves intended module, necessary login/profile and read-only legacy paths', () => {
  for (const [method,url] of [['POST','/api/admin/campus-news/drafts'], ['PUT','/api/admin/campus-news/15'], ['POST','/api/admin/campus-news/images'], ['GET','/api/campus-news/images/id?imageToken=encoded%2Ffixture'], ['POST','/api/auth/login'], ['GET','/api/users/me'], ['GET','/api/users/me/terms'], ['POST','/api/users/me/terms/accept'], ['GET','/api/organizations/me'], ['GET','/api/square/campus-feed'], ['GET','/api/square/campus-posts/15/comments'], ['POST','/api/square/campus-posts'], ['GET','/health']]) {
    let next = 0; localHttpBoundary({ method,url }, response(), () => next++); assert.equal(next, 1, url);
  }
});
test('Local boundary preserves mailbox reads and existing read/clear actions', () => {
  for (const [method, url] of [
    ['GET', '/api/notifications'], ['GET', '/api/notifications/unread-summary'],
    ['GET', '/api/notifications/unread-announcements'], ['GET', '/api/notifications/1'],
    ['PATCH', '/api/notifications/1/read'], ['PATCH', '/api/notifications/read-batch'],
    ['DELETE', '/api/notifications/clear'],
  ]) {
    let next = 0;
    localHttpBoundary({ method, url }, response(), () => next++);
    assert.equal(next, 1, `${method} ${url}`);
  }
});

test('04E local boundary allows exact campus comment writes to reach protected router', () => {
  for (const url of ['/api/square/campus-posts/15/comments']) {
    let queriesOrNotifications = 0; const res = response();
    localHttpBoundary({ method: 'POST', url }, res, () => queriesOrNotifications++);
    assert.equal(queriesOrNotifications, 1);
  }
});

test('04D local boundary opens campus like verbs including deprecated POST and statistics, not future features', () => {
  for (const [method, url] of [['GET','/api/square/campus-posts/15/interactions'], ['PUT','/api/square/campus-posts/15/like'], ['DELETE','/api/square/campus-posts/15/like'], ['POST','/api/square/campus-posts/15/like']]) {
    let next = 0; localHttpBoundary({ method, url }, response(), () => next++); assert.equal(next, 1);
  }
  for (const [method, url] of [['PUT','/api/square/trending/posts/15/like'], ['PUT','/api/square/campus-posts%2f15%2flike']]) {
    let next = 0; const res = response(); localHttpBoundary({ method, url }, res, () => next++);
    assert.equal(next, 0); assert.equal(res.statusCode, 503);
  }
});
test('Isolated HTTP boundary is installed before business handlers and only in isolated server mode', () => {
  const server = fs.readFileSync(require.resolve('../server.js'), 'utf8');
  assert.match(server, /if \(process.env.STAGE2_LOCAL_ISOLATED === '1'\) \{\s+app.use\(require\('\.\/scripts\/stage2-local\/http-boundary.cjs'\).localHttpBoundary\)/);
  assert.ok(server.indexOf('.localHttpBoundary)') < server.indexOf("app.use('/api/auth'"));
});
