'use strict';
// Explicit test workflow only. Never imported by a normal application startup.
// Uses the existing login API; credentials/tokens are never printed or included in reports.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, '.local/stage2/integration-01e');
const { readLocalConfig, verifyIdentity } = require('../stage2-db/local-config.cjs');
const { plan, stateAfter, ledgerPrefix } = require('../stage2-db/migrate.cjs');
const { inspectSchema, assertSchema } = require('../stage2-db/schema.cjs');
const APPROVED = '868c8889fd742f70797436ce431fc6f45b57aac58a9a37d5ec5b7103ee230e0d';
const save = (name, value) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2), { mode: 0o600 }); };
const load = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const report = { scope: 'Local Stage2 TEST ONLY', checks: [], data: {} };
let db;
async function sql(text, params = []) { const [rows] = await db.execute(text, params); return rows; }
async function check(label, action) {
  const result = await action(); report.checks.push({ label, result: 'PASS', ...result }); save('api-report.json', report); console.log(`PASS ${label}`); return result;
}
async function http(label, pathname, { method = 'GET', token, body, expected = 200, form } = {}) {
  assert.ok(pathname.startsWith('/api/'), 'Only local API paths allowed');
  const response = await fetch(`http://127.0.0.1:4040${pathname}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: form || (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  const allowed = Array.isArray(expected) ? expected : [expected];
  report.checks.push({ label, method, path: pathname.split('?')[0], httpStatus: response.status, result: allowed.includes(response.status) ? 'PASS' : 'FAIL' });
  save('api-report.json', report);
  assert.ok(allowed.includes(response.status), `${label}: unexpected HTTP status ${response.status}`);
  if (response.status === 200) assert.equal(result.status, 0, `${label}: API failure`);
  return { ...result, __httpStatus: response.status };
}
async function login(account, label) {
  const result = await http(label, '/api/auth/login', { method: 'POST', body: { username: account.username, password: account.password } });
  assert.equal(typeof result.token, 'string', 'Real login token missing'); return result.token;
}
async function verify(empty = false) {
  const candidate = plan(); assert.equal(candidate.hash, APPROVED, 'Migration contract changed: stop');
  const identity = await verifyIdentity(db); const schema = await inspectSchema(db); assertSchema(schema, stateAfter(candidate, 21));
  const ledger = await sql('SELECT * FROM stage2_schema_migrations'); assert.equal(ledgerPrefix(ledger, candidate), 21);
  if (empty) for (const table of Object.keys(candidate.schema)) { const rows = await sql(`SELECT COUNT(*) AS n FROM ${table}`); assert.equal(Number(rows[0].n), 0, `Unexpected preexisting business data: ${table}`); }
  return { identity, tableCount: schema.tables.length, columns: schema.columns.length, foreignKeys: schema.foreignKeys.length, applied: ledger.length };
}
async function seed() {
  assert.equal(fs.existsSync(path.join(dir, 'credentials.json')), false, 'Test credentials already exist; refuse duplicate seeding');
  const preflight = await verify(true);
  const boundary = await fetch('http://127.0.0.1:4040/api/notifications'); assert.equal(boundary.status, 503); assert.equal((await boundary.json()).code, 'STAGE2_FUNCTION_UNAVAILABLE');
  const proxy = await fetch('http://127.0.0.1:5173/api/notifications'); assert.equal(proxy.status, 503); assert.equal((await proxy.json()).code, 'STAGE2_FUNCTION_UNAVAILABLE');
  const accounts = [{ key: 'admin', username: 'stage2_test_admin_01e', role: 'admin' }, { key: 'student', username: 'stage2_test_student_01e', role: 'student' }, { key: 'revocation', username: 'stage2_test_revocation_01e', role: 'admin' }];
  const credentials = {};
  await db.beginTransaction();
  try {
    for (const account of accounts) {
      const password = `Stage2!${crypto.randomBytes(24).toString('base64url')}`;
      const hash = await require('bcryptjs').hash(password, 10);
      const result = await sql("INSERT INTO users(username,nickname,email,student_id,password_hash,role,status,email_verified) VALUES(?,?,NULL,NULL,?,?,'active',0)", [account.username, `[STAGE2 TEST] ${account.key}`, hash, account.role]);
      credentials[account.key] = { id: result.insertId, username: account.username, password };
    }
    const colleges = [{ id: 'stage2-test-college-a', code: 'TEST_ONLY_A', name: '[临时测试学院，非正式目录] 学院A' }, { id: 'stage2-test-college-b', code: 'TEST_ONLY_B', name: '[临时测试学院，非正式目录] 学院B' }];
    for (const college of colleges) await sql('INSERT INTO colleges(id,code,name,is_active) VALUES(?,?,?,1)', [college.id, college.code, college.name]);
    const org = await sql("INSERT INTO organizations(type,name,description,is_active) VALUES('Official',?,'TEST ONLY - no real organization',1)", ['[STAGE2 TEST 01E] 权限测试组织']);
    await sql("INSERT INTO organization_memberships(organization_id,user_id,title,permission_level) VALUES(?,?,'TEST ONLY member',1)", [org.insertId, credentials.student.id]);
    // Files are ignored, local only; DB stores bcrypt hashes, never passwords.
    save('credentials.json', credentials);
    save('manifest.json', { marker: 'STAGE2 TEST 01E', accounts: Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, { id: value.id, username: value.username }])), colleges, organizationId: org.insertId });
    await db.commit();
    console.log(JSON.stringify({ seed: 'PASS', preflight, accounts: Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, { id: value.id, username: value.username }])), colleges, organizationId: org.insertId, credentials: 'Saved privately in ignored .local; no password output' }));
  } catch (error) { await db.rollback(); throw error; }
}
async function consistency(postId) {
  const rows = await sql('SELECT * FROM campus_posts WHERE id=?', [postId]); assert.equal(rows.length, 1);
  const p = rows[0]; const versions = await sql('SELECT * FROM campus_news_versions WHERE post_id=? ORDER BY revision', [postId]);
  const audit = await sql('SELECT * FROM campus_news_audit WHERE post_id=? ORDER BY revision', [postId]);
  assert.equal(versions.length, Number(p.revision)); assert.equal(audit.length, versions.length);
  versions.forEach((v, index) => { assert.equal(Number(v.revision), index + 1); assert.equal(Number(audit[index].version_id), Number(v.id)); assert.equal(Number(audit[index].revision), Number(v.revision)); });
  const snapshot = typeof versions.at(-1).snapshot === 'string' ? JSON.parse(versions.at(-1).snapshot) : versions.at(-1).snapshot;
  assert.equal(snapshot.title, p.title); assert.equal(snapshot.content, p.content); assert.equal(snapshot.lifecycleStatus, p.lifecycle_status); assert.equal(snapshot.hiddenByAdmin, Boolean(p.hidden_by_admin)); assert.equal(Boolean(snapshot.deletedAt), Boolean(p.deleted_at));
  const audiences = await sql('SELECT college_id FROM campus_post_audiences WHERE post_id=? ORDER BY college_id', [postId]);
  assert.deepEqual(snapshot.audience.collegeIds, audiences.map(a => a.college_id));
  const images = await sql('SELECT asset_id,sort_order FROM campus_news_images WHERE post_id=? ORDER BY sort_order', [postId]);
  assert.deepEqual(snapshot.images.map(i => i.id), images.map(i => i.asset_id));
  const refs = await sql('SELECT asset_id,sort_order FROM campus_news_version_assets WHERE version_id=? ORDER BY sort_order', [versions.at(-1).id]);
  assert.deepEqual(refs.map(i => i.asset_id), images.map(i => i.asset_id));
  return { postId: Number(postId), source: p.source_kind, lifecycle: p.lifecycle_status, revision: Number(p.revision), versions: versions.length, audits: audit.length, images: images.length };
}
async function apiTests() {
  await verify(); const credentials = load('credentials.json'), manifest = load('manifest.json'); report.data = manifest;
  let admin = await login(credentials.admin, 'admin real login');
  const student = await login(credentials.student, 'student real login');
  const oldAdmin = await login(credentials.revocation, 'revocation account real login');
  await http('anonymous admin API denied', '/api/admin/campus-news', { expected: 401 });
  await http('student admin API denied', '/api/admin/campus-news', { token: student, expected: 403 });
  const membership = await http('organization membership exists', '/api/organizations/me', { token: student }); assert.equal(membership.data.length, 1);
  await http('organization member has no news admin authority', '/api/admin/campus-news/drafts', { method: 'POST', token: student, body: { title: '' }, expected: 403 });
  await sql("UPDATE users SET role='student' WHERE id=? AND username='stage2_test_revocation_01e'", [credentials.revocation.id]);
  try { await http('revoked admin old JWT rejected', '/api/admin/campus-news', { token: oldAdmin, expected: 403 }); }
  finally { await sql("UPDATE users SET role='admin' WHERE id=? AND username='stage2_test_revocation_01e'", [credentials.revocation.id]); }
  const secondAdmin = await login(credentials.revocation, 'restored role requires normal login');
  await http('restored administrator valid session', '/api/admin/campus-news', { token: secondAdmin });
  const empty = { title: '', content: '', category: null, audience: { scope: 'all', collegeIds: [] }, imageAssetIds: [] };
  let post = (await http('create incomplete draft', '/api/admin/campus-news/drafts', { token: admin, method: 'POST', body: empty })).data;
  manifest.apiDraftId = Number(post.id); save('manifest.json', manifest); report.data = manifest;
  await check('draft stored with first version and audit', () => consistency(post.id));
  post = (await http('refresh draft from real database', `/api/admin/campus-news/${post.id}`, { token: admin })).data;
  await http('draft private to student', `/api/campus-news/${post.id}`, { token: student, expected: 404 });
  await http('incomplete draft cannot publish', `/api/admin/campus-news/${post.id}/publish`, { token: admin, method: 'POST', body: { expectedRevision: post.revision }, expected: 400 });
  const body = { title: '[STAGE2 TEST 01E] API真实生命周期测试', content: '测试正文第一段。\n第二段：本条仅用于本地联调。', category: 'lecture', audience: { scope: 'colleges', collegeIds: manifest.colleges.map(c => c.id) }, imageAssetIds: [] };
  post = (await http('save complete multi-college draft', `/api/admin/campus-news/${post.id}`, { token: admin, method: 'PUT', body: { ...body, expectedRevision: post.revision } })).data;
  post = (await http('publish draft', `/api/admin/campus-news/${post.id}/publish`, { token: admin, method: 'POST', body: { expectedRevision: post.revision } })).data;
  assert.ok(post.publishedAt); const firstPublished = post.publishedAt;
  await http('published detail available to student', `/api/campus-news/${post.id}`, { token: student });
  post = (await http('published edit immediately effective', `/api/admin/campus-news/${post.id}`, { token: admin, method: 'PUT', body: { ...body, title: body.title + ' 已编辑', expectedRevision: post.revision } })).data;
  assert.equal(post.lifecycleStatus, 'published');
  const old = await sql('SELECT snapshot FROM campus_news_versions WHERE post_id=? AND revision=1', [post.id]); const oldSnapshot = typeof old[0].snapshot === 'string' ? JSON.parse(old[0].snapshot) : old[0].snapshot; assert.equal(oldSnapshot.title, '');
  post = (await http('withdraw published post', `/api/admin/campus-news/${post.id}/withdraw`, { token: admin, method: 'POST', body: { expectedRevision: post.revision } })).data;
  await http('withdrawn detail private to student', `/api/campus-news/${post.id}`, { token: student, expected: 404 });
  post = (await http('republish same post', `/api/admin/campus-news/${post.id}/publish`, { token: admin, method: 'POST', body: { expectedRevision: post.revision } })).data;
  assert.equal(post.publishedAt, firstPublished);
  const revision = post.revision;
  const competing = await Promise.all([http('concurrent writer A', `/api/admin/campus-news/${post.id}`, { token: admin, method: 'PUT', body: { ...body, title: body.title + ' 并发请求A', expectedRevision: revision }, expected: [200,409] }), http('concurrent writer B', `/api/admin/campus-news/${post.id}`, { token: secondAdmin, method: 'PUT', body: { ...body, title: body.title + ' 并发请求B', expectedRevision: revision }, expected: [200,409] })]);
  assert.deepEqual(competing.map(r => r.__httpStatus).sort(), [200,409]);
  post = competing.find(r => r.__httpStatus === 200).data;
  assert.equal((await http('conflict did not overwrite winner', `/api/admin/campus-news/${post.id}`, { token: admin })).data.title, post.title);
  await check('lifecycle versions and audit consistent', () => consistency(post.id));
  for (const action of ['hide','unhide']) {
    post = (await http(`${action} published post`, `/api/admin/campus-news/${post.id}/${action}`, { token: admin, method: 'POST', body: { expectedRevision: post.revision } })).data;
    assert.equal(post.lifecycleStatus, 'published');
    await http(`${action} student visibility`, `/api/campus-news/${post.id}`, { token: student, expected: action === 'hide' ? 404 : 200 });
  }
  const direct = (await http('direct publish without draft', '/api/admin/campus-news/publish', { token: admin, method: 'POST', body: { ...body, title: '[STAGE2 TEST 01E] 直接发布并软删除测试', audience: { scope: 'all', collegeIds: [] } } })).data;
  manifest.deletedPostId = Number(direct.id);
  const deleted = (await http('soft delete', `/api/admin/campus-news/${direct.id}`, { token: admin, method: 'DELETE', body: { expectedRevision: direct.revision } })).data;
  await http('soft-deleted private', `/api/campus-news/${direct.id}`, { token: student, expected: 404 });
  await http('unhide cannot restore deleted', `/api/admin/campus-news/${direct.id}/unhide`, { token: admin, method: 'POST', body: { expectedRevision: deleted.revision }, expected: 409 });
  await http('republish cannot restore deleted', `/api/admin/campus-news/${direct.id}/publish`, { token: admin, method: 'POST', body: { expectedRevision: deleted.revision }, expected: 409 });
  await check('deleted history retained', () => consistency(direct.id));
  for (const status of ['draft','withdrawn']) {
    let item = (await http(`${status} unhide fixture`, '/api/admin/campus-news/drafts', { token: admin, method: 'POST', body: { ...body, title: `[STAGE2 TEST 01E] ${status} 隐藏状态测试` } })).data;
    if (status === 'withdrawn') {
      item = (await http('state fixture publish', `/api/admin/campus-news/${item.id}/publish`, { token: admin, method: 'POST', body: { expectedRevision: item.revision } })).data;
      item = (await http('state fixture withdraw', `/api/admin/campus-news/${item.id}/withdraw`, { token: admin, method: 'POST', body: { expectedRevision: item.revision } })).data;
    }
    item = (await http(`${status} hide`, `/api/admin/campus-news/${item.id}/hide`, { token: admin, method: 'POST', body: { expectedRevision: item.revision } })).data;
    item = (await http(`${status} unhide`, `/api/admin/campus-news/${item.id}/unhide`, { token: admin, method: 'POST', body: { expectedRevision: item.revision } })).data;
    assert.equal(item.lifecycleStatus, status); await http(`${status} remains private`, `/api/campus-news/${item.id}`, { token: student, expected: 404 });
    manifest[`${status}FixtureId`] = Number(item.id);
  }
  save('manifest.json', manifest);
  await imageTests(admin, student, manifest, body);
  await rollbackTests(credentials.admin.id, manifest);
  await verify();
  report.data = load('manifest.json'); report.outcome = 'API_AND_REAL_DB_VERIFIED'; save('api-report.json', report);
  console.log(JSON.stringify({ outcome: report.outcome, checks: report.checks.length, data: report.data }));
}
async function imageTests(admin, student, manifest, body) {
  const sharp = require('sharp'); const images = [];
  for (let i = 0; i < 10; i++) {
    const format = ['jpeg','png','webp'][i % 3]; const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
    const buffer = await sharp({ create: { width: 320, height: 180, channels: 3, background: { r: i * 20, g: 80, b: 180 } } }).composite([{ input: Buffer.from(`<svg width="320" height="180"><text x="20" y="100" font-size="26" fill="white">STAGE2 TEST ${i + 1}</text></svg>`), top: 0, left: 0 }]).toFormat(format).toBuffer();
    const filename = `stage2-test-${String(i + 1).padStart(2,'0')}.${format}`; fs.writeFileSync(path.join(dir, filename), buffer);
    const form = new FormData(); form.append('image', new Blob([buffer], { type: mime }), filename);
    const asset = (await http(`upload ${format} fixture ${i + 1}`, '/api/admin/campus-news/images', { token: admin, method: 'POST', form })).data; images.push(asset);
  }
  manifest.assetIds = images.map(i => i.id); save('manifest.json', manifest);
  for (const [name, type, buffer] of [['invalid.svg','image/svg+xml',Buffer.from('<svg/>')], ['spoof.png','image/png',Buffer.from('invalid image')], ['oversize.png','image/png',Buffer.alloc(8 * 1024 * 1024 + 1)]]) {
    const form = new FormData(); form.append('image', new Blob([buffer], { type }), name);
    await http(`reject ${name}`, '/api/admin/campus-news/images', { token: admin, method: 'POST', form, expected: 400 });
  }
  let item = (await http('ten images direct publish', '/api/admin/campus-news/publish', { token: admin, method: 'POST', body: { ...body, title: '[STAGE2 TEST 01E] 十图及历史引用测试', imageAssetIds: manifest.assetIds } })).data;
  manifest.imagePostId = Number(item.id);
  assert.deepEqual(item.images.map(i => i.id), manifest.assetIds);
  await http('eleven images rejected', '/api/admin/campus-news/drafts', { token: admin, method: 'POST', body: { ...body, imageAssetIds: [...manifest.assetIds, manifest.assetIds[0]] }, expected: 400 });
  const order = [...manifest.assetIds].reverse().slice(0,9);
  item = (await http('replace and reorder current images', `/api/admin/campus-news/${item.id}`, { token: admin, method: 'PUT', body: { ...body, title: '[STAGE2 TEST 01E] 十图及历史引用测试（当前九图）', imageAssetIds: order, expectedRevision: item.revision } })).data;
  assert.deepEqual(item.images.map(i => i.id), order);
  const versions = (await http('real image version history', `/api/admin/campus-news/${item.id}/versions`, { token: admin })).data.items;
  assert.deepEqual(versions.find(v => v.revision === 1).images.map(i => i.id), manifest.assetIds);
  const historyOnly = versions.find(v => v.revision === 1).images.find(i => !order.includes(i.id));
  const historyFile = await fetch(`http://127.0.0.1:4040${historyOnly.url}`); assert.equal(historyFile.status, 200); assert.ok((await historyFile.arrayBuffer()).byteLength > 0);
  await check('current/old image order and all audit references intact', () => consistency(item.id));
  const rows = await sql('SELECT id,object_key,storage_kind,state FROM campus_news_assets WHERE uploaded_by=?', [manifest.accounts.admin.id]);
  assert.equal(new Set(rows.map(r => r.object_key)).size, 10); assert.ok(rows.every(r => r.storage_kind === 'local' && r.state === 'ready'));
  for (const row of rows) assert.ok(fs.existsSync(path.join(root,'.local/stage2/news-assets',path.basename(row.object_key))));
  save('manifest.json', manifest);
}
async function rollbackTests(adminId, manifest) {
  const { createRepository } = require('../../services/campusNews/repository'); const { createNewsService } = require('../../services/campusNews/service');
  const before = await sql('SELECT (SELECT COUNT(*) FROM campus_posts) AS posts,(SELECT COUNT(*) FROM campus_news_versions) AS versions,(SELECT COUNT(*) FROM campus_news_audit) AS audit,(SELECT COUNT(*) FROM campus_news_version_assets) AS refs,(SELECT COUNT(*) FROM campus_post_audiences) AS audiences,(SELECT COUNT(*) FROM campus_news_images) AS images');
  let insertedVersion = false, injected = false;
  const wrapped = { beginTransaction: () => db.beginTransaction(), commit: () => db.commit(), rollback: () => db.rollback(), release() {}, execute: async (text, params) => {
    if (text.startsWith('INSERT INTO campus_news_audit')) { injected = true; throw new Error('TEST ONLY injected audit failure'); }
    const result = await db.execute(text, params); if (text.startsWith('INSERT INTO campus_news_versions')) insertedVersion = true; return result;
  } };
  const repo = createRepository({ getConnection: async () => wrapped }, key => `/test-only/${path.basename(key)}`);
  const service = createNewsService(repo);
  await assert.rejects(service.createPublished(adminId, { title: '[STAGE2 TEST 01E] 必须回滚的事务', content: '模拟审计写入失败', category: 'lecture', audience: { scope: 'colleges', collegeIds: manifest.colleges.map(c => c.id) }, imageAssetIds: manifest.assetIds.slice(0,2) }), /injected audit failure/);
  assert.ok(insertedVersion && injected);
  const after = await sql('SELECT (SELECT COUNT(*) FROM campus_posts) AS posts,(SELECT COUNT(*) FROM campus_news_versions) AS versions,(SELECT COUNT(*) FROM campus_news_audit) AS audit,(SELECT COUNT(*) FROM campus_news_version_assets) AS refs,(SELECT COUNT(*) FROM campus_post_audiences) AS audiences,(SELECT COUNT(*) FROM campus_news_images) AS images');
  assert.deepEqual(after, before);
  await check('real MySQL audit failure rolls back main row, audiences, images, version and historical references', async () => ({ before: before[0], after: after[0], fault: 'repository execute wrapper before audit SQL; actual prior SQL inside real transaction' }));
  const { createAssetService, normalize } = require('../../services/campusNews/assets');
  const options = readLocalConfig(); Object.assign(process.env, { STAGE2_LOCAL_ISOLATED: '1', DB_HOST: options.host, DB_PORT: String(options.port), DB_NAME: options.database, DB_USER: options.user });
  const normal = createRepository({ getConnection: async () => ({ beginTransaction: () => db.beginTransaction(), commit: () => db.commit(), rollback: () => db.rollback(), release() {}, execute: (text, params) => db.execute(text, params) }) }, key => key);
  const assets = createAssetService(normal, { put: async () => { throw new Error('TEST ONLY injected local disk failure'); } }, normalize);
  await assert.rejects(assets.upload(adminId, { buffer: fs.readFileSync(path.join(dir,'stage2-test-01.jpeg')), mimetype: 'image/jpeg' }), /injected local disk failure/);
  const failed = await sql("SELECT id,state,object_key FROM campus_news_assets WHERE uploaded_by=? AND state='failed'", [adminId]); assert.equal(failed.length, 1);
  manifest.failedAssetId = failed[0].id; save('manifest.json', manifest);
  await check('real asset reservation failure is marked failed without deleting referenced files', async () => ({ assetId: failed[0].id, state: failed[0].state, fault: 'injected disk adapter failure before write' }));
}
async function finalVerification() {
  Object.assign(report, load('api-report.json'));
  const credentials = load('credentials.json'), manifest = load('manifest.json');
  const admin = await login(credentials.admin, 'final administrator login');
  const student = await login(credentials.student, 'final student login');
  const posts = await sql('SELECT id,title,lifecycle_status,revision FROM campus_posts ORDER BY id');
  assert.ok(posts.every(p => p.title.startsWith('[STAGE2 TEST 01E]')));
  manifest.browserPostId = Number(posts.find(p => p.title.includes('浏览器并发胜出版本')).id);
  for (const post of posts) await check(`final consistency post ${post.id}`, () => consistency(post.id));
  const publicResult = (await http('public feed excludes private and deleted test fixtures', '/api/campus-news', { token: student })).data;
  assert.deepEqual(publicResult.items.map(p => Number(p.id)).sort(), [manifest.apiDraftId,manifest.imagePostId,manifest.browserPostId].sort());
  const imagePost = (await http('student current image detail', `/api/campus-news/${manifest.imagePostId}`, { token: student })).data;
  const imageUrl = imagePost.images[0].url;
  assert.equal((await fetch(`http://127.0.0.1:4040${imageUrl}`)).status, 200);
  const hidden = (await http('hide image fixture', `/api/admin/campus-news/${imagePost.id}/hide`, { token: admin, method: 'POST', body: { expectedRevision: imagePost.revision } })).data;
  try {
    assert.equal((await fetch(`http://127.0.0.1:4040${imageUrl}`)).status, 404);
    const feed = (await http('hidden image fixture removed from public feed', '/api/campus-news', { token: student })).data;
    assert.ok(!feed.items.some(p => Number(p.id) === Number(imagePost.id)));
  } finally {
    await http('restore test image fixture visibility', `/api/admin/campus-news/${imagePost.id}/unhide`, { token: admin, method: 'POST', body: { expectedRevision: hidden.revision } });
  }
  await check('previously issued student image URL respects current hidden state', async () => ({ imagePostId: manifest.imagePostId, visibleHTTP: 200, hiddenHTTP: 404, restored: true }));
  const fixture = { title: '[STAGE2 TEST 01E] 必须拒绝的无效受众', content: '不得持久化', category: 'lecture', audience: { scope: 'colleges', collegeIds: ['nonexistent-test-college'] }, imageAssetIds: [] };
  await http('unknown college rejected in real DB', '/api/admin/campus-news/publish', { token: admin, method: 'POST', body: fixture, expected: 400 });
  await http('all and colleges cannot be combined', '/api/admin/campus-news/drafts', { token: admin, method: 'POST', body: { ...fixture, audience: { scope: 'all', collegeIds: manifest.colleges.map(c => c.id) } }, expected: 400 });
  const orphans = (await http('orphan review does not delete recent failed or referenced assets', '/api/admin/campus-news/images/orphans', { token: admin })).data;
  assert.equal(orphans.items.length, 0);
  const { createDiskStore } = require('../../services/campusNews/assets');
  const options = readLocalConfig(); Object.assign(process.env, { STAGE2_LOCAL_ISOLATED: '1', DB_HOST: options.host, DB_PORT: String(options.port), DB_NAME: options.database, DB_USER: options.user });
  const assets = await sql('SELECT id,object_key,state FROM campus_news_assets ORDER BY created_at');
  const ready = assets.find(a => a.state === 'ready');
  const disk = createDiskStore(); const file = disk.file(ready.object_key); const original = fs.readFileSync(file);
  await assert.rejects(disk.put(ready.object_key, Buffer.from('must never overwrite')), e => e.code === 'EEXIST');
  assert.deepEqual(fs.readFileSync(file), original);
  await check('immutable local object refuses overwrite and preserves original bytes', async () => ({ assetId: ready.id, error: 'EEXIST' }));
  const users = await sql("SELECT id,username,role,status,(password_hash LIKE '$2a$10$%' OR password_hash LIKE '$2b$10$%') AS bcrypt_only FROM users ORDER BY id");
  assert.equal(users.length, 3); assert.ok(users.every(u => Number(u.bcrypt_only) === 1 && u.status === 'active'));
  assert.equal(users.find(u => u.id === credentials.revocation.id).role, 'admin');
  const metadata = await verify(); const counts = {};
  for (const table of Object.keys(plan().schema)) counts[table] = Number((await sql(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);
  for (const table of ['sensitive_words','user_sanctions']) assert.equal(counts[table], 0);
  // Reports/notifications are deliberately absent from the approved minimal
  // foundation and denied by the local HTTP boundary, not initialized here.
  assert.ok(!Object.hasOwn(counts, 'reports') && !Object.hasOwn(counts, 'notifications'));
  await check('final real schema/ledger unchanged, test roles restored and no unrelated business records', async () => ({ metadata, counts, users }));
  manifest.allPostIds = posts.map(p => Number(p.id)); manifest.assetIdsAll = assets.map(a => ({ id: a.id, state: a.state })); save('manifest.json', manifest);
  report.data = manifest; report.outcome = 'API_AND_REAL_DB_VERIFIED_AFTER_UPLOAD_FIX'; save('api-report.json', report);
  console.log(JSON.stringify({ outcome: report.outcome, checks: report.checks.length, counts, posts, users }));
}
async function main() {
  require('./network.cjs')([3306,4040,5173]);
  db = await require('mysql2/promise').createConnection(readLocalConfig()); await verifyIdentity(db);
  try {
    if (process.argv[2] === 'seed') await seed();
    else if (process.argv[2] === 'api') await apiTests();
    else if (process.argv[2] === 'verify') await finalVerification();
    else if (process.argv[2] === 'snapshot') {
      const metadata = await verify(), counts = {}, manifest = load('manifest.json');
      for (const table of Object.keys(plan().schema)) counts[table] = Number((await sql(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);
      manifest.versionRecords = await sql('SELECT id,post_id,revision,action FROM campus_news_versions ORDER BY id');
      manifest.auditRecords = await sql('SELECT id,post_id,version_id,revision,action FROM campus_news_audit ORDER BY id');
      const posts = await sql('SELECT id,title,lifecycle_status,hidden_by_admin,deleted_at,revision FROM campus_posts ORDER BY id');
      for (const post of posts) await consistency(post.id);
      save('manifest.json', manifest);
      save('final-db-snapshot.json', { metadata, counts, posts, versions: manifest.versionRecords, audit: manifest.auditRecords });
      console.log(JSON.stringify({ metadata, counts, posts, versionIds: manifest.versionRecords.map(v => v.id), auditIds: manifest.auditRecords.map(a => a.id) }));
    }
    else if (process.argv[2] === 'remaining') {
      Object.assign(report, load('api-report.json')); delete report.error;
      const credentials = load('credentials.json'), manifest = load('manifest.json');
      const admin = await login(credentials.admin, 'admin login for remaining image tests');
      const student = await login(credentials.student, 'student login for remaining tests');
      await imageTests(admin, student, manifest, { title: '[STAGE2 TEST 01E] 图片测试', content: '本地测试图片与历史版本', category: 'campus-life', audience: { scope: 'all', collegeIds: [] }, imageAssetIds: [] });
      await rollbackTests(credentials.admin.id, manifest);
      await verify(); report.data = load('manifest.json'); report.outcome = 'API_AND_REAL_DB_VERIFIED_AFTER_UPLOAD_FIX'; save('api-report.json', report);
      console.log(JSON.stringify({ outcome: report.outcome, checks: report.checks.length, data: report.data }));
    }
    else throw new Error('Explicit seed|api required; no implicit workflow');
  } finally { await db.end(); }
}
main().catch(error => { report.outcome = 'FAILED — REVIEW REQUIRED'; report.error = error.code || error.message; save('api-report.json', report); console.error('Integration stopped:', error.code || error.message); console.error(String(error.stack).split('\n').filter(line => /^\s+at /.test(line)).join('\n')); process.exitCode = 1; });
