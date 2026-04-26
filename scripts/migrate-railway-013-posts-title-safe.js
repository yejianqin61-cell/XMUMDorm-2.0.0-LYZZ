/**
 * Railway 专用（幂等）迁移：给 posts 增加 title 字段
 *
 * 特点：
 * - 强制使用 DATABASE_URL / MYSQL_URL（避免误连本地库）
 * - 先检查列是否存在：存在则直接退出，不会报 Duplicate column
 *
 * 用法：
 * - npm run migrate:title:railway
 * - 或 node scripts/migrate-railway-013-posts-title-safe.js
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

function mustGetRailwayUrl() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!url) {
    throw new Error('未发现 DATABASE_URL / MYSQL_URL。请在 Railway 环境变量或本地 .env 中配置连接串。');
  }
  return url;
}

async function columnExists(conn, columnName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = ?`,
    [columnName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function indexExists(conn, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'posts'
       AND INDEX_NAME = ?`,
    [indexName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function main() {
  const url = mustGetRailwayUrl();
  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });

  try {
    // 确认当前连接的库名（便于排查）
    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    const dbName = dbRows?.[0]?.db || '(unknown)';
    console.log(`ℹ️ 当前数据库: ${dbName}`);

    const hasTitle = await columnExists(conn, 'title');
    if (hasTitle) {
      console.log('✅ 已存在 posts.title，无需迁移。');
      return;
    }

    console.log('⏳ 正在执行迁移：ADD COLUMN posts.title ...');
    await conn.query(
      "ALTER TABLE posts ADD COLUMN title VARCHAR(120) NULL COMMENT '帖子标题（瀑布流展示）' AFTER user_id"
    );

    const idxName = 'idx_posts_title';
    const hasIdx = await indexExists(conn, idxName);
    if (!hasIdx) {
      console.log(`⏳ 正在创建索引：${idxName} ...`);
      await conn.query(`CREATE INDEX ${idxName} ON posts(title)`);
    }

    console.log('✅ Railway 迁移完成：posts.title');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Railway 迁移失败：', err && err.message ? err.message : err);
  process.exitCode = 1;
});

