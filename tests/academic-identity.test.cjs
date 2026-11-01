'use strict';

const test = require('node:test'),
  assert = require('node:assert/strict');
const a = require('../services/academicIdentity');
function fixture(old = {}) {
  let state = {
      id: 99,
      nickname: 'Test',
      status: 'active',
      college: 'unreviewed',
      major: 'old major',
      grade: '2099',
      show_college: 1,
      show_grade: 1,
      show_major: 0,
      college_id: null,
      programme_id: null,
      ...old
    },
    before,
    commits = 0,
    rollbacks = 0,
    fail = false;
  const c = {
    beginTransaction: async () => {
      before = structuredClone(state);
    },
    commit: async () => {
      commits++;
    },
    rollback: async () => {
      state = before;
      rollbacks++;
    },
    release() {},
    execute: async (sql, args = []) => {
      if (sql.startsWith('SELECT *')) return [[{
        ...state
      }]];
      if (sql.includes('FROM colleges')) return [a.COLLEGE_IDS.includes(args[0]) ? [{
        id: args[0],
        name: 'School ' + args[0],
        nameEn: 'English',
        code: 'CODE'
      }] : []];
      if (sql.includes('FROM academic_programmes')) {
        if (args[0] === 'invalid') return [[]];
        const college_id = args[0].includes('soc') ? 'xmum-soc' : 'xmum-sem';
        return [[{
          id: args[0],
          college_id,
          collegeId: college_id,
          name: 'Programme'
        }].filter(p => !sql.includes('college_id=?') || p.collegeId === args[1])];
      }
      if (sql.startsWith('UPDATE users')) {
        if (fail) throw Error('simulated write failure');
        const keys = [...sql.matchAll(/`(\w+)`=\?/g)].map(m => m[1]);
        keys.forEach((k, i) => state[k] = args[i]);
        return [{
          affectedRows: 1
        }];
      }
      throw Error('Unstubbed SQL');
    }
  };
  return {
    pool: {
      getConnection: async () => c
    },
    c,
    state: () => state,
    stats: () => ({
      commits,
      rollbacks
    }),
    fail: () => {
      fail = true;
    }
  };
}
for (const [label, body, code] of [['invalid college', {
  collegeId: 'not-college',
  programmeId: null
}, 'INVALID_COLLEGE'], ['invalid programme', {
  collegeId: 'xmum-sem',
  programmeId: 'invalid'
}, 'INVALID_PROGRAMME'], ['cross college', {
  collegeId: 'xmum-soc',
  programmeId: 'xmum-sem-p'
}, 'PROGRAMME_COLLEGE_MISMATCH'], ['programme without college', {
  collegeId: null,
  programmeId: 'xmum-sem-p'
}, 'COLLEGE_REQUIRED'], ['partial pair', {
  collegeId: 'xmum-sem'
}, 'INCOMPLETE_IDENTITY'], ['numeric ID', {
  collegeId: 2,
  programmeId: null
}, 'INVALID_ACADEMIC_ID'], ['test college', {
  collegeId: 'stage2-test-college-a',
  programmeId: null
}, 'INVALID_COLLEGE'], ['other user target', {
  id: 100
}, 'PROFILE_TARGET_FORBIDDEN'], ['role injection', {
  role: 'admin'
}, 'PROFILE_TARGET_FORBIDDEN']]) test(label, async () => {
  const f = fixture();
  await assert.rejects(a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    ...body
  }), e => e.code === code);
  assert.equal(f.state().college_id, null);
});
test('matching IDs persist atomically and legacy public labels reflect explicit selection', async () => {
  const f = fixture();
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    collegeId: 'xmum-sem',
    programmeId: 'xmum-sem-p'
  });
  assert.equal(r.collegeId, 'xmum-sem');
  assert.equal(r.programmeId, 'xmum-sem-p');
  assert.equal(r.grade, '2099');
  assert.equal(f.stats().commits, 1);
});
test('college only and college switch clear old programme', async () => {
  const f = fixture({
    college_id: 'xmum-sem',
    programme_id: 'xmum-sem-p'
  });
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    collegeId: 'xmum-soc',
    programmeId: null
  });
  assert.equal(r.programmeId, null);
  assert.equal(r.major, null);
  assert.equal(r.collegeId, 'xmum-soc');
});
test('explicit clear retains unknown historical text without inference', async () => {
  const f = fixture();
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    collegeId: null,
    programmeId: null
  });
  assert.equal(r.college, 'unreviewed');
  assert.equal(r.major, 'old major');
  assert.equal(r.academicIdentity.needsSelection, true);
});
test('legacy name-only patch preserves grade, text and stable identity', async () => {
  const f = fixture({
    college_id: 'xmum-sem'
  });
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'New'
  });
  assert.equal(r.collegeId, 'xmum-sem');
  assert.equal(r.grade, '2099');
  assert.equal(r.college, 'unreviewed');
});
test('bound legacy text mutation refuses stale stable identity', async () => {
  const f = fixture({
    college_id: 'xmum-sem'
  });
  await assert.rejects(a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    college: 'changed'
  }), e => e.code === 'RESELECT_ACADEMIC_IDENTITY');
  assert.equal(f.stats().rollbacks, 1);
});
test('unbound legacy text is preserved and not guessed', async () => {
  const f = fixture();
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    college: 'CS'
  });
  assert.equal(r.collegeId, null);
  assert.equal(r.college, 'CS');
});
test('schema unavailable never falsely reports ID saved', async () => {
  const f = fixture();
  delete f.state().college_id;
  await assert.rejects(a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    collegeId: 'xmum-sem',
    programmeId: null
  }), e => e.code === 'ACADEMIC_SCHEMA_UNAVAILABLE');
});
test('inactive user rejected in current DB state', async () => {
  const f = fixture({
    status: 'deactivated'
  });
  await assert.rejects(a.saveProfile(f.pool, 99, {
    nickname: 'Test'
  }), e => e.code === 'USER_INACTIVE');
});
test('write failure rolls back all fields', async () => {
  const f = fixture();
  f.fail();
  await assert.rejects(a.saveProfile(f.pool, 99, {
    nickname: 'Changed',
    collegeId: 'xmum-sem',
    programmeId: null
  }));
  assert.equal(f.state().nickname, 'Test');
  assert.equal(f.stats().rollbacks, 1);
});
test('public flags do not affect trusted saved identity', async () => {
  const f = fixture();
  const r = await a.saveProfile(f.pool, 99, {
    nickname: 'Test',
    collegeId: 'xmum-sem',
    programmeId: null,
    show_college: false
  });
  assert.equal(r.collegeId, 'xmum-sem');
  assert.equal(r.show_college, false);
});
test('local boundary allows only directory GET and current-user PATCH', () => {
  const {
    localHttpBoundary
  } = require('../scripts/stage2-local/http-boundary.cjs');
  for (const [method, url, expected] of [['GET', '/api/academic-directory/colleges', true], ['GET', '/api/academic-directory/colleges/xmum-sem/programmes', true], ['PATCH', '/api/users/me', true], ['PATCH', '/api/users/9', false], ['POST', '/api/notifications', false]]) {
    let allowed = false;
    localHttpBoundary({
      method,
      url
    }, {
      status() {
        return this;
      },
      json() {}
    }, () => {
      allowed = true;
    });
    assert.equal(allowed, expected);
  }
});
