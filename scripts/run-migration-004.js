/**
 * 执行 004 迁移：为 products 表增加 price 列
 *   node scripts/run-migration-004.js
 */
const path = require('path');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const mysql = require('mysql2/promise');

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const dbConfig = connectionUrl
  ? connectionUrl
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jack_campus',
    };

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('已连接数据库，正在执行 004 迁移...');

    const sql = `
      ALTER TABLE products
        ADD COLUMN price DECIMAL(10,2) NULL DEFAULT NULL COMMENT '价格 RM' AFTER description
    `;
    await conn.execute(sql);
    console.log('004 迁移执行成功：已为 products 表添加 price 列。');
  } catch (err) {
    const msg = (err && (err.message || err.code || '')).toString();
    if (msg.includes('Duplicate column name') || msg.includes('price')) {
      console.log('004 已执行过：price 列已存在，无需重复执行。');
      process.exit(0);
      return;
    }
    console.error('004 迁移失败:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME）');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
