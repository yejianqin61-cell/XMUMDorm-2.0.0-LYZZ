const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  const id = Number(req.get('x-user'));
  if (!id) return res.status(401).json({ status: -1, message: '需要登录' });
  req.user = { id, role: req.get('x-role') || 'student' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({ checkSanction: (_req, _res, next) => next() }));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../services/termsAcceptance', () => ({ requireCurrentTerms: (_req, _res, next) => next() }));

const { query } = require('../../database');
const errandsRoutes = require('../../routes/errands');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const bearer = (user) => `Bearer ${jwt.sign(user, SECRET)}`;
const row = { id: 5, title: 't', reward: 1, status: 'taken', type: 'delivery', contact_info: 'wx-123', owner_id: 1, taker_id: 2 };

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/errands', errandsRoutes);
  instance.use((err, _req, res, _next) => res.status(500).json({ status: -1, message: err.message }));
  return instance;
}

describe('跑腿联系方式：接单后才可见', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async (sql) => (sql.includes('FROM users WHERE id') ? [{ status: 'active' }] : [row]));
  });

  it.each([
    ['游客', null, ''],
    ['无关用户', { id: 3, role: 'student' }, ''],
    ['发布者', { id: 1, role: 'student' }, 'wx-123'],
    ['接单人', { id: 2, role: 'student' }, 'wx-123'],
    ['管理员', { id: 9, role: 'admin' }, 'wx-123'],
  ])('%s', async (_name, user, expected) => {
    const req = supertest(app()).get('/api/errands/5');
    const res = await (user ? req.set('Authorization', bearer(user)) : req);
    expect(res.status).toBe(200);
    expect(res.body.data.contactInfo).toBe(expected);
    expect(res.body.data.contactHidden).toBe(expected === '');
  });

  it('坏令牌按游客处理，不报错也不给联系方式', async () => {
    const res = await supertest(app()).get('/api/errands/5').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(200);
    expect(res.body.data.contactInfo).toBe('');
  });

  it('其他用户认领待接单任务时记录接单人', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce([{ id: 5, owner_user_id: 1, status: 'open', taken_by_user_id: null }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await supertest(app()).post('/api/errands/5/take').set('x-user', '3');
    expect(res.status).toBe(200);
    expect(query.mock.calls[1][1]).toEqual([3, 5]);
  });

  it('别人不能取消已被认领的任务，认领者本人可以', async () => {
    const taken = [{ id: 5, owner_user_id: 1, status: 'taken', taken_by_user_id: 2 }];
    query.mockReset();
    query.mockResolvedValueOnce(taken);
    const other = await supertest(app()).post('/api/errands/5/take').set('x-user', '3');
    expect(other.status).toBe(403);
    query.mockResolvedValueOnce(taken).mockResolvedValueOnce({ affectedRows: 1 });
    const mine = await supertest(app()).post('/api/errands/5/take').set('x-user', '2');
    expect(mine.status).toBe(200);
  });

  it('发布者的旧切换行为保留（不记录接单人）', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce([{ id: 5, owner_user_id: 1, status: 'open', taken_by_user_id: null }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await supertest(app()).post('/api/errands/5/take').set('x-user', '1');
    expect(res.status).toBe(200);
    expect(query.mock.calls[1][1]).toEqual([5]);
  });
});
