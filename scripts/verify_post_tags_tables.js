/**
 * 检查当前 .env 指向的数据库是否已有 tags / post_tag_map
 * 用法: node scripts/verify_post_tags_tables.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const conn = url
    ? await mysql.createConnection(url)
    : await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'jack_campus',
      });
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('tags','post_tag_map')`
  );
  await conn.end();
  const names = (rows || []).map((r) => r.TABLE_NAME);
  console.log('当前库中的标签相关表:', names.length ? names.join(', ') : '（无）');
  if (!names.includes('tags') || !names.includes('post_tag_map')) {
    console.error('❌ 缺少表，请执行: node scripts/migrate_011_post_tags.js');
    process.exit(1);
  }
  console.log('✅ tags 与 post_tag_map 已存在。');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
