const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 5, role: 'student' };
  next();
});
jest.mock('../../middleware/upload', () => ({
  avatarUpload: (_req, _res, next) => next(),
}));
jest.mock('../../services/objectStorage', () => ({
  uploadBuffer: jest.fn(),
  guessContentType: jest.fn(() => 'image/jpeg'),
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
  getUserLevelSummary: jest.fn(),
  formatAuthorLevel: jest.fn((user) => ({
    level: user.level ?? 1,
    badge: user.badge ?? null,
  })),
}));
jest.mock('../../constants/levelThresholds', () => ({
  getExpProgress: jest.fn(() => ({ currentLevel: 1, nextLevel: 2, progress: 50 })),
}));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `https://cdn.test/${value}` : null)),
}));

const { query } = require('../../database');
const { simpleCache } = require('../../utils/simpleCache');
const usersRoutes = require('../../routes/users');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/users', usersRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) {
      res.status(500).json({ status: -1, message: err.message || 'Internal error' });
    }
  });
  return a;
}

describe('Users Routes', () => {
  beforeEach(() => {
    query.mockReset();
    simpleCache.get.mockReset();
    simpleCache.set.mockReset();
    simpleCache.delete.mockReset();
    simpleCache.getOrSet.mockReset();
  });

  describe('GET /api/users/me', () => {
    it('returns the current user profile through cache loader', async () => {
      simpleCache.getOrSet.mockImplementationOnce(async (_key, _ttlMs, loader) => loader());
      query.mockResolvedValueOnce([
        {
          id: 5,
          student_id: 'S001',
          username: 'alice',
          email: 'alice@example.com',
          role: 'student',
          level: 3,
          exp: 120,
          badge: 'starter',
          avatar: 'avatars/a.jpg',
          nickname: 'Alice',
          weekly_comment_count: 4,
          created_at: '2026-06-01 10:00:00',
        },
      ]);

      const res = await supertest(app()).get('/api/users/me');

      expect(res.status).toBe(200);
      expect(simpleCache.getOrSet).toHaveBeenCalledWith(
        'users:me:v1:5',
        expect.any(Number),
        expect.any(Function)
      );
      expect(res.body.data).toMatchObject({
        id: 5,
        username: 'alice',
        nickname: 'Alice',
        avatar: 'https://cdn.test/avatars/a.jpg',
      });
      expect(res.body.data.levelProgress).toEqual({
        currentLevel: 1,
        nextLevel: 2,
        progress: 50,
      });
    });
  });

  describe('PATCH /api/users/me', () => {
    it('rejects reserved nicknames before hitting the database', async () => {
      const res = await supertest(app())
        .patch('/api/users/me')
        .send({ nickname: 'admin' });

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
      expect(simpleCache.delete).not.toHaveBeenCalled();
    });

    it('updates nickname and invalidates the me cache', async () => {
      query.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app())
        .patch('/api/users/me')
        .send({ nickname: 'New Name' });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith('UPDATE users SET nickname = ? WHERE id = ?', ['New Name', 5]);
      expect(simpleCache.delete).toHaveBeenCalledWith('users:me:v1:5');
      expect(res.body.data).toEqual({ nickname: 'New Name' });
    });
  });

  describe('GET /api/users/:id/profile', () => {
    it('returns cached profile payload without extra database calls', async () => {
      const cached = {
        user: { id: 12, nickname: 'Cached User' },
        posts: [],
        stats: { post_count: 0, comment_received_count: 0, like_received_count: 0 },
        page: 1,
        pageSize: 10,
        hasMore: false,
      };
      simpleCache.get.mockReturnValueOnce(cached);

      const res = await supertest(app()).get('/api/users/12/profile');

      expect(res.status).toBe(200);
      expect(query).not.toHaveBeenCalled();
      expect(res.body.data).toEqual(cached);
    });
  });
});
