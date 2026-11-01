import test from 'node:test';
import assert from 'node:assert/strict';
import { createFavoriteCoordinator } from './campusFavoriteCoordinator.js';

test('feed/detail duplicate intent shares a lock; different account remains independent', async () => {
  const run = createFavoriteCoordinator(); let release, writes = 0;
  const wait = new Promise(resolve => { release = resolve; });
  const args = { key: 'A:12', desired: true, write: async () => { writes++; await wait; return { favorited: true }; }, read: () => assert.fail(), apply() {}, unavailable() {} };
  const first = run(args); await run(args); assert.equal(writes, 1);
  await run({ ...args, key: 'B:12', write: async () => ({ favorited: true }) });
  release(); await first;
});
test('lost response reconciles persisted state without issuing a second write', async () => {
  const run = createFavoriteCoordinator(); let writes = 0, observed;
  await assert.rejects(run({ key: 'A:12', desired: true, write: async () => { writes++; throw Error('lost response'); }, read: async () => ({ favorited: true }), apply: value => { observed = value; }, unavailable: () => assert.fail() }));
  assert.equal(writes, 1); assert.equal(observed.favorited, true);
});
test('failed reconciliation removes usable state and releases lock for retry', async () => {
  const run = createFavoriteCoordinator(); let cleared = false, observed;
  const args = { key: 'A:12', desired: false, write: async () => { throw Error('offline'); }, read: async () => { throw Error('offline'); }, apply: value => { observed = value; }, unavailable: () => { cleared = true; } };
  await assert.rejects(run(args)); assert.equal(cleared, true);
  await run({ ...args, write: async () => ({ favorited: false }) }); assert.equal(observed.favorited, false);
});
test('contradictory response is rejected then read back', async () => {
  let observed; const run = createFavoriteCoordinator();
  await assert.rejects(run({ key: 'A:12', desired: false, write: async () => ({ favorited: true }), read: async () => ({ favorited: true }), apply: value => { observed = value; }, unavailable() {} }), /不一致/);
  assert.equal(observed.favorited, true);
});
