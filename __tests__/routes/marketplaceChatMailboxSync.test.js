/**
 * 二手私信 × 信箱联动（任务管理表 #8）
 * - 读对话时，把自己这条对话的私信通知一并标已读
 * - 会话详情返回对方信息、商品卡片、对方已读时间
 */
const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../services/termsAcceptance', () => ({ requireCurrentTerms: (_req, _res, next) => next() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  const id = Number(req.headers['x-test-user-id'] || 9);
  req.user = { id, role: 'student' };
  next();
});

const { query } = require('../../database');
const marketplaceRoutes = require('../../routes/marketplace');

function app() {
  const value = express();
  value.use(express.json());
  value.use('/api/marketplace', marketplaceRoutes);
  return value;
}

const THREAD = { id: 11, seller_user_id: 7, buyer_user_id: 9 };

const detailRow = (overrides = {}) => ({
  id: 11,
  item_id: 5,
  seller_user_id: 7,
  buyer_user_id: 9,
  seller_last_read_at: '2026-11-16 10:05:00',
  buyer_last_read_at: '2026-11-16 10:01:00',
  item_title: '二手键盘',
  item_price: '45.50',
  item_status: 'reserved',
  item_deleted_at: null,
  item_cover_path: null,
  seller_username: 'seller7',
  seller_nickname: '卖家小七',
  seller_avatar: null,
  buyer_username: 'buyer9',
  buyer_nickname: null,
  buyer_avatar: null,
  ...overrides,
});

describe('POST /chat/threads/:id/read 联动信箱', () => {
  beforeEach(() => query.mockReset());

  it('买家读对话：更新已读边界后，只把自己这条对话的私信通知标已读', async () => {
    query
      .mockResolvedValueOnce([THREAD])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 3 });

    const res = await supertest(app()).post('/api/marketplace/chat/threads/11/read').set('x-test-user-id', '9');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ thread_id: 11, notifications_read: 3 });
    const [sql, params] = query.mock.calls[2];
    expect(sql).toContain('UPDATE notifications SET is_read = 1');
    expect(sql).toContain("type = 'marketplace_chat'");
    expect(sql).toContain("JSON_EXTRACT(extra, '$.targetId') = ?");
    expect(params).toEqual([9, 11]);
  });

  it('卖家读对话：通知按卖家自己的 user_id 更新', async () => {
    query
      .mockResolvedValueOnce([THREAD])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });

    const res = await supertest(app()).post('/api/marketplace/chat/threads/11/read').set('x-test-user-id', '7');

    expect(res.status).toBe(200);
    expect(query.mock.calls[1][0]).toContain('seller_last_read_at');
    expect(query.mock.calls[2][1]).toEqual([7, 11]);
  });

  it('通知更新失败不影响已读结果（尽力而为）', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    query
      .mockResolvedValueOnce([THREAD])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockRejectedValueOnce(Object.assign(new Error('Invalid JSON'), { code: 'ER_INVALID_JSON_TEXT' }));

    const res = await supertest(app()).post('/api/marketplace/chat/threads/11/read').set('x-test-user-id', '9');

    expect(res.status).toBe(200);
    expect(res.body.data.notifications_read).toBe(0);
    warn.mockRestore();
  });

  it('无关用户：403，且不碰通知表', async () => {
    query.mockResolvedValueOnce([THREAD]);
    const res = await supertest(app()).post('/api/marketplace/chat/threads/11/read').set('x-test-user-id', '88');
    expect(res.status).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('GET /chat/threads/:id/messages 返回对方和商品卡片', () => {
  beforeEach(() => query.mockReset());

  it('买家视角：peer 是卖家，peer_last_read_at 取卖家已读时间，商品带价格和状态', async () => {
    query.mockResolvedValueOnce([detailRow()]).mockResolvedValueOnce([]);

    const res = await supertest(app()).get('/api/marketplace/chat/threads/11/messages').set('x-test-user-id', '9');

    expect(res.status).toBe(200);
    const { thread } = res.body.data;
    expect(thread.role).toBe('buyer');
    expect(thread.peer).toEqual({ id: 7, name: '卖家小七', avatar: null });
    expect(thread.peer_last_read_at).toBe('2026-11-16 10:05:00');
    expect(thread.item).toEqual({ id: 5, title: '二手键盘', price: 45.5, status: 'reserved', cover: null, available: true });
    // 旧字段保留，App 端仍在用
    expect(thread.item_title).toBe('二手键盘');
    expect(thread.seller_user_id).toBe(7);
  });

  it('卖家视角：peer 是买家；没有昵称时用用户名', async () => {
    query.mockResolvedValueOnce([detailRow()]).mockResolvedValueOnce([]);

    const res = await supertest(app()).get('/api/marketplace/chat/threads/11/messages').set('x-test-user-id', '7');

    const { thread } = res.body.data;
    expect(thread.role).toBe('seller');
    expect(thread.peer.id).toBe(9);
    expect(thread.peer.name).toBe('buyer9');
    expect(thread.peer_last_read_at).toBe('2026-11-16 10:01:00');
  });

  it('商品已删除：item.available 为 false', async () => {
    query.mockResolvedValueOnce([detailRow({ item_deleted_at: '2026-11-15 00:00:00' })]).mockResolvedValueOnce([]);
    const res = await supertest(app()).get('/api/marketplace/chat/threads/11/messages').set('x-test-user-id', '9');
    expect(res.body.data.thread.item.available).toBe(false);
  });
});
