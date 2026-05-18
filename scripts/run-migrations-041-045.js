/**
 * 执行广场/组织系统增量迁移 041–045
 *
 *   node scripts/run-migrations-041-045.js
 *
 * 文件顺序：
 *   041_organizations.sql
 *   042_organization_memberships.sql
 *   043_trending_topics.sql
 *   044_trending_posts.sql
 *   045_campus_posts.sql
 *
 * 连接：.env 中 DATABASE_URL / MYSQL_URL / RAILWAY_MYSQL_URL（与 run-incremental-migrations.js 一致）
 * 已存在的表/列/索引会跳过（Duplicate / already exists）。
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const MIGRATION_FILES = [
  '041_organizations.sql',
  '042_organization_memberships.sql',
  '043_trending_topics.sql',
  '044_trending_posts.sql',
  '045_campus_posts.sql',
];

require('dotenv').config({ path: path.join(ROOT, '.env') });

const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;

function getDbNameFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '').split('/')[0] || null;
  } catch {
    return null;
  }
}

const DB_NAME = (connectionUrl ? getDbNameFromUrl(connectionUrl) : null) || process.env.DB_NAME || 'jack_campus';

const dbConfig = connectionUrl
  ? { uri: connectionUrl, multipleStatements: true }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      multipleStatements: true,
    };

function isSkippableError(err) {
  const msg = (err && (err.message || err.code || '')).toString();
  return (
    msg.includes('ER_DUP_FIELDNAME') ||
    msg.includes('Duplicate column name') ||
    msg.includes('ER_TABLE_EXISTS_ERROR') ||
    msg.includes('already exists') ||
    msg.includes('Duplicate entry') ||
    msg.includes('Duplicate key name') ||
    msg.includes('ER_DUP_KEYNAME')
  );
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

const TABLE_BY_FILE = {
  '041_organizations.sql': 'organizations',
  '042_organization_memberships.sql': 'organization_memberships',
  '043_trending_topics.sql': 'trending_topics',
  '044_trending_posts.sql': 'trending_posts',
  '045_campus_posts.sql': 'campus_posts',
};

async function run() {
  for (const file of MIGRATION_FILES) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`缺少迁移文件：${file}`);
      process.exit(1);
    }
  }

  let conn;
  try {
    console.log('正在连接数据库...');
    conn = dbConfig.uri
      ? await mysql.createConnection({ uri: dbConfig.uri, multipleStatements: true })
      : await mysql.createConnection(dbConfig);

    console.log(`已连接，数据库：${DB_NAME}`);
    console.log('执行前表状态：');
    for (const file of MIGRATION_FILES) {
      const table = TABLE_BY_FILE[file];
      const exists = await tableExists(conn, table);
      console.log(`  ${table}: ${exists ? '已存在' : '未创建'}`);
    }
    console.log(`\n将执行 ${MIGRATION_FILES.length} 个迁移文件\n`);

    await conn.query(`USE \`${DB_NAME}\`;`);

    let ok = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of MIGRATION_FILES) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      console.log(`=== ${file} ===`);
      let sql = fs.readFileSync(fullPath, 'utf8');
      sql = sql.replace(/^\s*USE\s+jack_campus\s*;?\s*$/gim, '');

      try {
        await conn.query(sql);
        console.log('完成\n');
        ok += 1;
      } catch (err) {
        if (isSkippableError(err)) {
          console.warn(`已存在，跳过：${(err.message || err).toString().slice(0, 120)}\n`);
          skipped += 1;
        } else {
          console.error('失败：', err.message || err);
          failed += 1;
        }
      }
    }

    console.log('执行后表状态：');
    for (const file of MIGRATION_FILES) {
      const table = TABLE_BY_FILE[file];
      const exists = await tableExists(conn, table);
      console.log(`  ${table}: ${exists ? '已存在' : '未创建'}`);
    }

    console.log(`\n汇总：成功 ${ok}，跳过 ${skipped}，失败 ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n连接或执行错误：', err.stack || err.message || err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
