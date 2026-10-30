/**
 * 网站端：管理员商家申请接口的权限与返回结构。
 */
const express = require('express');
const supertest = require('supertest');

let mockUser = { id: 1, role: 'admin' };
jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => { req.user = { ...mockUser }; next(); });
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/shopMerchantApplications', () => ({
  adminList: jest.fn(),
  adminDetail: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
}));

const { query } = require('../../database');
const applications = require('../../services/shopMerchantApplications');
const router = require('../../routes/shopMerchantApplications');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/admin/shop-applications', router);
  instance.use((err, _req, res, _next) => {
    if (!res.headersSent) res.status(500).json({ status: -1, message: err.message });
  });
  return instance;
}

describe('admin merchant application routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 1, role: 'admin' };
    query.mockResolvedValue([{ role: 'admin', status: 'active' }]);
  });

  test('rejects a non-admin account', async () => {
    mockUser = { id: 9, role: 'student' };
    query.mockResolvedValue([{ role: 'student', status: 'active' }]);

    const res = await supertest(app()).get('/api/admin/shop-applications');

    expect(res.status).toBe(403);
    expect(applications.adminList).not.toHaveBeenCalled();
  });

  test('lists applications with the requested status', async () => {
    applications.adminList.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });

    const res = await supertest(app()).get('/api/admin/shop-applications?status=pending');

    expect(res.status).toBe(200);
    expect(applications.adminList).toHaveBeenCalledWith({ status: 'pending', page: undefined, pageSize: undefined });
  });

  test('approves an application and writes an audit entry', async () => {
    applications.approve.mockResolvedValue({ id: 5, status: 'approved', merchantId: 9, slug: 'campus-mart' });

    const res = await supertest(app()).post('/api/admin/shop-applications/5/approve');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ merchantId: 9, slug: 'campus-mart' });
    const { logAudit } = require('../../services/auditLog');
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'SHOP_MERCHANT_APPROVE', targetId: 5 }));
  });

  test('rejects with a reason and forwards it to the service', async () => {
    applications.reject.mockResolvedValue({ id: 5, status: 'rejected' });

    const res = await supertest(app()).post('/api/admin/shop-applications/5/reject').send({ note: '缺少经营范围' });

    expect(res.status).toBe(200);
    expect(applications.reject).toHaveBeenCalledWith(1, 5, '缺少经营范围');
  });

  test('rejects an invalid application id before calling the service', async () => {
    const res = await supertest(app()).post('/api/admin/shop-applications/abc/approve');

    expect(res.status).toBe(400);
    expect(applications.approve).not.toHaveBeenCalled();
  });
});
