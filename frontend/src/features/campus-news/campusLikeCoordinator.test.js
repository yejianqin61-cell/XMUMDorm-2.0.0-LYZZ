import test from 'node:test';
import assert from 'node:assert/strict';
import { createLikeCoordinator } from './campusLikeCoordinator.js';

const state = { liked: true, like_count: 1, comment_count: 0 };
test('Pending duplicate intent never issues another write; feed/detail share the target lock', async () => {
  const run = createLikeCoordinator(); let release, writes = 0;
  const wait = new Promise(resolve => { release = resolve; });
  const options = { key: 'campus:student2:15', desired: true, write: async () => { writes++; await wait; return state; }, read: async () => assert.fail(), apply() {}, unavailable() {} };
  const first = run(options); await run(options); assert.equal(writes, 1); release(); await first;
});
test('Network/unknown result failure reads current state; never flips intent or announces success', async () => {
  const run = createLikeCoordinator(); let writes = 0, reads = 0, applied;
  await assert.rejects(run({ key: 'campus:2:15', desired: true, write: async desired => { assert.equal(desired, true); writes++; throw new Error('unknown commit'); }, read: async () => { reads++; return state; }, apply: value => { applied = value; }, unavailable: () => assert.fail() }), /unknown commit/);
  assert.equal(writes, 1); assert.equal(reads, 1); assert.equal(applied.liked, true);
});
test('Failed reconciliation clears usable state, releases pending and permits a fresh explicit attempt', async () => {
  const run = createLikeCoordinator(); let cleared = false;
  const options = { key: 'campus:2:15', desired: true, write: async () => { throw new Error('offline'); }, read: async () => { throw new Error('offline'); }, apply: () => assert.fail(), unavailable: () => { cleared = true; } };
  await assert.rejects(run(options)); assert.equal(cleared, true);
  let applied = false; await run({ ...options, write: async () => state, apply: () => { applied = true; } }); assert.equal(applied, true);
});
test('Different identities and targets do not block or overwrite one another', async () => {
  const run = createLikeCoordinator(); const keys = [];
  await Promise.all(['campus:2:15', 'campus:3:15', 'campus:2:16'].map(key => run({ key, desired: true, write: async () => state, read: async () => state, apply: () => keys.push(key), unavailable() {} })));
  assert.equal(keys.length, 3);
});
test('Contradictory write response is not accepted as success', async () => {
  const run = createLikeCoordinator(); let applied;
  await assert.rejects(run({ key: 'campus:2:15', desired: false, write: async () => state, read: async () => state, apply: value => { applied = value; }, unavailable() {} }), /不一致/);
  assert.equal(applied.liked, true);
});
