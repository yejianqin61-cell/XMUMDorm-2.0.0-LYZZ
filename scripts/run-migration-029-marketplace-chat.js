/**
 * 执行 Marketplace 迁移（029）：私聊线程/消息
 *
 * 用法：
 *   node scripts/run-migration-029-marketplace-chat.js
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
    conn = dbConfig.uri
      ? await mysql.createConnection({ uri: dbConfig.uri, multipleStatements: true })
      : await mysql.createConnection(dbConfig);

    console.log(`已连接数据库，当前数据库：${DB_NAME}`);
    await conn.query(`USE \`${DB_NAME}\`;`);

    const file = path.join(ROOT, 'migrations', '029_marketplace_chat.sql');
    if (!fs.existsSync(file)) {
      console.error('迁移文件不存在：', file);
      process.exit(1);
    }

    console.log('\n=== 正在执行迁移：029_marketplace_chat.sql ===');
    let sql = fs.readFileSync(file, 'utf8');
    sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');
    await conn.query(sql);
    console.log('迁移 029_marketplace_chat.sql 执行完成。');
    process.exit(0);
  } catch (err) {
    console.error('\n运行迁移时发生错误：', err && (err.stack || err.message || err));
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();

