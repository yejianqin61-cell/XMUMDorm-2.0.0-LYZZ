/**
 * Import the cleaned course recommendation extract into course_reviews.
 *
 * Dry-run is the default.  To write to the database:
 *   node scripts/import-course-recommendations.js --apply --created-by 1
 *
 * The script uses DATABASE_URL, MYSQL_URL, RAILWAY_MYSQL_URL, or DB_* from .env.
 * It is idempotent for the same created_by/course/comment/term combination.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const inputIndex = process.argv.findIndex((arg) => arg === '--input');
const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : path.join(ROOT, 'data/course-recommendations/course-recommendations.cleaned.json');
const ownerIndex = process.argv.findIndex((arg) => arg === '--created-by');
const ownerRaw = ownerIndex >= 0 ? process.argv[ownerIndex + 1] : process.env.COURSE_IMPORT_USER_ID;
const ratingIndex = process.argv.findIndex((arg) => arg === '--rating');
const difficultyIndex = process.argv.findIndex((arg) => arg === '--difficulty');
const defaultRating = ratingIndex >= 0 ? Number(process.argv[ratingIndex + 1]) : 3;
const defaultDifficulty = difficultyIndex >= 0 ? Number(process.argv[difficultyIndex + 1]) : 3;

function getConnectionConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
  if (url) return { uri: url, multipleStatements: true };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jack_campus',
    multipleStatements: true,
  };
}

function assertScore(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`${label} must be an integer from 1 to 5`);
}

async function main() {
  if (!fs.existsSync(inputPath)) throw new Error(`Input extract not found: ${inputPath}`);
  const records = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(records) || records.length === 0) throw new Error('Input extract is empty');
  const ownerId = Number(ownerRaw);
  if (!Number.isInteger(ownerId) || ownerId <= 0) throw new Error('Pass --created-by <existing users.id> or set COURSE_IMPORT_USER_ID');
  assertScore(defaultRating, 'rating');
  assertScore(defaultDifficulty, 'difficulty');

  const conn = await mysql.createConnection(getConnectionConfig());
  try {
    const [userRows] = await conn.query('SELECT id FROM users WHERE id = ? LIMIT 1', [ownerId]);
    if (!userRows.length) throw new Error(`users.id=${ownerId} does not exist`);
    const [tableRows] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_reviews'");
    if (!Number(tableRows[0].n)) throw new Error('course_reviews is missing; apply migrations/017_handbook.sql and 018-023 first');

    let existing = 0;
    let inserted = 0;
    if (apply) await conn.beginTransaction();
    for (const record of records) {
      const params = [ownerId, record.course_name, record.teacher || null, record.comment, record.term_year || null, record.term_month || null];
      const [matches] = await conn.query(
        `SELECT id FROM course_reviews
         WHERE created_by = ? AND course_name = ? AND COALESCE(teacher, '') = COALESCE(?, '')
           AND comment = ? AND ((term_year = ?) OR (term_year IS NULL AND ? IS NULL))
           AND ((term_month = ?) OR (term_month IS NULL AND ? IS NULL)) AND deleted_at IS NULL
         LIMIT 1`,
        [ownerId, record.course_name, record.teacher || null, record.comment, record.term_year || null, record.term_year || null, record.term_month || null, record.term_month || null]
      );
      if (matches.length) {
        existing += 1;
        continue;
      }
      if (apply) {
        await conn.query(
          `INSERT INTO course_reviews
            (course_name, teacher, tag, tags_json, rating, difficulty, comment, created_by, term_year, term_month)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.course_name, record.teacher || null, 'GE', JSON.stringify(record.tags || ['GE']), defaultRating, defaultDifficulty, record.comment, ownerId, record.term_year || null, record.term_month || null]
        );
      }
      inserted += 1;
    }
    if (apply) await conn.commit();
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', inputRows: records.length, existing, wouldInsert: apply ? undefined : inserted, inserted: apply ? inserted : undefined, createdBy: ownerId, defaultRating, defaultDifficulty }, null, 2));
  } catch (error) {
    if (apply) await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(`[course-recommendations] ${error.message}`);
  process.exitCode = 1;
});
