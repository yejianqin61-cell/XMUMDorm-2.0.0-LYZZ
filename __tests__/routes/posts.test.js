const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 9, role: 'student' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({
  checkSanction: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../middleware/upload', () => ({
  postImagesUpload: (_req, _res, next) => next(),
  savePostImages: jest.fn(),
}));
jest.mock('../../services/auditLog', () => ({
  logAudit: jest.fn(),
}));
jest.mock('../../utils/simpleCache', () => ({
  simpleCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getOrSet: jest.fn(),
  },
}));
jest.mock('../../services/expService', () => ({
  grantExp: jest.fn().mockResolvedValue(null),
  revokeByRef: jest.fn().mockResolvedValue(null),
  checkAndGrantPostPopularRewards: jest.fn().mockResolvedValue(undefined),
  formatAuthorLevel: jest.fn(() => ({})),
}));
jest.mock('../../utils/expResponse', () => ({
  attachExp: jest.fn((payload) => payload),
}));
jest.mock('../../utils/expEligibility', () => ({
  isPostContentEligible: jest.fn(() => false),
  isCommentEligible: jest.fn(() => false),
}));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `https://cdn.test/${value}` : null)),
}));

const { query } = require('../../database');
const { revokeByRef, grantExp, checkAndGrantPostPopularRewards } = require('../../services/expService');
const postsRoutes = require('../../routes/posts');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/posts', postsRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) {
      res.status(500).json({ status: -1, message: err.message || 'Internal error' });
    }
  });
  return a;
}

describe('Posts Routes', () => {
  beforeEach(() => {
    query.mockReset();
    revokeByRef.mockClear();
    grantExp.mockClear();
    checkAndGrantPostPopularRewards.mockClear();
  });

  describe('POST /api/posts', () => {
    it('rejects announcement creation by non-admin users', async () => {
      const res = await supertest(app())
        .post('/api/posts')
        .send({ title: 'Notice', content: 'Campus update', type: 'announcement' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('仅管理员可发公告');
      expect(query).not.toHaveBeenCalled();
    });

    it('returns a migration hint when posts.title is missing', async () => {
      query.mockRejectedValueOnce({
        code: 'ER_BAD_FIELD_ERROR',
        sqlMessage: "Unknown column 'title' in 'field list'",
      });

      const res = await supertest(app())
        .post('/api/posts')
        .send({ title: 'Hello', content: 'Body', type: 'normal' });

      expect(res.status).toBe(503);
      expect(res.body.message).toContain('posts.title');
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('toggles off an existing like and revokes exp', async () => {
      query
        .mockResolvedValueOnce([{ id: 44, user_id: 11 }])
        .mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app()).post('/api/posts/44/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 44, liked: false });
      expect(query).toHaveBeenCalledWith('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [9, 44]);
      expect(revokeByRef).toHaveBeenCalledWith(9, {
        action: 'like',
        refType: 'treehole_post',
        refId: 44,
      });
      expect(grantExp).not.toHaveBeenCalled();
    });

    it('creates a like, grants exp, and notifies the author', async () => {
      query
        .mockResolvedValueOnce([{ id: 88, user_id: 12 }])
        .mockResolvedValueOnce({ affectedRows: 0 })
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({ insertId: 2 });

      const res = await supertest(app()).post('/api/posts/88/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 88, liked: true });
      expect(query).toHaveBeenCalledWith('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [9, 88]);
      expect(grantExp).toHaveBeenCalledWith(9, {
        action: 'like',
        refType: 'treehole_post',
        refId: 88,
      });
      expect(checkAndGrantPostPopularRewards).toHaveBeenCalledWith('treehole', 88, 12);
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [12, 'treehole_like', 88, 9]
      );
    });

    it('treats duplicate-like races as an idempotent liked response', async () => {
      query
        .mockResolvedValueOnce([{ id: 66, user_id: 12 }])
        .mockResolvedValueOnce({ affectedRows: 0 })
        .mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const res = await supertest(app()).post('/api/posts/66/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 66, liked: true });
      expect(grantExp).not.toHaveBeenCalled();
      expect(checkAndGrantPostPopularRewards).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalledWith(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [12, 'treehole_like', 66, 9]
      );
    });
  });
});
