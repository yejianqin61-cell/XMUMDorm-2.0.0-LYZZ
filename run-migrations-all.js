/**
 * 一键执行所有数据库迁移（001~008）
 *
 * 使用场景：
 * - Railway 等生产环境启动前自动建表/更新表结构
 * - 本地首次初始化数据库
 *
 * 使用方式：
 * - 本地：在项目根目录执行 `node run-migrations-all.js`
 * - Railway：在 Start Command 中配置为
 *     node run-migrations-all.js && npm start
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 加载 .env（与后端共用配置）
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 支持 DATABASE_URL / MYSQL_URL 或单独的 DB_* 配置
const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

/**
 * 解析连接字符串里的数据库名（若存在）
 * 例如: mysql://user:pass@host:3306/dbname?charset=utf8mb4
 */
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

// 最终使用的数据库名：
// 1) 优先 DB_NAME
// 2) 然后连接串中的路径
// 3) 最后兜底 'jack_campus'
const DB_NAME = process.env.DB_NAME || dbNameFromUrl || 'jack_campus';

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

// 按顺序执行的迁移文件列表
const MIGRATIONS = [
  '001_posts_system_2.0.0.sql',
  '002_canteen_system.sql',
  '003_ranking_system.sql',
  '004_product_price.sql',
  '005_shops_logo_opening_hours.sql',
  '006_audit_logs.sql',
  '007_product_favorites.sql',
  '008_email_verification_codes.sql',
];

async function run() {
  let conn;
  try {
    console.log('正在连接数据库...');
    if (dbConfig.uri) {
      // 连接串模式（如 Railway 提供的 URL）
      conn = await mysql.createConnection({
        uri: dbConfig.uri,
        multipleStatements: true,
      });
    } else {
      conn = await mysql.createConnection(dbConfig);
    }

    console.log(`已连接数据库，当前数据库：${DB_NAME}`);

    // 确保使用目标数据库
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${DB_NAME}\`;`);

    const migrationsDir = path.join(__dirname, 'migrations');

    for (const file of MIGRATIONS) {
      const fullPath = path.join(migrationsDir, file);
      console.log(`\n=== 正在执行迁移：${file} ===`);

      if (!fs.existsSync(fullPath)) {
        console.warn(`跳过：文件不存在 ${fullPath}`);
        continue;
      }

      let sql = fs.readFileSync(fullPath, 'utf8');

      // 去掉脚本内部的 USE jack_campus;，避免与当前 DB_NAME 冲突
      sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

      try {
        await conn.query(sql);
        console.log(`迁移 ${file} 执行完成。`);
      } catch (err) {
        const msg = (err && (err.message || err.code || '')).toString();
        // 对已存在的列/表等重复执行场景做宽容处理，只打印提示但不中断后续迁移
        if (
          msg.includes('ER_DUP_FIELDNAME') ||
          msg.includes('Duplicate column name') ||
          msg.includes('ER_TABLE_EXISTS_ERROR') ||
          msg.includes('already exists') ||
          msg.includes('Duplicate entry')
        ) {
          console.warn(`迁移 ${file} 已执行过或部分执行：${msg}`);
          continue;
        }
        console.error(`迁移 ${file} 执行失败：`, msg);
        throw err;
      }
    }

    console.log('\n所有迁移执行完成。');
    process.exit(0);
  } catch (err) {
    console.error('\n运行迁移时发生错误：', err && (err.stack || err.message || err));
    if (err && err.code === 'ECONNREFUSED') {
      console.error('请确认：1) MySQL 已启动  2) 主机/端口/用户名/密码/数据库名正确（可在 .env 中配置 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME 或 DATABASE_URL / MYSQL_URL）');
    }
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

run();

