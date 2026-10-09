const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 9, role: 'student' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({
  checkSanction: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../middleware/upload', () => ({
  postImagesUpload: (_req, _res, next) => next(),
  savePostImages: jest.fn(),
}));

const { query } = require('../../database');
const postsRoutes = require('../../routes/posts');
const confessionRoutes = require('../../routes/confessions');
const marketplaceRoutes = require('../../routes/marketplace');
const errandsRoutes = require('../../routes/errands');

function app() {
  const value = express();
  value.use(express.json());
  value.use('/api/posts', postsRoutes);
  value.use('/api/confessions', confessionRoutes);
  value.use('/api/marketplace', marketplaceRoutes);
  value.use('/api/errands', errandsRoutes);
  return value;
}

describe('UGC publishing terms gate', () => {
  beforeEach(() => query.mockReset().mockResolvedValue([]));

  test.each([
    ['/api/posts', { title: '标题', content: '内容' }],
    ['/api/confessions', { content: '匿名内容' }],
    ['/api/marketplace/items', {
      title: '物品', description: '描述', category: 'books', price: '10',
      delivery_method: 'pickup', dorm_area: 'LY1',
    }],
    ['/api/errands', { title: '跑腿', contactInfo: '电话' }],
  ])('%s rejects a publish before any insert when current terms are missing', async (path, body) => {
    const res = await supertest(app()).post(path).send(body);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TERMS_NOT_ACCEPTED');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('user_terms_acceptances');
    expect(query.mock.calls.some(([sql]) => /\bINSERT\b/i.test(sql))).toBe(false);
  });
});
