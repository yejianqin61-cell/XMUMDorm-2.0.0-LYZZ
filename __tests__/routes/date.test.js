/**
 * 交友模块（任务管理表 #9）
 */
const express = require('express');
const supertest = require('supertest');
const { createDateRouter, validateProfile } = require('../../routes/date');

function build({ query, notify = jest.fn(), userId = 9, filterHit = false } = {}) {
  const app = express();
  app.use(express.json());
  const auth = (req, _res, next) => { req.user = { id: Number(req.headers['x-user'] || userId), role: 'student' }; next(); };
  const sensitiveWordFilter = (req, res, next) => {
    if (filterHit) return res.status(400).json({ status: -1, message: '内容包含违规词汇' });
    next();
  };
  const passLimiter = (_req, _res, next) => next();
  app.use('/api/date', createDateRouter({ query, auth, guards: [], sensitiveWordFilter, notify, assetUrl: (p) => `/u/${p}`, likeLimiter: passLimiter }));
  return app;
}

const PROFILE = { content: '大二 EEE，喜欢羽毛球和咖啡', contact: 'wx_abc', looking_for: 'activity', tags: ['羽毛球', '咖啡'] };

describe('validateProfile', () => {
  it('合法输入：去空白、标签去重、默认可见', () => {
    const { value } = validateProfile({ ...PROFILE, tags: [' 羽毛球 ', '羽毛球', '', '咖啡'] });
    expect(value).toEqual({ intro: PROFILE.content, contact: 'wx_abc', lookingFor: 'activity', tags: ['羽毛球', '咖啡'], visible: 1 });
  });
  it.each([
    [{ ...PROFILE, content: '  ' }, '自我介绍'],
    [{ ...PROFILE, content: 'x'.repeat(301) }, '300'],
    [{ ...PROFILE, contact: '' }, '联系方式'],
    [{ ...PROFILE, looking_for: 'hookup' }, 'looking_for'],
    [{ ...PROFILE, tags: 'a,b' }, 'tags'],
    [{ ...PROFILE, tags: ['1', '2', '3', '4', '5', '6', '7'] }, '6'],
    [{ ...PROFILE, tags: ['这是一个超过十二个字的很长的标签'] }, '12'],
  ])('非法输入被拒绝 %#', (input, hint) => {
    expect(validateProfile(input).error).toContain(hint);
  });
  it('visible=false 存为 0', () => {
    expect(validateProfile({ ...PROFILE, visible: false }).value.visible).toBe(0);
  });
});

