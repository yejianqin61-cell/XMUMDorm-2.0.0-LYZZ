import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, toForm, validateForm, validateFiles, payloadFor, moveImage, canAct, errorMessage, safeImageUrl } from './model.js';
import { createCampusNewsApi, unwrap } from './apiClient.js';

const content = { title: '校园讲座', content: '第一段\n第二段', category: 'lecture', audience: { scope: 'all', collegeIds: [] }, images: [] };
const news = { ...content, id: '15', sourceKind: 'news', lifecycleStatus: 'published', revision: 2, hiddenByAdmin: false, deletedAt: null, createdBy: { id: '1', name: '管理员' }, updatedAt: '2026-10-28', publishedAt: '2026-10-28' };
const ok = data => ({ __httpStatus: 200, status: 0, data });
test('Incomplete draft is permitted; publication requires title, body, category and college selection', () => {
  assert.deepEqual(validateForm(toForm(null)), []);
  assert.equal(validateForm(toForm(null), true).length, 3);
  const form = { ...toForm(news), audienceScope: 'colleges', collegeIds: [] };
  assert.match(validateForm(form, true).join(''), /至少选择/);
  assert.equal(validateForm({ ...form, collegeIds: ['college-a', 'college-b'] }, true).length, 0);
});
test('Audience exclusivity, title limit and category are checked independently', () => {
  const form = { ...toForm(news), title: 'a'.repeat(201), category: 'school', collegeIds: ['college-a'] };
  assert.equal(validateForm(form).length, 3);
  assert.deepEqual(CATEGORIES.map(c => c.code), ['competition', 'lecture', 'campus-life']);
});
test('Ten images accepted; eleven, wrong MIME, oversized and unuploaded images rejected', () => {
  const file = { type: 'image/webp', size: 100 };
  assert.equal(validateFiles(Array(10).fill(file), 0), '');
  assert.match(validateFiles([file], 10), /十张/);
  assert.match(validateFiles([{ type: 'image/svg+xml', size: 1 }], 0), /JPEG/);
  assert.match(validateFiles([{ ...file, size: 8 * 1024 * 1024 + 1 }], 0), /8 MiB/);
  assert.match(validateForm({ ...toForm(news), images: [{ file, url: 'blob:local' }] }).join(''), /成功上传/);
});
test('Reordering is immutable and payload preserves image order and revision, not privileged fields', () => {
  const images = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const ordered = moveImage(images, 2, -1);
  assert.deepEqual(images.map(i => i.id), ['a', 'b', 'c']);
  const payload = payloadFor({ ...toForm(news), images: ordered, collegeIds: ['stale'] }, 2);
  assert.deepEqual(payload.imageAssetIds, ['a', 'c', 'b']);
  assert.deepEqual(payload.audience.collegeIds, []);
  assert.equal(payload.expectedRevision, 2);
  for (const key of ['sourceKind', 'lifecycleStatus', 'hiddenByAdmin', 'deletedAt']) assert.equal(key in payload, false);
});
test('Lifecycle actions respect hidden, deleted, withdrawn and legacy states', () => {
  assert.equal(canAct(news, 'withdraw'), true);
  assert.equal(canAct(news, 'publish'), false);
  assert.equal(canAct({ ...news, lifecycleStatus: 'withdrawn' }, 'publish'), true);
  assert.equal(canAct({ ...news, hiddenByAdmin: true }, 'publish'), false);
  assert.equal(canAct({ ...news, deletedAt: 'now' }, 'edit'), false);
  assert.equal(canAct({ ...news, sourceKind: 'legacy' }, 'edit'), false);
});
test('HTTP failure and malformed success cannot masquerade as success', async () => {
  for (const status of [401, 403, 404, 409, 500]) {
    assert.throws(() => unwrap({ __httpStatus: status, status: 0, data: news }), e => e.status === status);
  }
  assert.throws(() => unwrap({ status: 0, data: news }));
  const api = createCampusNewsApi(async () => ok({}));
  await assert.rejects(api.createDraft(payloadFor(toForm(null))), /响应不符合约定/);
  await assert.rejects(api.list({ page: 1 }));
});
test('Published save and withdrawn save preserve lifecycle; revision must increase exactly once', async () => {
  let result = { ...news, revision: 3 };
  const requests = [];
  const api = createCampusNewsApi(async (url, options) => { requests.push({ url, options }); return ok(result); });
  await api.update('15', payloadFor(toForm(news), 2), 'published');
  assert.equal(requests[0].options.method, 'PUT');
  result = { ...result, lifecycleStatus: 'draft' };
  await assert.rejects(api.update('15', payloadFor(toForm(news), 2), 'published'));
  await assert.rejects(api.update('15', payloadFor(toForm(news), 2), 'withdrawn'));
  result = { ...result, lifecycleStatus: 'withdrawn' };
  await api.update('15', payloadFor(toForm(news), 2), 'withdrawn');
  result = { ...result, revision: 2 };
  await assert.rejects(api.update('15', payloadFor(toForm(news), 2), 'withdrawn'));
});
test('Admin requests only use dedicated endpoints; conflict propagates with expectedRevision', async () => {
  let request;
  const api = createCampusNewsApi(async (url, options) => { request = { url, options }; return { __httpStatus: 409, status: -1 }; });
  await assert.rejects(api.publish('15', 2), e => e.status === 409);
  assert.equal(request.url, '/api/admin/campus-news/15/publish');
  assert.deepEqual(request.options.body, { expectedRevision: 2 });
  await assert.rejects(api.detail('mock-post'));
  assert.match(errorMessage({ status: 409 }), /未覆盖/);
});
test('Directory and historical snapshots require real shaped responses; no fallback data', async () => {
  const api = createCampusNewsApi(async () => ok({ items: [{ id: 'college-a', code: 'CS', name: '计算机学院' }] }));
  assert.equal((await api.colleges()).items.length, 1);
  await assert.rejects(api.versions('15'));
  const empty = createCampusNewsApi(async () => ok({ items: [] }));
  assert.deepEqual(await empty.versions('15'), { items: [] });
});
test('Images cannot introduce javascript or protocol-relative links', () => {
  for (const url of ['javascript:alert(1)', '//evil.test/image', '/\\evil/image', 'data:text/html,x']) assert.equal(safeImageUrl(url), '');
  assert.equal(safeImageUrl('/uploads/image.webp'), '/uploads/image.webp');
});

