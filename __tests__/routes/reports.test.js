/**
 * Integration tests for user report submission route
 */
const express = require('express');
const supertest = require('supertest');

// Mock database
jest.mock('../../database', () => ({
  query: jest.fn(),
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => {
  return (req, res, next) => {
    if (!req.user) {
      req.user = { id: 42, username: 'test_user', role: 'student' };
    }
    next();
  };
});

const { query } = require('../../database');
const reportRoutes = require('../../routes/reports');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportRoutes);
  return app;
}

describe('Report Submission Routes', () => {
  let app;

  beforeEach(() => {
    query.mockReset();
    app = createApp();
  });

  describe('POST /api/reports', () => {
    it('should submit a report for a post', async () => {
      // Mock: no existing report, no duplicates
      query.mockImplementation((sql, params) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) {
          return Promise.resolve([]); // no existing report
        }
        if (sql.includes('INSERT INTO reports')) {
          return Promise.resolve({ insertId: 1 });
        }
        if (sql.includes('COUNT(*) AS cnt FROM reports WHERE target')) {
          return Promise.resolve([{ cnt: 1 }]);
        }
        // findReportedUser: SELECT user_id FROM posts
        if (sql.includes('FROM posts WHERE id')) {
          return Promise.resolve([{ user_id: 99 }]);
        }
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'spam', detail: '广告内容' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(res.body.data.id).toBe(1);
    });

    it('should prevent duplicate reports', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) {
          return Promise.resolve([{ id: 5 }]); // existing report
        }
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'spam' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已举报');
    });

    it('should reject missing required parameters', async () => {
      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post' }); // missing target_id and reason

      expect(res.status).toBe(400);
    });

    it('should reject invalid reason', async () => {
      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'invalid_reason' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid target_type', async () => {
      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'invalid_type', target_id: 42, reason: 'spam' });

      expect(res.status).toBe(400);
    });

    it('should accept all valid reasons', async () => {
      const validReasons = ['spam', 'fraud', 'abuse', 'nsfw', 'trolling', 'privacy', 'illegal_trade', 'other'];

      for (const reason of validReasons) {
        query.mockReset();
        query.mockImplementation((sql) => {
          if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
          if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 99 });
          if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
          if (sql.includes('FROM posts WHERE id')) return Promise.resolve([{ user_id: 10 }]);
          return Promise.resolve([]);
        });

        const res = await supertest(app)
          .post('/api/reports')
          .send({ target_type: 'post', target_id: 42, reason });

        expect(res.status).toBe(200);
      }
    });

    it('should find reported user for marketplace items', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 2 });
        if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
        if (sql.includes('FROM marketplace_items WHERE id')) return Promise.resolve([{ user_id: 50 }]);
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'marketplace', target_id: 10, reason: 'fraud' });

      expect(res.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      query.mockRejectedValue(new Error('DB error'));

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'spam' });

      expect(res.status).toBe(500);
    });

    it('should trigger auto-hide when report count reaches threshold', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 3 });
        if (sql.includes('COUNT(*) AS cnt FROM reports WHERE target')) return Promise.resolve([{ cnt: 3 }]);
        if (sql.includes('FROM posts WHERE id')) return Promise.resolve([{ user_id: 99 }]);
        if (sql.includes('FROM system_configs')) {
          return Promise.resolve([
            { config_key: 'report_auto_hide_threshold', config_value: '3' },
            { config_key: 'report_auto_review_threshold', config_value: '10' },
            { config_key: 'report_auto_delist_threshold', config_value: '5' },
          ]);
        }
        if (sql.includes('UPDATE reports SET status')) return Promise.resolve({ affectedRows: 1 });
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'spam' });

      expect(res.status).toBe(200);
    });

    it('should handle findReportedUser gracefully for unknown target types', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 4 });
        if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'post', target_id: 42, reason: 'spam' });

      expect(res.status).toBe(200);
    });

    it('should submit report for errand with owner_user_id lookup', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 5 });
        if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
        if (sql.includes('FROM errands WHERE id')) return Promise.resolve([{ user_id: 77 }]);
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'errand', target_id: 10, reason: 'fraud' });

      expect(res.status).toBe(200);
    });

    it('should submit report for handbook_article with author_user_id lookup', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 6 });
        if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
        if (sql.includes('FROM handbook_articles WHERE id')) return Promise.resolve([{ user_id: 88 }]);
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'handbook_article', target_id: 5, reason: 'other' });

      expect(res.status).toBe(200);
    });

    it('should submit report for course_review with created_by lookup', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('id FROM reports WHERE reporter_id')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO reports')) return Promise.resolve({ insertId: 7 });
        if (sql.includes('COUNT(*) AS cnt')) return Promise.resolve([{ cnt: 1 }]);
        if (sql.includes('FROM course_reviews WHERE id')) return Promise.resolve([{ user_id: 66 }]);
        return Promise.resolve([]);
      });

      const res = await supertest(app)
        .post('/api/reports')
        .send({ target_type: 'course_review', target_id: 3, reason: 'other' });

      expect(res.status).toBe(200);
    });
  });
});
