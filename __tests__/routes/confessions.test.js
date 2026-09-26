/**
 * 万能墙（Confession Wall）路由集成测试 — M09
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §11
 *
 * 本文件的**头号目标**是守护匿名性不变量：
 * 任何对外响应都不得出现 user_id / username / nickname / avatar。
 * 见下方 assertNoIdentityLeak 与「匿名性（安全不变量）」describe 块。
 */
const express = require('express');
const supertest = require('supertest');
// 在 require 任何路由/中间件之前加载 .env，确保真实 auth 中间件读到同一个 JWT_SECRET
require('dotenv').config();
const jwt = require('jsonwebtoken');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, _res, next) => {
  // 默认已登录；测试可通过 setAuth(null) 模拟未登录
  req.user = req.__testUser === undefined ? { id: 9, role: 'student' } : req.__testUser;
  next();
});
jest.mock('../../middleware/checkSanction', () => ({
  checkSanction: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../services/auditLog', () => ({ logAudit: jest.fn() }));
// simpleCache 是模块级单例，真实实现会在测试间保留缓存值 → 必须 mock 掉，
// 否则 fetchTotal() 不会走 loader，查询调用序列整体错位。
jest.mock('../../utils/simpleCache', () => ({
  simpleCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    // getOrSet 直接执行 loader，保证每次都产生一次预期的 COUNT 查询
    getOrSet: jest.fn(async (_key, _ttl, loader) => loader()),
  },
}));

const { query } = require('../../database');
const { logAudit } = require('../../services/auditLog');
const confessionRoutes = require('../../routes/confessions');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/confessions', confessionRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) {
      res.status(500).json({ status: -1, message: err.message || 'Internal error' });
    }
  });
  return a;
}

const request = () => supertest(app());

/**
 * 用**真实的** authenticateToken 中间件构建 app，用于验证 401 / 403。
 * （顶部 mock 的 auth 永远放行，因此无法用来测鉴权失败路径。）
 *
 * 做法：不 isolateModules（那只会命中同一份 mock），而是在路由前显式挂上真实的
 * authenticateToken。路由内部那份被 mock 的 auth 会直接放行，因此最终生效的
 * 鉴权判定完全来自真实中间件。
 */
