/**
 * 执行单个 SQL 文件（支持多语句）。供本地 / CI / agent 应用迁移用。
 *
 *   node scripts/apply-sql-file.js migrations/036_club_profile_perf_indexes.sql
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-sql-file.js <path-to.sql>');
  process.exit(1);
}

const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
if (!fs.existsSync(full)) {
  console.error('File not found:', full);
  process.exit(1);
}

const url = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
const opts = { multipleStatements: true };

async function main() {
  const conn = url
    ? await mysql.createConnection({ uri: url, ...opts })
    : await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'jack_campus',
        ...opts,
      });
  try {
    const sql = fs.readFileSync(full, 'utf8');
    await conn.query(sql);
    console.log('Applied:', full);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e && (e.stack || e.message || e));
  process.exit(1);
});
