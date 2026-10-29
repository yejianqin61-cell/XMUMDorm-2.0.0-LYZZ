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
  if (req.headers['x-test-unauthorized'] === '1') {
    return _res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: 7, role: req.headers['x-test-admin'] === '1' ? 'admin' : 'student' };
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
        // 阶段3-01 起 target 固定带评论定位（null 也带上，客户端不用猜）
        comment_id: null,
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
          post_hidden_by_admin: 0,
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

    it('marks an admin-hidden post unavailable to a normal user', async () => {
      query
        .mockResolvedValueOnce([{
          id: 32,
          type: 'treehole_comment',
          is_read: 0,
          post_id: 42,
          created_at: '2026-06-03 09:00:00',
          resolved_post_id: 42,
          post_deleted_at: null,
          post_hidden_by_admin: 1,
          post_title: 'Hidden post',
        }])
        .mockResolvedValueOnce([]);

      const res = await supertest(app()).get('/api/notifications?category=interaction');

      expect(res.status).toBe(200);
      expect(res.body.data.list[0].target).toEqual(expect.objectContaining({
        available: false,
        path: '#',
      }));
      expect(query.mock.calls[0][0]).toContain('p.hidden_by_admin AS post_hidden_by_admin');
    });

    it('keeps an admin-hidden post available to an administrator', async () => {
      query
        .mockResolvedValueOnce([{
          id: 33,
          type: 'treehole_comment',
          is_read: 0,
          post_id: 42,
          created_at: '2026-06-03 09:00:00',
          resolved_post_id: 42,
          post_deleted_at: null,
          post_hidden_by_admin: 1,
          post_title: 'Hidden post',
        }])
        .mockResolvedValueOnce([]);

      const res = await supertest(app())
        .get('/api/notifications?category=interaction')
        .set('x-test-admin', '1');

      expect(res.status).toBe(200);
      expect(res.body.data.list[0].target).toEqual(expect.objectContaining({
        available: true,
        path: '/post/42',
      }));
    });

    it('keeps equal-timestamp notifications stable across two pages', async () => {
      const sameTime = '2026-06-03 09:00:00';
      const rows = (from, to) => Array.from({ length: from - to + 1 }, (_, index) => ({
        id: from - index,
        type: 'treehole_like',
        is_read: 1,
        post_id: from - index,
        created_at: sameTime,
      }));
      query
        .mockResolvedValueOnce(rows(40, 20))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(rows(20, 1))
        .mockResolvedValueOnce([]);

      const first = await supertest(app()).get('/api/notifications?category=interaction&page=1&pageSize=20');
      const second = await supertest(app()).get('/api/notifications?category=interaction&page=2&pageSize=20');
      const ids = [...first.body.data.list, ...second.body.data.list].map((item) => item.id);

      expect(first.body.data.hasMore).toBe(true);
      expect(second.body.data.hasMore).toBe(false);
      expect(ids).toHaveLength(40);
      expect(new Set(ids)).toHaveProperty('size', 40);
      expect(query.mock.calls[0][0]).toContain('ORDER BY n.created_at DESC, n.id DESC');
      expect(query.mock.calls[2][0]).toContain('LIMIT 21 OFFSET 20');
    });

    it('returns 401 when authentication rejects the request', async () => {
      const res = await supertest(app())
        .get('/api/notifications')
        .set('x-test-unauthorized', '1');

      expect(res.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });

    it('returns 500 when the notification list query fails', async () => {
      query.mockRejectedValueOnce(new Error('database unavailable'));

      const res = await supertest(app()).get('/api/notifications');

      expect(res.status).toBe(500);
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
      expect(typeof res.body.error).toBe('string');
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
      expect(typeof res.body.error).toBe('string');
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

describe('通知来源摘要与匿名裁剪（阶段3-01/02）', () => {
  beforeEach(() => {
    query.mockReset();
    simpleCache.get.mockReset();
    simpleCache.set.mockReset();
    simpleCache.delete.mockReset();
    simpleCache.getOrSet.mockReset();
  });

  function row(overrides = {}) {
    return {
      id: 2,
      type: 'treehole_like',
      is_read: 0,
      post_id: 11,
      comment_id: null,
      from_user_id: 9,
      extra: null,
      created_at: '2026-06-02 10:00:00',
      resolved_post_id: 11,
      post_deleted_at: null,
      post_hidden_by_admin: null,
      post_title: 'Treehole post',
      post_content: '来源正文',
      from_username: 'author',
      from_nickname: 'Author',
      from_avatar: null,
      ...overrides,
    };
  }

  it('帖子正文 → source_excerpt，且长度有上限（140 + 省略号）', async () => {
    const long = '甲'.repeat(200);
    query
      .mockResolvedValueOnce([row({ post_content: long })])
      .mockResolvedValueOnce([{ type: 'treehole_like', cnt: 1 }]);

    const res = await supertest(app()).get('/api/notifications');
    const item = res.body.data.list[0];
    expect(item.source_excerpt).toHaveLength(141);
    expect(item.source_excerpt.endsWith('…')).toBe(true);
  });

  it('失效目标：available=false 时两段原文都清空（D2-03）', async () => {
    query
      .mockResolvedValueOnce([
        row({
          type: 'treehole_comment',
          comment_id: 50,
          post_deleted_at: '2026-06-03 00:00:00',
          post_content: '来源正文',
        }),
      ])
      .mockResolvedValueOnce([{ type: 'treehole_comment', cnt: 1 }])
      .mockResolvedValueOnce([{ id: 50, parent_id: 40, parent_content: '父评论' }]);

    const res = await supertest(app()).get('/api/notifications');
    const item = res.body.data.list[0];
    expect(item.target.available).toBe(false);
    expect(item.source_excerpt).toBeNull();
    expect(item.reply_to_excerpt).toBeNull();
  });

  it('匿名域不返回 from_user；公开域仍保留', async () => {
    query
      .mockResolvedValueOnce([
        row({ id: 2, type: 'treehole_like' }),
        row({ id: 3, type: 'club_like', post_id: null, from_user_id: 12, extra: JSON.stringify({ targetType: 'club', targetId: 5 }) }),
      ])
      .mockResolvedValueOnce([
        { type: 'treehole_like', cnt: 1 },
        { type: 'club_like', cnt: 1 },
      ]);

    const res = await supertest(app()).get('/api/notifications');
    const [anonymous, club] = res.body.data.list;
    expect(anonymous.from_user).toBeUndefined();
    expect(anonymous.from_user_id).toBeNull();
    expect(club.from_user).toEqual(expect.objectContaining({ id: 12, username: 'author' }));
  });

  it('评论通知：target.comment_id 定位；reply_to_excerpt 来自父评论（≠ extra.content）', async () => {
    query
      .mockResolvedValueOnce([
        row({
          id: 4,
          type: 'treehole_comment',
          comment_id: 60,
          extra: JSON.stringify({ content: '这是新评论本身' }),
        }),
      ])
      .mockResolvedValueOnce([{ type: 'treehole_comment', cnt: 1 }])
      .mockResolvedValueOnce([{ id: 60, parent_id: 55, parent_content: '这是被回复的原评论' }]);

    const res = await supertest(app()).get('/api/notifications');
    const item = res.body.data.list[0];
    expect(item.target.comment_id).toBe(60);
    expect(item.reply_to_excerpt).toBe('这是被回复的原评论');
    expect(item.reply_to_excerpt).not.toBe('这是新评论本身');
    expect(item.source_excerpt).toBe('来源正文');
  });

  it('未注册的非帖子域（二手）摘要为 null，但字段仍在', async () => {
    query
      .mockResolvedValueOnce([
        row({
          id: 5,
          type: 'marketplace_want',
          post_id: null,
          extra: JSON.stringify({ targetType: 'marketplace_item', targetId: 77, targetTitle: '旧教材' }),
        }),
      ])
      .mockResolvedValueOnce([{ type: 'marketplace_want', cnt: 1 }]);

    const res = await supertest(app()).get('/api/notifications');
    const item = res.body.data.list[0];
    expect(item.source_excerpt).toBeNull();
    expect(item.reply_to_excerpt).toBeNull();
    expect(item.target).toEqual(expect.objectContaining({ type: 'marketplace_item', id: 77, comment_id: null }));
  });
});
