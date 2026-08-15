const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 1, role: req.get('x-test-role') || 'admin' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({ checkSanction: (_req, _res, next) => next() }));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../middleware/upload', () => ({
  productImagesUpload: (_req, _res, next) => next(),
  commentImagesUpload: (_req, _res, next) => next(),
  shopLogoUpload: (_req, _res, next) => next(),
  bannerImageUpload: (_req, _res, next) => next(),
  postImagesUpload: (_req, _res, next) => next(),
}));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../services/rankingStats', () => ({ onPrimaryCommentChange: jest.fn() }));
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn() }));
jest.mock('../../services/objectStorage', () => ({
  uploadBuffer: jest.fn(),
  guessContentType: jest.fn(() => 'image/jpeg'),
}));
jest.mock('../../services/expService', () => ({
  grantExp: jest.fn(),
  revokeByRef: jest.fn(),
  checkAndGrantPostPopularRewards: jest.fn(),
}));
jest.mock('../../utils/expResponse', () => ({ attachExp: jest.fn((data) => data) }));
jest.mock('../../utils/expEligibility', () => ({
  isQualityReview: jest.fn(),
  isPostContentEligible: jest.fn(),
  isCommentEligible: jest.fn(),
}));
jest.mock('../../utils/simpleCache', () => ({
  simpleCache: {
    delete: jest.fn(),
    getOrSet: jest.fn((_key, _ttl, factory) => factory()),
  },
}));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `/uploads/${value}` : null)),
}));
jest.mock('../../services/squareHomeService', () => ({ getSquareHomeSummary: jest.fn() }));
jest.mock('../../services/squareRecommendationService', () => ({
  getSquarePersonalizedSummary: jest.fn(),
  getSquareRecommendations: jest.fn(),
}));

const { query } = require('../../database');
const canteenRoutes = require('../../routes/canteen');
const squareRoutes = require('../../routes/square');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/canteen', canteenRoutes);
  instance.use('/api/square', squareRoutes);
  return instance;
}

describe('Advertisement carousel target boundaries', () => {
  beforeEach(() => query.mockReset());

  it('rejects a normal post target for an advertisement canteen banner', async () => {
    query.mockResolvedValueOnce([]);

    const response = await supertest(app())
      .post('/api/canteen/banners')
      .send({
        type: 'ad',
        title: 'Campaign',
        image_url: '/uploads/campaign.jpg',
        link_type: 'post',
        link_target: '42',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('广告');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects an archived advertisement target for a square banner', async () => {
    query.mockResolvedValueOnce([{ post_id: 42, status: 'archived', deleted_at: null }]);

    const response = await supertest(app())
      .post('/api/square/banners')
      .send({
        type: 'ad',
        title: 'Campaign',
        image_url: '/uploads/campaign.jpg',
        link_type: 'post',
        link_target: '42',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('归档');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('allows an advertisement banner with no jump target', async () => {
    query
      .mockResolvedValueOnce({ insertId: 7 })
      .mockResolvedValueOnce([{ id: 7, type: 'ad', title: 'Awareness', image_url: '/uploads/ad.jpg', link_type: 'none', link_target: null }]);

    const response = await supertest(app())
      .post('/api/canteen/banners')
      .send({
        type: 'ad',
        title: 'Awareness',
        image_url: '/uploads/ad.jpg',
        link_type: 'none',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(7);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('keeps archived advertisement filtering in the public carousel query', async () => {
    query.mockResolvedValueOnce([{
      id: 7,
      type: 'ad',
      title: 'Active awareness',
      subtitle: '',
      image_url: '/uploads/ad.jpg',
      link_type: 'none',
      link_target: null,
    }]);

    const response = await supertest(app()).get('/api/square/banners');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    const [sql] = query.mock.calls[0];
    expect(sql).toContain("ap.status = 'active'");
    expect(sql).toContain("link_type = 'none'");
  });
});
