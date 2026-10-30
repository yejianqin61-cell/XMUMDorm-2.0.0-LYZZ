/**
 * 社团动态流（GET /api/clubs/feed）的分页与合并顺序测试。
 *
 * 旧实现两类各取一页再拼，第 2 页会漏条目/重复；这里锁住三件事：
 * 跨类型按时间合并、翻页连续（前缀取 offset+pageSize 再切）、clubId 只过滤本社团。
 */
const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({
  query: jest.fn(),
  pool: { getConnection: jest.fn() },
}));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  delete req.user;
  next();
});
jest.mock('../../middleware/checkSanction', () => ({ checkSanction: (_req, _res, next) => next() }));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  createNotificationBatch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/assets', () => ({ assetUrl: jest.fn((value) => (value ? `https://cdn.test/${value}` : null)) }));

const { query } = require('../../database');
const clubsRoutes = require('../../routes/clubs');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/clubs', clubsRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return a;
}

const activity = (id, createdAt) => ({
  id,
  title: `活动 ${id}`,
  summary: `活动摘要 ${id}`,
  images: '[]',
  club_id: 3,
  club_name: '摄影社',
  club_category: 'art',
  tag: null,
  status: 'upcoming',
  start_time: '2099-01-01 10:00:00',
  end_time: '2099-01-01 12:00:00',
  created_at: createdAt,
});

const post = (id, createdAt) => ({
  id,
  title: `帖子 ${id}`,
  content: `帖子正文 ${id}`,
  images: '[]',
  club_id: 3,
  club_name: '摄影社',
  club_category: 'art',
  created_at: createdAt,
});

function mockFeed(activities, posts) {
  query.mockImplementation(async (sql) => {
    if (/FROM club_activities a/i.test(sql)) return activities;
    if (/FROM club_posts p/i.test(sql)) return posts;
    return [];
  });
}

describe('GET /api/clubs/feed', () => {
  beforeEach(() => query.mockReset());

  it('merges activities and posts into one time-ordered list with type labels', async () => {
    mockFeed(
      [activity(1, '2026-10-01 10:00:00'), activity(2, '2026-10-01 08:00:00')],
      [post(3, '2026-10-01 09:00:00'), post(4, '2026-10-01 07:00:00')]
    );

    const res = await supertest(app()).get('/api/clubs/feed?page=1&pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.data.list.map((row) => `${row.type}:${row.id}`)).toEqual([
      'activity:1',
      'post:3',
      'activity:2',
      'post:4',
    ]);
    expect(res.body.data.hasMore).toBe(false);
  });

  it('keeps page 2 continuous by slicing a prefix instead of paging each type separately', async () => {
    const activities = Array.from({ length: 4 }, (_, i) => activity(10 + i, `2026-10-0${4 - i} 10:00:00`));
    const posts = Array.from({ length: 4 }, (_, i) => post(20 + i, `2026-10-0${4 - i} 09:00:00`));
    mockFeed(activities, posts);

    const res = await supertest(app()).get('/api/clubs/feed?page=2&pageSize=5');

    expect(res.status).toBe(200);
    // 全部 8 条按时间交错：10,20,11,21,12,22,13,23；第 2 页应取 22,13,23。
    expect(res.body.data.list.map((row) => row.id)).toEqual([22, 13, 23]);
    const sql = query.mock.calls.map(([text]) => text).find((text) => /FROM club_activities a/i.test(text));
    expect(sql).toMatch(/LIMIT 10;/);
  });

  it('reports hasMore when more rows exist beyond the page', async () => {
    mockFeed(Array.from({ length: 8 }, (_, i) => activity(i + 1, `2026-10-0${8 - i} 10:00:00`)), []);

    const res = await supertest(app()).get('/api/clubs/feed?page=1&pageSize=5');

    expect(res.body.data.list).toHaveLength(5);
    expect(res.body.data.hasMore).toBe(true);
  });

  it('filters both branches by clubId when given', async () => {
    mockFeed([activity(1, '2026-10-01 10:00:00')], [post(2, '2026-10-01 09:00:00')]);

    const res = await supertest(app()).get('/api/clubs/feed?clubId=3&pageSize=5');

    expect(res.status).toBe(200);
    for (const [sql, params] of query.mock.calls) {
      if (/FROM club_activities a|FROM club_posts p/i.test(sql)) {
        expect(sql).toContain('club_id = ?');
        expect(params).toEqual([3]);
      }
    }
  });

  it('rejects an invalid clubId instead of silently ignoring it', async () => {
    const res = await supertest(app()).get('/api/clubs/feed?clubId=abc');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe(-1);
  });
});
