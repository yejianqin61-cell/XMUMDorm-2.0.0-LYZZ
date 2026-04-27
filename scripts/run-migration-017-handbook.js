/**
 * 执行 Handbook 迁移（017）
 *
 * 用法：
 *   node scripts/run-migration-017-handbook.js
 *
 * 依赖：
 * - .env（DATABASE_URL / MYSQL_URL 或 DB_*）
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

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

const dbConfig = connectionUrl
  ? { uri: connectionUrl, multipleStatements: true }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      multipleStatements: true,
    };

async function run() {
  let conn;
  try {
    console.log('正在连接数据库...');
    if (dbConfig.uri) {
      conn = await mysql.createConnection({ uri: dbConfig.uri, multipleStatements: true });
    } else {
      conn = await mysql.createConnection(dbConfig);
    }

    console.log(`已连接数据库，当前数据库：${DB_NAME}`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${DB_NAME}\`;`);

    const file = path.join(ROOT, 'migrations', '017_handbook.sql');
    if (!fs.existsSync(file)) {
      console.error('迁移文件不存在：', file);
      process.exit(1);
    }

    console.log('\n=== 正在执行迁移：017_handbook.sql ===');
    let sql = fs.readFileSync(file, 'utf8');
    sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

    try {
      await conn.query(sql);
      console.log('迁移 017_handbook.sql 执行完成。');
    } catch (err) {
      const msg = (err && (err.message || err.code || '')).toString();
      if (
        msg.includes('ER_DUP_FIELDNAME') ||
        msg.includes('Duplicate column name') ||
        msg.includes('ER_TABLE_EXISTS_ERROR') ||
        msg.includes('already exists') ||
        msg.includes('Duplicate entry')
      ) {
        console.warn('迁移可能已执行过或部分执行：', msg);
      } else {
        console.error('迁移执行失败：', msg);
        throw err;
      }
    }

    console.log('\n完成。');
    process.exit(0);
  } catch (err) {
    console.error('\n运行迁移时发生错误：', err && (err.stack || err.message || err));
    if (err && err.code === 'ECONNREFUSED') {
      console.error('请确认 MySQL 已启动，且 .env 数据库配置正确。');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();

