'use strict';
// Deliberately restricted DDL compiler. Unsupported syntax fails planning rather
// than silently omitting a structural postcondition. No DB/file/network access.
const copy = value => structuredClone(value);
function splitParts(value) {
  const parts = []; let start = 0, depth = 0, quoted = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "'") {
      if (quoted && value[index + 1] === "'") { index++; continue; }
      quoted = !quoted;
    }
    if (!quoted) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) { parts.push(value.slice(start, index).trim()); start = index + 1; }
    }
  }
  if (quoted || depth !== 0) throw new Error('Unsupported/unbalanced candidate DDL.');
  parts.push(value.slice(start).trim());
  return parts;
}
function normType(value) {
  return String(value).split(/('(?:''|[^'])*')/).map((part, index) => index % 2 ? part : part.toLowerCase().replace(/\b(tinyint|int|bigint)\(\d+\)/g, '$1').replace(/\s+/g, ' ')).join('').trim();
}
function normDefault(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (/^current_timestamp(?:\(\d*\))?$/i.test(text)) return text.toLowerCase().replace(/\(\)/g, '');
  return text;
}
const normAction = value => String(value || 'RESTRICT').toUpperCase() === 'NO ACTION' ? 'RESTRICT' : String(value || 'RESTRICT').toUpperCase();
const names = value => value.split(',').map(name => name.trim());
const textType = type => /^(varchar|char|enum|text|mediumtext)\b/i.test(type);
const normCheck = value => String(value).replace(/[`()\s]/g, '').toLowerCase();
function column(definition) {
  const match = definition.match(/^([a-z_][a-z0-9_]*)\s+((?:varchar|char)\(\d+\)|enum\((?:'[^']*'\s*,?\s*)+\)|(?:tinyint|bigint|int)(?:\(\d+\))?(?:\s+unsigned)?|(?:timestamp|datetime)(?:\(\d+\))?|mediumtext|text|json|date)(?=\s|$)(.*)$/is);
  if (!match) throw new Error(`Unsupported column definition: ${definition}`);
  const [, name, rawType, tail] = match;
  // All currently approved grammar is checked; unknown column clauses stop plan generation.
  // Remove DEFAULT before NULL to avoid consuming the default's NULL token.
  const residual = tail.replace(/\bDEFAULT\s+(?:NULL|'(?:''|[^'])*'|CURRENT_TIMESTAMP(?:\(\d*\))?|[+-]?\d+)/gi, '')
    .replace(/\bON UPDATE CURRENT_TIMESTAMP(?:\(\d*\))?/gi, '')
    .replace(/\bNOT NULL\b|\bNULL\b|\bAUTO_INCREMENT\b|\bPRIMARY KEY\b|\bUNIQUE\b/gi, '').trim();
  if (residual) throw new Error(`Unsupported column clauses for ${name}: ${residual}`);
  const defaultMatch = tail.match(/\bDEFAULT\s+(NULL|'(?:''|[^'])*'|CURRENT_TIMESTAMP(?:\(\d*\))?|[+-]?\d+)/i);
  let defaultValue = defaultMatch?.[1] ?? null;
  if (defaultValue && /^NULL$/i.test(defaultValue)) defaultValue = null;
  else if (defaultValue?.startsWith("'")) defaultValue = defaultValue.slice(1, -1).replace(/''/g, "'");
  const type = normType(rawType);
  const updateMatch = tail.match(/\bON UPDATE (CURRENT_TIMESTAMP(?:\(\d*\))?)/i);
  return { name, type, nullable: !/\bNOT NULL\b|\bPRIMARY KEY\b/i.test(tail), default: normDefault(defaultValue), autoIncrement: /\bAUTO_INCREMENT\b/i.test(tail), onUpdate: updateMatch ? normDefault(updateMatch[1]) : null,
    charset: textType(type) ? 'utf8mb4' : null, collation: textType(type) ? 'utf8mb4_unicode_ci' : null };
}
function index(definition) {
  const primary = definition.match(/^PRIMARY KEY\s*\(([^)]+)\)$/i);
  if (primary) return { name: 'PRIMARY', columns: names(primary[1]), unique: true };
  const match = definition.match(/^(UNIQUE KEY|INDEX|KEY) ([a-z_]+)\s*\(([^)]+)\)$/i);
  return match ? { name: match[2], columns: names(match[3]), unique: /^UNIQUE/i.test(match[1]) } : null;
}
function addDefinition(table, definition, modifying = false) {
  const key = index(definition);
  if (key) { if (table.indexes.some(i => i.name === key.name)) throw new Error('Duplicate index in candidate'); table.indexes.push(key); return; }
  const fk = definition.match(/^FOREIGN KEY\s*\(([^)]+)\) REFERENCES ([a-z_]+)\s*\(([^)]+)\) ON DELETE (CASCADE|RESTRICT)$/i);
  if (fk) { table.foreignKeys.push({ columns: names(fk[1]), parent: fk[2], parentColumns: names(fk[3]), deleteRule: fk[4].toUpperCase(), updateRule: 'RESTRICT' }); return; }
  const check = definition.match(/^CHECK\((.+)\)$/i);
  if (check) {
    if (!/^[a-z_][a-z0-9_]*\s*<\s*\d+$/i.test(check[1])) throw new Error('Unsupported CHECK grammar');
    table.checks.push(normCheck(check[1])); return;
  }
  const item = column(definition);
  if (modifying !== Object.hasOwn(table.columns, item.name)) throw new Error(`Unexpected ADD/MODIFY for ${item.name}`);
  table.columns[item.name] = item;
  if (/\bPRIMARY KEY\b/i.test(definition)) table.indexes.push({ name: 'PRIMARY', columns: [item.name], unique: true });
  if (/\bUNIQUE\b/i.test(definition)) table.indexes.push({ name: item.name, columns: [item.name], unique: true });
}
function applyDDL(schema, sql) {
  const result = copy(schema);
  const create = sql.match(/^CREATE TABLE ([a-z_][a-z0-9_]*)\s*\(([\s\S]*)\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/i);
  if (create) {
    if (result[create[1]]) throw new Error('Duplicate CREATE in candidate');
    const table = { engine: 'InnoDB', collation: 'utf8mb4_unicode_ci', columns: {}, indexes: [], foreignKeys: [], checks: [] };
    splitParts(create[2]).forEach(part => addDefinition(table, part));
    for (const key of table.indexes.filter(i => i.name === 'PRIMARY')) for (const name of key.columns) table.columns[name].nullable = false;
    result[create[1]] = table;
    return result;
  }
  const alter = sql.match(/^ALTER TABLE ([a-z_][a-z0-9_]*)\s+([\s\S]+)$/i);
  if (!alter || !result[alter[1]]) throw new Error('Unsupported candidate DDL or missing dependency');
  splitParts(alter[2]).forEach(part => {
    const operation = part.match(/^(ADD|MODIFY) (.+)$/is);
    if (!operation) throw new Error('Unsupported ALTER operation');
    addDefinition(result[alter[1]], operation[2], operation[1].toUpperCase() === 'MODIFY');
  });
  return result;
}
function expectedSchema(statements) { return statements.reduce((schema, item) => applyDDL(schema, item.sql), {}); }
function group(rows, key) {
  const result = new Map();
  for (const row of rows) { const name = key(row); if (!result.has(name)) result.set(name, []); result.get(name).push(row); }
  return result;
}
async function inspectSchema(connection) {
  // Queries are intentionally limited to the connected database's metadata.
  const [tables] = await connection.query('SELECT TABLE_NAME,ENGINE,TABLE_COLLATION,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
  const [columns] = await connection.query('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,CHARACTER_SET_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
  const [indexes] = await connection.query('SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE,IS_VISIBLE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX');
  const [foreignKeys] = await connection.query('SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,k.REFERENCED_TABLE_SCHEMA,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.CONSTRAINT_SCHEMA=DATABASE() ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION');
  const [checks] = await connection.query("SELECT t.TABLE_NAME,t.CONSTRAINT_NAME,c.CHECK_CLAUSE,t.ENFORCED FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.CONSTRAINT_TYPE='CHECK'");
  const [unexpectedObjects] = await connection.query("SELECT 'trigger' AS object_type,TRIGGER_NAME AS object_name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() UNION ALL SELECT 'routine',ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() UNION ALL SELECT 'event',EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()");
  return { tables, columns, indexes, foreignKeys, checks, unexpectedObjects };
}
function assertSchema(actual, expected, database = 'xmumdorm_stage2_dev') {
  const errors = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const tableNames = actual.tables.map(t => t.TABLE_NAME).sort();
  if (actual.unexpectedObjects?.length) errors.push('unapproved database trigger/routine/event present');
  if (!same(tableNames, Object.keys(expected).sort())) errors.push(`tables expected=[${Object.keys(expected).sort()}] actual=[${tableNames}]`);
  for (const [tableName, table] of Object.entries(expected)) {
    const metadata = actual.tables.find(t => t.TABLE_NAME === tableName);
    if (!metadata) continue;
    if (metadata.ENGINE?.toLowerCase() !== 'innodb' || metadata.TABLE_COLLATION !== table.collation || metadata.TABLE_TYPE !== 'BASE TABLE') errors.push(`${tableName}: engine/collation/table type mismatch`);
    const rows = actual.columns.filter(c => c.TABLE_NAME === tableName);
    if (!same(rows.map(c => c.COLUMN_NAME).sort(), Object.keys(table.columns).sort())) errors.push(`${tableName}: columns mismatch`);
    for (const [name, item] of Object.entries(table.columns)) {
      const row = rows.find(c => c.COLUMN_NAME === name);
      if (!row) continue;
      const extra = String(row.EXTRA || '').toLowerCase();
      const unexpectedExtra = extra.replace(/\bauto_increment\b|\bdefault_generated\b/g, '').replace(/on update current_timestamp(?:\(\d*\))?/g, '').trim();
      if (unexpectedExtra) errors.push(`${tableName}.${name}: unexpected generated/invisible column attributes`);
      const update = extra.match(/on update (current_timestamp(?:\(\d*\))?)/i);
      const actualColumn = { name, type: normType(row.COLUMN_TYPE), nullable: row.IS_NULLABLE === 'YES', default: normDefault(row.COLUMN_DEFAULT), autoIncrement: extra.includes('auto_increment'), onUpdate: update ? normDefault(update[1]) : null, charset: row.CHARACTER_SET_NAME, collation: row.COLLATION_NAME };
      if (!same(actualColumn, item)) errors.push(`${tableName}.${name}: column type/nullability/default/extra/charset mismatch`);
    }
    const actualIndexes = [...group(actual.indexes.filter(i => i.TABLE_NAME === tableName), i => i.INDEX_NAME)].map(([name, rows]) => ({ name, columns: rows.sort((a,b) => a.SEQ_IN_INDEX-b.SEQ_IN_INDEX).map(r => r.COLUMN_NAME), unique: Number(rows[0].NON_UNIQUE) === 0,
      valid: rows.every(r => r.SUB_PART === null && r.INDEX_TYPE === 'BTREE' && r.IS_VISIBLE === 'YES') }));
    for (const item of table.indexes) if (!actualIndexes.some(i => i.valid && same({ name: i.name, columns: i.columns, unique: i.unique }, item))) errors.push(`${tableName}.${item.name}: required index/unique mismatch`);
    for (const fk of table.foreignKeys) if (!actualIndexes.some(i => i.valid && same(i.columns.slice(0, fk.columns.length), fk.columns))) errors.push(`${tableName}: FK supporting index missing (${fk.columns})`);
    for (const item of actualIndexes) {
      if (!table.indexes.some(i => i.name === item.name) && !(item.valid && !item.unique && table.foreignKeys.some(fk => same(fk.columns, item.columns)))) errors.push(`${tableName}.${item.name}: unexpected index`);
    }
    const fkRows = actual.foreignKeys.filter(f => f.TABLE_NAME === tableName);
    const actualFKs = [...group(fkRows, f => f.CONSTRAINT_NAME)].map(([, rows]) => {
      rows.sort((a,b) => a.ORDINAL_POSITION-b.ORDINAL_POSITION);
      if (rows.some(row => row.REFERENCED_TABLE_SCHEMA !== database)) errors.push(`${tableName}: cross-database FK`);
      return { columns: rows.map(r => r.COLUMN_NAME), parent: rows[0].REFERENCED_TABLE_NAME, parentColumns: rows.map(r => r.REFERENCED_COLUMN_NAME), deleteRule: normAction(rows[0].DELETE_RULE), updateRule: normAction(rows[0].UPDATE_RULE) };
    });
    const sortObjects = items => items.map(i => JSON.stringify(i)).sort();
    if (!same(sortObjects(actualFKs), sortObjects(table.foreignKeys))) errors.push(`${tableName}: foreign key target/delete/update mismatch`);
    const actualChecks = actual.checks.filter(c => c.TABLE_NAME === tableName);
    if (actualChecks.some(c => c.ENFORCED !== 'YES') || !same(actualChecks.map(c => normCheck(c.CHECK_CLAUSE)).sort(), [...table.checks].sort())) errors.push(`${tableName}: CHECK constraint mismatch`);
  }
  if (errors.length) throw new Error(`SCHEMA_MISMATCH: ${errors.join('; ')}. Stop for read-only inspection and separately approved manual reconciliation; no automatic repair.`);
}
module.exports = { splitParts, normType, normDefault, applyDDL, expectedSchema, inspectSchema, assertSchema };
