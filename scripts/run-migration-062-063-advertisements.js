/**
 * Apply the Phase3 advertisement migrations.
 *
 * Usage:
 *   node scripts/run-migration-062-063-advertisements.js
 *
 * The script uses the same DATABASE_URL / MYSQL_URL / RAILWAY_MYSQL_URL
 * (or DB_* variables) as the rest of the project and is safe to run again
 * because both migrations use CREATE TABLE IF NOT EXISTS.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS = [
  '062_advertisement_posts.sql',
  '063_advertisement_clicks.sql',
];

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

    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'advertisement_%'",
    );
    console.log(`Advertisement migration complete. Tables found: ${tables.length}`);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch((error) => {
  console.error('Advertisement migration failed:');
  console.error(error && (error.stack || error.message || error));
  process.exit(1);
});
