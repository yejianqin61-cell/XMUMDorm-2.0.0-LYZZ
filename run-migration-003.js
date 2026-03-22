/**
 * 执行 003 迁移：排行榜统计字段（products/shops/users 的 review_count、comprehensive_score 等）
 *
 * 含义：给数据库表增加「点评条数、综合分、各等级计数」等列，后端榜单与回填脚本依赖这些列。
 *
 * 使用：在项目根目录执行
 *   node run-migration-003.js
 *
 * 数据库配置与后端相同：.env 中的 DATABASE_URL / MYSQL_URL 或 DB_HOST、DB_NAME 等。
 * 正式库（Railway 等）：在本地把 .env 指向生产连接串后执行，或在服务器 / Railway Shell 里拉代码后执行同一命令。
 *
 * 若列已存在会提示「已执行过」并正常退出（可重复跑）。
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

function getDbNameFromUrl(url) {
  try {
    const u = new URL(url);
    const name = u.pathname.replace(/^\//, '').split('/')[0];
    return name || null;
  } catch {
    return null;
  }
}

// 同时配了 MYSQL_URL 与 DB_NAME 时：必须以连接串里的库名为准（Railway 多为 /railway，不是 jack_campus）
const dbNameFromUrl = connectionUrl ? getDbNameFromUrl(connectionUrl) : null;
const DB_NAME = dbNameFromUrl || process.env.DB_NAME || 'jack_campus';

async function run() {
  let conn;
  try {
    if (connectionUrl) {
      conn = await mysql.createConnection({
        uri: connectionUrl,
        multipleStatements: true,
      });
    } else {
      conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: DB_NAME,
        multipleStatements: true,
      });
    }

    await conn.query(`USE \`${DB_NAME}\`;`);

    const sqlPath = path.join(__dirname, 'migrations', '003_ranking_system.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

    console.log(`已连接数据库 \`${DB_NAME}\`，正在执行 003_ranking_system.sql …`);
    await conn.query(sql);
    console.log('003 迁移执行成功（排行榜相关字段已就绪）。');
    process.exit(0);
  } catch (err) {
    const msg = (err && (err.message || err.code || '')).toString();
    if (msg.includes('Duplicate column name') || msg.includes('ER_DUP_FIELDNAME')) {
      console.log('003 已执行过：统计相关列已存在，无需重复执行。');
      process.exit(0);
      return;
    }
    console.error('003 迁移失败:', err.message || err);
    if (err && err.code === 'ECONNREFUSED') {
      console.error(
        '请确认 MySQL 已启动，且 .env 中 DATABASE_URL 或 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME 正确。'
      );
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
