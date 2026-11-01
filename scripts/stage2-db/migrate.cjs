'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { connectLocal, verifyIdentity } = require('./local-config.cjs');
const { expectedSchema, applyDDL, inspectSchema, assertSchema } = require('./schema.cjs');
const FILES = ['001_local_foundation.sql', '002_campus_news.sql', '003_campus_safety.sql'];
const TABLES = ['users','audit_logs','exp_logs','user_exp_daily','user_terms_acceptances','organizations','organization_memberships','campus_posts','campus_post_images','campus_post_likes','campus_post_comments','colleges','campus_post_audiences','campus_news_assets','campus_news_images','campus_news_versions','campus_news_version_assets','campus_news_audit','user_sanctions','sensitive_words'];
const LEDGER = 'stage2_schema_migrations';
const LEDGER_SQL = `CREATE TABLE ${LEDGER} (file_name VARCHAR(100) NOT NULL, statement_index INT NOT NULL, sha256 CHAR(64) NOT NULL, state ENUM('started','applied') NOT NULL, applied_at DATETIME NULL, PRIMARY KEY(file_name,statement_index)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const LEDGER_START = `INSERT INTO ${LEDGER}(file_name,statement_index,sha256,state) VALUES(?,?,?,'started')`;
const LEDGER_APPLY = `UPDATE ${LEDGER} SET state='applied',applied_at=UTC_TIMESTAMP() WHERE file_name=? AND statement_index=? AND sha256=? AND state='started'`;
const sha = text => createHash('sha256').update(text).digest('hex');
function validateSQL(sql) {
  if (!/^(CREATE TABLE|ALTER TABLE) [a-z_]+\s/i.test(sql)
    || /\b(USE|DROP|TRUNCATE|RENAME|INSERT|UPDATE|DELETE|REPLACE|GRANT|REVOKE|PROCEDURE|TRIGGER|PREPARE|EXECUTE|OUTFILE|LOAD|DATABASE)\b/i.test(sql.replace(/ON DELETE (CASCADE|RESTRICT)/gi, '').replace(/ON UPDATE CURRENT_TIMESTAMP/g, ''))
    || /[`.]/.test(sql.replace(/DEFAULT CURRENT_TIMESTAMP\(3\)/g, ''))) throw new Error('Candidate SQL contains forbidden commands/qualified names.');
  const table = sql.match(/^(?:CREATE TABLE|ALTER TABLE) ([a-z_]+)/i)[1];
  if (!TABLES.includes(table)) throw new Error('Table is outside the reviewed manifest.');
  for (const match of sql.matchAll(/REFERENCES\s+([a-z_]+)/gi)) if (!TABLES.includes(match[1])) throw new Error('Foreign key outside reviewed manifest.');
}
function plan() {
  const statements = FILES.flatMap(file => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../migrations/stage2', file), 'utf8');
    return source.replace(/^--.*$/gm, '').split(';').map(sql => sql.trim()).filter(Boolean).map((sql, index) => { validateSQL(sql); return { file, index, sql, hash: sha(sql) }; });
  });
  const schema = expectedSchema(statements);
  const ledger = { create: LEDGER_SQL, start: LEDGER_START, applied: LEDGER_APPLY };
  const policy = { version: 2,
    runnerHash: sha(fs.readFileSync(__filename, 'utf8')),
    verifierHash: sha(fs.readFileSync(path.join(__dirname, 'schema.cjs'), 'utf8')),
    connectionGuardHash: sha(fs.readFileSync(path.join(__dirname, 'local-config.cjs'), 'utf8')),
    networkGuardHash: sha(fs.readFileSync(path.join(__dirname, '../stage2-local/network.cjs'), 'utf8')),
  };
  const reviewed = { statements, schema, ledger, policy };
  return { hash: sha(JSON.stringify(reviewed)), ...reviewed };
}
function stateAfter(candidate, count) {
  // Validate the cumulative prefix. A later ALTER legitimately supersedes the
  // earlier CREATE's definition; do not compare both incompatible definitions.
  return applyDDL(expectedSchema(candidate.statements.slice(0, count)), candidate.ledger.create);
}
function ledgerPrefix(entries, candidate) {
  let count = 0;
  for (const entry of entries) {
    const item = candidate.statements.find(s => s.file === entry.file_name && s.index === entry.statement_index);
    if (!item || item.hash !== entry.sha256 || entry.state !== 'applied' || !entry.applied_at) throw new Error('Ledger mismatch/incomplete DDL: manual reconciliation required, no automatic retry.');
  }
  while (count < candidate.statements.length && entries.some(e => e.file_name === candidate.statements[count].file && e.statement_index === candidate.statements[count].index)) count++;
  if (count !== entries.length) throw new Error('Ledger is not a unique contiguous applied prefix; manual reconciliation required.');
  return count;
}
async function verifyStructure(connection, candidate, count) { assertSchema(await inspectSchema(connection), stateAfter(candidate, count)); }
async function apply(connection, candidate, approval) {
  if (approval !== candidate.hash) throw new Error('Explicit approved plan hash required; no database writes performed.');
  const reviewed = plan();
  if (JSON.stringify(candidate) !== JSON.stringify(reviewed)) throw new Error('Candidate changed or differs from the reviewed manifest.');
  await verifyIdentity(connection);
  const [session] = await connection.query('SELECT @@SESSION.foreign_key_checks AS foreign_key_checks, @@SESSION.explicit_defaults_for_timestamp AS explicit_defaults_for_timestamp');
  if (Number(session[0]?.foreign_key_checks) !== 1 || Number(session[0]?.explicit_defaults_for_timestamp) !== 1) throw new Error('Migration requires FK checks and explicit timestamp defaults enabled; no automatic session changes.');
  const [lock] = await connection.query("SELECT GET_LOCK('xmumdorm_stage2_dev_schema',0) AS acquired");
  if (Number(lock[0].acquired) !== 1) throw new Error('Another migration executor is active.');
  try {
    const before = await inspectSchema(connection);
    const hasLedger = before.tables.some(t => t.TABLE_NAME === LEDGER);
    if (!hasLedger && before.tables.length) throw new Error('Non-empty untracked schema refused. This manifest is empty-database only.');
    if (!hasLedger) {
      assertSchema(before, {});
      await connection.query(candidate.ledger.create);
      await verifyStructure(connection, candidate, 0);
    } else {
      // Check the ledger's own shape before trusting its rows. The full schema
      // is checked after deriving the applied prefix below.
      const ledgerOnly = Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, rows.filter(row => row.TABLE_NAME === LEDGER)]));
      assertSchema(ledgerOnly, stateAfter(candidate, 0));
    }
    const [entries] = await connection.query(`SELECT * FROM ${LEDGER}`);
    const completed = ledgerPrefix(entries, candidate);
    // Fail before any further DDL/DML on drift, missing tables or stale ledger.
    await verifyStructure(connection, candidate, completed);
    for (let index = completed; index < candidate.statements.length; index++) {
      const item = candidate.statements[index];
      await verifyIdentity(connection);
      const [started] = await connection.execute(candidate.ledger.start, [item.file, item.index, item.hash]);
      if (started.affectedRows !== 1) throw new Error('Ledger started INSERT affectedRows mismatch; stop for manual inspection.');
      // MySQL DDL commits implicitly. A started entry is intentionally NOT retried automatically.
      await connection.query(item.sql);
      await verifyStructure(connection, candidate, index + 1);
      const [updated] = await connection.execute(candidate.ledger.applied, [item.file, item.index, item.hash]);
      if (updated.affectedRows !== 1) throw new Error('Ledger applied UPDATE affectedRows mismatch; stop for manual inspection.');
    }
    const [finalEntries] = await connection.query(`SELECT * FROM ${LEDGER}`);
    if (ledgerPrefix(finalEntries, candidate) !== candidate.statements.length) throw new Error('Incomplete final ledger; no success may be reported.');
    await verifyStructure(connection, candidate, candidate.statements.length);
  } finally { await connection.query("SELECT RELEASE_LOCK('xmumdorm_stage2_dev_schema')"); }
}
if (require.main === module) (async () => {
  let connection;
  try {
    const candidate = plan();
    if (process.argv[2] !== '--apply') { console.log(JSON.stringify(candidate, null, 2)); return; }
    if (process.argv[3] !== '--approved-plan' || process.argv[4] !== candidate.hash || process.argv.length !== 5) throw new Error('User approval and exact plan hash required.');
    connection = await connectLocal(); await apply(connection, candidate, process.argv[4]);
    console.log('Approved local schema statements applied. Run read-only preflight to verify structure.');
  } catch (error) { console.error('Migration stopped:', error.code || error.message); process.exitCode = 1; }
  finally { if (connection) await connection.end(); }
})();
module.exports = { plan, validateSQL, apply, FILES, TABLES, stateAfter, ledgerPrefix, verifyStructure };
