'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { statements, operations, inspect, piece, compatible, stable } = require('./schema.cjs');
const DIR = path.resolve(__dirname, '../../migrations/delivery-01-05');
const FILES = ['001_dependencies.sql','002_news.sql','003_comments.sql','004_favorites.sql','005_academic_notifications.sql'];
const LEDGER = 'xmumdorm_delivery_01_05';
const LEDGER_SQL = `CREATE TABLE ${LEDGER} (step_id VARCHAR(200) NOT NULL PRIMARY KEY, sha256 CHAR(64) NOT NULL, state ENUM('started','applied') NOT NULL, applied_at DATETIME(3) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const hash = s => createHash('sha256').update(s).digest('hex');
function plan() {
  const ops = FILES.flatMap(f => operations(fs.readFileSync(path.join(DIR, f), 'utf8'), f));
  for (const o of ops) o.hash = hash(o.sql);
  return ops;
}
const BASELINE = {
  users: 'id username password_hash student_id email role status banned_until muted_until email_verified avatar nickname college major grade show_college show_major show_grade level exp badge weekly_comment_count created_at updated_at',
  posts: 'id user_id title content type content_origin repost_source deleted_at hidden_by_admin created_at updated_at',
  post_images: 'id post_id file_path sort_order', post_likes: 'post_id user_id', comments: 'id post_id user_id content parent_id deleted_at',
  advertisement_posts: 'post_id', notifications: 'id user_id type is_read post_id comment_id from_user_id extra created_at',
  products: 'id shop_id name deleted_at', shops: 'id name deleted_at', product_comments: 'id product_id user_id parent_id content rating deleted_at created_at',
  product_images: 'id product_id file_path sort_order', product_comment_images: 'id comment_id file_path sort_order', product_favorites: 'id user_id product_id created_at',
  regions: 'id code name', product_categories: 'id shop_id name',
  tags: 'id slug name_zh name_en', post_tag_map: 'post_id tag_id', tag_visibility: 'user_id tag_id visible'
};
function baseline(schema, contract) {
  for (const [table, names] of Object.entries(BASELINE)) {
    if (schema[table]?.engine !== 'InnoDB' || schema[table]?.type !== 'BASE TABLE') throw new Error(`BASELINE_REQUIRED:${table}`);
    for (const name of names.split(' ')) if (!schema[table].columns[name]) throw new Error(`BASELINE_COLUMN_REQUIRED:${table}.${name}`);
    for (const name of names.split(' ')) if (contract && schema[table].columns[name][0] !== contract.baseline[table][name]) throw new Error(`BASELINE_TYPE_MISMATCH:${table}.${name}`);
  }
  for (const [t,n] of [['users','id'],['posts','id'],['notifications','id']]) if (schema[t].columns[n][0] !== 'int' || schema[t].columns[n][1] !== 'NO') throw new Error(`BASELINE_SIGNED_INT_REQUIRED:${t}.${n}`);
  if (schema.notifications.columns.type[0] !== 'varchar(50)') throw new Error('BASELINE_REQUIRED:030_notifications_type_varchar');
  if (schema.notifications.columns.extra[0] !== 'json') throw new Error('BASELINE_REQUIRED:notifications.extra_json');
  if (schema.users.columns.role[0] !== "enum('student','merchant','admin')" || schema.users.columns.status[0] !== "enum('active','banned','deactivated')") throw new Error('BASELINE_REQUIRED:users.role/status');
}
function tableMatches(actual, expected, final) {
  if (!actual) return false;
  const projected = structuredClone(actual);
  for (const [name, value] of Object.entries(actual.columns)) {
    if (!expected.columns[name]) {
      if (!compatible(value, final.columns[name], 'column')) return false;
      delete projected.columns[name];
    } else if (!compatible(value, expected.columns[name], 'column')) {
      if (!compatible(value, final.columns[name], 'column')) return false;
      projected.columns[name] = expected.columns[name];
    }
  }
  // Later reviewed indexes/checks/FKs may already be present on a rerun.
  for (const key of ['indexes','checks','fks']) for (const [name,v] of Object.entries(projected[key])) {
    if (!Object.values(expected[key]).some(f => stable(f) === stable(v)) && Object.values(final[key]).some(f => stable(f) === stable(v))) delete projected[key][name];
  }
  return compatible(projected, expected, 'table');
}
function classify(schema, op, contract) {
  if (schema[op.table] && (schema[op.table].engine !== 'InnoDB' || schema[op.table].collation !== 'utf8mb4_unicode_ci' || schema[op.table].type !== 'BASE TABLE')) throw new Error(`INCOMPATIBLE_TABLE:${op.table}`);
  const actual = piece(schema, op), expected = contract.steps[op.id];
  if (actual === undefined) {
    if (op.kind !== 'table' && !schema[op.table]) return 'pending';
    if (/ MODIFY /i.test(op.sql)) throw new Error(`MISSING_MODIFY_COLUMN:${op.table}.${op.name}`);
    return 'pending';
  }
  if (op.kind === 'table' ? tableMatches(actual, expected, contract.final[op.table]) : compatible(actual, expected, op.kind)) return 'ready';
  if (/ MODIFY /i.test(op.sql) && compatible(actual, contract.before[op.id], 'column')) return 'pending';
  throw new Error(`INCOMPATIBLE_OBJECT:${op.table}.${op.name}`);
}
async function identity(c, config, requirePin = true) {
  const [[r]] = await c.query('SELECT DATABASE() AS database_name,@@server_uuid AS server_uuid,@@hostname AS hostname,@@port AS port,VERSION() AS version,@@SESSION.foreign_key_checks AS fk_checks,@@SESSION.unique_checks AS unique_checks,@@SESSION.explicit_defaults_for_timestamp AS timestamp_defaults,@@SESSION.sql_mode AS sql_mode');
  if (r.database_name !== config.database || !/^8\.0\./.test(r.version) || Number(r.version.split('.')[2].match(/^\d+/)?.[0]) < 16) throw new Error('TARGET_DATABASE_OR_MYSQL_VERSION_REJECTED');
  if (requirePin && (!config.expectedServerUuid || r.server_uuid !== config.expectedServerUuid)) throw new Error('SERVER_UUID_PIN_REQUIRED_OR_MISMATCH');
  if (Number(r.fk_checks) !== 1 || Number(r.unique_checks) !== 1 || Number(r.timestamp_defaults) !== 1 || !/STRICT_(TRANS|ALL)_TABLES/.test(r.sql_mode)) throw new Error('STRICT_SESSION_REQUIRED');
  return r;
}
async function directory(c, write) {
  const sources = statements(fs.readFileSync(path.join(DIR, '006_directory.sql'), 'utf8'));
  for (const sql of sources) {
    const m = sql.match(/^INSERT INTO (colleges|academic_programmes) \(([^)]+)\) VALUES\s+([\s\S]+)$/);
    if (!m) throw new Error('DIRECTORY_SQL_REJECTED');
    const table = m[1], names = m[2].split(',').map(s => s.trim());
    const { split } = require('./schema.cjs');
    for (const tuple of split(m[3], ',')) {
      const values = split(tuple.slice(1,-1), ',').map(v => v.trim().startsWith("'") ? v.trim().slice(1,-1).replace(/''/g,"'") : Number(v));
      const [found] = await c.execute(`SELECT ${names.join(',')} FROM ${table} WHERE id=? OR code=? OR name=? OR name_en=? FOR SHARE`, [values[0],values[1],values[names.indexOf('name')],values[names.indexOf('name_en')]]);
      if (found.length && (found.length !== 1 || names.some((n,i) => String(found[0][n]) !== String(values[i])))) throw new Error(`DIRECTORY_CONFLICT:${table}`);
      if (!found.length) { if (!write) throw new Error(`DIRECTORY_MISSING:${table}`); await c.execute(`INSERT INTO ${table}(${names.join(',')}) VALUES(${names.map(() => '?')})`, values); }
    }
  }
}
async function run(c, config, mode, hook) {
  const who = await identity(c, config, mode !== 'identity');
  if (mode === 'identity') return { identity: who };
  const ops = plan(), contract = JSON.parse(fs.readFileSync(path.join(DIR, 'schema-contract.json'), 'utf8'));
  if (contract.planHash !== hash(stable(ops))) throw new Error('PLAN_CONTRACT_HASH_MISMATCH');
  if (contract.directoryHash !== hash(fs.readFileSync(path.join(DIR,'006_directory.sql'),'utf8'))) throw new Error('DIRECTORY_CONTRACT_HASH_MISMATCH');
  let schema = await inspect(c); baseline(schema, contract);
  if (Object.values(schema).some(t => t.triggers.length)) throw new Error('TRIGGERS_REQUIRE_SEPARATE_REVIEW');
  // Validate all existing objects before any write, including later migration steps.
  const states = ops.map(op => ({ step: op.id, state: classify(schema, op, contract) }));
  let ledger = [];
  if (schema[LEDGER]) {
    if (!compatible(schema[LEDGER], contract.ledger, 'table')) throw new Error('LEDGER_SCHEMA_MISMATCH');
    [ledger] = await c.query(`SELECT step_id,sha256,state,applied_at FROM ${LEDGER}`);
    for (const row of ledger) {
      const op = ops.find(o => o.id === row.step_id);
      if (!op || row.sha256 !== op.hash || !['started','applied'].includes(row.state)) throw new Error('LEDGER_HASH_OR_STATE_MISMATCH');
      if (row.state === 'applied' && (!row.applied_at || classify(schema, op, contract) !== 'ready')) throw new Error('APPLIED_LEDGER_SCHEMA_DRIFT');
    }
  }
  const counts = {};
  for (const table of new Set([...Object.keys(BASELINE), ...ops.map(o => o.table)])) if (schema[table]) {
    const [[r]] = await c.query(`SELECT COUNT(*) AS total FROM \`${table}\``); counts[table] = Number(r.total);
  }
  const historicalLedgers = {};
  for (const table of Object.keys(schema).filter(t => t !== LEDGER && /migration|schema_version/i.test(t)).sort()) {
    if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error('HISTORICAL_LEDGER_NAME_REQUIRES_REVIEW');
    const [[r]] = await c.query(`SELECT COUNT(*) AS total FROM \`${table}\``); historicalLedgers[table] = { rows:Number(r.total) };
    if (schema[table].columns.state) {
      const [[states]] = await c.query(`SELECT COALESCE(SUM(state='applied'),0) AS applied,COALESCE(SUM(state='started'),0) AS started FROM \`${table}\``);
      historicalLedgers[table].applied = Number(states.applied); historicalLedgers[table].started = Number(states.started);
    }
  }
  if (mode === 'pre') return { identity: who, counts, historicalLedgers, steps: states, ledger: { applied: ledger.filter(r => r.state === 'applied').length, started: ledger.filter(r => r.state === 'started').length } };
  if (mode === 'post') {
    if (states.some(s => s.state !== 'ready') || ledger.length !== ops.length || ledger.some(r => r.state !== 'applied')) throw new Error('POSTCHECK_INCOMPLETE');
    await directory(c, false);
    const [[totals]] = await c.query("SELECT COUNT(*) AS pending,COALESCE(SUM(attempts>0),0) AS retried FROM campus_news_notification_deliveries WHERE state='pending'");
    return { identity: who, counts, historicalLedgers, verifiedSteps: ops.length, directory: '38 reviewed rows verified', deliveries: totals };
  }
  if (mode !== 'apply') throw new Error('INVALID_MODE');
  const [[lock]] = await c.query("SELECT GET_LOCK(CONCAT(DATABASE(),':delivery01-05'),0) AS acquired");
  if (Number(lock.acquired) !== 1) throw new Error('MIGRATION_ALREADY_RUNNING');
  try {
    if (!schema[LEDGER]) await c.query(LEDGER_SQL);
    for (const op of ops) {
      await identity(c, config);
      schema = await inspect(c);
      const state = classify(schema, op, contract);
      const [entries] = await c.execute(`SELECT state,sha256 FROM ${LEDGER} WHERE step_id=?`, [op.id]);
      if (entries.length && entries[0].sha256 !== op.hash) throw new Error('LEDGER_HASH_MISMATCH');
      if (!entries.length) await c.execute(`INSERT INTO ${LEDGER}(step_id,sha256,state) VALUES(?,?,'started')`, [op.id,op.hash]);
      if (state === 'pending') {
        if (entries[0]?.state === 'applied') throw new Error('LEDGER_DRIFT');
        await c.query(op.sql);
        const [warnings] = await c.query('SHOW WARNINGS');
        if (warnings.some(w => !(Number(w.Code) === 1681 && w.Message === 'Integer display width is deprecated and will be removed in a future release.'))) throw new Error('DDL_WARNING_REQUIRES_REVIEW');
        if (hook) await hook(op);
      }
      if (classify(await inspect(c), op, contract) !== 'ready') throw new Error(`DDL_POSTCONDITION_FAILED:${op.table}.${op.name}`);
      const [updated] = await c.execute(`UPDATE ${LEDGER} SET state='applied',applied_at=COALESCE(applied_at,UTC_TIMESTAMP(3)) WHERE step_id=? AND sha256=?`, [op.id,op.hash]);
      if (updated.affectedRows !== 1) throw new Error('LEDGER_UPDATE_FAILED');
    }
    await c.beginTransaction();
    try { await directory(c, true); await directory(c, false); await c.commit(); }
    catch (e) { await c.rollback(); throw e; }
    return await run(c, config, 'post');
  } finally { await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':delivery01-05'))"); }
}
async function main() {
  let c;
  try {
    const [mode, configPath, ...rest] = process.argv.slice(2);
    if (!['identity','pre','apply','post'].includes(mode) || !configPath || rest.length) throw new Error('USAGE:node scripts/delivery-01-05/migrate.cjs identity|pre|apply|post PRIVATE_CONFIG_JSON');
    const cfg = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf8'));
    if (Object.keys(cfg).some(k => !['host','port','user','password','database','expectedServerUuid','ssl'].includes(k)) || !/^[a-zA-Z0-9_]+$/.test(cfg.database) || !cfg.host || !cfg.user || !Number.isInteger(cfg.port)) throw new Error('INVALID_EXPLICIT_CONFIG');
    const { expectedServerUuid, ...connection } = cfg;
    c = await require('mysql2/promise').createConnection({ ...connection, multipleStatements: false, connectTimeout: 10000 });
    console.log(JSON.stringify(await run(c, cfg, mode), null, 2));
  } catch (e) {
    // Never print driver message/sql/connection config: they can contain business data or credentials.
    console.error('STOP:', /^[A-Z_]+(?::[A-Za-z0-9_. -]+)?$/.test(e.message || '') ? e.message : (e.code && /^[A-Z_0-9]+$/.test(e.code) ? e.code : 'CHECK_FAILED_SEE_HANDOFF')); process.exitCode = 1;
  } finally { if (c) await c.end(); }
}
if (require.main === module) main();
module.exports = { plan, run, directory, baseline, classify, tableMatches, hash, LEDGER, LEDGER_SQL, DIR, BASELINE };
