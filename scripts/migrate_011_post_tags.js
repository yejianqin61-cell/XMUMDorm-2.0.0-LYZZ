/**
 * 执行 011_post_tags.sql（帖子标签表）
 * 用法: node scripts/migrate_011_post_tags.js
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

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
    database: process.env.DB_NAME || 'jack_campus',
  };
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '011_post_tags.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`找不到迁移文件：${sqlPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const opt = getConnectionOptions();
  const conn = opt.url
    ? await mysql.createConnection({ uri: opt.url, multipleStatements: true })
    : await mysql.createConnection({ ...opt, multipleStatements: true });
  try {
    const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
    console.log('✅ MySQL 已连接，当前数据库:', dbRow?.db || '(未知)');
    console.log('   开始执行 011_post_tags.sql …');
    await conn.query(sql);
    console.log('🎉 执行完成：tags / post_tag_map 已就绪（与后端 .env 为同一库即可）。');
  } catch (e) {
    console.error('❌ 执行失败：', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
