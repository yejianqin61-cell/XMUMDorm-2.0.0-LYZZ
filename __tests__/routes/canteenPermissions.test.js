const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  if (req.get('x-test-auth') === 'none') {
    return res.status(401).json({ status: -1, message: '需要登录' });
  }
  req.user = { id: 1, role: req.get('x-test-role') || 'student' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({ checkSanction: (_req, _res, next) => next() }));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../middleware/upload', () => ({
  productImagesUpload: (_req, _res, next) => next(),
  commentImagesUpload: (_req, _res, next) => next(),
  shopLogoUpload: (_req, _res, next) => next(),
  bannerImageUpload: (_req, _res, next) => next(),
  saveProductImages: jest.fn(),
  saveCommentImages: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/rankingStats', () => ({ onPrimaryCommentChange: jest.fn() }));
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn() }));
jest.mock('../../services/objectStorage', () => ({ uploadBuffer: jest.fn(), guessContentType: jest.fn() }));
jest.mock('../../services/expService', () => ({ grantExp: jest.fn() }));
jest.mock('../../utils/expResponse', () => ({ attachExp: jest.fn((data) => data) }));
jest.mock('../../utils/expEligibility', () => ({ isQualityReview: jest.fn() }));
jest.mock('../../utils/simpleCache', () => ({ simpleCache: { delete: jest.fn(), getOrSet: jest.fn() } }));

const { query } = require('../../database');
const canteenRoutes = require('../../routes/canteen');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/canteen', canteenRoutes);
  return instance;
}

describe('Canteen collaborative maintenance permissions', () => {
  beforeEach(() => query.mockReset());

  it('allows a student to create a second shop', async () => {
    query
      .mockResolvedValueOnce([{ id: 6 }])
      .mockResolvedValueOnce({ insertId: 22 })
      .mockResolvedValueOnce([{ id: 22 }])
      .mockResolvedValueOnce([{ id: 22, user_id: 1, region_id: 6, name: 'New stall', region_code: 'D6', region_name: 'D6' }]);

    const res = await supertest(app())
      .post('/api/canteen/shops')
      .send({ name: 'New stall', region_id: 6 });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(22);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('user_id = ? AND deleted_at'))).toBe(false);
  });

  it('allows a student to create a category in a shop they do not own', async () => {
    query
      .mockResolvedValueOnce([{ id: 8 }])
      .mockResolvedValueOnce({ insertId: 12 })
      .mockResolvedValueOnce([{ id: 12 }])
      .mockResolvedValueOnce([{ id: 12, shop_id: 8, name: 'Drinks', sort_order: 0 }]);

    const res = await supertest(app())
      .post('/api/canteen/shops/8/categories')
      .send({ name: 'Drinks' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Drinks');
  });

  it('allows a student to edit a product they do not own', async () => {
    query
      .mockResolvedValueOnce([{ id: 9, shop_id: 8 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 9, shop_id: 8, category_id: 2, name: 'Updated dish', description: null, price: 8, file_path: '/products/dish.jpg', sort_order: 0 }]);

    const res = await supertest(app())
      .patch('/api/canteen/products/9')
      .send({ name: 'Updated dish', description: '', price: 8 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated dish');
  });

  it('allows logged-in users to delete categories but not shops or products', async () => {
    query
      .mockResolvedValueOnce([{ id: 3 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    const categoryRes = await supertest(app()).delete('/api/canteen/categories/3');
    expect(categoryRes.status).toBe(200);

    const shopRes = await supertest(app()).delete('/api/canteen/shops/3');
    const productRes = await supertest(app()).delete('/api/canteen/products/3');
    expect(shopRes.status).toBe(403);
    expect(productRes.status).toBe(403);
  });

  it('allows only admins to soft-delete shops and products', async () => {
    query.mockResolvedValueOnce([{ id: 3 }]).mockResolvedValueOnce({ affectedRows: 1 });
    const shopRes = await supertest(app()).delete('/api/canteen/shops/3').set('x-test-role', 'admin');
    expect(shopRes.status).toBe(200);

    query.mockReset();
    query.mockResolvedValueOnce([{ id: 4 }]).mockResolvedValueOnce({ affectedRows: 1 });
    const productRes = await supertest(app()).delete('/api/canteen/products/4').set('x-test-role', 'admin');
    expect(productRes.status).toBe(200);
  });

  it('continues to require authentication for writes', async () => {
    const res = await supertest(app()).post('/api/canteen/shops').set('x-test-auth', 'none').send({ name: 'No auth', region_id: 1 });
    expect(res.status).toBe(401);
  });
});
