/**
 * 一键执行迁移：013_posts_title.sql
 *
 * 用法：
 * - npm run migrate:title
 * - 或 node scripts/run-migration-013-title.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function pickConnectionConfig() {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (connectionUrl) return { connectionUrl };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jack_campus',
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const sqlPath = path.join(repoRoot, 'migrations', '013_posts_title.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const cfg = pickConnectionConfig();
  const conn = cfg.connectionUrl
    ? await mysql.createConnection({
        uri: cfg.connectionUrl,
        multipleStatements: true,
      })
    : await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        multipleStatements: true,
      });

  try {
    await conn.query(sql);
    console.log('✅ 迁移执行成功：migrations/013_posts_title.sql');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ 迁移执行失败：', err && err.message ? err.message : err);
  process.exitCode = 1;
});

