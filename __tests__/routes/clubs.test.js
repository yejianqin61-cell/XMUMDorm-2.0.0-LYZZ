const express = require('express');
const supertest = require('supertest');
const ExcelJS = require('exceljs');

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

function binaryParser(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
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

  describe('GET /api/clubs/activities/:id/registrations/export', () => {
    it('creates an XLSX response in memory for a site administrator', async () => {
      mockUser.role = 'admin';
      query
        .mockResolvedValueOnce([{
          id: 33,
          club_id: 8,
          title: 'Orientation Night',
          start_time: '2099-08-10 16:00:00',
          end_time: '2099-08-10 18:00:00',
          location: 'Library',
          club_name: 'Tech Club',
        }])
        .mockResolvedValueOnce([{
          student_id: '0123456789',
          username: 'alice',
          nickname: '=Alice',
          email: 'alice@example.test',
          created_at: '2099-08-01 10:30:00',
        }]);

      const res = await supertest(app())
        .get('/api/clubs/activities/33/registrations/export')
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.body.subarray(0, 2).toString()).toBe('PK');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const worksheet = workbook.getWorksheet('报名成员');
      expect(worksheet.getCell('A4').value).toBe('序号');
      expect(worksheet.getCell('B5').value).toBe('0123456789');
      expect(worksheet.getCell('C5').value).toBe("'=Alice");
    });

    it('does not expose registration data to ordinary members', async () => {
      query
        .mockResolvedValueOnce([{ id: 33, club_id: 8, title: 'Orientation Night', club_name: 'Tech Club' }])
        .mockResolvedValueOnce([{ role: 'member' }]);

      const res = await supertest(app()).get('/api/clubs/activities/33/registrations/export');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('社团管理员');
      expect(query).toHaveBeenCalledTimes(2);
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

describe('Clubs discovery list contract', () => {
  beforeEach(() => {
    mockUser.id = 9;
    mockUser.role = 'student';
    query.mockReset();
  });

  it('filters by a whitelisted category and returns a stable page boundary', async () => {
    query.mockResolvedValueOnce([
      { id: 6, name: 'Music 1', category: 'music', description: '', avatar: null, followers: 4 },
      { id: 5, name: 'Music 2', category: 'music', description: '', avatar: null, followers: 3 },
      { id: 4, name: 'Music 3', category: 'music', description: '', avatar: null, followers: 2 },
      { id: 3, name: 'Music 4', category: 'music', description: '', avatar: null, followers: 1 },
      { id: 2, name: 'Music 5', category: 'music', description: '', avatar: null, followers: 0 },
      { id: 1, name: 'Music next page', category: 'music', description: '', avatar: null, followers: 0 },
    ]);

    const res = await supertest(app()).get('/api/clubs/list?category=music&page=1&pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 5, hasMore: true });
    expect(res.body.data.list).toHaveLength(5);
    expect(res.body.data.list[0]).toMatchObject({ id: 6, category: 'music', viewer: { following: false } });
    expect(query.mock.calls[0][0]).toContain('c.category = ?');
    expect(query.mock.calls[0][1]).toEqual(['music']);
  });

  it('rejects an unknown category before it reaches the database', async () => {
    const res = await supertest(app()).get('/api/clubs/list?category=not-a-category');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('分类');
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Clubs member removal', () => {
  beforeEach(() => {
    mockUser.id = 9;
    mockUser.role = 'student';
    query.mockReset();
  });

  it('lets a club administrator remove a non-admin member', async () => {
    query
      .mockResolvedValueOnce([{role: 'admin'}])
      .mockResolvedValueOnce([{user_id: 22, role: 'member'}])
      .mockResolvedValueOnce({affectedRows: 1});

    const res = await supertest(app()).delete('/api/clubs/8/members/22');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({userId: 22, removed: true});
    expect(query.mock.calls[2]).toEqual([
      'DELETE FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1', [8, 22],
    ]);
  });

  it('does not let a regular member remove anyone', async () => {
    query.mockResolvedValueOnce([]);

    const res = await supertest(app()).delete('/api/clubs/8/members/22');

    expect(res.status).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('keeps the last club administrator', async () => {
    query
      .mockResolvedValueOnce([{role: 'admin'}])
      .mockResolvedValueOnce([{user_id: 22, role: 'admin'}])
      .mockResolvedValueOnce([{c: 1}]);

    const res = await supertest(app()).delete('/api/clubs/8/members/22');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('最后');
    expect(query).toHaveBeenCalledTimes(3);
  });
});

describe('Clubs content list pagination', () => {
  beforeEach(() => {
    mockUser.id = 9;
    mockUser.role = 'student';
    query.mockReset();
  });

  it('does not expose the activity lookahead record and reports hasMore', async () => {
    query.mockResolvedValueOnce(Array.from({length: 6}, (_unused, index) => ({
      id: index + 1, title: `Activity ${index + 1}`, club_id: 8, club_name: 'Music',
      images: null, cover: null, start_time: null, end_time: null, created_at: '2099-01-01',
    })));

    const res = await supertest(app()).get('/api/clubs/activities?page=1&pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({page: 1, pageSize: 5, hasMore: true});
    expect(res.body.data.list).toHaveLength(5);
    expect(query.mock.calls[0][0]).toContain('LIMIT 6 OFFSET 0');
    expect(query.mock.calls.slice(1).flatMap((call) => call[1] || [])).not.toContain(6);
  });

  it('does not expose the post lookahead record and reports hasMore', async () => {
    query.mockResolvedValueOnce(Array.from({length: 6}, (_unused, index) => ({
      id: index + 1, title: `Post ${index + 1}`, content: 'content', club_id: 8, club_name: 'Music',
      images: null, created_at: '2099-01-01',
    })));

    const res = await supertest(app()).get('/api/clubs/posts?page=1&pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({page: 1, pageSize: 5, hasMore: true});
    expect(res.body.data.list).toHaveLength(5);
    expect(query.mock.calls[0][0]).toContain('LIMIT 6 OFFSET 0');
    expect(query.mock.calls.slice(1).flatMap((call) => call[1] || [])).not.toContain(6);
  });
});
