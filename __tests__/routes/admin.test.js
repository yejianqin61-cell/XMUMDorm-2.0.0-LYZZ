/**
 * Integration tests for admin routes
 */
const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  if (!req.user) req.user = { id: 1, role: 'admin', username: 'admin_test' };
  next();
});
jest.mock('../../middleware/adminAuth', () => (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ status: -1, message: '需要管理员权限' });
});
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn().mockResolvedValue() }));

const { query } = require('../../database');
const adminRoutes = require('../../routes/admin');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/admin', adminRoutes);
  a.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return a;
}

// Helper: query() returns [{c: N}] for COUNT or array of row objects for SELECT
const c = (n) => [{ c: n }];
const rows = (...objs) => objs;
const total = (n) => [{ total: n }];
const inserted = (id) => ({ insertId: id, affectedRows: 1 });
const affected = (n = 1) => ({ affectedRows: n });

describe('Admin Routes', () => {
  beforeEach(() => { query.mockReset(); });

  // ─── Dashboard ────────────────────────────────────────
  describe('GET /api/admin/dashboard', () => {
    it('returns dashboard stats', async () => {
      const reportRows = [
        { id: 1, reporter_id: 10, target_type: 'post', target_id: 42, reason: 'spam', status: 'pending', created_at: '2026-05-30', reporter_name: 'ua', reported_name: 'ub' },
        { id: 2, reporter_id: 11, target_type: 'comment', target_id: 7, reason: 'abuse', status: 'pending', created_at: '2026-05-29', reporter_name: 'uc', reported_name: 'ud' },
      ];
      query
        .mockResolvedValueOnce(c(1100))  // totalUsers
        .mockResolvedValueOnce(c(1000))  // studentCount
        .mockResolvedValueOnce(c(100))   // merchantCount
        .mockResolvedValueOnce(c(5))     // newUsersToday
        .mockResolvedValueOnce(c(80))    // activeUsersToday
        .mockResolvedValueOnce(c(2300))  // totalPosts (with filter)
        .mockResolvedValueOnce(c(12000)) // totalComments
        .mockResolvedValueOnce(c(8))     // pendingReports
        .mockResolvedValueOnce(c(3))     // bannedUsers
        .mockResolvedValueOnce(c(2000))  // treeholePosts
        .mockResolvedValueOnce(c(500))   // canteenReviews
        .mockResolvedValueOnce(c(300))   // trendingPosts
        .mockResolvedValueOnce(c(150))   // courseReviews
        .mockResolvedValueOnce(c(100))   // clubActivities
        .mockResolvedValueOnce(c(350))   // marketplaceItems
        .mockResolvedValueOnce(c(90))    // errandPosts
        .mockResolvedValueOnce(c(60))    // handbookArticles
        .mockResolvedValueOnce(reportRows); // recentReports

      const res = await supertest(app()).get('/api/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(res.body.data.totalUsers).toBe(1100);
      expect(res.body.data.pendingReports).toBe(8);
      expect(res.body.data.contentStats.treeholePosts).toBe(2000);
      expect(res.body.data.recentReports).toHaveLength(2);
    });

    it('handles database errors', async () => {
      query.mockRejectedValue(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/dashboard');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe(-1);
    });
  });

  // ─── User List ────────────────────────────────────────
  describe('GET /api/admin/users', () => {
    it('returns paginated users', async () => {
      const usersList = [
        { id: 1, username: 'u1', email: 'u1@xmu.edu.my', role: 'student', level: 2, exp: 150, status: 'active' },
        { id: 2, username: 'u2', email: 'u2@xmu.edu.my', role: 'merchant', level: 1, exp: 50, status: 'active' },
      ];
      query.mockResolvedValueOnce(total(50)).mockResolvedValueOnce(usersList);

      const res = await supertest(app()).get('/api/admin/users?page=1&pageSize=20');
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(2);
      expect(res.body.data.total).toBe(50);
    });

    it('filters by search and role', async () => {
      query.mockResolvedValueOnce(total(1)).mockResolvedValueOnce([{ id: 3, username: 'searchuser' }]);

      const res = await supertest(app()).get('/api/admin/users?search=s&role=student');
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('returns empty list', async () => {
      query.mockResolvedValueOnce(total(0)).mockResolvedValueOnce([]);
      const res = await supertest(app()).get('/api/admin/users');
      expect(res.body.data.list).toHaveLength(0);
    });
  });

  // ─── User Detail ──────────────────────────────────────
  describe('GET /api/admin/users/:id', () => {
    it('returns user detail with stats', async () => {
      query
        .mockResolvedValueOnce([{ id: 1, username: 'u1', email: 't@xmu.edu.my', role: 'student', level: 2, exp: 150, status: 'active' }])
        .mockResolvedValueOnce(c(25))
        .mockResolvedValueOnce(c(100))
        .mockResolvedValueOnce(c(2))
        .mockResolvedValueOnce([{ id: 1, type: 'ban', duration_days: 7, reason: 'test' }]);

      const res = await supertest(app()).get('/api/admin/users/1');
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('u1');
      expect(res.body.data.postCount).toBe(25);
      expect(res.body.data.commentCount).toBe(100);
      expect(res.body.data.reportCount).toBe(2);
      expect(res.body.data.sanctions).toHaveLength(1);
    });

    it('returns 400 for invalid ID', async () => {
      const res = await supertest(app()).get('/api/admin/users/abc');
      expect(res.status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
      query.mockResolvedValueOnce([]);
      const res = await supertest(app()).get('/api/admin/users/99999');
      expect(res.status).toBe(404);
    });
  });

  // ─── Ban / Unban / Mute / Unmute / Delete ─────────────
  describe('POST /api/admin/users/:id/ban', () => {
    it('bans a user', async () => {
      query.mockResolvedValueOnce([{ id: 5, username: 'bad', role: 'student', status: 'active' }])
        .mockResolvedValueOnce(inserted(1))
        .mockResolvedValueOnce(affected());

      const res = await supertest(app()).post('/api/admin/users/5/ban').send({ duration: 7, reason: 'spam' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
    });

    it('rejects banning admin', async () => {
      query.mockResolvedValueOnce([{ id: 99, role: 'admin' }]);
      const res = await supertest(app()).post('/api/admin/users/99/ban').send({ duration: 7 });
      expect(res.status).toBe(403);
    });

    it('returns 404 for missing user', async () => {
      query.mockResolvedValueOnce([]);
      const res = await supertest(app()).post('/api/admin/users/999/ban').send({ duration: 7 });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/users/:id/unban', () => {
    it('unbans a user', async () => {
      query.mockResolvedValue(affected());
      const res = await supertest(app()).post('/api/admin/users/5/unban');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin/users/:id/mute', () => {
    it('mutes a user', async () => {
      query.mockResolvedValueOnce([{ id: 5, username: 'noisy', role: 'student' }])
        .mockResolvedValueOnce(inserted(1))
        .mockResolvedValueOnce(affected());

      const res = await supertest(app()).post('/api/admin/users/5/mute').send({ duration: 3, reason: 'flood' });
      expect(res.status).toBe(200);
    });

    it('rejects muting admin', async () => {
      query.mockResolvedValueOnce([{ id: 99, role: 'admin' }]);
      const res = await supertest(app()).post('/api/admin/users/99/mute').send({ duration: 3 });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/users/:id/unmute', () => {
    it('unmutes a user', async () => {
      query.mockResolvedValue(affected());
      const res = await supertest(app()).post('/api/admin/users/5/unmute');
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('deactivates a user', async () => {
      query.mockResolvedValueOnce([{ id: 5, role: 'student' }]).mockResolvedValueOnce(affected());
      const res = await supertest(app()).delete('/api/admin/users/5');
      expect(res.status).toBe(200);
    });

    it('rejects deleting admin', async () => {
      query.mockResolvedValueOnce([{ id: 99, role: 'admin' }]);
      const res = await supertest(app()).delete('/api/admin/users/99');
      expect(res.status).toBe(403);
    });
  });

  // ─── Reports ──────────────────────────────────────────
  describe('GET /api/admin/reports', () => {
    it('returns paginated reports', async () => {
      query.mockResolvedValueOnce(total(15)).mockResolvedValueOnce([{ id: 1, reason: 'spam', status: 'pending', reporter_name: 'ua', reported_name: 'ub' }]);
      const res = await supertest(app()).get('/api/admin/reports');
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('filters by status', async () => {
      query.mockResolvedValueOnce(total(3)).mockResolvedValueOnce([]);
      await supertest(app()).get('/api/admin/reports?status=pending');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('r.status = ?'), ['pending']);
    });
  });

  describe('GET /api/admin/reports/:id', () => {
    it('returns report detail', async () => {
      query.mockResolvedValueOnce([{ id: 1, reporter_id: 10, target_type: 'post', target_id: 42, reason: 'spam', status: 'pending', reporter_name: 'ua', reported_name: 'ub' }]);
      const res = await supertest(app()).get('/api/admin/reports/1');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(res.body.data.id).toBe(1);
    });

    it('returns 400 for bad ID', async () => {
      const res = await supertest(app()).get('/api/admin/reports/abc');
      expect(res.status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      query.mockResolvedValueOnce([]);
      const res = await supertest(app()).get('/api/admin/reports/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/reports/:id/process', () => {
    it('processes report (dismiss)', async () => {
      query.mockResolvedValueOnce([{ id: 1, status: 'pending' }]).mockResolvedValueOnce(affected());
      const res = await supertest(app()).patch('/api/admin/reports/1/process').send({ action: 'dismiss', note: 'ok' });
      expect(res.status).toBe(200);
    });

    it('returns 400 for missing action', async () => {
      const res = await supertest(app()).patch('/api/admin/reports/1/process').send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Announcements ────────────────────────────────────
  describe('Announcement CRUD', () => {
    it('lists announcements', async () => {
      query.mockResolvedValueOnce(total(2)).mockResolvedValueOnce([{ id: 1, title: 'A1', created_at: '2026-05-01', author: 'admin' }]);
      const res = await supertest(app()).get('/api/admin/announcements');
      expect(res.status).toBe(200);
    });

    it('creates announcement', async () => {
      query.mockResolvedValueOnce(inserted(10)).mockResolvedValueOnce(affected(100));
      const res = await supertest(app()).post('/api/admin/announcements').send({ title: 'Test', content: 'Body' });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(10);
    });

    it('rejects empty announcement', async () => {
      const res = await supertest(app()).post('/api/admin/announcements').send({ title: '', content: '' });
      expect(res.status).toBe(400);
    });

    it('updates announcement', async () => {
      query.mockResolvedValueOnce(affected());
      const res = await supertest(app()).patch('/api/admin/announcements/1').send({ content: 'new' });
      expect(res.status).toBe(200);
    });

    it('deletes announcement', async () => {
      query.mockResolvedValueOnce(affected());
      const res = await supertest(app()).delete('/api/admin/announcements/1');
      expect(res.status).toBe(200);
    });
  });

  // ─── System Configs ───────────────────────────────────
  describe('System Configs', () => {
    it('gets all configs', async () => {
      query.mockResolvedValueOnce([
        { config_key: 'report_auto_hide_threshold', config_value: '3', description: 'Auto hide' },
        { config_key: 'report_auto_review_threshold', config_value: '10', description: 'Review' },
      ]);
      const res = await supertest(app()).get('/api/admin/configs');
      expect(res.status).toBe(200);
      expect(res.body.data.report_auto_hide_threshold.value).toBe('3');
    });

    it('updates a config', async () => {
      query.mockResolvedValueOnce(affected());
      const res = await supertest(app()).patch('/api/admin/configs/k1').send({ value: '5' });
      expect(res.status).toBe(200);
    });

    it('rejects update without value', async () => {
      const res = await supertest(app()).patch('/api/admin/configs/k1').send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Sensitive Words ──────────────────────────────────
  describe('Sensitive Words', () => {
    it('lists words', async () => {
      query.mockResolvedValueOnce(total(2)).mockResolvedValueOnce([{ id: 1, word: 'bad1', category: 'general', enabled: 1 }]);
      const res = await supertest(app()).get('/api/admin/sensitive-words');
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('adds a word', async () => {
      query.mockResolvedValueOnce(affected());
      const res = await supertest(app()).post('/api/admin/sensitive-words').send({ word: 'badword' });
      expect(res.status).toBe(200);
    });

    it('rejects empty word', async () => {
      const res = await supertest(app()).post('/api/admin/sensitive-words').send({ word: '  ' });
      expect(res.status).toBe(400);
    });

    it('batch imports', async () => {
      query.mockResolvedValue(affected());
      const res = await supertest(app()).post('/api/admin/sensitive-words/batch').send({ words: ['w1', 'w2', 'w3'] });
      expect(res.status).toBe(200);
      expect(res.body.data.added).toBe(3);
    });

    it('rejects empty batch', async () => {
      const res = await supertest(app()).post('/api/admin/sensitive-words/batch').send({ words: [] });
      expect(res.status).toBe(400);
    });

    it('deletes a word', async () => {
      query.mockResolvedValueOnce(affected());
      const res = await supertest(app()).delete('/api/admin/sensitive-words/1');
      expect(res.status).toBe(200);
    });

    it('toggles a word off', async () => {
      query.mockResolvedValueOnce([{ enabled: 1 }]).mockResolvedValueOnce(affected());
      const res = await supertest(app()).patch('/api/admin/sensitive-words/1/toggle');
      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(false);
    });

    it('returns 404 for toggle on missing word', async () => {
      query.mockResolvedValueOnce([]);
      const res = await supertest(app()).patch('/api/admin/sensitive-words/999/toggle');
      expect(res.status).toBe(404);
    });
  });

  // ─── Error Handling ───────────────────────────────────
  describe('Error handling', () => {
    it('handles user list error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/users');
      expect(res.status).toBe(500);
    });

    it('handles user detail error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/users/1');
      expect(res.status).toBe(500);
    });

    it('handles ban error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/users/1/ban').send({ duration: 7 });
      expect(res.status).toBe(500);
    });

    it('handles unban error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/users/1/unban');
      expect(res.status).toBe(500);
    });

    it('handles mute error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/users/1/mute').send({ duration: 3 });
      expect(res.status).toBe(500);
    });

    it('handles unmute error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/users/1/unmute');
      expect(res.status).toBe(500);
    });

    it('handles delete user error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).delete('/api/admin/users/1');
      expect(res.status).toBe(500);
    });

    it('handles reports list error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/reports');
      expect(res.status).toBe(500);
    });

    it('handles report detail error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/reports/1');
      expect(res.status).toBe(500);
    });

    it('handles report process error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).patch('/api/admin/reports/1/process').send({ action: 'dismiss' });
      expect(res.status).toBe(500);
    });

    it('handles announcements list error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/announcements');
      expect(res.status).toBe(500);
    });

    it('handles announcement create error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/announcements').send({ title: 'T', content: 'C' });
      expect(res.status).toBe(500);
    });

    it('handles announcement update error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).patch('/api/admin/announcements/1').send({ content: 'C' });
      expect(res.status).toBe(500);
    });

    it('handles announcement delete error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).delete('/api/admin/announcements/1');
      expect(res.status).toBe(500);
    });

    it('handles config get error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/configs');
      expect(res.status).toBe(500);
    });

    it('handles config update error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).patch('/api/admin/configs/k1').send({ value: '5' });
      expect(res.status).toBe(500);
    });

    it('handles sensitive words list error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/sensitive-words');
      expect(res.status).toBe(500);
    });

    it('handles sensitive word add error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/sensitive-words').send({ word: 'bad' });
      expect(res.status).toBe(500);
    });

    it('handles sensitive word batch import with DB errors per item', async () => {
      query.mockRejectedValue(new Error('DB down'));
      const res = await supertest(app()).post('/api/admin/sensitive-words/batch').send({ words: ['w1'] });
      // Batch errors are caught per-word; the outer request succeeds with 0 added
      expect(res.status).toBe(200);
      expect(res.body.data.added).toBe(0);
    });

    it('handles sensitive word delete error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).delete('/api/admin/sensitive-words/1');
      expect(res.status).toBe(500);
    });

    it('handles sensitive word toggle error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).patch('/api/admin/sensitive-words/1/toggle');
      expect(res.status).toBe(500);
    });

    it('handles audit logs error', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));
      const res = await supertest(app()).get('/api/admin/audit-logs');
      expect(res.status).toBe(500);
    });

    it('handles invalid page param gracefully', async () => {
      query.mockResolvedValueOnce(total(0)).mockResolvedValueOnce([]);
      const res = await supertest(app()).get('/api/admin/users?page=-1');
      expect(res.status).toBe(200);
    });
  });

  // ─── Audit Logs ───────────────────────────────────────
  describe('GET /api/admin/audit-logs', () => {
    it('returns paginated logs', async () => {
      query.mockResolvedValueOnce(total(100)).mockResolvedValueOnce([
        { id: 1, user_id: 1, role: 'admin', action: 'ADMIN_BAN_USER', target_type: 'user', target_id: 5, ip: '127.0.0.1', created_at: '2026-05-30', username: 'admin_test' },
      ]);
      const res = await supertest(app()).get('/api/admin/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('filters by userId and action', async () => {
      query.mockResolvedValueOnce(total(5)).mockResolvedValueOnce([]);
      await supertest(app()).get('/api/admin/audit-logs?userId=1&action=ADMIN_BAN_USER');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('a.user_id = ? AND a.action = ?'),
        ['1', 'ADMIN_BAN_USER']
      );
    });
  });
});
