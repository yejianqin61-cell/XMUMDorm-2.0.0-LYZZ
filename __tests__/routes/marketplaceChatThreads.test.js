/**
 * P2B-02 · 跨商品私信会话列表（买家 + 卖家两侧合并）—— 后端集成用例
 *
 * 依据：`docs/app/task/phase-2/P2B-02-后端跨商品会话列表接口.md`
 *      · 缺口 G1（原状：唯一的线程列表是 per-item 且仅卖家）
 *      · `migrations/029_marketplace_chat.sql:13-14` 的两个索引已就位 → **无迁移**
 *
 * 与 `__tests__/routes/*` 的既有写法一致：mock `database` + 手工挂路由 + supertest。
 */
const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  if (!req.user) req.user = { id: 7, role: 'student', username: 'me' };
  next();
});

const { query } = require('../../database');
const marketplaceRoutes = require('../../routes/marketplace');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/marketplace', marketplaceRoutes);
  a.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(500).json({ status: -1, message: err.message || 'Internal error' });
  });
  return a;
}

const thread = (over = {}) => ({
  id: 11,
  item_id: 5,
  seller_user_id: 7,
  buyer_user_id: 9,
  last_message_at: '2026-10-06 10:00:00',
  seller_last_read_at: null,
  buyer_last_read_at: null,
  item_title: '二手键盘',
  item_deleted_at: null,
  seller_username: 'me',
  seller_nickname: null,
  seller_avatar: null,
  buyer_username: 'buyer9',
  buyer_nickname: '买家九',
  // 真实库里存的是 object key（不是 `/uploads/...`）；`assetUrl()` 负责拼前缀
  buyer_avatar: 'avatars/u9.png',
  last_content: '还在吗',
  unread_count: 2,
  ...over,
});

const lastSql = () => query.mock.calls[query.mock.calls.length - 1][0];
const lastParams = () => query.mock.calls[query.mock.calls.length - 1][1];

describe('P2B-02 跨商品私信会话列表', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('1A · 我作为卖家：role=seller，对方是买家，含 item 标题与未读数', async () => {
    query.mockResolvedValueOnce([thread()]);

    const res = await supertest(app()).get('/api/marketplace/chat/threads');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    const row = res.body.data.list[0];
    expect(row.thread_id).toBe(11);
    expect(row.role).toBe('seller');
    expect(row.item).toEqual({ id: 5, title: '二手键盘', available: true });
    expect(row.peer.id).toBe(9);
    expect(row.peer.name).toBe('买家九');
    // ⛔ 不钉死前缀：`PUBLIC_ASSET_BASE_URL` 配了就是绝对地址，没配是 `/uploads/...`
    expect(String(row.peer.avatar)).toContain('u9.png');
    expect(row.unread_count).toBe(2);
    expect(row.last_content).toBe('还在吗');
  });

  it('2A · 我作为买家：同一条列表里也能看到（两侧合并）', async () => {
    query.mockResolvedValueOnce([
      thread({ id: 12, seller_user_id: 9, buyer_user_id: 7, buyer_nickname: null, buyer_username: 'me', seller_nickname: '卖家九', seller_username: 'seller9', item_title: '二手台灯', unread_count: 0 }),
    ]);

    const res = await supertest(app()).get('/api/marketplace/chat/threads');

    const row = res.body.data.list[0];
    expect(row.role).toBe('buyer');
    expect(row.item.title).toBe('二手台灯');
    expect(row.peer.id).toBe(9);
    expect(row.peer.name).toBe('卖家九');
    expect(row.peer.avatar).toBeNull();
    expect(row.unread_count).toBe(0);
  });

  it('3A · 商品已删除：item.available 为 false（前端据此提示，而不是隐藏会话）', async () => {
    query.mockResolvedValueOnce([thread({ item_deleted_at: '2026-10-01 00:00:00' })]);

    const res = await supertest(app()).get('/api/marketplace/chat/threads');

    expect(res.body.data.list[0].item.available).toBe(false);
  });

  it('4A · 只返回与我有关的线程：SQL 两侧都限我，参数里两次出现我的 id', async () => {
    query.mockResolvedValueOnce([]);

    await supertest(app()).get('/api/marketplace/chat/threads');

    expect(lastSql()).toMatch(/WHERE\s+t\.seller_user_id\s*=\s*\?\s*OR\s+t\.buyer_user_id\s*=\s*\?/);
    expect(lastParams()).toEqual([7, 7, 7, 7]);
  });

  it('5A · limit 夹紧在 1..100，非法值回落默认；⛔ 不 500', async () => {
    query.mockResolvedValue([]);

    await supertest(app()).get('/api/marketplace/chat/threads?limit=999');
    expect(lastSql()).toMatch(/LIMIT 100$/);

    await supertest(app()).get('/api/marketplace/chat/threads?limit=abc');
    expect(lastSql()).toMatch(/LIMIT 50$/);

    await supertest(app()).get('/api/marketplace/chat/threads?limit=3');
    expect(lastSql()).toMatch(/LIMIT 3$/);
  });

  it('6A · 数据库报错 → 500 且不泄露内部信息', async () => {
    query.mockRejectedValueOnce(new Error('ER_NO_SUCH_TABLE'));
    const warn = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await supertest(app()).get('/api/marketplace/chat/threads');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('ER_NO_SUCH_TABLE');
    warn.mockRestore();
  });
});
