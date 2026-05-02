/**
 * 删除演示社团：吉他社、羽毛球社、摄影社，并清理 club_likes / club_views（若表存在）。
 *
 *   node scripts/remove-demo-clubs.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const NAMES = ['吉他社', '羽毛球社', '摄影社'];

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
const dbConfig = connectionUrl
  ? connectionUrl
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jack_campus',
      multipleStatements: true,
    };

async function tableExists(conn, name) {
  const db = conn.config?.database || process.env.DB_NAME || 'jack_campus';
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    [db, name]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const placeholders = NAMES.map(() => '?').join(',');
    const hasLikes = await tableExists(conn, 'club_likes');
    const hasViews = await tableExists(conn, 'club_views');

    if (hasLikes) {
      const [r1] = await conn.query(
        `DELETE lv FROM club_likes lv
         INNER JOIN club_activities a ON lv.target_type = 'activity' AND lv.target_id = a.id
         INNER JOIN clubs c ON a.club_id = c.id
         WHERE c.name IN (${placeholders})`,
        NAMES
      );
      const [r2] = await conn.query(
        `DELETE lv FROM club_likes lv
         INNER JOIN club_posts p ON lv.target_type = 'post' AND lv.target_id = p.id
         INNER JOIN clubs c ON p.club_id = c.id
         WHERE c.name IN (${placeholders})`,
        NAMES
      );
      console.log('[remove-demo-clubs] club_likes removed (activity/post):', r1?.affectedRows ?? 0, r2?.affectedRows ?? 0);
    }

    if (hasViews) {
      const [r3] = await conn.query(
        `DELETE v FROM club_views v
         INNER JOIN club_activities a ON v.target_type = 'activity' AND v.target_id = a.id
         INNER JOIN clubs c ON a.club_id = c.id
         WHERE c.name IN (${placeholders})`,
        NAMES
      );
      const [r4] = await conn.query(
        `DELETE v FROM club_views v
         INNER JOIN club_posts p ON v.target_type = 'post' AND v.target_id = p.id
         INNER JOIN clubs c ON p.club_id = c.id
         WHERE c.name IN (${placeholders})`,
        NAMES
      );
      console.log('[remove-demo-clubs] club_views removed:', r3?.affectedRows ?? 0, r4?.affectedRows ?? 0);
    }

    const [r5] = await conn.query(`DELETE FROM clubs WHERE name IN (${placeholders})`, NAMES);
    console.log('[remove-demo-clubs] clubs deleted:', r5?.affectedRows ?? 0);
    console.log('[remove-demo-clubs] done.');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[remove-demo-clubs] failed:', e && (e.stack || e.message || e));
  process.exit(1);
});
