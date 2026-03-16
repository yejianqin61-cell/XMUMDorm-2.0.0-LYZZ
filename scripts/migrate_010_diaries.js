/**
 * 一键执行 010_diaries.sql（创建日记本相关表）
 *
 * 用法（项目根目录）：
 *   node scripts/migrate_010_diaries.js
 *
 * 连接配置沿用项目约定：
 * - 优先 DATABASE_URL 或 MYSQL_URL（mysql://user:pass@host:port/db）
 * - 否则读取 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
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
  if (connectionUrl) {
    return { url: connectionUrl };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jack_campus'
  };
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '010_diaries.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`找不到迁移文件：${sqlPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const opt = getConnectionOptions();
  const conn = opt.url
    ? await mysql.createConnection({
        uri: opt.url,
        multipleStatements: true
      })
    : await mysql.createConnection({
        ...opt,
        multipleStatements: true
      });

  try {
    console.log('✅ MySQL 已连接，开始执行 010_diaries.sql ...');
    await conn.query(sql);
    console.log('🎉 执行完成：日记本相关表已创建/更新。');
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

