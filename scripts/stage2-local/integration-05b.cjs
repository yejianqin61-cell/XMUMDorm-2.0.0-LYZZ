'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const guard = require('../stage2-db/local-config.cjs');
require('./network.cjs')([3306, 4040]);
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.local/stage5/batch05b/run-02');
const ids = JSON.parse(fs.readFileSync(path.join(output, 'fixtures.json')));
const cfg = JSON.parse(fs.readFileSync(path.join(root, '.local/stage2/config.json')));
const sessions = Object.fromEntries(['a', 'b', 'empty'].map(key => [key,
  jwt.sign({ id: ids.users[key], role: 'student' }, cfg.JWT_SECRET, { expiresIn: '15m' })]));
const results = [];
async function request(url, who = 'a', method = 'GET') {
  const token = who === 'expired'
    ? jwt.sign({ id: ids.users.a }, cfg.JWT_SECRET, { expiresIn: -10 }) : sessions[who];
  const response = await fetch('http://127.0.0.1:4040' + url, {
    method, headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  const body = await response.json();
  results.push({ path: url, who, method, status: response.status, body });
  return { ...body, httpStatus: response.status };
}
async function main() {
  for (const url of ['/api/users/me/posts', '/api/canteen/my-reviews', '/api/canteen/my-favorites']) {
    assert.equal((await request(url, 'guest')).httpStatus, 401);
    assert.equal((await request(url, 'expired')).httpStatus, 403);
    const spoofed = `?pageSize=10&userId=${ids.users.b}&user_id=${ids.users.b}&id=${ids.users.b}`;
    const first = await request(url + spoofed);
    assert.equal(first.httpStatus, 200);
    assert.equal(first.data.total, 11);
    assert.equal(first.data.list.length, 10);
    assert.equal(first.data.hasMore, true);
    const second = await request(url + '?page=2&pageSize=10');
    assert.equal(second.data.list.length, 1);
    assert.equal(second.data.hasMore, false);
    assert.equal(new Set([...first.data.list, ...second.data.list].map(x => x.id ?? x.product_id)).size, 11);
    assert.equal((await request(url, 'b')).data.total, 1);
    assert.equal((await request(url, 'empty')).data.total, 0);
    assert.equal((await request(url + '?page=999999999999999999')).httpStatus, 400);
  }
  assert.equal((await request('/api/canteen/products/2/favorite', 'b', 'POST')).status, 0);
  assert.equal((await request('/api/canteen/products/2/favorite', 'b')).data.favorited, true);
  const db = await require('mysql2/promise').createConnection(guard.readLocalConfig());
  try {
    const [persisted] = await db.query('SELECT id FROM product_favorites WHERE user_id=? AND product_id=?', [ids.users.b, 2]);
    assert.equal(persisted.length, 1);
  } finally { await db.end(); }
  assert.equal((await request('/api/canteen/my-favorites', 'b')).data.total, 2);
  assert.equal((await request('/api/canteen/my-favorites')).data.total, 11);
  await request('/api/canteen/products/2/favorite', 'b', 'DELETE');
  assert.equal((await request('/api/canteen/products/2/favorite', 'b')).data.favorited, false);
  for (const product of [ids.deletedProduct, ids.deletedShopProduct]) {
    assert.equal((await request('/api/canteen/products/' + product)).httpStatus, 404);
  }
  for (const key of ['deleted', 'hidden']) assert.equal((await request('/api/posts/' + ids.posts[key])).httpStatus, 404);
  assert.equal((await request('/api/posts/' + ids.posts.visible[0])).httpStatus, 200);
  assert.equal((await request('/api/canteen/products/1')).httpStatus, 200);
  for (const viewer of ['b', 'guest']) {
    const profile = await request('/api/users/' + ids.users.a + '/profile', viewer);
    assert.equal(profile.httpStatus, 200);
    assert.ok(profile.data.posts.every(post => ![ids.posts.hidden, ids.posts.deleted, ids.posts.ad].includes(post.id)));
    assert.equal(profile.data.list, undefined);
  }
  console.log('05B real HTTP + MySQL integration passed (' + results.length + ' requests).');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(path.join(output, 'http-results.json'), JSON.stringify(results, null, 2));
});
