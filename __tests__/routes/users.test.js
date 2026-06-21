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
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ id: 12, role: 'student' })),
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
    it('returns the current user profile with campus identity fields', async () => {
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
          college: 'FCSIT',
          grade: 'Year 2',
          major: 'SE',
          show_college: 1,
          show_grade: 1,
          show_major: 0,
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
        college: 'FCSIT',
        grade: 'Year 2',
        major: 'SE',
        show_college: true,
        show_grade: true,
        show_major: true,
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

    it('updates extended profile fields and invalidates the me cache', async () => {
      query.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app())
        .patch('/api/users/me')
        .send({
          nickname: 'New Name',
          college: 'Business',
          grade: 'Year 1',
          major: 'Finance',
          show_college: false,
          show_grade: true,
          show_major: true,
        });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET nickname = ?, college = ?, grade = ?, major = ?, show_college = ?, show_grade = ?, show_major = ?'),
        ['New Name', 'Business', 'Year 1', 'Finance', 0, 1, 1, 5]
      );
      expect(simpleCache.delete).toHaveBeenCalledWith('users:me:v1:5');
      expect(res.body.data).toEqual({
        nickname: 'New Name',
        college: 'Business',
        grade: 'Year 1',
        major: 'Finance',
        show_college: false,
        show_grade: true,
        show_major: true,
      });
    });
  });

  describe('GET /api/users/:id/profile', () => {
    it('returns cached profile payload keyed by viewer id', async () => {
      const cached = {
        user: { id: 12, nickname: 'Cached User' },
        campus_identity: { college: 'FCSIT', grade: 'Year 2', major: null },
        active_directions: [],
        recent_participation: [],
        posts: [],
        stats: { post_count: 0, comment_received_count: 0, like_received_count: 0 },
        page: 1,
        pageSize: 10,
        hasMore: false,
      };
      simpleCache.get.mockReturnValueOnce(cached);

      const res = await supertest(app())
        .get('/api/users/12/profile')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(simpleCache.get).toHaveBeenCalledWith('user_profile_v3:12:viewer:12:p:1:s:10');
      expect(query).not.toHaveBeenCalled();
      expect(res.body.data).toEqual(cached);
    });

    it('hides private campus identity fields from public viewers', async () => {
      simpleCache.get.mockReturnValueOnce(null);
      query
        .mockResolvedValueOnce([
          {
            id: 12,
            username: 'bob',
            student_id: 'S002',
            email: 'bob@example.com',
            avatar: 'avatars/b.jpg',
            nickname: 'Bob',
            role: 'student',
            level: 2,
            exp: 80,
            badge: null,
            weekly_comment_count: 1,
            created_at: '2026-06-01 10:00:00',
            college: 'Engineering',
            grade: 'Year 3',
            major: 'Robotics',
            show_college: 1,
            show_grade: 0,
            show_major: 0,
          },
        ])
        .mockResolvedValueOnce([{ total: 2 }])
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 4 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { post_count: 0, comment_received_count: 0, like_received_count: 0 },
        ]);

      const res = await supertest(app()).get('/api/users/12/profile');

      expect(res.status).toBe(200);
      expect(res.body.data.campus_identity).toEqual({
        college: 'Engineering',
        grade: null,
        major: null,
        visibility: {
          show_college: true,
          show_grade: false,
          show_major: false,
        },
      });
      expect(res.body.data.active_directions[0]).toMatchObject({ key: 'favorite', value: 4 });
    });
  });
});
