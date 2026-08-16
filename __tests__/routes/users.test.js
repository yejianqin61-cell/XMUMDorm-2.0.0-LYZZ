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
        show_major: false,
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
    it.each(['7abc', '7.5', '-7', '0', '01', '9007199254740992'])('rejects malformed user id %s before querying', async (id) => {
      const res = await supertest(app()).get(`/api/users/${id}/profile`);

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });

    it('returns cached profile payload keyed by viewer id', async () => {
      const cached = {
        user: { id: 12, nickname: 'Cached User' },
        campus_identity: { college: 'FCSIT', grade: 'Year 2', major: null },
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
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(simpleCache.get).toHaveBeenCalledWith('user_profile_v6:12:viewer:12:p:1:s:10');
      expect(query).not.toHaveBeenCalled();
      expect(res.body.data).toEqual(cached);
    });

    it('keeps hidden campus fields hidden when the profile owner requests the public profile', async () => {
      simpleCache.get.mockReturnValueOnce(null);
      query
        .mockResolvedValueOnce([{
          id: 12,
          username: 'bob',
          avatar: null,
          nickname: 'Bob',
          level: 2,
          exp: 80,
          badge: null,
          college: 'Engineering',
          grade: 'Year 3',
          major: 'Robotics',
          show_college: 0,
          show_grade: 0,
          show_major: 0,
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ post_count: 0, comment_received_count: 0, like_received_count: 0 }]);

      const res = await supertest(app())
        .get('/api/users/12/profile')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.data.campus_identity).toEqual({
        college: null,
        grade: null,
        major: null,
        visibility: { show_college: false, show_grade: false, show_major: false },
      });
      expect(res.body.data.user.campus_identity).not.toHaveProperty('raw');
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
      expect(Object.keys(res.body.data.user).sort()).toEqual([
        'avatar',
        'badge',
        'campus_identity',
        'id',
        'level',
        'levelProgress',
        'nickname',
        'username',
      ]);
      expect(res.body.data.user).not.toHaveProperty('email');
      expect(res.body.data.user).not.toHaveProperty('student_id');
      expect(res.body.data.user).not.toHaveProperty('role');
      expect(res.body.data.user).not.toHaveProperty('weekly_comment_count');
      expect(res.body.data).not.toHaveProperty('active_directions');
      expect(res.body.data).not.toHaveProperty('recent_participation');
    });

    it('caps page size and derives hasMore and statistics from public posts only', async () => {
      simpleCache.get.mockReturnValueOnce(null);
      query
        .mockResolvedValueOnce([
          {
            id: 12,
            username: 'bob',
            avatar: null,
            nickname: 'Bob',
            level: 2,
            exp: 80,
            badge: null,
            college: null,
            grade: null,
            major: null,
            show_college: 1,
            show_grade: 1,
            show_major: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 101,
            content: 'Public post',
            type: 'treehole',
            created_at: '2026-06-01 10:00:00',
            like_count: 3,
            comment_count: 2,
            image_file_path: '/uploads/one.jpg',
            image_sort_order: 0,
          },
          {
            id: 101,
            content: 'Public post',
            type: 'treehole',
            created_at: '2026-06-01 10:00:00',
            like_count: 3,
            comment_count: 2,
            image_file_path: '/uploads/two.jpg',
            image_sort_order: 1,
          },
        ])
        .mockResolvedValueOnce([{ post_count: 31, comment_received_count: 2, like_received_count: 3 }]);

      const res = await supertest(app()).get('/api/users/12/profile?page=1&pageSize=999');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ page: 1, pageSize: 30, hasMore: true });
      expect(res.body.data.posts[0]).toMatchObject({ like_count: 3, comment_count: 2 });
      expect(res.body.data.posts).toHaveLength(1);
      expect(res.body.data.posts[0].images.map(({ url }) => url)).toEqual([
        'https://cdn.test//uploads/one.jpg',
        'https://cdn.test//uploads/two.jpg',
      ]);
      expect(query.mock.calls[1][0]).toContain('LIMIT 30 OFFSET 0');
      expect(query.mock.calls[1][0]).toContain('SELECT COUNT(*) FROM post_likes');
      expect(query.mock.calls[1][0]).toContain('SELECT COUNT(*) FROM comments');
      expect(query.mock.calls[1][0]).toContain('LEFT JOIN post_images');
      const statsSql = query.mock.calls[2][0];
      expect(statsSql).toContain('p.hidden_by_admin = 0');
      expect(statsSql).toContain('NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)');
      expect(query.mock.calls.some(([sql]) => String(sql).includes('GROUP BY post_id'))).toBe(false);
      expect(query).toHaveBeenCalledTimes(3);
    });
  });
});
