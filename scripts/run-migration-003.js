/**
 * 执行 003 迁移：排行榜统计字段（products/shops/users 的 review_count、comprehensive_score 等）
 *
 * 执行（任选其一）：
 *   node scripts/run-migration-003.js
 *   node run-migration-003.js   （根目录 shim，转发到 scripts）
 *
 * 数据库配置与后端相同：项目根目录 .env 中的 DATABASE_URL / MYSQL_URL 或 DB_*。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const mysql = require('mysql2/promise');

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

function getDbNameFromUrl(url) {
  try {
    const u = new URL(url);
    const name = u.pathname.replace(/^\//, '').split('/')[0];
    return name || null;
  } catch {
    return null;
  }
}

const dbNameFromUrl = connectionUrl ? getDbNameFromUrl(connectionUrl) : null;
const DB_NAME = dbNameFromUrl || process.env.DB_NAME || 'jack_campus';

async function run() {
  let conn;
  try {
    if (connectionUrl) {
      conn = await mysql.createConnection({
        uri: connectionUrl,
        multipleStatements: true,
      });
    } else {
      conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: DB_NAME,
        multipleStatements: true,
      });
    }

    await conn.query(`USE \`${DB_NAME}\`;`);

    const sqlPath = path.join(ROOT, 'migrations', '003_ranking_system.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

    console.log(`已连接数据库 \`${DB_NAME}\`，正在执行 003_ranking_system.sql …`);
    await conn.query(sql);
    console.log('003 迁移执行成功（排行榜相关字段已就绪）。');
    process.exit(0);
  } catch (err) {
    const msg = (err && (err.message || err.code || '')).toString();
    if (msg.includes('Duplicate column name') || msg.includes('ER_DUP_FIELDNAME')) {
      console.log('003 已执行过：统计相关列已存在，无需重复执行。');
      process.exit(0);
      return;
    }
    console.error('003 迁移失败:', err.message || err);
    if (err && err.code === 'ECONNREFUSED') {
      console.error(
        '请确认 MySQL 已启动，且 .env 中 DATABASE_URL 或 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME 正确。'
      );
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
