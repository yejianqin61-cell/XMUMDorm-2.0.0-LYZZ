/**
 * Execute migration 067: backfill missing numeric food-comment scores.
 *
 * Usage:
 *   node scripts/run-migration-067-product-comment-score.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
const config = connectionUrl
  ? { uri: connectionUrl, multipleStatements: true }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jack_campus',
      multipleStatements: true,
    };

async function main() {
  const file = path.join(ROOT, 'migrations', '067_backfill_product_comment_score.sql');
  if (!fs.existsSync(file)) throw new Error(`Migration file not found: ${file}`);
  const conn = await mysql.createConnection(config);
  try {
    const [result] = await conn.query(fs.readFileSync(file, 'utf8'));
    console.log(JSON.stringify({ migration: '067_backfill_product_comment_score', affectedRows: result.affectedRows ?? 0 }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(`[migration-067] ${error.message}`);
  process.exitCode = 1;
});
