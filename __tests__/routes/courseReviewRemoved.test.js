const express = require('express');
const request = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1, role: 'admin' };
  next();
});
jest.mock('../../middleware/adminAuth', () => (_req, _res, next) => next());
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn().mockResolvedValue() }));

const app = express();
app.use(express.json());
app.use('/api/handbook', require('../../routes/handbook'));
app.use('/api/admin', require('../../routes/admin'));
app.use('/api/reports', require('../../routes/reports'));

describe('课程评价功能已下线', () => {
  test.each([
    ['get', '/api/handbook/course-reviews'],
    ['get', '/api/handbook/course-reviews/1'],
    ['post', '/api/handbook/course-reviews'],
    ['patch', '/api/handbook/course-reviews/1'],
    ['delete', '/api/handbook/course-reviews/1'],
    ['post', '/api/handbook/course-reviews/1/rate'],
    ['get', '/api/handbook/course-reviews/1/comments'],
    ['post', '/api/handbook/course-reviews/1/comments'],
    ['delete', '/api/handbook/course-reviews/1/comments/1'],
    ['get', '/api/handbook/me/course-reviews'],
  ])('%s %s 已移除', async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(404);
  });

  it('管理后台不再提供课程评价管理', async () => {
    expect((await request(app).get('/api/admin/contents/course-review')).status).toBe(400);
  });

  test.each(['course_review', 'course_review_comment'])('不再接受 %s 类型的新举报', async (type) => {
    const res = await request(app).post('/api/reports').send({ target_type: type, target_id: 1, reason: 'other' });
    expect(res.status).toBe(400);
  });
});
