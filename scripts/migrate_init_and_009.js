/**
 * 一键执行 init-db.sql + 009_timetable_import.sql
 *
 * 适用场景：
 * - 你现在报错 ER_FK_CANNOT_OPEN_PARENT / Failed to open referenced table 'users'
 * - 说明目标数据库里还没创建 users 表（或没跑过 init-db.sql）
 *
 * 用法（项目根目录）：
 *   node scripts/migrate_init_and_009.js
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// 读取项目根目录 .env（与 server.js 保持一致）
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {}

function getConnectionOptions() {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (connectionUrl) return { url: connectionUrl };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jack_campus'
  };
}

function readSql(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`找不到 SQL 文件：${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function main() {
  const initPath = path.join(__dirname, '..', 'init-db.sql');
  const m009Path = path.join(__dirname, '..', 'migrations', '009_timetable_import.sql');

  const initSql = readSql(initPath);
  const m009Sql = readSql(m009Path);

  const opt = getConnectionOptions();
  const conn = opt.url
    ? await mysql.createConnection({ uri: opt.url, multipleStatements: true })
    : await mysql.createConnection({ ...opt, multipleStatements: true });

  try {
    console.log('✅ MySQL 已连接，开始执行 init-db.sql ...');
    await conn.query(initSql);
    console.log('🎉 init-db.sql 执行完成（基础表已创建）。');

    console.log('✅ 开始执行 009_timetable_import.sql ...');
    await conn.query(m009Sql);
    console.log('🎉 009_timetable_import.sql 执行完成（课程表表已创建）。');
  } catch (e) {
    console.error('❌ 执行失败：', e && e.message ? e.message : e);
    if (e && e.code) console.error('错误码:', e.code);
    process.exitCode = 1;
  } finally {
    try {
      await conn.end();
    } catch {}
  }
}

main();

