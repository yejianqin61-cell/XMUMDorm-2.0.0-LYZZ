/**
 * Import prepared canteen review examples.
 * Dry-run is the default. Use --apply --user-id <existing users.id> to write.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const userIndex = process.argv.findIndex((arg) => arg === '--user-id');
const userId = Number(userIndex >= 0 ? process.argv[userIndex + 1] : process.env.CANTEEN_IMPORT_USER_ID);
const inputIndex = process.argv.findIndex((arg) => arg === '--input');
const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : path.join(ROOT, 'data/canteen-product-reviews/canteen-product-reviews.json');

function dbConfig() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
  if (uri) return { uri, multipleStatements: true };
  return { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'jack_campus', multipleStatements: true };
}

async function main() {
  if (!fs.existsSync(inputPath)) throw new Error(`Input extract not found: ${inputPath}`);
  const records = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(records) || records.length === 0) throw new Error('Input extract is empty');
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Pass --user-id <existing users.id> or set CANTEEN_IMPORT_USER_ID');
  const conn = await mysql.createConnection(dbConfig());
  try {
    const [users] = await conn.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users.length) throw new Error(`users.id=${userId} does not exist`);
    const [tables] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product_comments'");
    if (!Number(tables[0].n)) throw new Error('product_comments is missing; apply migrations/002_canteen_system.sql first');
    const [columns] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'product_comments' AND column_name = 'score'");
    if (!Number(columns[0].n)) throw new Error('product_comments.score is missing; apply migrations/066_product_comment_score.sql first');
    let existing = 0; let inserted = 0;
    if (apply) await conn.beginTransaction();
    for (const record of records) {
      const [matches] = await conn.query('SELECT id FROM product_comments WHERE product_id = ? AND user_id = ? AND content = ? AND deleted_at IS NULL LIMIT 1', [record.product_id, userId, record.content]);
      if (matches.length) { existing += 1; continue; }
      if (apply) await conn.query('INSERT INTO product_comments (product_id, user_id, parent_id, rating, score, content) VALUES (?, ?, NULL, ?, ?, ?)', [record.product_id, userId, record.rating, record.score, record.content]);
      inserted += 1;
    }
    if (apply) await conn.commit();
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', inputRows: records.length, existing, wouldInsert: apply ? undefined : inserted, inserted: apply ? inserted : undefined, userId }, null, 2));
  } catch (error) { if (apply) await conn.rollback(); throw error; } finally { await conn.end(); }
}

main().catch((error) => { console.error(`[canteen-import] ${error.message}`); process.exitCode = 1; });