describe('PUT /api/date/me', () => {
  it('写入名片（upsert）', async () => {
    const query = jest.fn().mockResolvedValueOnce({ affectedRows: 1 });
    const res = await supertest(build({ query })).put('/api/date/me').send(PROFILE);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ visible: true, looking_for: 'activity', tags: ['羽毛球', '咖啡'] });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(params).toEqual([9, 1, PROFILE.content, JSON.stringify(['羽毛球', '咖啡']), 'activity', 'wx_abc']);
  });
  it('命中敏感词时不写库', async () => {
    const query = jest.fn();
    const res = await supertest(build({ query, filterHit: true })).put('/api/date/me').send(PROFILE);
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('GET /api/date/cards', () => {
  it('自己没挂名片：403 NEED_PROFILE，不查别人', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const res = await supertest(build({ query })).get('/api/date/cards');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NEED_PROFILE');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('名片隐藏也算没挂', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ user_id: 9, visible: 0 }]);
    const res = await supertest(build({ query })).get('/api/date/cards');
    expect(res.status).toBe(403);
  });
  it('列表不含联系方式；排除自己、已打招呼、双向拉黑、非学生和封禁', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ user_id: 9, visible: 1 }])
      .mockResolvedValueOnce([{ user_id: 3, intro: 'hi', tags_json: '["跑步"]', looking_for: 'friends', updated_at: '2026-11-16 10:00:00', username: 'a', nickname: '小A', avatar: null, level: 2, contact: 'SHOULD_NOT_LEAK' }]);
    const res = await supertest(build({ query })).get('/api/date/cards?looking_for=friends');
    expect(res.status).toBe(200);
    expect(res.body.data.list).toEqual([{ user: { id: 3, name: '小A', avatar: null, level: 2 }, intro: 'hi', tags: ['跑步'], looking_for: 'friends', updated_at: '2026-11-16 10:00:00' }]);
    expect(JSON.stringify(res.body)).not.toContain('SHOULD_NOT_LEAK');
    const [sql, params] = query.mock.calls[1];
    expect(sql).not.toMatch(/p\.contact/);
    expect(sql).toContain("u.role = 'student' AND u.status = 'active'");
    expect(sql).toContain('date_likes l WHERE l.from_user_id = ?');
    expect(sql).toContain('b.user_id = ? AND b.blocked_user_id = p.user_id');
    expect(sql).toContain('b2.user_id = p.user_id AND b2.blocked_user_id = ?');
    expect(params).toEqual([9, 9, 9, 9, 'friends']);
  });
  it('非法筛选或游标返回 400', async () => {
    const query = jest.fn();
    expect((await supertest(build({ query })).get('/api/date/cards?looking_for=x')).status).toBe(400);
    expect((await supertest(build({ query })).get('/api/date/cards?cursor=bad')).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('POST /api/date/cards/:userId/like', () => {
  const ready = (query) => query
    .mockResolvedValueOnce([{ user_id: 9, visible: 1 }]) // 我的名片
    .mockResolvedValueOnce([{ user_id: 3 }]) // 对方名片
    .mockResolvedValueOnce([]); // 未拉黑

  it('单方面打招呼：matched=false，不通知对方', async () => {
    const query = ready(jest.fn()).mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([]);
    const notify = jest.fn();
    const res = await supertest(build({ query, notify })).post('/api/date/cards/3/like');
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it('互相打招呼：matched=true，双方各收到一条通知，指向对方', async () => {
    const query = ready(jest.fn()).mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([{ 1: 1 }]);
    const notify = jest.fn();
    const res = await supertest(build({ query, notify })).post('/api/date/cards/3/like');
    expect(res.body.data.matched).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[0][0]).toMatchObject({ userId: 3, type: 'date_match', fromUserId: 9, extra: { targetId: 9 } });
    expect(notify.mock.calls[1][0]).toMatchObject({ userId: 9, type: 'date_match', fromUserId: 3, extra: { targetId: 3 } });
  });

  it('重复点（没有新插入）不重复通知', async () => {
    const query = ready(jest.fn()).mockResolvedValueOnce({ affectedRows: 0 }).mockResolvedValueOnce([{ 1: 1 }]);
    const notify = jest.fn();
    await supertest(build({ query, notify })).post('/api/date/cards/3/like');
    expect(notify).not.toHaveBeenCalled();
  });

  it('被拉黑：和名片不存在一样返回 404，不写招呼', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ user_id: 9, visible: 1 }])
      .mockResolvedValueOnce([{ user_id: 3 }])
      .mockResolvedValueOnce([{ 1: 1 }]);
    const res = await supertest(build({ query })).post('/api/date/cards/3/like');
    expect(res.status).toBe(404);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('不能给自己打招呼；自己没名片 403', async () => {
    expect((await supertest(build({ query: jest.fn() })).post('/api/date/cards/9/like')).status).toBe(400);
    const query = jest.fn().mockResolvedValueOnce([]);
    expect((await supertest(build({ query })).post('/api/date/cards/3/like')).status).toBe(403);
  });
});

describe('GET /api/date/matches 与拉黑', () => {
  it('互相喜欢的人带联系方式', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ user_id: 3, intro: 'hi', tags_json: null, looking_for: 'study', contact: 'wx_3', updated_at: 't', username: 'a', nickname: null, avatar: 'x.png', level: 1, matched_at: 'm' }]);
    const res = await supertest(build({ query })).get('/api/date/matches');
    expect(res.body.data.list[0]).toMatchObject({ user: { id: 3, name: 'a', avatar: '/u/x.png' }, contact: 'wx_3', matched_at: 'm', tags: [] });
    expect(query.mock.calls[0][0]).toContain('JOIN date_likes b ON b.from_user_id = a.to_user_id AND b.to_user_id = a.from_user_id');
  });

  it('拉黑后清掉双方之间的招呼', async () => {
    const query = jest.fn().mockResolvedValue({ affectedRows: 1 });
    const res = await supertest(build({ query })).post('/api/date/blocks/3');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1]).toEqual([9, 3]);
    expect(query.mock.calls[1][1]).toEqual([9, 3, 3, 9]);
  });

  it('删除名片会连同我发出的招呼一起删', async () => {
    const query = jest.fn().mockResolvedValue({ affectedRows: 1 });
    await supertest(build({ query })).delete('/api/date/me');
    expect(query.mock.calls[0][0]).toContain('DELETE FROM date_likes WHERE from_user_id = ?');
    expect(query.mock.calls[1][0]).toContain('DELETE FROM date_profiles');
  });
});
