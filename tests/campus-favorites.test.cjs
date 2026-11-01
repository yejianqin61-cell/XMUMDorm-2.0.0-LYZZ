const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createCampusFavorites } = require('../services/campusFavorites');
const { createPublicRouter } = require('../routes/campusNews');

function fixture({ eligible = true, reader = true, commitFails = false } = {}) {
  const saved = new Set(), calls = []; let releases = 0, destroys = 0;
  const c = { beginTransaction: async () => {}, commit: async () => { if (commitFails) throw Error('connection lost'); }, rollback: async () => {}, release: () => releases++, destroy: () => destroys++,
    execute: async (sql, args) => {
      calls.push({ sql, args });
      if (sql.startsWith('SELECT id FROM users')) return [[{ id: args[0] }]];
      if (sql.includes('FROM users u')) return [reader ? [{ id: args[0] }] : []];
      if (sql.includes('AS eligible')) return [[{ id: args[0], eligible: Number(eligible) }]];
      if (sql.startsWith('SELECT 1 FROM campus_post_favorites')) return [saved.has(args.join(':')) ? [{ 1: 1 }] : []];
      if (sql.startsWith('INSERT INTO campus_post_favorites')) { saved.add(args.join(':')); return [{ affectedRows: 1 }]; }
      if (sql.startsWith('DELETE FROM campus_post_favorites')) { saved.delete(args.join(':')); return [{ affectedRows: 0 }]; }
      if (sql.startsWith('SELECT COUNT')) return [[{ total: 0 }]];
      return [[]];
    } };
  return { service: createCampusFavorites({ getConnection: async () => c }), saved, calls, stats: () => ({ releases, destroys }) };
}
test('desired writes are idempotent, scoped by actor and preserve other users', async () => {
  const f = fixture(); await f.service.set(1, 10, true); await f.service.set(1, 10, true); await f.service.set(2, 10, true);
  assert.equal(f.saved.size, 2); await f.service.set(1, 10, false); await f.service.set(1, 10, false);
  assert.deepEqual([...f.saved], ['2:10']); assert.equal((await f.service.get(2, 10)).favorited, true);
  assert.match(f.calls[0].sql, /users.*FOR SHARE/); assert.match(f.calls.find(c => c.sql.includes('AS eligible')).sql, /FOR UPDATE/);
  assert.ok(f.calls.filter(c => c.sql.startsWith('SELECT 1 FROM campus_post_favorites')).every(c => /FOR (SHARE|UPDATE)$/.test(c.sql)));
});
test('invisible target rejects reads/saves but permits content-free owned cleanup', async () => {
  const f = fixture({ eligible: false });
  await assert.rejects(f.service.get(1, 10), e => e.status === 404);
  await assert.rejects(f.service.set(1, 10, true), e => e.status === 404);
  assert.deepEqual(await f.service.set(1, 10, false), { target_type: 'campus_post', post_id: '10', favorited: false });
});
test('current reader ineligibility blocks all private operations', async () => {
  const f = fixture({ reader: false });
  for (const work of [() => f.service.get(1, 10), () => f.service.set(1, 10, true), () => f.service.list(1, {})]) await assert.rejects(work(), e => e.status === 403);
});
test('uncertain commit discards connection and does not announce success', async () => {
  const f = fixture({ commitFails: true }); await assert.rejects(f.service.set(1, 10, true), e => e.status === 503);
  assert.equal(f.stats().destroys, 1); assert.equal(f.stats().releases, 0);
});
test('pagination is bounded and list SQL binds actor, not supplied userId', async () => {
  const f = fixture(); const data = await f.service.list(1, { userId: 2, page: 2, pageSize: 10 }); assert.equal(data.page, 2);
  const sql = f.calls.filter(c => c.sql.includes('JOIN campus_posts')); assert.ok(sql.every(c => c.args[0] === 1));
  assert.match(sql[1].sql, /ORDER BY f.created_at DESC,f.post_id DESC LIMIT 10 OFFSET 10/);
  assert.throws(() => f.service.list(1, { pageSize: 999 })); assert.throws(() => f.service.get(1, '1 OR 1=1'));
});
test('real routes pass only authenticated identity and set private no-store', async () => {
  const seen = []; const app = express(); app.use(express.json());
  app.use('/api/campus-news', createPublicRouter({ authenticate: (req, _res, next) => { req.user = { id: 7 }; next(); }, service: {}, assets: {}, favorites: {
    list: async actor => { seen.push(actor); return { list: [] }; }, get: async actor => { seen.push(actor); return { favorited: false }; }, set: async (actor, id, desired) => { seen.push(actor); return { id, favorited: desired }; },
  } }));
  const r = await request(app).put('/api/campus-news/10/favorite?userId=8').send({ user_id: 8 }); assert.equal(r.status, 200); assert.equal(r.body.data.favorited, true); assert.match(r.headers['cache-control'], /private, no-store/);
  await request(app).get('/api/campus-news/me/favorites?userId=8'); assert.deepEqual(seen, [7,7]);
});
