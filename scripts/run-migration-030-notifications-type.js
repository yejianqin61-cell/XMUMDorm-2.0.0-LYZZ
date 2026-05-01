/**
 * Run migration: notifications.type -> VARCHAR(50)
 * Usage: node scripts/run-migration-030-notifications-type.js
 */

// Load env from .env for local/CLI runs (Railway sets env directly, so this is harmless there)
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (_) {
  // ignore
}

async function main() {
  // Reuse existing DB pool config (env driven)
  // eslint-disable-next-line global-require
  const { query, pool } = require('../database');

  await query('ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL');
  // eslint-disable-next-line no-console
  console.log('OK: notifications.type -> VARCHAR(50)');
  try {
    await pool.end();
  } catch (_) {
    // ignore
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('MIGRATION_FAILED', e && (e.code || e.message || e));
  process.exitCode = 1;
});

