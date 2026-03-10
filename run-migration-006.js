/**
 * 执行 006 迁移：创建 audit_logs 表（审计日志）
 * 在项目根目录执行: node run-migration-006.js
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

const sql = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    role VARCHAR(32) NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NULL,
    target_id BIGINT UNSIGNED NULL,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('已连接数据库，正在执行 006 迁移...');
    await conn.execute(sql);
    console.log('006 迁移执行成功：已创建 audit_logs 表。');
  } catch (err) {
    console.error('006 迁移失败:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置）');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();

