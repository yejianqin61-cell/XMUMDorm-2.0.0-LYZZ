/**
 * Dev seed for Clubs module.
 *
 * Usage:
 *   node scripts/seed-clubs-dev.js
 */
require('dotenv').config();
const { query } = require('../database');

async function main() {
  const clubCountRows = await query('SELECT COUNT(*) AS c FROM clubs');
  const clubCount = clubCountRows && clubCountRows[0] ? Number(clubCountRows[0].c) : 0;
  if (clubCount > 0) {
    console.log(`[clubs-seed] skip: already has ${clubCount} clubs`);
    return;
  }

  console.log('[clubs-seed] inserting clubs...');
  const clubs = [
    {
      name: '摄影社',
      avatar: null,
      description: '用镜头记录马校日常。每周外拍，欢迎新手。',
      contact_text: '微信：xmuphoto_club',
      signup_link: 'https://forms.gle/example-photo',
    },
    {
      name: '羽毛球社',
      avatar: null,
      description: '每周固定球局，欢迎各水平同学。',
      contact_text: '联系人：阿明（D2）',
      signup_link: 'https://forms.gle/example-badminton',
    },
    {
      name: '吉他社',
      avatar: null,
      description: '一起练琴、一起演出。会不定期办 open mic。',
      contact_text: 'IG：@xmuguitar',
      signup_link: 'https://forms.gle/example-guitar',
    },
  ];

  const clubIds = [];
  for (const c of clubs) {
    const r = await query(
      'INSERT INTO clubs (name, avatar, description, contact_text, signup_link) VALUES (?, ?, ?, ?, ?)',
      [c.name, c.avatar, c.description, c.contact_text, c.signup_link]
    );
    clubIds.push(r.insertId);
  }

  console.log('[clubs-seed] inserting activities...');
  const now = Date.now();
  const activities = [
    {
      clubId: clubIds[0],
      title: '夜景外拍 · 城市光影',
      summary: '集合后统一出发，带好充电宝与雨伞。',
      cover: null,
      start: new Date(now + 3 * 24 * 3600 * 1000),
      end: new Date(now + 3 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
      location: 'KLCC',
      signup: 'https://forms.gle/example-photo-activity',
    },
    {
      clubId: clubIds[1],
      title: '周末球局（新手友好）',
      summary: '可借拍，按到场分组。',
      cover: null,
      start: new Date(now + 1 * 24 * 3600 * 1000),
      end: new Date(now + 1 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
      location: '体育馆 2F',
      signup: 'https://forms.gle/example-badminton-activity',
    },
  ];
  for (const a of activities) {
    await query(
      `
      INSERT INTO club_activities
        (club_id, title, summary, cover, start_time, end_time, location, signup_link)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [a.clubId, a.title, a.summary, a.cover, a.start, a.end, a.location, a.signup]
    );
  }

  console.log('[clubs-seed] inserting club posts...');
  const posts = [
    {
      clubId: clubIds[2],
      title: '本周练琴打卡',
      content: '欢迎大家周五晚来一起合奏～\n曲目：City of Stars / 小幸运 / 你是人间四月天\n（不需要特别专业，来玩就行）',
      images: [],
    },
    {
      clubId: clubIds[0],
      title: '新手相机推荐清单',
      content: '预算 1k–2k：二手微单是性价比之王。\n想要轻便：优先看 Sony A6000 系列 / Canon M 系列。\n镜头：先用套头，别急着烧。',
      images: [],
    },
  ];
  for (const p of posts) {
    await query(
      'INSERT INTO club_posts (club_id, title, content, images) VALUES (?, ?, ?, ?)',
      [p.clubId, p.title, p.content, JSON.stringify(p.images)]
    );
  }

  console.log('[clubs-seed] done.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[clubs-seed] failed:', e && (e.stack || e.message || e));
    process.exit(1);
  });

