/**
 * 网站端商家入驻服务：申请校验、审核事务、暂停营业。
 * 数据库与事务连接使用假实现，重点验证业务规则与写入顺序。
 */
jest.mock('../../database', () => ({ pool: { getConnection: jest.fn() }, query: jest.fn() }));
jest.mock('../../services/shop', () => ({
  text: (value, max) => {
    if (typeof value !== 'string') throw Object.assign(new Error('必填字段'), { status: 400 });
    const clean = value.trim();
    if (!clean || clean.length > max) throw Object.assign(new Error('为空或过长'), { status: 400 });
    return clean;
  },
  fail: (message, status = 400) => { throw Object.assign(new Error(message), { status }); },
  transaction: jest.fn(),
}));

const s = require('../../services/shop');
const applications = require('../../services/shopMerchantApplications');

function connection(responses) {
  let index = 0;
  return {
    execute: jest.fn(async () => {
      const next = responses[index];
      index += 1;
      if (next instanceof Error) throw next;
      // mysql2 returns [rows, fields]; the service destructures the first item.
      return [next ?? [], []];
    }),
  };
}

const payload = {
  name_zh: '校园便利店',
  name_en: 'Campus Mart',
  business_scope: '零食、饮料和日用品',
  contact_name: '王同学',
  student_id: 'B230001',
  contact_phone: '+60 12-345 6789',
  contact_wechat: 'campusmart',
};

describe('shop merchant applications service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('submits an application for an active account', async () => {
    const conn = connection([[{ id: 7, status: 'active' }], [], { insertId: 21 }]);
    s.transaction.mockImplementation(async (work) => work(conn));

    await expect(applications.submit(7, payload)).resolves.toEqual({ id: 21, status: 'pending' });
    const insert = conn.execute.mock.calls[2];
    expect(insert[0]).toContain('INSERT INTO shop_merchant_applications');
    expect(insert[1]).toEqual([7, '校园便利店', 'Campus Mart', '零食、饮料和日用品', '王同学', 'B230001', '+60 12-345 6789', 'campusmart']);
  });

  test('rejects a second pending application from the same account', async () => {
    const conn = connection([[{ id: 7, status: 'active' }], [{ id: 20 }]]);
    s.transaction.mockImplementation(async (work) => work(conn));

    await expect(applications.submit(7, payload)).rejects.toMatchObject({ status: 409 });
  });

  test('rejects a malformed student ID before touching the database', async () => {
    await expect(applications.submit(7, { ...payload, student_id: '中文 12' })).rejects.toMatchObject({ status: 400 });
    expect(s.transaction).not.toHaveBeenCalled();
  });

  test('approval creates the store, settings, membership and marks the application approved', async () => {
    const application = { ...payload, id: 21, status: 'pending', applicant_user_id: 7 };
    const conn = connection([
      [{ ...application }],       // lock application
      [],                          // slug availability
      { insertId: 88 },            // shop_merchants
      [{ affectedRows: 1 }],       // shop_settings
      [{ affectedRows: 1 }],       // shop_merchant_members
      [{ affectedRows: 1 }],       // application update
    ]);
    s.transaction.mockImplementation(async (work) => work(conn));

    await expect(applications.approve(1, 21)).resolves.toEqual({ id: 21, status: 'approved', merchantId: 88, slug: 'campus-mart' });

    const storeInsert = conn.execute.mock.calls[2];
    expect(storeInsert[0]).toContain('INSERT INTO shop_merchants');
    expect(storeInsert[1]).toEqual(['campus-mart', '校园便利店', 'Campus Mart', '零食、饮料和日用品', 7]);
    expect(conn.execute.mock.calls[4][1]).toEqual([88, 7]);
  });

  test('approval refuses an application that was already reviewed', async () => {
    const conn = connection([[{ ...payload, id: 21, status: 'approved', applicant_user_id: 7 }]]);
    s.transaction.mockImplementation(async (work) => work(conn));

    await expect(applications.approve(1, 21)).rejects.toMatchObject({ status: 409 });
  });

  test('rejection requires a reason and records it', async () => {
    await expect(applications.reject(1, 21, '')).rejects.toMatchObject({ status: 400 });

    const conn = connection([[{ id: 21, status: 'pending' }], [{ affectedRows: 1 }]]);
    s.transaction.mockImplementation(async (work) => work(conn));
    await expect(applications.reject(1, 21, '缺少经营范围')).resolves.toEqual({ id: 21, status: 'rejected' });
    expect(conn.execute.mock.calls[1][1]).toEqual([1, '缺少经营范围', 21]);
  });

  test('only a store member can pause it', async () => {
    s.transaction.mockImplementation(async (work) => work(connection([[]])));
    await expect(applications.setPaused(7, 88, true)).rejects.toMatchObject({ status: 403 });

    const conn = connection([[{ id: 88, paused: 0 }], [{ affectedRows: 1 }]]);
    s.transaction.mockImplementation(async (work) => work(conn));
    await expect(applications.setPaused(7, 88, true)).resolves.toEqual({ id: 88, paused: true });
  });
});
