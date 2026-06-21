const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../utils/simpleCache', () => ({
  simpleCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getOrSet: jest.fn(),
  },
}));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 7, role: 'student' };
  next();
});

const { query } = require('../../database');
const { simpleCache } = require('../../utils/simpleCache');
const notificationsRoutes = require('../../routes/notifications');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/notifications', notificationsRoutes);
  a.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return a;
}

describe('Notifications Routes', () => {
  beforeEach(() => {
    query.mockReset();
    simpleCache.get.mockReset();
    simpleCache.set.mockReset();
    simpleCache.delete.mockReset();
    simpleCache.getOrSet.mockReset();
  });

  describe('GET /api/notifications', () => {
    it('maps system announcements to announcement targets', async () => {
      query.mockResolvedValueOnce([
        {
          id: 1,
          type: 'system_announcement',
          is_read: 0,
          post_id: 42,
          comment_id: null,
          from_user_id: 9,
          extra: JSON.stringify({ content: 'Welcome' }),
          created_at: '2026-06-01 10:00:00',
          post_title: 'Campus News',
          from_username: 'admin',
          from_nickname: 'Admin',
          from_avatar: null,
        },
      ]);

      const res = await supertest(app()).get('/api/notifications');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.list[0].target).toEqual({
        type: 'announcement',
        id: 42,
        key: 'announcement:42',
        title: 'Campus News',
        path: '/post/42',
      });
    });
  });

  describe('GET /api/notifications/unread-announcements', () => {
    it('queries both legacy and system announcement types', async () => {
      simpleCache.getOrSet.mockImplementationOnce(async (_key, _ttlMs, loader) => loader());

      query.mockResolvedValueOnce([
        {
          id: 2,
          type: 'system_announcement',
          is_read: 0,
          post_id: 88,
          extra: JSON.stringify({ content: 'Semester starts' }),
          created_at: '2026-06-02 08:00:00',
          from_user_id: 1,
          from_username: 'admin',
          from_nickname: 'Admin',
          from_avatar: null,
        },
      ]);

      const res = await supertest(app()).get('/api/notifications/unread-announcements');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toContain("n.type IN ('announcement', 'system_announcement')");
      expect(res.body.data[0].target.type).toBe('announcement');
    });
  });

  describe('cache invalidation', () => {
    it('clears unread announcement cache after marking one notification as read', async () => {
      query
        .mockResolvedValueOnce([{ id: 12 }])
        .mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app()).patch('/api/notifications/12/read').send({});

      expect(res.status).toBe(200);
      expect(simpleCache.delete).toHaveBeenCalledWith('notifications:unreadAnn:v1:7');
    });

    it('clears unread announcement cache after batch mark-read', async () => {
      query.mockResolvedValueOnce({ affectedRows: 2 });

      const res = await supertest(app())
        .patch('/api/notifications/read-batch')
        .send({ ids: [3, 4] });

      expect(res.status).toBe(200);
      expect(simpleCache.delete).toHaveBeenCalledWith('notifications:unreadAnn:v1:7');
    });

    it('clears unread announcement cache after clear', async () => {
      query.mockResolvedValueOnce({ affectedRows: 5 });

      const res = await supertest(app()).delete('/api/notifications/clear');

      expect(res.status).toBe(200);
      expect(simpleCache.delete).toHaveBeenCalledWith('notifications:unreadAnn:v1:7');
    });
  });
});
