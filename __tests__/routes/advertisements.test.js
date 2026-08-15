const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 7, role: req.get('x-test-role') || 'student' };
  next();
});
jest.mock('../../middleware/adminAuth', () => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ status: -1, message: '需要管理员权限' });
});
jest.mock('../../middleware/upload', () => ({
  postImagesUpload: (_req, _res, next) => next(),
  savePostImages: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn() }));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `/uploads/${value}` : null)),
}));

const { query } = require('../../database');
const advertisementRoutes = require('../../routes/advertisements');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/advertisements', advertisementRoutes);
  return instance;
}

describe('Advertisement Routes', () => {
  beforeEach(() => query.mockReset());

  it('serves a public advertisement only while a valid placement exists', async () => {
    query
      .mockResolvedValueOnce([{
        post_id: 44,
        title: 'Launch',
        content: 'Body',
        ad_status: 'active',
        sponsor_name: 'Campus',
        sponsor_logo: null,
        cta_label: 'Open',
        cta_type: 'internal',
        cta_target: '/about',
      }])
      .mockResolvedValueOnce([{ post_id: 44, file_path: 'ad.jpg', sort_order: 0 }]);

    const response = await supertest(app()).get('/api/advertisements/public/44');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(44);
    expect(response.body.data.sponsor_name).toBe('Campus');
    expect(response.body.data.images).toHaveLength(1);
    expect(response.body.data).not.toHaveProperty('created_by');
  });

  it('returns a stable unavailable state after a placement expires or is withdrawn', async () => {
    query.mockResolvedValueOnce([]);

    const response = await supertest(app()).get('/api/advertisements/public/44');

    expect(response.status).toBe(410);
    expect(response.body.code).toBe('ADVERTISEMENT_UNAVAILABLE');
  });

  it('requires an administrator for the content library', async () => {
    const response = await supertest(app()).get('/api/advertisements/admin');
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects incomplete advertisement creation before touching the database', async () => {
    const response = await supertest(app())
      .post('/api/advertisements')
      .set('x-test-role', 'admin')
      .send({ title: 'Only title' });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('标题');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns a migration hint when the advertisement table is missing', async () => {
    query.mockRejectedValueOnce({
      code: 'ER_NO_SUCH_TABLE',
      sqlMessage: "Table 'jack_campus.advertisement_posts' doesn't exist",
    });
    const response = await supertest(app())
      .post('/api/advertisements')
      .set('x-test-role', 'admin')
      .send({
        title: 'Launch',
        content: 'Body',
        sponsor_name: 'Campus',
      });
    expect(response.status).toBe(503);
    expect(response.body.message).toContain('062_advertisement_posts.sql');
  });

  it('creates an advertisement without publishing a normal post notification', async () => {
    query
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce({ insertId: 44 })
      .mockResolvedValueOnce({ insertId: 1 });
    const response = await supertest(app())
      .post('/api/advertisements')
      .set('x-test-role', 'admin')
      .send({
        title: 'Launch',
        content: 'Body',
        sponsor_name: 'Campus',
        status: 'active',
        cta_type: 'none',
      });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id: 44 });
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('notifications'),
      expect.anything()
    );
  });
});
