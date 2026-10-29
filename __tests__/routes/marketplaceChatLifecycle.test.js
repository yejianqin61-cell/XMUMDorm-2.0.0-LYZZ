const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../services/termsAcceptance', () => ({ requireCurrentTerms: (_req, _res, next) => next() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  const id = Number(req.headers['x-test-user-id'] || 9);
  req.user = { id, role: id === 7 ? 'student' : 'student' };
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

describe('marketplace chat lifecycle for an on-sale item', () => {
  beforeEach(() => query.mockReset());

  it('buyer first message returns a thread and message id', async () => {
    query
      .mockResolvedValueOnce([{ id: 5, title: '二手键盘', seller_user_id: 7 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ insertId: 11 })
      .mockResolvedValueOnce({ insertId: 101 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ insertId: 9001 });

    const res = await supertest(app())
      .post('/api/marketplace/items/5/chat/messages')
      .set('x-test-user-id', '9')
      .send({ content: '还在吗？' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ thread_id: 11, id: 101 });
  });

  it('seller reply uses the same thread and returns a new message id', async () => {
    query
      .mockResolvedValueOnce([{ id: 11, item_id: 5, seller_user_id: 7, buyer_user_id: 9, item_title: '二手键盘' }])
      .mockResolvedValueOnce({ insertId: 102 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ insertId: 9002 });

    const res = await supertest(app())
      .post('/api/marketplace/chat/threads/11/messages')
      .set('x-test-user-id', '7')
      .send({ content: '还在，可以面交。' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: 102 });
    expect(query.mock.calls[1][1]).toEqual([11, 7, '还在，可以面交。']);
  });

  it('buyer can query the same thread after the first message', async () => {
    query
      .mockResolvedValueOnce([{ id: 11, seller_user_id: 7, buyer_user_id: 9, last_message_at: '2026-10-29 10:00:00' }]);

    const res = await supertest(app())
      .get('/api/marketplace/items/5/chat/thread')
      .set('x-test-user-id', '9');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 11, seller_user_id: 7, buyer_user_id: 9 });
  });

  it('rejects a stranger before reading message history', async () => {
    query.mockResolvedValueOnce([{ id: 11, item_id: 5, seller_user_id: 7, buyer_user_id: 9, item_title: '二手键盘' }]);

    const res = await supertest(app())
      .get('/api/marketplace/chat/threads/11/messages')
      .set('x-test-user-id', '88');

    expect(res.status).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns not found for a missing thread without querying messages', async () => {
    query.mockResolvedValueOnce([]);

    const res = await supertest(app())
      .get('/api/marketplace/chat/threads/999/messages')
      .set('x-test-user-id', '9');

    expect(res.status).toBe(404);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('allows the seller to mark an on-sale item sold', async () => {
    query.mockResolvedValueOnce([{ id: 5, seller_user_id: 7, status: 'on_sale' }]).mockResolvedValueOnce({ affectedRows: 1 });

    const res = await supertest(app())
      .post('/api/marketplace/items/5/status')
      .set('x-test-user-id', '7')
      .send({ status: 'sold' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sold');
  });

  it('rejects a buyer from changing item status', async () => {
    query.mockResolvedValueOnce([{ id: 5, seller_user_id: 7, status: 'on_sale' }]);

    const res = await supertest(app())
      .post('/api/marketplace/items/5/status')
      .set('x-test-user-id', '9')
      .send({ status: 'sold' });

    expect(res.status).toBe(403);
  });
});
