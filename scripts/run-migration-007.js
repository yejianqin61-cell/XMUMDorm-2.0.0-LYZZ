/**
 * 执行 007 迁移：创建 product_favorites 表（商品收藏）
 *   node scripts/run-migration-007.js
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

const sql = `
  CREATE TABLE IF NOT EXISTS product_favorites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用户ID',
    product_id INT NOT NULL COMMENT '商品ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品收藏'
`;

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('已连接数据库，正在执行 007 迁移...');
    await conn.execute(sql);
    console.log('007 迁移执行成功：已创建 product_favorites 表。');
  } catch (err) {
    console.error('007 迁移失败:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置）');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
