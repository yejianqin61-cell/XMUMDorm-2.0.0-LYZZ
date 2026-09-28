const fs = require('fs');
const path = require('path');
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
// 注意：本文件故意不 mock checkSanction / sensitiveWordFilter —— 要验证的正是这两个守卫
// 在“共建写权限开放”之后仍然拦住封禁用户与违规文本。
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

const SENSITIVE_WORD = '违禁词';

describe('共建写接口的内容与账号守卫', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('被封禁的登录用户不能新增商铺', async () => {
    query.mockImplementation((sql) => {
      if (String(sql).includes('user_sanctions')) return Promise.resolve([{ type: 'ban', ends_at: null }]);
      return Promise.resolve([]);
    });

    const res = await supertest(app()).post('/api/canteen/shops').send({ name: '新档口', region_id: 6 });

    expect(res.status).toBe(403);
    expect(res.body.banned).toBe(true);
  });

  it('被禁言的登录用户不能编辑商铺', async () => {
    query.mockImplementation((sql) => {
      if (String(sql).includes('user_sanctions')) return Promise.resolve([{ type: 'mute', ends_at: null }]);
      return Promise.resolve([]);
    });

    const res = await supertest(app()).patch('/api/canteen/shops/3').send({ name: '改个名' });

    expect(res.status).toBe(403);
    expect(res.body.muted).toBe(true);
  });

  it('店铺名称命中敏感词时拒绝创建', async () => {
    const seen = [];
    query.mockImplementation((sql) => {
      const s = String(sql);
      seen.push(s);
      if (s.includes('user_sanctions')) return Promise.resolve([]);
      if (s.includes('sensitive_words')) return Promise.resolve([{ word: SENSITIVE_WORD }]);
      if (s.includes('FROM regions')) return Promise.resolve([{ id: 6 }]);
      if (s.includes('INSERT INTO shops')) return Promise.resolve({ insertId: 22 });
      if (s.includes('LAST_INSERT_ID')) return Promise.resolve([{ id: 22 }]);
      return Promise.resolve([]);
    });

    const res = await supertest(app())
      .post('/api/canteen/shops')
      .send({ name: `好吃${SENSITIVE_WORD}档口`, region_id: 6 });

    expect(res.status).toBe(400);
    expect(res.body.sensitive_word).toBe(SENSITIVE_WORD);
    // 命中敏感词时不得落库
    expect(seen.some((s) => s.includes('INSERT INTO shops'))).toBe(false);
  });

  it('菜品名称命中敏感词时拒绝创建', async () => {
    query.mockImplementation((sql) => {
      const s = String(sql);
      if (s.includes('user_sanctions')) return Promise.resolve([]);
      if (s.includes('sensitive_words')) return Promise.resolve([{ word: SENSITIVE_WORD }]);
      return Promise.resolve([]);
    });

    const res = await supertest(app())
      .post('/api/canteen/products')
      .send({ category_id: 1, name: `${SENSITIVE_WORD}面`, description: '' });

    expect(res.status).toBe(400);
    expect(res.body.sensitive_word).toBe(SENSITIVE_WORD);
  });

  it('干净内容仍可通过守卫继续走业务逻辑', async () => {
    const seen = [];
    query.mockImplementation((sql) => {
      const s = String(sql);
      seen.push(s);
      if (s.includes('user_sanctions')) return Promise.resolve([]);
      if (s.includes('sensitive_words')) return Promise.resolve([{ word: SENSITIVE_WORD }]);
      if (s.includes('FROM regions')) return Promise.resolve([{ id: 6 }]);
      if (s.includes('INSERT INTO shops')) return Promise.resolve({ insertId: 30 });
      if (s.includes('LAST_INSERT_ID')) return Promise.resolve([{ id: 30 }]);
      if (s.includes('FROM shops s JOIN regions r')) {
        return Promise.resolve([{ id: 30, user_id: 1, region_id: 6, name: '干净档口', region_code: 'D6', region_name: 'D6' }]);
      }
      return Promise.resolve([]);
    });

    const res = await supertest(app()).post('/api/canteen/shops').send({ name: '干净档口', region_id: 6 });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(30);
    expect(seen.some((s) => s.includes('INSERT INTO shops'))).toBe(true);
  });
});

describe('敏感词中间件的注册顺序', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'routes', 'canteen.js'), 'utf8');

  const chainOf = (marker) => {
    const start = source.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('async (req, res)', start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  it.each([
    ["router.post('/shops'"],
    ["router.patch('/shops/:shopId'"],
    ["router.post('/products'"],
    ["router.patch('/products/:productId'"],
  ])('%s 仍挂着封禁校验与敏感词过滤', (marker) => {
    const chain = chainOf(marker);
    expect(chain).toContain('checkSanction');
    expect(chain).toContain('sensitiveWordFilter');
  });

  /**
   * multer 只把 multipart 的文本字段写进 req.body，所以敏感词过滤必须排在
   * 上传中间件之后；否则图片上传路径上的店名/菜名会永远绕过过滤。
   */
  it('菜品写接口的敏感词过滤排在上传中间件之后', () => {
    ["router.post('/products'", "router.patch('/products/:productId'"].forEach((marker) => {
      const start = source.indexOf(marker);
      const filter = source.indexOf('sensitiveWordFilter', start);
      const upload = source.indexOf('productImagesUpload', start);
      expect(upload).toBeGreaterThan(-1);
      expect(filter).toBeGreaterThan(upload);
    });
  });
});
