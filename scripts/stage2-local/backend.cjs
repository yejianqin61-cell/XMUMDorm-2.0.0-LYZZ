'use strict';

const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
if (process.env.STAGE2_LOCAL_ISOLATED !== '1') throw new Error('Use the Stage 2 launcher.');
for (const key of ['DATABASE_URL', 'MYSQL_URL', 'RAILWAY_MYSQL_URL', 'PREVIEW_DATABASE_URL']) {
  if (process.env[key]) throw new Error('Connection strings are forbidden in Stage 2 local mode.');
}
function validateDatabase(options) {
  if (!options || typeof options !== 'object' || options.uri || options.url || options.stream || options.socketPath
      || options.host !== '127.0.0.1' || Number(options.port) !== 3306
      || options.database !== 'xmumdorm_stage2_dev' || options.user !== 'xmumdorm_dev') {
    throw new Error('Stage 2 rejected a database connection configuration.');
  }
}
validateDatabase({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER });
require('./network.cjs')([3306]);

const originalLoad = Module._load;
const guardedDrivers = new WeakSet();
Module._load = function (request, parent, isMain) {
  // Bypass all legacy dotenv reads inside this dedicated process only.
  if (request === 'dotenv' || request === 'dotenv/config') return { config: () => ({ parsed: {} }), configDotenv: () => ({ parsed: {} }) };
  const exported = originalLoad.call(this, request, parent, isMain);
  if (['mysql2', 'mysql2/promise'].includes(request) && !guardedDrivers.has(exported)) {
    guardedDrivers.add(exported);
    for (const method of ['createPool', 'createConnection', 'createPoolCluster']) {
      if (typeof exported[method] !== 'function') continue;
      const original = exported[method];
      exported[method] = function (options, ...rest) {
        if (method === 'createPoolCluster') throw new Error('Database clusters are forbidden in Stage 2.');
        validateDatabase(options);
        return original.call(this, options, ...rest);
      };
    }
  }
  return exported;
};
// Explicit service blockers, before the server imports any routes. Existing
// local-fallback consumers remain usable, but cloud-only uploads fail closed.
const storage = require(path.join(root, 'services/objectStorage.js'));
const blocked = async () => { throw new Error('Object storage is disabled in Stage 2 local mode.'); };
for (const method of ['uploadBuffer', 'downloadBuffer', 'objectExists', 'headObject']) storage[method] = blocked;
storage.isObjectStorageConfigured = () => false;
storage.publicUrlForKey = () => null;
console.log('Stage 2 isolated backend: local MySQL only; dotenv and object storage disabled.');
require(path.join(root, 'server.js'));
