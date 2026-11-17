/**
 * Dorm 贡献站接口（任务管理表 #5）
 */
const express = require('express');
const supertest = require('supertest');
const { createContributeRouter, CONTRIBUTION_ACTIONS } = require('../../routes/contribute');
const { SimpleCache } = require('../../utils/simpleCache');

function build({ query, userId = 9 } = {}) {
  const app = express();
  const auth = (req, res, next) => {
    if (req.headers['x-anon']) return res.status(401).json({ status: -1, message: '未登录' });
    req.user = { id: userId, role: 'student' };
    next();
  };
  app.use('/api/contribute', createContributeRouter({ query, cache: new SimpleCache(), auth, assetUrl: (p) => `/u/${p}` }));
  return app;
}

describe('GET /api/contribute/leaderboard', () => {
  it('默认 30 天：只统计内容类行为和学生账号，返回排名、昵称优先、分数为数字', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      { id: 3, username: 'alice', nickname: '小A', avatar: 'a.png', level: 3, points: '120', contributions: '14' },
      { id: 5, username: 'bob', nickname: '  ', avatar: null, level: null, points: 80, contributions: 9 },
    ]);
    const res = await supertest(build({ query })).get('/api/contribute/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body.data.range).toBe('30d');
    expect(res.body.data.list).toEqual([
      { rank: 1, user: { id: 3, name: '小A', avatar: '/u/a.png', level: 3 }, points: 120, contributions: 14 },
      { rank: 2, user: { id: 5, name: 'bob', avatar: null, level: 1 }, points: 80, contributions: 9 },
    ]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("u.role = 'student'");
    expect(sql).toContain('l.exp > 0');
    expect(sql).toContain('INTERVAL 30 DAY');
    expect(sql).toContain('LIMIT 20');
    expect(params).toEqual([...CONTRIBUTION_ACTIONS]);
    expect(params).not.toContain('login');
    expect(params).not.toContain('like');
  });

  it('range=all 不加时间条件', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const res = await supertest(build({ query })).get('/api/contribute/leaderboard?range=all');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).not.toContain('INTERVAL');
  });

  it('同一范围 5 分钟内走缓存，不重复查库', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const app = build({ query });
    await supertest(app).get('/api/contribute/leaderboard');
    await supertest(app).get('/api/contribute/leaderboard');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('非法 range 返回 400，不查库', async () => {
    const query = jest.fn();
    const res = await supertest(build({ query })).get('/api/contribute/leaderboard?range=7d');
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('查库出错返回 500，不泄露细节', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const query = jest.fn().mockRejectedValueOnce(new Error('ER_NO_SUCH_TABLE exp_logs'));
    const res = await supertest(build({ query })).get('/api/contribute/leaderboard');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('exp_logs');
    err.mockRestore();
  });
});

describe('GET /api/contribute/me', () => {
  it('未登录 401', async () => {
    const query = jest.fn();
    const res = await supertest(build({ query })).get('/api/contribute/me').set('x-anon', '1');
    expect(res.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('返回 30 天分项、总计和排名（排名 = 比我高的人数 + 1）', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([
        { action: 'post', points: '30', contributions: '3' },
        { action: 'cafeteria_review', points: 15, contributions: 3 },
      ])
      .mockResolvedValueOnce([{ points: '200', contributions: '31' }])
      .mockResolvedValueOnce([{ ahead: 4 }]);
    const res = await supertest(build({ query, userId: 9 })).get('/api/contribute/me');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      last30d: {
        points: 45,
        contributions: 6,
        rank: 5,
        byAction: { post: { points: 30, contributions: 3 }, cafeteria_review: { points: 15, contributions: 3 } },
      },
      total: { points: 200, contributions: 31 },
    });
    expect(query.mock.calls[0][1][0]).toBe(9);
    expect(query.mock.calls[2][1].at(-1)).toBe(45);
  });

  it('30 天没有贡献：不算排名，也不发排名查询', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ points: 0, contributions: 0 }]);
    const res = await supertest(build({ query })).get('/api/contribute/me');
    expect(res.body.data.last30d).toEqual({ points: 0, contributions: 0, rank: null, byAction: {} });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
