const express = require('express');
const supertest = require('supertest');

const mockUser = { id: 9, role: 'student' };
const mockConn = {
  beginTransaction: jest.fn(),
  execute: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../database', () => ({
  query: jest.fn(),
  pool: {
    getConnection: jest.fn(async () => mockConn),
  },
}));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { ...mockUser };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({
  checkSanction: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  createNotificationBatch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `https://cdn.test/${value}` : null)),
}));
jest.mock('../../services/objectStorage', () => ({
  uploadBuffer: jest.fn(),
  guessContentType: jest.fn(() => 'image/jpeg'),
  isObjectStorageConfigured: jest.fn(() => false),
}));

const { query, pool } = require('../../database');
const { createNotification } = require('../../services/notificationService');
const clubsRoutes = require('../../routes/clubs');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/clubs', clubsRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) {
      res.status(500).json({ status: -1, message: err.message || 'Internal error' });
    }
  });
  return a;
}

describe('Clubs activity registration routes', () => {
  beforeEach(() => {
    mockUser.id = 9;
    mockUser.role = 'student';
    query.mockReset();
    createNotification.mockClear();
    mockConn.beginTransaction.mockReset();
    mockConn.execute.mockReset();
    mockConn.commit.mockReset();
    mockConn.rollback.mockReset();
    mockConn.release.mockReset();
    pool.getConnection.mockClear();
  });

  describe('GET /api/clubs/activities/:id/registration-status', () => {
    it('returns registration counts and viewer state', async () => {
      query
        .mockResolvedValueOnce([{ id: 33, end_time: '2099-08-10 18:00:00' }])
        .mockResolvedValueOnce([{ activity_id: 33, c: 6 }])
        .mockResolvedValueOnce([{ activity_id: 33, status: 'registered' }]);

      const res = await supertest(app()).get('/api/clubs/activities/33/registration-status');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        activityId: 33,
        registered: true,
        count: 6,
        deadline: '2099-08-10 18:00:00',
      });
    });
  });

  describe('POST /api/clubs/activities/:id/register', () => {
    it('registers a viewer, commits the transaction, and sends a notification', async () => {
      mockConn.execute
        .mockResolvedValueOnce([
          [{
            id: 33,
            club_id: 8,
            title: 'Orientation Night',
            end_time: '2099-08-10 18:00:00',
            club_name: 'Tech Club',
            start_time: '2099-08-10 16:00:00',
            status: 'upcoming',
          }],
          [],
        ])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockResolvedValueOnce([[{ c: 7 }], []]);

      const res = await supertest(app()).post('/api/clubs/activities/33/register').send({});

      expect(res.status).toBe(200);
      expect(mockConn.beginTransaction).toHaveBeenCalled();
      expect(mockConn.commit).toHaveBeenCalled();
      expect(mockConn.rollback).not.toHaveBeenCalled();
      expect(res.body.data).toEqual({
        activityId: 33,
        registered: true,
        count: 7,
        deadline: '2099-08-10 18:00:00',
      });
      expect(createNotification).toHaveBeenCalledWith({
        userId: 9,
        type: 'activity_register_success',
        extra: {
          targetType: 'club_activity',
          targetId: 33,
          targetTitle: 'Orientation Night',
          targetPath: '/about/club/activity/33',
          clubId: 8,
          clubName: 'Tech Club',
        },
      });
    });

    it('rejects club admins from re-registering their own activity', async () => {
      mockConn.execute
        .mockResolvedValueOnce([
          [{
            id: 33,
            club_id: 8,
            title: 'Orientation Night',
            end_time: '2099-08-10 18:00:00',
            club_name: 'Tech Club',
            start_time: '2099-08-10 16:00:00',
            status: 'upcoming',
          }],
          [],
        ])
        .mockResolvedValueOnce([[{ role: 'admin' }], []]);

      const res = await supertest(app()).post('/api/clubs/activities/33/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('管理员');
      expect(mockConn.rollback).toHaveBeenCalled();
      expect(mockConn.commit).not.toHaveBeenCalled();
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/clubs/activities/:id/register', () => {
    it('cancels an existing registration and returns the updated count', async () => {
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 33, end_time: '2099-08-10 18:00:00' }], []])
        .mockResolvedValueOnce([[{ id: 91, status: 'registered' }], []])
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockResolvedValueOnce([[{ c: 4 }], []]);

      const res = await supertest(app()).delete('/api/clubs/activities/33/register');

      expect(res.status).toBe(200);
      expect(mockConn.commit).toHaveBeenCalled();
      expect(res.body.data).toEqual({
        activityId: 33,
        registered: false,
        count: 4,
        deadline: '2099-08-10 18:00:00',
      });
    });

    it('returns a validation error when the viewer is not currently registered', async () => {
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 33, end_time: '2099-08-10 18:00:00' }], []])
        .mockResolvedValueOnce([[], []]);

      const res = await supertest(app()).delete('/api/clubs/activities/33/register');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('无需取消');
      expect(mockConn.rollback).toHaveBeenCalled();
      expect(mockConn.commit).not.toHaveBeenCalled();
    });
  });
});
