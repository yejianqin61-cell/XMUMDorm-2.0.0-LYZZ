const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 7, role: 'student' };
  next();
});

const { query } = require('../../database');
const marketplaceRoutes = require('../../routes/marketplace');

function app() {
  const value = express();
  value.use(express.json());
  value.use('/api/marketplace', marketplaceRoutes);
  return value;
}

const message = (id, created_at = `2026-10-09 10:00:${String(id).padStart(2, '0')}`) => ({
  id,
  thread_id: 11,
  sender_user_id: 7,
  content: `message-${id}`,
  created_at,
  username: 'me',
  nickname: null,
  avatar: null,
});

describe('marketplace chat message history cursor', () => {
  beforeEach(() => query.mockReset());

  it('首屏返回升序消息、hasMore 和稳定游标', async () => {
    query.mockResolvedValueOnce([{ id: 11, item_id: 5, seller_user_id: 7, buyer_user_id: 9, item_title: '键盘' }]);
    query.mockResolvedValueOnce(Array.from({ length: 101 }, (_, index) => message(101 - index)));

    const res = await supertest(app()).get('/api/marketplace/chat/threads/11/messages');

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(100);
    expect(res.body.data.list[0].id).toBe(2);
    expect(res.body.data.list[99].id).toBe(101);
    expect(res.body.data.hasMore).toBe(true);
    expect(typeof res.body.data.nextCursor).toBe('string');
  });

  it('带游标请求更早页面，并保留复合排序条件', async () => {
    const cursor = Buffer.from(JSON.stringify({ createdAt: '2026-10-09 10:00:50', id: 50 })).toString('base64url');
    query.mockResolvedValueOnce([{ id: 11, item_id: 5, seller_user_id: 7, buyer_user_id: 9, item_title: '键盘' }]);
    query.mockResolvedValueOnce([message(1)]);

    const res = await supertest(app()).get(`/api/marketplace/chat/threads/11/messages?cursor=${cursor}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hasMore).toBe(false);
    expect(res.body.data.nextCursor).toBeNull();
    expect(query.mock.calls[1][0]).toContain('m.created_at < ? OR (m.created_at = ? AND m.id < ?)');
    expect(query.mock.calls[1][1]).toEqual([11, '2026-10-09 10:00:50', '2026-10-09 10:00:50', 50]);
  });

  it('非法游标返回 400，不访问数据库消息表', async () => {
    const res = await supertest(app()).get('/api/marketplace/chat/threads/11/messages?cursor=bad');
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