function realAuthApp() {
  const realAuth = jest.requireActual('../../middleware/auth');
  const a = express();
  a.use(express.json());
  a.use('/api/confessions', realAuth, confessionRoutes);
  return a;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/** 用真实密钥签一个有效 token */
function validToken(payload = { id: 9, role: 'student' }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ---------- 匿名性断言 ----------

const FORBIDDEN_KEYS = ['user_id', 'username', 'nickname', 'avatar', 'display_name_real', 'from_user_id'];

/** 递归搜索 JSON 中是否出现任何身份字段 */
function findIdentityLeak(node, path = '$') {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const hit = findIdentityLeak(node[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const key of Object.keys(node)) {
    if (FORBIDDEN_KEYS.includes(key)) return `${path}.${key}`;
    const hit = findIdentityLeak(node[key], `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}

function assertNoIdentityLeak(res) {
  const leak = findIdentityLeak(res.body);
  if (leak) {
    throw new Error(`匿名性被破坏：响应中出现了身份字段 ${leak}\n${JSON.stringify(res.body)}`);
  }
}

// ---------- 测试数据 ----------
// 注意：故意构造「数据库里存在身份字段」的原始行，
// 以证明路由是主动投影（而非依赖 SQL 不选这些列）来保证匿名。

const RAW_CONFESSION = {
  id: 101,
  user_id: 42,
  template_key: 'letter',
  content: '给图书馆三楼靠窗的同学：你的耳机掉了。',
  username: 'leaker_should_never_appear',
  nickname: '真实昵称',
  avatar: 'avatar_42.jpg',
  like_count: 3,
  comment_count: 2,
  created_at: '2026-02-14T10:00:00.000Z',
};

const RAW_COMMENT = {
  id: 501,
  parent_id: null,
  content: '我知道！是我掉的',
  user_id: 77,
  username: 'commenter_should_never_appear',
  nickname: '评论者昵称',
  avatar: 'avatar_77.jpg',
  created_at: '2026-02-14T11:00:00.000Z',
};

describe('Confession Wall Routes (M09)', () => {
  beforeEach(() => {
    query.mockReset();
    logAudit.mockClear();
  });

  // ==========================================================
  // GET /api/confessions/window
  // ==========================================================
  describe('GET /api/confessions/window', () => {
    /** 首屏（无 cursor）完整 mock：total → window → hydrate → like → comment → older? → newer? */
    function mockFirstWindow(ids, { total = 10, hasOlder = true, hasNewer = false } = {}) {
      query
        .mockResolvedValueOnce([{ total }])
        .mockResolvedValueOnce(ids.map((id) => ({ id })))
        // hydrate 必须为每个 id 都返回一行，否则会被当作已删除而过滤掉
        .mockResolvedValueOnce(ids.map((id) => ({ id, template_key: 'letter', content: `c${id}`, created_at: '2026-02-14T10:00:00.000Z' })))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(hasOlder ? [{ 1: 1 }] : [])
        .mockResolvedValueOnce(hasNewer ? [{ 1: 1 }] : []);
    }

    it('返回 200 + 正确的窗口数据结构', async () => {
      mockFirstWindow([103, 102, 101], { total: 7, hasOlder: true, hasNewer: false });

      const res = await request().get('/api/confessions/window?limit=3');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.map((i) => i.id)).toEqual([103, 102, 101]);
      expect(res.body.data.total).toBe(7);
      expect(res.body.data.has_older).toBe(true);
      expect(res.body.data.has_newer).toBe(false);
      expect(res.body.data.oldest_cursor).toBe(101);
      expect(res.body.data.newest_cursor).toBe(103);
    });

    it('无内容时返回空数组与 total 0', async () => {
      query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/window');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.has_older).toBe(false);
      expect(res.body.data.oldest_cursor).toBeNull();
    });

    it('limit 超上限被钳制为 10', async () => {
      query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await request().get('/api/confessions/window?limit=999');

      const windowSql = query.mock.calls[1][0];
      expect(windowSql).toContain('LIMIT 10');
    });

    it('limit 非法值回落为默认 5', async () => {
      query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await request().get('/api/confessions/window?limit=abc');

      expect(query.mock.calls[1][0]).toContain('LIMIT 5');
    });

    it('direction=older 使用 id < cursor 且按 DESC 排序', async () => {
      query
        .mockResolvedValueOnce([{ total: 5 }])
        .mockResolvedValueOnce([]);

      await request().get('/api/confessions/window?cursor=100&direction=older&limit=3');

      const sql = query.mock.calls[1][0];
      expect(sql).toContain('id < ?');
      expect(sql).toContain('ORDER BY id DESC');
      expect(query.mock.calls[1][1]).toEqual([100]);
    });

    it('direction=newer 使用 id > cursor，并在应用层反转回「新→旧」', async () => {
      query
        .mockResolvedValueOnce([{ total: 5 }])
        // DB 按 ASC 返回 [104,105]（更近的在后），路由应反转为 [105,104]
        .mockResolvedValueOnce([{ id: 104 }, { id: 105 }])
        .mockResolvedValueOnce([
          { id: 105, template_key: 'letter', content: 'c105', created_at: 'x' },
          { id: 104, template_key: 'letter', content: 'c104', created_at: 'x' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/window?cursor=103&direction=newer&limit=2');

      const sql = query.mock.calls[1][0];
      expect(sql).toContain('id > ?');
      expect(sql).toContain('ORDER BY id ASC');
      expect(res.body.data.items.map((i) => i.id)).toEqual([105, 104]);
    });

    it('锚点游标指向已删除的帖时不报错，正常返回相邻内容', async () => {
      query
        .mockResolvedValueOnce([{ total: 3 }])
        .mockResolvedValueOnce([{ id: 99 }, { id: 98 }])
        .mockResolvedValueOnce([
          { id: 99, template_key: 'note', content: 'c99', created_at: 'x' },
          { id: 98, template_key: 'note', content: 'c98', created_at: 'x' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/window?cursor=100&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.items.map((i) => i.id)).toEqual([99, 98]);
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().get('/api/confessions/window');

      expect(res.status).toBe(500);
      expect(res.body.status).toBe(-1);
    });
  });

  // ==========================================================
  // GET /api/confessions/meta
  // ==========================================================
  describe('GET /api/confessions/meta', () => {
    it('返回总篇数', async () => {
      query.mockResolvedValueOnce([{ total: 42 }]);

      const res = await request().get('/api/confessions/meta');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(42);
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().get('/api/confessions/meta');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // POST /api/confessions
  // ==========================================================
  describe('POST /api/confessions', () => {
    function mockCreateSuccess() {
      query
        .mockResolvedValueOnce({ insertId: 101 }) // INSERT
        .mockResolvedValueOnce([RAW_CONFESSION]) // SELECT 单篇
        .mockResolvedValueOnce([]) // liked
        .mockResolvedValueOnce([{ id: 101 }]); // authored
    }

    it('正常投稿返回 200 + 完整帖子对象', async () => {
      mockCreateSuccess();

      const res = await request()
        .post('/api/confessions')
        .send({ content: '给图书馆三楼靠窗的同学', template_key: 'letter' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(0);
      expect(res.body.data.id).toBe(101);
      expect(res.body.data.template_key).toBe('letter');
      expect(res.body.data.author.display_name).toBe('匿名');
      expect(res.body.data.viewer_is_author).toBe(true);
    });

    it('未提供令牌返回 401', async () => {
      const res = await supertest(realAuthApp())
        .post('/api/confessions')
        .send({ content: 'hello', template_key: 'letter' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('未提供身份验证令牌');
      expect(query).not.toHaveBeenCalled();
    });

    it('令牌无效返回 403', async () => {
      const res = await supertest(realAuthApp())
        .post('/api/confessions')
        .set('Authorization', 'Bearer not-a-real-token')
        .send({ content: 'hello', template_key: 'letter' });

      expect(res.status).toBe(403);
      expect(query).not.toHaveBeenCalled();
    });

    it('有效令牌可正常投稿（真实 auth 中间件）', async () => {
      query
        .mockResolvedValueOnce({ insertId: 101 })
        .mockResolvedValueOnce([RAW_CONFESSION])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 101 }]);

      const res = await supertest(realAuthApp())
        .post('/api/confessions')
        .set('Authorization', `Bearer ${validToken({ id: 9, role: 'student' })}`)
        .send({ content: 'hello', template_key: 'letter' });

      expect(res.status).toBe(200);
      expect(query.mock.calls[0][1][0]).toBe(9);
    });

    it('正文为空返回 400', async () => {
      const res = await request().post('/api/confessions').send({ content: '   ', template_key: 'letter' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('正文不能为空');
      expect(query).not.toHaveBeenCalled();
    });

    it('正文缺失返回 400', async () => {
      const res = await request().post('/api/confessions').send({ template_key: 'letter' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('正文不能为空');
    });

    it('非法版式返回 400', async () => {
      const res = await request()
        .post('/api/confessions')
        .send({ content: 'hello', template_key: 'not-a-template' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('无效的版式');
      expect(query).not.toHaveBeenCalled();
    });

    it('缺省版式回落到 bigtype', async () => {
      mockCreateSuccess();

      const res = await request().post('/api/confessions').send({ content: '只有正文' });

      expect(res.status).toBe(200);
      expect(query.mock.calls[0][1]).toEqual([9, 'bigtype', '只有正文']);
    });

    it('大字卡超过 60 字返回 400', async () => {
      const res = await request()
        .post('/api/confessions')
        .send({ content: 'x'.repeat(61), template_key: 'bigtype' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('60');
      expect(query).not.toHaveBeenCalled();
    });

    it('大字卡恰好 60 字通过', async () => {
      mockCreateSuccess();

      const res = await request()
        .post('/api/confessions')
        .send({ content: 'x'.repeat(60), template_key: 'bigtype' });

      expect(res.status).toBe(200);
    });

    it('便签卡超过 300 字返回 400', async () => {
      const res = await request()
        .post('/api/confessions')
        .send({ content: 'x'.repeat(301), template_key: 'note' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('300');
    });

    it('信笺卡 1000 字通过、1001 字拒绝', async () => {
      mockCreateSuccess();
      const ok = await request()
        .post('/api/confessions')
        .send({ content: 'x'.repeat(1000), template_key: 'letter' });
      expect(ok.status).toBe(200);

      const bad = await request()
        .post('/api/confessions')
        .send({ content: 'x'.repeat(1001), template_key: 'letter' });
      expect(bad.status).toBe(400);
    });

    it('正文含 <script> 被清洗为纯文本入库', async () => {
      mockCreateSuccess();

      await request()
        .post('/api/confessions')
        .send({ content: '<script>alert(1)</script>正常内容', template_key: 'letter' });

      const insertParams = query.mock.calls[0][1];
      expect(insertParams[2]).toBe('正常内容');
      expect(insertParams[2]).not.toContain('<script>');
    });

    it('正文含 img onerror 被清洗，仅保留文字', async () => {
      mockCreateSuccess();

      await request()
        .post('/api/confessions')
        .send({ content: '<img src=x onerror=alert(1)>你好', template_key: 'letter' });

      const insertParams = query.mock.calls[0][1];
      expect(insertParams[2]).not.toContain('onerror');
      expect(insertParams[2]).toContain('你好');
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request()
        .post('/api/confessions')
        .send({ content: 'hello', template_key: 'letter' });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // GET /api/confessions/:id
  // ==========================================================
  describe('GET /api/confessions/:id', () => {
    it('返回单篇详情', async () => {
      query
        .mockResolvedValueOnce([RAW_CONFESSION])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/101');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(101);
      expect(res.body.data.like_count).toBe(3);
    });

    it('非法 id 返回 400', async () => {
      const res = await request().get('/api/confessions/abc');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('帖子 ID 无效');
    });

    it('帖子不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/999');

      expect(res.status).toBe(404);
    });

    it('已删除/隐藏的帖子同样按 404 响应，不泄露存在性', async () => {
      // SQL 已带 deleted_at IS NULL AND hidden_by_admin = 0，因此返回空集
      query.mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/101');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('帖子不存在或已删除');
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().get('/api/confessions/101');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // DELETE /api/confessions/:id
  // ==========================================================
  describe('DELETE /api/confessions/:id', () => {
    it('作者本人删除成功并记录审计日志', async () => {
      query
        .mockResolvedValueOnce([{ id: 101, user_id: 9 }]) // 归属查询（user_id = 9 即当前用户）
        .mockResolvedValueOnce({ affectedRows: 1 });

      const res = await request().delete('/api/confessions/101');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('删除成功');
      expect(logAudit).toHaveBeenCalledTimes(1);
      expect(logAudit.mock.calls[0][0].action).toBe('CONFESSION_DELETE');
    });

    it('非作者且非管理员返回 403', async () => {
      query.mockResolvedValueOnce([{ id: 101, user_id: 42 }]); // 作者是 42，当前用户是 9

      const res = await request().delete('/api/confessions/101');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('只能删除自己的帖子');
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('帖子不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().delete('/api/confessions/999');

      expect(res.status).toBe(404);
    });

    it('非法 id 返回 400', async () => {
      const res = await request().delete('/api/confessions/abc');

      expect(res.status).toBe(400);
    });

    it('未提供令牌返回 401', async () => {
      const res = await supertest(realAuthApp()).delete('/api/confessions/101');

      expect(res.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().delete('/api/confessions/101');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // POST /api/confessions/:id/like
  // ==========================================================
  describe('POST /api/confessions/:id/like', () => {
    it('首次点赞返回 liked=true 与最新计数', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }]) // 帖子存在
        .mockResolvedValueOnce([]) // 尚未点赞
        .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT
        .mockResolvedValueOnce([{ cnt: 4 }]); // COUNT

      const res = await request().post('/api/confessions/101/like');

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(true);
      expect(res.body.data.like_count).toBe(4);
    });

    it('再次点赞为取消，返回 liked=false', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce([{ user_id: 9 }]) // 已点赞
        .mockResolvedValueOnce({ affectedRows: 1 }) // DELETE
        .mockResolvedValueOnce([{ cnt: 2 }]);

      const res = await request().post('/api/confessions/101/like');

      expect(res.status).toBe(200);
      expect(res.body.data.liked).toBe(false);
      expect(res.body.data.like_count).toBe(2);
    });

    it('帖子不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().post('/api/confessions/999/like');

      expect(res.status).toBe(404);
    });

    it('非法 id 返回 400', async () => {
      const res = await request().post('/api/confessions/abc/like');

      expect(res.status).toBe(400);
    });

    it('未提供令牌返回 401', async () => {
      const res = await supertest(realAuthApp()).post('/api/confessions/101/like');

      expect(res.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().post('/api/confessions/101/like');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // GET /api/confessions/:id/comments
  // ==========================================================
  describe('GET /api/confessions/:id/comments', () => {
    it('返回一级评论及其 replies 嵌套结构', async () => {
      const reply = { ...RAW_COMMENT, id: 502, parent_id: 501, content: '那是我朋友的' };
      query
        .mockResolvedValueOnce([{ id: 101 }]) // 帖子存在
        .mockResolvedValueOnce([RAW_COMMENT, reply]);

      const res = await request().get('/api/confessions/101/comments');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(501);
      expect(res.body.data[0].replies).toHaveLength(1);
      expect(res.body.data[0].replies[0].id).toBe(502);
    });

    it('无评论时返回空数组', async () => {
      query.mockResolvedValueOnce([{ id: 101 }]).mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/101/comments');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('帖子不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/999/comments');

      expect(res.status).toBe(404);
    });

    it('非法 id 返回 400', async () => {
      const res = await request().get('/api/confessions/abc/comments');

      expect(res.status).toBe(400);
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().get('/api/confessions/101/comments');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // POST /api/confessions/:id/comments
  // ==========================================================
  describe('POST /api/confessions/:id/comments', () => {
    function mockCommentSuccess(row = RAW_COMMENT) {
      query
        .mockResolvedValueOnce([{ id: 101 }]) // 帖子存在
        .mockResolvedValueOnce({ insertId: row.id }) // INSERT
        .mockResolvedValueOnce([row]); // SELECT 回读
    }

    it('发表一级评论成功', async () => {
      mockCommentSuccess();

      const res = await request().post('/api/confessions/101/comments').send({ content: '我知道！' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(501);
      expect(res.body.data.parent_id).toBeNull();
    });

    it('回复一级评论成功', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }]) // 帖子存在
        .mockResolvedValueOnce([{ id: 501, parent_id: null }]) // 父评论存在且是一级
        .mockResolvedValueOnce({ insertId: 502 })
        .mockResolvedValueOnce([{ ...RAW_COMMENT, id: 502, parent_id: 501 }]);

      const res = await request()
        .post('/api/confessions/101/comments')
        .send({ content: '回复你', parent_id: 501 });

      expect(res.status).toBe(200);
      expect(res.body.data.parent_id).toBe(501);
    });

    it('回复一条回复返回 400（仅支持二级）', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce([{ id: 502, parent_id: 501 }]); // 父评论本身就是回复

      const res = await request()
        .post('/api/confessions/101/comments')
        .send({ content: '三级', parent_id: 502 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('仅支持二级评论');
    });

    it('parent_id 指向其他帖子的评论返回 400', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce([]); // 该帖下查不到这条父评论

      const res = await request()
        .post('/api/confessions/101/comments')
        .send({ content: '跨帖回复', parent_id: 501 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('回复的评论不存在');
    });

    it('评论内容为空返回 400', async () => {
      const res = await request().post('/api/confessions/101/comments').send({ content: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('评论内容不能为空');
      expect(query).not.toHaveBeenCalled();
    });

    it('评论超过 500 字返回 400', async () => {
      const res = await request()
        .post('/api/confessions/101/comments')
        .send({ content: 'x'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('500');
    });

    it('帖子不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().post('/api/confessions/999/comments').send({ content: 'hi' });

      expect(res.status).toBe(404);
    });

    it('未提供令牌返回 401', async () => {
      const res = await supertest(realAuthApp())
        .post('/api/confessions/101/comments')
        .send({ content: 'hi' });

      expect(res.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });

    it('评论内容含 HTML 被清洗', async () => {
      mockCommentSuccess();

      await request()
        .post('/api/confessions/101/comments')
        .send({ content: '<b>加粗</b>文字' });

      const insertParams = query.mock.calls[1][1];
      expect(insertParams[3]).toBe('加粗文字');
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().post('/api/confessions/101/comments').send({ content: 'hi' });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // DELETE /api/confessions/:id/comments/:commentId
  // ==========================================================
  describe('DELETE /api/confessions/:id/comments/:commentId', () => {
    it('作者本人删除评论成功并记录审计日志', async () => {
      query
        .mockResolvedValueOnce([{ id: 501, user_id: 9 }])
        .mockResolvedValueOnce({ affectedRows: 1 });

      const res = await request().delete('/api/confessions/101/comments/501');

      expect(res.status).toBe(200);
      expect(logAudit).toHaveBeenCalledTimes(1);
      expect(logAudit.mock.calls[0][0].action).toBe('CONFESSION_COMMENT_DELETE');
    });

    it('他人评论返回 403', async () => {
      query.mockResolvedValueOnce([{ id: 501, user_id: 77 }]);

      const res = await request().delete('/api/confessions/101/comments/501');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('只能删除自己的评论');
    });

    it('评论不存在返回 404', async () => {
      query.mockResolvedValueOnce([]);

      const res = await request().delete('/api/confessions/101/comments/999');

      expect(res.status).toBe(404);
    });

    it('非法参数返回 400', async () => {
      const res = await request().delete('/api/confessions/101/comments/abc');

      expect(res.status).toBe(400);
    });

    it('未提供令牌返回 401', async () => {
      const res = await supertest(realAuthApp()).delete('/api/confessions/101/comments/501');

      expect(res.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });

    it('数据库错误返回 500', async () => {
      query.mockRejectedValueOnce(new Error('db down'));

      const res = await request().delete('/api/confessions/101/comments/501');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================
  // 匿名性（安全不变量）— 本模块最重要的测试
  // ==========================================================
  describe('匿名性（安全不变量）', () => {
    it('GET /window 不下发任何身份字段', async () => {
      query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce([{ confession_id: 101, cnt: 3 }])
        .mockResolvedValueOnce([{ confession_id: 101, cnt: 2 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/window');

      expect(res.status).toBe(200);
      assertNoIdentityLeak(res);
    });

    it('GET /window 使用带身份字段的原始行时，仍被投影掉', async () => {
      query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: 101 }]) // window
        .mockResolvedValueOnce([RAW_CONFESSION]) // hydrate：带身份列的原始行
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/window');

      assertNoIdentityLeak(res);
      expect(res.body.data.items[0].author.display_name).toBe('匿名');
      expect(JSON.stringify(res.body)).not.toContain('真实昵称');
      expect(JSON.stringify(res.body)).not.toContain('leaker_should_never_appear');
    });

    it('GET /:id 不下发任何身份字段（即使 DB 行含身份列）', async () => {
      query
        .mockResolvedValueOnce([RAW_CONFESSION])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await request().get('/api/confessions/101');

      assertNoIdentityLeak(res);
      expect(JSON.stringify(res.body)).not.toContain('真实昵称');
      expect(JSON.stringify(res.body)).not.toContain('avatar_42.jpg');
    });

    it('GET /:id/comments 不下发任何身份字段（含 replies）', async () => {
      const reply = { ...RAW_COMMENT, id: 502, parent_id: 501, username: 'reply_leaker' };
      query.mockResolvedValueOnce([{ id: 101 }]).mockResolvedValueOnce([RAW_COMMENT, reply]);

      const res = await request().get('/api/confessions/101/comments');

      assertNoIdentityLeak(res);
      expect(JSON.stringify(res.body)).not.toContain('评论者昵称');
      expect(JSON.stringify(res.body)).not.toContain('commenter_should_never_appear');
      expect(JSON.stringify(res.body)).not.toContain('reply_leaker');
      expect(res.body.data[0].author.display_name).toBe('匿名');
      expect(res.body.data[0].replies[0].author.display_name).toBe('匿名');
    });

    it('POST /comments 回读行含身份列时也不下发', async () => {
      query
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce({ insertId: 501 })
        .mockResolvedValueOnce([RAW_COMMENT]);

      const res = await request().post('/api/confessions/101/comments').send({ content: 'hi' });

      assertNoIdentityLeak(res);
    });

    it('POST / 投稿响应不下发身份字段', async () => {
      query
        .mockResolvedValueOnce({ insertId: 101 })
        .mockResolvedValueOnce([RAW_CONFESSION])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 101 }]);

      const res = await request()
        .post('/api/confessions')
        .send({ content: 'hello', template_key: 'letter' });

      assertNoIdentityLeak(res);
      expect(JSON.stringify(res.body)).not.toContain('真实昵称');
    });
  });
});
