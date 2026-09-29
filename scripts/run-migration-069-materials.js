/**
 * 应用 M10 学习资料模块的迁移（069）。
 *
 * 用法：
 *   node scripts/run-migration-069-materials.js
 *   npm run migrate:materials
 *
 * 与项目其它脚本一致：优先使用 DATABASE_URL / MYSQL_URL / RAILWAY_MYSQL_URL，
 * 否则回落到 DB_* 变量。迁移内部全部是 CREATE TABLE IF NOT EXISTS + INSERT IGNORE，
 * 因此**可重复执行**。
 *
 * 注意：`node scripts/run-incremental-migrations.js` 也会自动扫到
 * migrations/069_*.sql；本脚本存在的意义是「只应用本模块的表结构」。
 *
 * 线上（Railway）执行步骤见 docs/09-Deploy/release/ 下的生产迁移指南。
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS = ['069_materials.sql'];

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;

function databaseNameFromUrl(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '').split('/')[0] || null;
  } catch {
    return null;
  }
}

const databaseName = databaseNameFromUrl(connectionUrl) || process.env.DB_NAME || 'jack_campus';
const connectionConfig = connectionUrl
  ? { uri: connectionUrl, multipleStatements: true }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: databaseName,
      multipleStatements: true,
    };

/** 本模块期望存在的表 */
const EXPECTED_TABLES = ['courses', 'course_aliases', 'materials', 'material_saves', 'material_downloads'];

async function main() {
  let connection;
  try {
    console.log(`Connecting to database: ${databaseName}`);
    connection = await mysql.createConnection(connectionConfig);

    for (const filename of MIGRATIONS) {
      const migrationPath = path.join(ROOT, 'migrations', filename);
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }
      console.log(`Applying ${filename} ...`);
      await connection.query(fs.readFileSync(migrationPath, 'utf8'));
      console.log(`Applied ${filename}`);
    }

    // 逐表核对，缺失即报错（避免「迁移跑过了但表没建全」的静默失败）
    const missing = [];
    for (const t of EXPECTED_TABLES) {
      const [rows] = await connection.query('SHOW TABLES LIKE ?', [t]);
      if (!rows || rows.length === 0) missing.push(t);
    }
    console.log(`Tables present: ${EXPECTED_TABLES.length - missing.length}/${EXPECTED_TABLES.length}`);
    if (missing.length > 0) {
      throw new Error(`以下表未创建成功：${missing.join(', ')}`);
    }

    // 伪课程必须存在（通用 / 其他）
    const [pseudo] = await connection.query(
      'SELECT id, name, is_pseudo FROM courses WHERE id = 1 LIMIT 1'
    );
    if (!pseudo || pseudo.length === 0) {
      throw new Error('未找到 id=1 的伪课程（通用 / 其他），迁移可能未正确执行');
    }
    console.log(`Pseudo course ready: #${pseudo[0].id} ${pseudo[0].name}`);

    console.log('学习资料迁移完成 ✅');
  } finally {
    if (connection) await connection.end();
  }
}

main().catch((error) => {
  console.error('学习资料迁移失败：');
  console.error(error && (error.stack || error.message || error));
  process.exit(1);
});
