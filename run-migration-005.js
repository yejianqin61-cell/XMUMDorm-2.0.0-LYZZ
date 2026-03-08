/**
 * 执行 005 迁移：为 shops 表增加 logo_path、opening_hours 列
 * 在项目根目录执行: node run-migration-005.js
 * 使用与后端相同的数据库配置（.env 或 database.js 默认值）
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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
    console.log('已连接数据库，正在执行 005 迁移...');

    await conn.execute(`
      ALTER TABLE shops
        ADD COLUMN logo_path VARCHAR(500) NULL DEFAULT NULL COMMENT 'logo 相对路径' AFTER name,
        ADD COLUMN opening_hours VARCHAR(200) NULL DEFAULT NULL COMMENT '营业时间，如 07:00-21:00' AFTER logo_path
    `);
    console.log('005 迁移执行成功：已为 shops 表添加 logo_path、opening_hours 列。');
  } catch (err) {
    const msg = (err && (err.message || err.code || '')).toString();
    if (msg.includes('Duplicate column name')) {
      console.log('005 已执行过：logo_path 或 opening_hours 列已存在，无需重复执行。');
      process.exit(0);
      return;
    }
    console.error('005 迁移失败:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置）');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
