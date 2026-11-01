'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  freezeRecipients,
  mailboxItem,
  createDeliveryWorker,
  ELIGIBLE,
  TYPE
} = require('../services/campusNewsNotifications');
const post = () => ({
  sourceKind: 'news',
  lifecycleStatus: 'published',
  audience: {
    scope: 'colleges',
    collegeIds: ['xmum-sem']
  }
});
for (const [name, change] of Object.entries({
  draft: {
    lifecycleStatus: 'draft'
  },
  withdrawn: {
    lifecycleStatus: 'withdrawn'
  },
  legacy: {
    sourceKind: 'legacy'
  },
  hidden: {
    hiddenByAdmin: true
  },
  deleted: {
    deletedAt: 'now'
  },
  all: {
    audience: {
      scope: 'all',
      collegeIds: []
    }
  },
  testCollege: {
    audience: {
      scope: 'colleges',
      collegeIds: ['stage2-test-college-a']
    }
  }
})) {
  test(`recipient snapshot skips ${name}`, async () => {
    assert.equal(await freezeRecipients({
      sql: () => {
        throw Error('unexpected SQL');
      }
    }, {
      ...post(),
      ...change
    }, 8), 0);
  });
}
test('snapshot uses stable IDs, locking reads and one event/user insert', async () => {
  const calls = [];
  const count = await freezeRecipients({
    sql: async (q, p) => {
      calls.push([q, p]);
      return q.startsWith('SELECT') ? [{
        id: 7,
        college_id: 'xmum-sem'
      }] : {};
    }
  }, post(), 8);
  assert.equal(count, 1);
  assert.match(calls[0][0], /FOR SHARE/);
  assert.deepEqual(calls[0][1], ['xmum-sem']);
  assert.deepEqual(calls[1][1], [8, 7, 'xmum-sem']);
  assert.match(ELIGIBLE, /role='student'/);
  assert.match(ELIGIBLE, /status='active'/);
  assert.match(ELIGIBLE, /banned_until/);
  assert.match(ELIGIBLE, /s.type='ban'/);
  assert.doesNotMatch(ELIGIBLE, /programme_id|email_verified|mute/);
});
test('snapshot failure propagates to publishing transaction', async () => {
  await assert.rejects(freezeRecipients({
    sql: async q => {
      if (q.startsWith('SELECT')) return [{
        id: 7,
        college_id: 'xmum-sem'
      }];
      throw Error('outbox failed');
    }
  }, post(), 8), /outbox failed/);
});
const raw = {
  id: 9,
  type: TYPE,
  is_read: 1,
  extra: '{"title":"SECRET","path":"https://evil.invalid"}',
  post_title: 'SECRET'
};
const target = {
  publication_version_id: 8,
  post_id: 4,
  title: 'Visible title',
  source_kind: 'news',
  lifecycle_status: 'published',
  hidden_by_admin: 0,
  deleted_at: null
};
for (const [name, change] of Object.entries({
  hidden: {
    hidden_by_admin: 1
  },
  withdrawn: {
    lifecycle_status: 'withdrawn'
  },
  draft: {
    lifecycle_status: 'draft'
  },
  deleted: {
    deleted_at: 'now'
  },
  legacy: {
    source_kind: 'legacy'
  }
})) {
  test(`mailbox redacts ${name} without leaking raw JSON`, async () => {
    const dto = await mailboxItem(async () => [{
      ...target,
      ...change
    }], raw, 7);
    assert.equal(dto.target.available, false);
    assert.equal(dto.target.title, null);
    assert.equal(dto.target.id, null);
    assert.equal(dto.target.path, '#');
    assert.equal(dto.is_read, true);
    assert.doesNotMatch(JSON.stringify(dto), /SECRET|evil/);
  });
}
test('mailbox uses owned persisted target and current reader eligibility', async () => {
  const calls = [];
  const sql = async (q, p) => {
    calls.push([q, p]);
    return calls.length === 1 ? [target] : [{
      id: 7
    }];
  };
  const dto = await mailboxItem(sql, raw, 7);
  assert.deepEqual(calls[0][1], [9, 7]);
  assert.match(calls[0][0], /d.user_id=\?/);
  assert.equal(dto.target.path, '/about/campus/4');
  assert.equal(dto.post_id, null);
  assert.equal(dto.extra.publicationVersionId, '8');
  assert.doesNotMatch(JSON.stringify(dto), /SECRET|evil/);
});
test('mailbox hides content from ineligible reader and missing relation', async () => {
  let n = 0;
  assert.equal((await mailboxItem(async () => ++n === 1 ? [target] : [], raw, 7)).target.available, false);
  assert.equal((await mailboxItem(async () => [], raw, 7)).target.available, false);
});
function workerFixture({
  failUpdate = false,
  ineligible = false,
  empty = false
} = {}) {
  const events = [];
  const c = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    query: async () => [[...(empty ? [] : [{
      publication_version_id: 8,
      user_id: 7
    }])]],
    execute: async (q, p) => {
      events.push([q, p]);
      if (q.startsWith('SELECT u.id')) return [ineligible ? [] : [{
        id: 7
      }]];
      if (q.startsWith('SELECT post_id')) return [[{
        post_id: 4
      }]];
      if (q.startsWith('INSERT')) return [{
        insertId: 9
      }];
      if (q.includes("SET state='delivered'")) return [{
        affectedRows: failUpdate ? 0 : 1
      }];
      return [{
        affectedRows: 1
      }];
    }
  };
  return {
    events,
    worker: createDeliveryWorker({
      getConnection: async () => c
    }, {
      logger: () => {}
    })
  };
}
test('delivery atomically inserts safe notification then commits delivered state', async () => {
  const {
    worker,
    events
  } = workerFixture();
  assert.equal(await worker.runOne(), true);
  assert.equal(events.at(-2), 'commit');
  const insert = events.find(e => Array.isArray(e) && e[0].startsWith('INSERT'));
  assert.match(insert[0], /NULL,NULL,NULL/);
  assert.deepEqual(JSON.parse(insert[1][2]), {
    targetType: 'campus_news',
    targetId: 4,
    publicationVersionId: '8'
  });
  assert.ok(events.find(e => Array.isArray(e) && e[0].includes("SET state='delivered'")));
});
test('failed delivered-state update rolls back insert and records persistent retry', async () => {
  const {
    worker,
    events
  } = workerFixture({
    failUpdate: true
  });
  assert.equal(await worker.runOne(), false);
  assert.ok(events.includes('rollback'));
  assert.ok(!events.includes('commit'));
  assert.ok(events.find(e => Array.isArray(e) && e[0].includes('next_attempt_at=TIMESTAMPADD')));
});
test('ineligible recipient is retained pending and not delivered', async () => {
  const {
    worker,
    events
  } = workerFixture({
    ineligible: true
  });
  assert.equal(await worker.runOne(), false);
  assert.ok(!events.find(e => Array.isArray(e) && e[0].startsWith('INSERT')));
  assert.ok(events.find(e => Array.isArray(e) && e[1][0] === 'RECIPIENT_INELIGIBLE'));
});
test('empty queue commits read transaction without notification', async () => {
  const {
    worker,
    events
  } = workerFixture({
    empty: true
  });
  assert.equal(await worker.runOne(), false);
  assert.deepEqual(events, ['begin', 'commit', 'release']);
});
