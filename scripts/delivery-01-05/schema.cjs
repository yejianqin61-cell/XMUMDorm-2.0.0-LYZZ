'use strict';
const { inspectSchema } = require('../stage2-db/schema.cjs');
const stable = value => JSON.stringify(value);
function split(text, delimiter) {
  const parts = []; let start = 0, depth = 0, quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote) { if (text[i + 1] === quote) i++; else quote = null; } }
    else if (['\'', '`', '"'].includes(ch)) quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === delimiter && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  if (quote || depth) throw new Error('Unbalanced reviewed SQL');
  parts.push(text.slice(start).trim()); return parts.filter(Boolean);
}
function statements(source) { return split(source.replace(/^--.*$/gm, ''), ';'); }
function operations(source, file) {
  return statements(source).flatMap(sql => {
    const alter = sql.match(/^ALTER TABLE ([a-z_]+)\s+([\s\S]+)$/i);
    const items = alter ? split(alter[2], ',').map(clause => `ALTER TABLE ${alter[1]} ${clause}`) : [sql];
    return items.map((sql, index) => {
      const table = sql.match(/^(?:CREATE TABLE|ALTER TABLE) `?([a-z_]+)`?/i)?.[1];
      if (!table) throw new Error('Unsupported delivery DDL');
      let kind = 'table', name = table;
      if (alter) {
        const clause = sql.slice(sql.indexOf(table) + table.length).trim();
        const match = clause.match(/^(?:ADD|MODIFY) (?:COLUMN )?([a-z_]+)\s/i);
        const key = clause.match(/^ADD (?:INDEX|KEY) ([a-z_]+)/i);
        const constraint = clause.match(/^ADD CONSTRAINT ([a-z_]+)\s+(CHECK|FOREIGN KEY)/i);
        if (constraint) { kind = constraint[2] === 'CHECK' ? 'check' : 'fk'; name = constraint[1]; }
        else if (key) { kind = 'index'; name = key[1]; }
        else if (match) { kind = 'column'; name = match[1]; }
        else throw new Error('Unsupported delivery ALTER');
      }
      return { id: `${file}:${table}:${kind}:${name}:${index}`, file, sql, table, kind, name };
    });
  });
}
function norm(value) { return value == null ? null : String(value).toLowerCase().replace(/\b(tinyint|int|bigint)\(\d+\)/g, '$1').replace(/current_timestamp\(\)/g, 'current_timestamp').replace(/default_generated\s*/g, '').trim(); }
async function inspect(c) {
  const raw = await inspectSchema(c);
  const dbName = await database(c);
  const [directions] = await c.query('SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLLATION FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()');
  const result = {};
  for (const t of raw.tables) {
    const table = { engine: t.ENGINE, collation: t.TABLE_COLLATION, type: t.TABLE_TYPE, columns: {}, indexes: {}, fks: {}, checks: {} };
    for (const r of raw.columns.filter(r => r.TABLE_NAME === t.TABLE_NAME)) table.columns[r.COLUMN_NAME] = [norm(r.COLUMN_TYPE), r.IS_NULLABLE, r.COLUMN_DEFAULT == null ? null : (/^current_timestamp/i.test(String(r.COLUMN_DEFAULT)) ? norm(r.COLUMN_DEFAULT) : String(r.COLUMN_DEFAULT)), norm(r.EXTRA), r.CHARACTER_SET_NAME, r.COLLATION_NAME];
    for (const r of raw.indexes.filter(r => r.TABLE_NAME === t.TABLE_NAME)) {
      const direction = directions.find(d => d.TABLE_NAME === r.TABLE_NAME && d.INDEX_NAME === r.INDEX_NAME && d.SEQ_IN_INDEX === r.SEQ_IN_INDEX)?.COLLATION;
      (table.indexes[r.INDEX_NAME] ||= []).push([r.COLUMN_NAME, Number(r.NON_UNIQUE), r.SUB_PART, r.INDEX_TYPE, r.IS_VISIBLE, direction]);
    }
    for (const r of raw.foreignKeys.filter(r => r.TABLE_NAME === t.TABLE_NAME)) (table.fks[r.CONSTRAINT_NAME] ||= []).push([r.COLUMN_NAME, r.REFERENCED_TABLE_NAME, r.REFERENCED_COLUMN_NAME, r.DELETE_RULE === 'NO ACTION' ? 'RESTRICT' : r.DELETE_RULE, r.UPDATE_RULE === 'NO ACTION' ? 'RESTRICT' : r.UPDATE_RULE, r.REFERENCED_TABLE_SCHEMA === dbName ? 'SELF' : 'EXTERNAL']);
    for (const r of raw.checks.filter(r => r.TABLE_NAME === t.TABLE_NAME)) table.checks[r.CONSTRAINT_NAME] = [r.CHECK_CLAUSE.replace(/[`()\s]/g, '').toLowerCase(), r.ENFORCED];
    table.triggers = raw.unexpectedObjects.filter(o => o.object_type === 'trigger');
    result[t.TABLE_NAME] = table;
  }
  return result;
}
async function database(c) { const [[r]] = await c.query('SELECT DATABASE() AS db'); return r.db; }
function piece(schema, op) {
  const t = schema[op.table]; if (!t) return undefined;
  return op.kind === 'table' ? t : t[{ column: 'columns', index: 'indexes', fk: 'fks', check: 'checks' }[op.kind]][op.name];
}
function compatible(actual, expected, kind) {
  if (kind !== 'table') return stable(actual) === stable(expected);
  if (!actual || actual.engine !== expected.engine || actual.collation !== expected.collation || actual.type !== 'BASE TABLE' || actual.triggers.length) return false;
  // Exact columns/checks; extra nonunique indexes and MySQL-generated FK names are harmless.
  if (stable(Object.keys(actual.columns).sort()) !== stable(Object.keys(expected.columns).sort())) return false;
  for (const [n, v] of Object.entries(expected.columns)) if (stable(actual.columns[n]) !== stable(v)) return false;
  for (const v of Object.values(expected.indexes)) if (!Object.values(actual.indexes).some(a => stable(a) === stable(v))) return false;
  for (const v of Object.values(actual.indexes)) if (v[0][1] === 0 && !Object.values(expected.indexes).some(a => stable(a) === stable(v))) return false;
  const values = o => Object.values(o).map(stable).sort();
  return stable(values(actual.fks)) === stable(values(expected.fks)) && stable(values(actual.checks)) === stable(values(expected.checks));
}
module.exports = { split, statements, operations, inspect, piece, compatible, stable };
