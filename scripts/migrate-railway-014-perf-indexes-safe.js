/**
 * Railway 专用（幂等）迁移：014_perf_indexes.sql（索引优化）
 *
 * - 强制使用 DATABASE_URL / MYSQL_URL
 * - 逐个检查索引是否存在，存在则跳过
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

function mustGetRailwayUrl() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!url) throw new Error('未发现 DATABASE_URL / MYSQL_URL，请配置连接串。');
  return url;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function main() {
  const url = mustGetRailwayUrl();
  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
  try {
    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    console.log(`ℹ️ 当前数据库: ${dbRows?.[0]?.db || '(unknown)'}`);

    const idx1 = 'idx_notifications_user_type_read_created_at';
    if (!(await indexExists(conn, 'notifications', idx1))) {
      console.log(`⏳ 创建索引：notifications.${idx1}`);
      await conn.query(
        `CREATE INDEX ${idx1} ON notifications(user_id, type, is_read, created_at)`
      );
    } else {
      console.log(`✅ 已存在索引：notifications.${idx1}`);
    }

    const idx2 = 'idx_post_images_post_sort';
    if (!(await indexExists(conn, 'post_images', idx2))) {
      console.log(`⏳ 创建索引：post_images.${idx2}`);
      await conn.query(
        `CREATE INDEX ${idx2} ON post_images(post_id, sort_order)`
      );
    } else {
      console.log(`✅ 已存在索引：post_images.${idx2}`);
    }

    console.log('✅ Railway 索引迁移完成：014_perf_indexes');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Railway 索引迁移失败：', err && err.message ? err.message : err);
  process.exitCode = 1;
});

