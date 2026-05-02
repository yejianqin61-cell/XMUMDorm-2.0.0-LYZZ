/**
 * Dev seed for Clubs module.
 *
 * （原吉他社 / 羽毛球社 / 摄影社 演示数据已移除；此处不再插入默认社团。）
 *
 * Usage:
 *   node scripts/seed-clubs-dev.js
 */
require('dotenv').config();
const { query } = require('../database');

/** 若需本地演示社团，可在此数组添加后再运行脚本（仅当 clubs 表为空时执行）。 */
const clubs = [];

async function main() {
  const clubCountRows = await query('SELECT COUNT(*) AS c FROM clubs');
  const clubCount = clubCountRows && clubCountRows[0] ? Number(clubCountRows[0].c) : 0;
  if (clubCount > 0) {
    console.log(`[clubs-seed] skip: already has ${clubCount} clubs`);
    return;
  }

  if (!clubs.length) {
    console.log('[clubs-seed] skip: no clubs in seed list (add entries in scripts/seed-clubs-dev.js if needed)');
    return;
  }

  console.log('[clubs-seed] inserting clubs...');
  const clubIds = [];
  for (const c of clubs) {
    const r = await query(
      'INSERT INTO clubs (name, avatar, description, contact_text, signup_link) VALUES (?, ?, ?, ?, ?)',
      [c.name, c.avatar, c.description, c.contact_text, c.signup_link]
    );
    clubIds.push(r.insertId);
  }

  console.log('[clubs-seed] done (clubs only; add activities/posts in seed if needed).');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[clubs-seed] failed:', e && (e.stack || e.message || e));
    process.exit(1);
  });
