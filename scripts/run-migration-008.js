/**
 * 执行 008 迁移：创建 email_verification_codes 表（邮箱验证码记录）
 *   node scripts/run-migration-008.js
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
    console.log('已连接数据库，正在执行 008 迁移...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL COMMENT '接收验证码的邮箱',
        scene VARCHAR(32) NOT NULL COMMENT '使用场景，如 register',
        code_hash VARCHAR(255) NOT NULL COMMENT '验证码哈希',
        expires_at DATETIME NOT NULL COMMENT '过期时间',
        used_at DATETIME NULL DEFAULT NULL COMMENT '实际使用时间，NULL=未使用',
        sent_count TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '当日发送次数计数，可选',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_scene_created_at (email, scene, created_at DESC),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码记录'
    `);
    console.log('008 迁移执行成功：已创建 email_verification_codes 表。');
  } catch (err) {
    console.error('008 迁移失败:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置）');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
