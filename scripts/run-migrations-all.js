/**
 * 一键执行数据库迁移（init-db + 002～008）
 *
 *   node scripts/run-migrations-all.js
 *
 * Railway Start Command 示例：
 *   node scripts/run-migrations-all.js && npm start
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

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

const dbNameFromUrl = connectionUrl ? getDbNameFromUrl(connectionUrl) : null;
const DB_NAME = dbNameFromUrl || process.env.DB_NAME || 'jack_campus';

const dbConfig = connectionUrl
  ? {
      uri: connectionUrl,
      multipleStatements: true,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      multipleStatements: true,
    };

const MIGRATIONS = [
  { file: 'init-db.sql', dir: ROOT },
  { file: '002_canteen_system.sql', dir: path.join(ROOT, 'migrations') },
  { file: '003_ranking_system.sql', dir: path.join(ROOT, 'migrations') },
  { file: '004_product_price.sql', dir: path.join(ROOT, 'migrations') },
  { file: '005_shops_logo_opening_hours.sql', dir: path.join(ROOT, 'migrations') },
  { file: '006_audit_logs.sql', dir: path.join(ROOT, 'migrations') },
  { file: '007_product_favorites.sql', dir: path.join(ROOT, 'migrations') },
  { file: '008_email_verification_codes.sql', dir: path.join(ROOT, 'migrations') },
];

async function run() {
  let conn;
  try {
    console.log('正在连接数据库...');
    if (dbConfig.uri) {
      conn = await mysql.createConnection({
        uri: dbConfig.uri,
        multipleStatements: true,
      });
    } else {
      conn = await mysql.createConnection(dbConfig);
    }

    console.log(`已连接数据库，当前数据库：${DB_NAME}`);

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${DB_NAME}\`;`);

    for (const item of MIGRATIONS) {
      const fullPath = path.join(item.dir, item.file);
      console.log(`\n=== 正在执行迁移：${item.file} ===`);

      if (!fs.existsSync(fullPath)) {
        console.warn(`跳过：文件不存在 ${fullPath}`);
        continue;
      }

      let sql = fs.readFileSync(fullPath, 'utf8');

      sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

      try {
        await conn.query(sql);
        console.log(`迁移 ${item.file} 执行完成。`);
      } catch (err) {
        const msg = (err && (err.message || err.code || '')).toString();
        if (
          msg.includes('ER_DUP_FIELDNAME') ||
          msg.includes('Duplicate column name') ||
          msg.includes('ER_TABLE_EXISTS_ERROR') ||
          msg.includes('already exists') ||
          msg.includes('Duplicate entry')
        ) {
          console.warn(`迁移 ${item.file} 已执行过或部分执行：${msg}`);
          continue;
        }
        console.error(`迁移 ${item.file} 执行失败：`, msg);
        throw err;
      }
    }

    console.log('\n所有迁移执行完成。');
    process.exit(0);
  } catch (err) {
    console.error('\n运行迁移时发生错误：', err && (err.stack || err.message || err));
    if (err && err.code === 'ECONNREFUSED') {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置 DATABASE_URL / MYSQL_URL 或 DB_*）');
    }
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

run();
