'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { plan, apply, stateAfter, ledgerPrefix } = require('../scripts/stage2-db/migrate.cjs');
const { applyDDL, expectedSchema, assertSchema } = require('../scripts/stage2-db/schema.cjs');
const clone = value => structuredClone(value);
const DB = 'xmumdorm_stage2_dev';
// Fake MySQL metadata, not a SQL engine. It includes implicit FK support indexes,
// generated constraint names, display-width variants and metadata default syntax.
function metadata(schema) {
  const out = { tables: [], columns: [], indexes: [], foreignKeys: [], checks: [], unexpectedObjects: [] };
  for (const [tableName, table] of Object.entries(schema)) {
    out.tables.push({ TABLE_NAME: tableName, ENGINE: 'InnoDB', TABLE_COLLATION: table.collation, TABLE_TYPE: 'BASE TABLE' });
    for (const item of Object.values(table.columns)) out.columns.push({ TABLE_NAME: tableName, COLUMN_NAME: item.name,
      COLUMN_TYPE: item.type === 'tinyint' ? 'tinyint(1)' : item.type,
      IS_NULLABLE: item.nullable ? 'YES' : 'NO', COLUMN_DEFAULT: item.default === 'current_timestamp' ? 'CURRENT_TIMESTAMP()' : item.default,
      EXTRA: [item.autoIncrement ? 'auto_increment' : '', item.onUpdate ? `DEFAULT_GENERATED on update ${item.onUpdate}` : ''].filter(Boolean).join(' '), CHARACTER_SET_NAME: item.charset, COLLATION_NAME: item.collation });
    const indexes = clone(table.indexes);
    for (let index = 0; index < table.foreignKeys.length; index++) {
      const fk = table.foreignKeys[index];
      if (!indexes.some(key => JSON.stringify(key.columns.slice(0, fk.columns.length)) === JSON.stringify(fk.columns))) indexes.push({ name: `implicit_${index}`, columns: fk.columns, unique: false });
      fk.columns.forEach((name, i) => out.foreignKeys.push({ TABLE_NAME: tableName, CONSTRAINT_NAME: `generated_fk_${index}`, COLUMN_NAME: name, ORDINAL_POSITION: i + 1, REFERENCED_TABLE_SCHEMA: DB, REFERENCED_TABLE_NAME: fk.parent, REFERENCED_COLUMN_NAME: fk.parentColumns[i], DELETE_RULE: fk.deleteRule, UPDATE_RULE: 'NO ACTION' }));
    }
    for (const item of indexes) item.columns.forEach((name, index) => out.indexes.push({ TABLE_NAME: tableName, INDEX_NAME: item.name, NON_UNIQUE: item.unique ? 0 : 1, SEQ_IN_INDEX: index + 1, COLUMN_NAME: name, SUB_PART: null, INDEX_TYPE: 'BTREE', IS_VISIBLE: 'YES' }));
    table.checks.forEach((value, index) => out.checks.push({ TABLE_NAME: tableName, CONSTRAINT_NAME: `generated_check_${index}`, CHECK_CLAUSE: `(${value.replace('sort_order', '`sort_order`')})`, ENFORCED: 'YES' }));
  }
  return out;
}
function database({ completed = 0, fresh = false, failAfterDDL = 0, updateZero = false, corruptFinal = false } = {}) {
  const candidate = plan();
  let physical = fresh ? {} : stateAfter(candidate, completed);
  const entries = candidate.statements.slice(0, completed).map(s => ({ file_name: s.file, statement_index: s.index, sha256: s.hash, state: 'applied', applied_at: '2026-10-28' }));
  const writes = []; let ddlCount = 0, ledgerReads = 0;
  const connection = {
    query: async sql => {
      if (sql.startsWith('SELECT DATABASE()')) return [[{ db: DB, account: 'xmumdorm_dev@localhost', port: 3306, version: '8.0.46' }]];
      if (sql.includes('@@SESSION.foreign_key_checks')) return [[{ foreign_key_checks: 1, explicit_defaults_for_timestamp: 1 }]];
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql === 'SELECT * FROM stage2_schema_migrations') {
        ledgerReads++;
        if (corruptFinal && ledgerReads === 2) physical.users.columns.role.type = 'varchar(32)';
        return [clone(entries)];
      }
      if (sql.includes('information_schema.')) {
        const data = metadata(physical);
        if (sql.includes('information_schema.TABLES')) return [data.tables];
        if (sql.includes('information_schema.COLUMNS')) return [data.columns];
        if (sql.includes('information_schema.STATISTICS')) return [data.indexes];
        if (sql.includes('information_schema.KEY_COLUMN_USAGE')) return [data.foreignKeys];
        if (sql.includes('information_schema.TABLE_CONSTRAINTS')) return [data.checks];
        if (sql.includes('information_schema.TRIGGERS')) return [data.unexpectedObjects];
        throw new Error('Unknown metadata query');
      }
      if (/^(CREATE TABLE|ALTER TABLE)/.test(sql)) {
        writes.push(sql); physical = applyDDL(physical, sql); ddlCount++;
        if (failAfterDDL && ddlCount === failAfterDDL) throw new Error('simulated interruption after successful DDL');
        return [[]];
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
    execute: async (sql, params) => {
      writes.push(sql);
      if (sql === candidate.ledger.start) { entries.push({ file_name: params[0], statement_index: params[1], sha256: params[2], state: 'started', applied_at: null }); return [{ affectedRows: 1 }]; }
      if (sql === candidate.ledger.applied) {
        if (updateZero) return [{ affectedRows: 0 }];
        const row = entries.find(e => e.file_name === params[0] && e.statement_index === params[1] && e.sha256 === params[2] && e.state === 'started');
        if (!row) return [{ affectedRows: 0 }]; row.state = 'applied'; row.applied_at = '2026-10-28'; return [{ affectedRows: 1 }];
      }
      throw new Error('Unexpected DML');
    },
  };
  return { candidate, connection, writes, entries, physical: () => physical };
}

test('Reviewed compiler captures stable defaults, nullability, widening, enums and legacy FK semantics', () => {
  const p = plan(); const final = p.schema;
  assert.equal(p.statements.length, 21); assert.equal(Object.keys(final).length, 20);
  assert.equal(final.users.columns.role.default, 'student');
  assert.equal(final.users.columns.status.type, "enum('active','banned','deactivated')");
  assert.equal(final.organizations.columns.type.type, "enum('SchoolDepartment','College','Major','Official')");
  assert.equal(final.campus_posts.columns.organization_id.nullable, true);
  assert.equal(final.campus_posts.columns.feed_tab.nullable, true);
  assert.equal(final.campus_posts.columns.content.type, 'mediumtext');
  assert.equal(final.campus_posts.columns.source_kind.default, 'legacy');
  assert.equal(final.campus_posts.columns.lifecycle_status.default, 'published');
  assert.equal(final.campus_posts.columns.revision.default, '0');
  assert.equal(final.campus_posts.columns.published_at.default, null);
  assert.equal(final.campus_posts.columns.updated_at.default, 'current_timestamp(3)');
  assert.equal(final.campus_posts.foreignKeys.length, 2);
  assert.ok(final.campus_posts.foreignKeys.every(fk => fk.deleteRule === 'CASCADE'));
  assert.equal(final.user_sanctions.foreignKeys.length, 0); assert.equal(final.sensitive_words.foreignKeys.length, 0);
  assert.equal(final.campus_news_images.checks[0], 'sort_order<10');
  assert.equal(final.campus_news_images.columns.sort_order.type, 'tinyint unsigned');
  assert.equal(Object.values(final).reduce((count, t) => count + t.foreignKeys.length, 0), 18);
  assertSchema(metadata(stateAfter(p, 21)), stateAfter(p, 21));
});
test('Unknown DDL grammar cannot silently drop a postcondition', () => {
  assert.throws(() => expectedSchema([{ sql: 'CREATE TABLE x(id INT) ENGINE=MyISAM' }]));
  assert.throws(() => expectedSchema([{ sql: "CREATE TABLE x(id INT GENERATED ALWAYS AS (1)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" }]));
});
const driftCases = [
  ['all business tables missing', f => { for (const key of Object.keys(f.physical())) if (key !== 'stage2_schema_migrations') delete f.physical()[key]; }],
  ['table missing', f => { delete f.physical().campus_posts; }],
  ['column deleted', f => { delete f.physical().campus_posts.columns.revision; }],
  ['column type changed', f => { f.physical().campus_posts.columns.title.type = 'text'; }],
  ['column nullability changed', f => { f.physical().campus_posts.columns.author_user_id.nullable = true; }],
  ['key default changed', f => { f.physical().campus_posts.columns.lifecycle_status.default = 'draft'; }],
  ['index missing', f => { f.physical().campus_posts.indexes = f.physical().campus_posts.indexes.filter(i => i.name !== 'idx_campus_news_feed'); }],
  ['unique constraint removed', f => { f.physical().campus_news_versions.indexes.find(i => i.name === 'uk_news_revision').unique = false; }],
  ['FK target differs', f => { f.physical().campus_post_audiences.foreignKeys[1].parent = 'organizations'; }],
  ['FK delete rule differs', f => { f.physical().campus_news_version_assets.foreignKeys[1].deleteRule = 'CASCADE'; }],
  ['FK update rule differs', f => {
    const original = f.connection.query; f.connection.query = async sql => {
      const [rows] = await original(sql);
      if (sql.includes('information_schema.KEY_COLUMN_USAGE')) rows.find(r => r.TABLE_NAME === 'campus_post_audiences').UPDATE_RULE = 'CASCADE';
      return [rows];
    };
  }],
  ['table charset/collation changed', f => { f.physical().users.collation = 'utf8mb4_0900_ai_ci'; }],
  ['column collation changed', f => { f.physical().colleges.columns.id.collation = 'utf8mb4_bin'; }],
  ['image CHECK removed', f => { f.physical().campus_news_images.checks = []; }],
  ['unexpected business column', f => { f.physical().users.columns.unreviewed = { ...f.physical().users.columns.username, name: 'unreviewed' }; }],
  ['unapproved trigger', f => {
    const original = f.connection.query; f.connection.query = async sql => sql.includes('information_schema.TRIGGERS') ? [[{ object_type: 'trigger', object_name: 'unreviewed' }]] : original(sql);
  }],
  ['generated column attribute', f => {
    const original = f.connection.query; f.connection.query = async sql => {
      const [rows] = await original(sql);
      if (sql.includes('information_schema.COLUMNS')) rows.find(r => r.TABLE_NAME === 'users' && r.COLUMN_NAME === 'username').EXTRA = 'STORED GENERATED';
      return [rows];
    };
  }],
];
for (const [name, alter] of driftCases) test(`Applied ledger refuses ${name} before any DDL/DML`, async () => {
  const f = database({ completed: 21 }); alter(f);
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /SCHEMA_MISMATCH/);
  assert.equal(f.writes.length, 0);
});
test('Complete ledger with complete actual metadata is an idempotent no-op', async () => {
  const f = database({ completed: 21 }); await apply(f.connection, f.candidate, f.candidate.hash); assert.equal(f.writes.length, 0);
});
test('Empty database applies only reviewed DDL and ledger DML and validates every prefix', async () => {
  const f = database({ fresh: true }); await apply(f.connection, f.candidate, f.candidate.hash);
  assert.equal(f.writes.filter(sql => /^(CREATE TABLE|ALTER TABLE)/.test(sql)).length, 22);
  assert.equal(f.writes.filter(sql => /^INSERT/.test(sql)).length, 21);
  assert.equal(f.writes.filter(sql => /^UPDATE/.test(sql)).length, 21);
  assert.equal(f.entries.length, 21); assert.ok(f.entries.every(e => e.state === 'applied'));
});
test('A legitimate pre-ALTER prefix resumes without comparing it to the final widened columns', async () => {
  const f = database({ completed: 11 }); assert.equal(f.physical().campus_posts.columns.content.type, 'text');
  await apply(f.connection, f.candidate, f.candidate.hash);
  assert.equal(f.physical().campus_posts.columns.content.type, 'mediumtext'); assert.equal(f.entries.length, 21);
});
test('Post-DDL interruption leaves started marker and cannot be blindly resumed', async () => {
  const f = database({ fresh: true, failAfterDDL: 2 });
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /interruption/);
  assert.ok(f.physical().users); assert.equal(f.entries[0].state, 'started');
  const writes = f.writes.length;
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /manual reconciliation/);
  assert.equal(f.writes.length, writes);
});
test('Ledger applied UPDATE affectedRows=0 stops before next DDL and preserves unresolved started state', async () => {
  const f = database({ fresh: true, updateZero: true });
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /UPDATE affectedRows mismatch/);
  assert.equal(f.entries[0].state, 'started'); assert.equal(f.entries.length, 1);
  assert.ok(f.physical().users); assert.equal(f.physical().audit_logs, undefined);
});
test('Final verification catches drift even after the last ledger update', async () => {
  const f = database({ fresh: true, corruptFinal: true });
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /SCHEMA_MISMATCH.*users.role/);
  assert.ok(f.entries.every(e => e.state === 'applied'));
});
test('Ledger shape, gaps, duplicates and applied_at state cannot be trusted blindly', async () => {
  const f = database({ completed: 21 }); delete f.physical().stage2_schema_migrations.columns.sha256;
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /SCHEMA_MISMATCH/);
  assert.equal(f.writes.length, 0);
  const g = database({ completed: 4 }); g.entries.splice(1, 1);
  await assert.rejects(apply(g.connection, g.candidate, g.candidate.hash), /contiguous/);
  assert.equal(g.writes.length, 0);
  const duplicate = database({ completed: 1 }); duplicate.entries.push(clone(duplicate.entries[0]));
  assert.throws(() => ledgerPrefix(duplicate.entries, duplicate.candidate), /contiguous/);
  const noTimestamp = database({ completed: 1 }); noTimestamp.entries[0].applied_at = null;
  await assert.rejects(apply(noTimestamp.connection, noTimestamp.candidate, noTimestamp.candidate.hash), /manual reconciliation/);
  assert.equal(noTimestamp.writes.length, 0);
});
test('Hash binds ledger DDL/DML, structural contract and verifier policy, not just business SQL', async () => {
  const f = database({ completed: 21 });
  for (const change of [c => { c.ledger.create += ' '; }, c => { c.schema.users.columns.role.default = 'admin'; }, c => { c.policy.version = -1; }]) {
    const tampered = clone(f.candidate); change(tampered);
    await assert.rejects(apply(f.connection, tampered, tampered.hash), /differs from the reviewed/);
  }
  assert.equal(f.writes.length, 0);
});
test('Wrong MySQL session FK/timestamp policy refuses before any DDL/DML', async () => {
  const f = database({ fresh: true }); const original = f.connection.query;
  f.connection.query = async sql => sql.includes('@@SESSION.foreign_key_checks') ? [[{ foreign_key_checks: 0, explicit_defaults_for_timestamp: 1 }]] : original(sql);
  await assert.rejects(apply(f.connection, f.candidate, f.candidate.hash), /FK checks/); assert.equal(f.writes.length, 0);
});