// Compile the real JSX in memory and render it with the real router/query providers.
// No service, file output, browser or HTTP request is used by these tests.
const directory = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(directory, '../../..');
const require = createRequire(path.join(frontend, 'package.json'));
const { build } = require('esbuild');
async function renderFixture(auth, role, route = '/myzone/admin/campus-news/new') {
  const source = `
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import { MemoryRouter, Routes, Route } from 'react-router-dom';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { AuthContext } from './src/context/AuthContextState';
    import Access from './src/features/admin-campus-news/CampusNewsAccess';
    import Editor from './src/features/admin-campus-news/CampusNewsEditor';
    export function render(auth, role, route) {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      client.setQueryData(['campus-news-admin-identity', 1], { role });
      client.setQueryData(['admin-campus-news-colleges'], { items: [{ id: 'college-a', code: 'CS', name: '学院目录测试项' }] });
      return renderToString(<QueryClientProvider client={client}><AuthContext.Provider value={{ isAdmin: auth, user: { id: 1 } }}><MemoryRouter initialEntries={[route]}><Routes><Route path='/myzone/admin/campus-news' element={<Access />}><Route path='new' element={<Editor />} /></Route></Routes></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
    }`;
  const output = await build({ stdin: { contents: source, resolveDir: frontend, loader: 'jsx' }, jsx: 'automatic', bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, alias: { '@shared': path.resolve(frontend, '../shared') }, define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, module, module.exports);
  return module.exports.render(auth, role, route);
}
test('Real route gate refuses non-admin and revoked role; current admin sees shared editor', async () => {
  assert.match(await renderFixture(false, 'admin'), /仅系统管理员/);
  assert.match(await renderFixture(true, 'user'), /权限已失效/);
  const html = await renderFixture(true, 'admin');
  assert.match(html, /新建快讯/); assert.match(html, /保存草稿/); assert.match(html, /指定学院/);
  assert.doesNotMatch(html, /保存成功/);
});
test('Admin integration leaves prior menus and routes in place; no Stage 1 routing edits needed', async () => {
  const app = await readFile(path.join(frontend, 'src/App.jsx'), 'utf8');
  const menu = await readFile(path.join(frontend, 'src/components/Admin/AdminSidebar.jsx'), 'utf8');
  for (const route of ['users', 'reports', 'announcements', 'contents/:module', 'campus-news']) assert.ok(app.includes(`path="${route}"`));
  for (const route of ['users', 'reports', 'announcements', 'campus-news']) assert.ok(menu.includes(`/myzone/admin/${route}`));
});
