'use strict';
const fs = require('node:fs');
const path = require('node:path');
const TARGET = Object.freeze({ host: '127.0.0.1', port: 3306, database: 'xmumdorm_stage2_dev', user: 'xmumdorm_dev' });
function validateTarget(options) {
  if (!options || typeof options !== 'object' || Object.entries(TARGET).some(([key, value]) => options[key] !== value)
    || ['uri', 'url', 'socketPath', 'stream', 'multipleStatements'].some(key => options[key])) {
    throw new Error('Rejected: only the fixed Stage 2 local TCP database is allowed.');
  }
}
function readLocalConfig() {
  for (const key of ['DATABASE_URL', 'MYSQL_URL', 'RAILWAY_MYSQL_URL', 'PREVIEW_DATABASE_URL']) {
    if (process.env[key]) throw new Error('Connection strings are forbidden. Use a clean local shell.');
  }
  let config;
  try { config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../.local/stage2/config.json'), 'utf8')); }
  catch { throw new Error('Cannot load ignored Stage 2 local configuration; contents are not logged.'); }
  if (!config || Object.keys(config).some(key => !['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'].includes(key))) throw new Error('Unexpected local configuration keys.');
  const options = { host: config.DB_HOST, port: config.DB_PORT, database: config.DB_NAME, user: config.DB_USER, password: config.DB_PASSWORD, connectTimeout: 5000, multipleStatements: false };
  validateTarget(options);
  if (typeof options.password !== 'string' || !options.password || options.password.startsWith('REPLACE_')) throw new Error('Local DB password must be configured privately.');
  return options;
}
async function verifyIdentity(connection) {
  const [rows] = await connection.query('SELECT DATABASE() AS db, CURRENT_USER() AS account, @@port AS port, @@hostname AS hostname, VERSION() AS version');
  const identity = rows[0];
  if (identity.db !== TARGET.database || identity.account !== 'xmumdorm_dev@localhost' || Number(identity.port) !== TARGET.port || !/^8\./.test(identity.version)) throw new Error('Live database identity/version rejected.');
  return identity;
}
async function connectLocal() {
  const options = readLocalConfig();
  require('../stage2-local/network.cjs')([3306]);
  const connection = await require('mysql2/promise').createConnection(options);
  try { await verifyIdentity(connection); return connection; }
  catch (error) { await connection.end(); throw error; }
}
module.exports = { TARGET, validateTarget, readLocalConfig, verifyIdentity, connectLocal };
