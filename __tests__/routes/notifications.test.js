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
      query
        .mockResolvedValueOnce([{
          id: 1,
          type: 'system_announcement',
          is_read: 0,
          post_id: 42,
          comment_id: null,
          from_user_id: 9,
          extra: JSON.stringify({ content: 'Welcome' }),
          created_at: '2026-06-01 10:00:00',
          resolved_post_id: 42,
          post_deleted_at: null,
          post_title: 'Campus News',
          from_username: 'admin',
          from_nickname: 'Admin',
          from_avatar: null,
        }])
        .mockResolvedValueOnce([{ type: 'system_announcement', cnt: 1 }]);

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
        available: true,
      });
      expect(res.body.data.unreadSummary.byCategory).toEqual({
        interaction: 0,
        transaction: 0,
        system: 1,
      });
    });

    it('supports category filtering and exposes the derived category', async () => {
      query
        .mockResolvedValueOnce([{
          id: 5,
          type: 'activity_register_success',
          is_read: 0,
          post_id: null,
          comment_id: null,
          from_user_id: null,
          extra: JSON.stringify({
            targetType: 'club_activity',
            targetId: 22,
            targetTitle: 'Open Day',
            targetPath: '/about/club/activity/22',
          }),
          created_at: '2026-06-03 09:00:00',
          post_title: null,
          from_username: null,
          from_nickname: null,
          from_avatar: null,
        }])
        .mockResolvedValueOnce([{ type: 'activity_register_success', cnt: 1 }]);

      const res = await supertest(app()).get('/api/notifications?category=transaction');

      expect(res.status).toBe(200);
      expect(query.mock.calls[0][0]).toContain('n.type IN');
      expect(query.mock.calls[0][1]).toContain('activity_register_success');
      expect(res.body.data.list[0].category).toBe('transaction');
      expect(res.body.data.list[0].target.path).toBe('/about/club/activity/22');
    });

    it('trims the lookahead row and uses stable ordering', async () => {
      const rows = Array.from({ length: 21 }, (_, index) => ({
        id: 100 - index,
        type: 'treehole_like',
        is_read: 0,
        post_id: index + 1,
        comment_id: null,
        from_user_id: index + 10,
        extra: null,
        created_at: '2026-06-03 09:00:00',
      }));
      query
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ type: 'treehole_like', cnt: 21 }]);

      const res = await supertest(app()).get('/api/notifications?category=interaction&page=1&pageSize=20');

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(20);
      expect(res.body.data.hasMore).toBe(true);
      expect(res.body.data.unreadSummary.byCategory.interaction).toBe(21);
      expect(query.mock.calls[0][0]).toContain('ORDER BY n.created_at DESC, n.id DESC');
      expect(query.mock.calls[0][0]).toContain('LIMIT 21 OFFSET 0');
    });

    it('filters a standard post interaction history for the current user', async () => {
      query
        .mockResolvedValueOnce([{
          id: 12,
          type: 'treehole_comment',
          is_read: 0,
          post_id: 42,
          comment_id: 8,
          from_user_id: 9,
          extra: JSON.stringify({ content: 'Reply' }),
          created_at: '2026-06-03 09:00:00',
          resolved_post_id: 42,
          post_deleted_at: null,
          post_title: 'Campus life',
        }])
        .mockResolvedValueOnce([]);

      const res = await supertest(app()).get('/api/notifications?category=interaction&post_id=42&page=2&pageSize=2');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.list[0].extra.content).toBe('Reply');
      expect(query.mock.calls[0][0]).toContain('n.user_id = ?');
      expect(query.mock.calls[0][0]).toContain('n.post_id = ?');
      expect(query.mock.calls[0][0]).toContain('LIMIT 3 OFFSET 2');
      expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining([
        7,
        42,
        'treehole_like',
        'treehole_comment',
      ]));
    });

    it('keeps equal numeric ids in different post domains separate', async () => {
      query
        .mockResolvedValueOnce([
          {
            id: 21,
            type: 'treehole_like',
            is_read: 0,
            post_id: 5,
            created_at: '2026-06-03 09:00:00',
            resolved_post_id: 5,
            post_deleted_at: null,
            post_title: 'Treehole post',
          },
          {
            id: 20,
            type: 'trending_like',
            is_read: 0,
            post_id: 5,
            created_at: '2026-06-03 08:00:00',
            resolved_post_id: 5,
            post_deleted_at: null,
            post_title: 'Wrong table title',
          },
          {
            id: 19,
            type: 'campus_comment',
            is_read: 0,
            post_id: 5,
            extra: JSON.stringify({ content: 'Noted' }),
            created_at: '2026-06-03 07:00:00',
            resolved_post_id: 5,
            post_deleted_at: null,
            post_title: 'Wrong table title',
          },
        ])
        .mockResolvedValueOnce([]);

      const res = await supertest(app()).get('/api/notifications?category=interaction');

      expect(res.status).toBe(200);
      expect(res.body.data.list.map((item) => item.target)).toEqual([
        expect.objectContaining({ key: 'post:5', path: '/post/5', title: 'Treehole post' }),
        expect.objectContaining({ key: 'trending_post:5', path: '/about/trending/post/5', title: null }),
        expect.objectContaining({ key: 'campus_post:5', path: '/about/campus/5', title: null }),
      ]);
      expect(res.body.data.list.map((item) => item.post_title)).toEqual([
        'Treehole post',
        null,
        null,
      ]);
    });

    it('marks an unavailable standard post target without a navigable path', async () => {
      query
        .mockResolvedValueOnce([{
          id: 31,
          type: 'treehole_like',
          is_read: 0,
          post_id: 404,
          created_at: '2026-06-03 09:00:00',
          resolved_post_id: null,
          post_deleted_at: null,
          post_title: null,
        }])
        .mockResolvedValueOnce([]);

      const res = await supertest(app()).get('/api/notifications?category=interaction');

      expect(res.status).toBe(200);
      expect(res.body.data.list[0].target).toEqual(expect.objectContaining({
        type: 'post',
        available: false,
        path: '#',
      }));
    });

    it.each([
      '/api/notifications?page=0',
      '/api/notifications?page=nope',
      '/api/notifications?pageSize=0',
      '/api/notifications?pageSize=nope',
      '/api/notifications?category=unknown',
      '/api/notifications?post_id=0',
      '/api/notifications?post_id=nope',
      '/api/notifications?post_id=1.5',
    ])('rejects invalid list parameters: %s', async (path) => {
      const res = await supertest(app()).get(path);

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/notifications/unread-summary', () => {
    it('returns unread counts grouped by category', async () => {
      query.mockResolvedValueOnce([
        { type: 'treehole_like', cnt: 2 },
        { type: 'activity_register_success', cnt: 1 },
        { type: 'system_announcement', cnt: 3 },
      ]);

      const res = await supertest(app()).get('/api/notifications/unread-summary');

      expect(res.status).toBe(200);
      expect(res.body.data.byCategory).toEqual({
        interaction: 2,
        transaction: 1,
        system: 3,
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
          resolved_post_id: 88,
          post_deleted_at: null,
        },
      ]);

      const res = await supertest(app()).get('/api/notifications/unread-announcements');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toContain("n.type IN ('announcement', 'system_announcement')");
      expect(query.mock.calls[0][0]).toContain('LEFT JOIN posts p ON n.post_id = p.id');
      expect(res.body.data[0].target).toEqual(expect.objectContaining({
        type: 'announcement',
        available: true,
        path: '/post/88',
      }));
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

    it('supports clearing by category', async () => {
      query.mockResolvedValueOnce({ affectedRows: 2 });

      const res = await supertest(app()).delete('/api/notifications/clear?category=transaction');

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications WHERE user_id = ? AND type IN'),
        expect.arrayContaining([7, 'activity_register_success'])
      );
    });

    it('preserves announcements when clearing the system category', async () => {
      query.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app()).delete('/api/notifications/clear?category=system');

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications WHERE user_id = ? AND type IN'),
        [7, 'system_ban']
      );
    });

    it('preserves announcements when clearing the system module', async () => {
      query.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app()).delete('/api/notifications/clear?module=system');

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications WHERE user_id = ? AND type IN'),
        [7, 'system_ban']
      );
    });
  });

  describe('PATCH /api/notifications/read-batch', () => {
    it('deduplicates ids and updates them once within the current user scope', async () => {
      query.mockResolvedValueOnce({ affectedRows: 2 });

      const res = await supertest(app())
        .patch('/api/notifications/read-batch')
        .send({ ids: [3, 3, 4] });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND id IN (?,?)'),
        [7, 3, 4]
      );
      expect(res.body.data).toEqual({ ids: [3, 4], updated: 2 });
      expect(simpleCache.delete).toHaveBeenCalledWith('notifications:unreadAnn:v1:7');
    });

    it.each([
      {},
      { ids: [] },
      { ids: '1,2' },
      { ids: [1, 0] },
      { ids: [1, -2] },
      { ids: [1, 2.5] },
      { ids: [1, '2'] },
      { ids: Array.from({ length: 101 }, (_, index) => index + 1) },
    ])('rejects an invalid batch: %j', async (body) => {
      const res = await supertest(app())
        .patch('/api/notifications/read-batch')
        .send(body);

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
      expect(simpleCache.delete).not.toHaveBeenCalled();
    });

    it('keeps the batch retryable when the database update fails', async () => {
      query.mockRejectedValueOnce(new Error('database unavailable'));

      const res = await supertest(app())
        .patch('/api/notifications/read-batch')
        .send({ ids: [3, 4] });

      expect(res.status).toBe(500);
      expect(simpleCache.delete).not.toHaveBeenCalled();
    });
  });
});
