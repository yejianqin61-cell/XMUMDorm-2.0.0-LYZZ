'use strict';
const { connectLocal, verifyIdentity } = require('./local-config.cjs');
async function inspect(connection) {
  const identity = await verifyIdentity(connection);
  const [grants] = await connection.query('SHOW GRANTS FOR CURRENT_USER()');
  const [tables] = await connection.query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME');
  const [columns] = await connection.query('SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION');
  const [indexes] = await connection.query('SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX');
  const [foreignKeys] = await connection.query('SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, UPDATE_RULE, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()');
  const migrationTables = tables.filter(row => /migration|schema_version/i.test(row.TABLE_NAME)).map(row => row.TABLE_NAME);
  return { identity, grants: grants.map(row => Object.values(row)[0]), empty: tables.length === 0, tables, columns, indexes, foreignKeys, migrationTables };
}
if (require.main === module) (async () => {
  let connection;
  try { connection = await connectLocal(); console.log(JSON.stringify(await inspect(connection), null, 2)); }
  catch (error) { console.error('Read-only preflight failed:', error.code || (error.message.startsWith('Rejected') ? error.message : 'local configuration/connection/identity unavailable')); process.exitCode = 1; }
  finally { if (connection) await connection.end(); }
})();
module.exports = { inspect };
