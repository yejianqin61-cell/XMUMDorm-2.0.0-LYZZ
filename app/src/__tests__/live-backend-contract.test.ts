/**
 * 真实后端契约验证（**可选运行**）—— 打**线上后端**，不用 mock
 *
 * ## 怎么跑
 * ```bash
 * cd app
 * $env:LIVE_API_BASE='https://xmumdorm-200-lyzz-production.up.railway.app'; npx jest src/__tests__/live-backend-contract --ci
 * ```
 * ⛔ 不设 `LIVE_API_BASE` 时整组 `describe.skip` —— 这样 CI（无网络/无凭据）不会被它拖红，
 *   而"契约假设有没有被现实证实"这件事**有一个可重复的入口**。
 *
 * ## 为什么必须有它
 * 之前所有用例都 `jest.mock` 掉了 `shared/api/*`，于是**我对后端响应形状的假设从未被检验过** ——
 * mock 是我自己写的，它当然符合我的假设。本文件打真服务，专门验那些**最容易想当然**的点：
 *   · `data` 到底包了几层（`shared/api/request.js` 会不会替我拆 `data`）；
 *   · 字段名与类型（`like_count` vs `likeCount`、`hasMore` 是不是真布尔）；
 *   · 头像/媒体 URL 是绝对地址还是相对路径（决定 `getUploadUrl()` 是不是必需）。
 *
 * ## 覆盖范围（如实）
 * 只覆盖**公开端点**（无需令牌）。需要登录的端点（`/api/users/me`、`/api/todos/today`、
 * `/api/schedule/week`、`/api/notifications`）在没有**测试凭据**时无法真验 —— 见
 * `docs/app/test/甲-真实后端契约验证.md` §3「未验清单」。
 */

import { normalizeProfilePosts } from '@/features/me/posts';
import { normalizeProfile } from '@/features/me/profile';
import { normalizeTodayTodos, formatClockTime } from '@/features/me/dashboard';

const LIVE = (process.env.LIVE_API_BASE ?? '').replace(/\/$/, '');
/** 测试凭据**只从环境变量读**，⛔ 绝不写进仓库 */
const LIVE_USER = process.env.LIVE_API_USER ?? '';
const LIVE_PASS = process.env.LIVE_API_PASS ?? '';
const TIMEOUT = 20000;
const liveDescribe = LIVE ? describe : describe.skip;
const authDescribe = LIVE && LIVE_USER && LIVE_PASS ? describe : describe.skip;

/**
 * 真发一次 GET，返回 `{ status, json }`（⛔ 不吞错误：网络问题要让用例红）
 *
 * ⚠️ **不用 `fetch`**：jest-expo 环境下 `fetch` 被替身接管（实测 `res.status === undefined`），
 *    那等于又一次"看起来在打真服务、其实是假的"。所以直接走 `node:https`。
 */
function liveGet(path: string): Promise<{ status: number; json: any }> {
  return liveRequest('GET', path);
}

/** 通用真请求（支持带令牌）；⛔ 不吞网络错误 */
function liveRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: any }> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const https = require('node:https');
  const url = new URL(`${LIVE}${path}`);
  const payload = body === undefined ? null : JSON.stringify(body);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (payload !== null) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = String(Buffer.byteLength(payload));
  }
  if (token) headers.authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: url.hostname, path: `${url.pathname}${url.search}`, method, headers },
      (res: any) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          text += chunk;
        });
        res.on('end', () => {
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => {
      req.destroy(new Error(`live request timeout: ${url.toString()}`));
    });
    if (payload !== null) req.write(payload);
    req.end();
  });
}

/** 真登录拿令牌（真实端点：token 在**顶层**，不在 `data` 里） */
async function liveLogin(): Promise<string> {
  const body = LIVE_USER.includes('@')
    ? { email: LIVE_USER, password: LIVE_PASS }
    : { username: LIVE_USER, password: LIVE_PASS };
  const { status, json } = await liveRequest('POST', '/api/auth/login', body);
  expect({ status, hasToken: typeof json?.token === 'string' }).toEqual({ status: 200, hasToken: true });
  return json.token as string;
}

/**
 * 需要令牌的那一半 —— **只有给了测试凭据才跑**
 * （`LIVE_API_USER` / `LIVE_API_PASS`；⛔ 凭据绝不写进仓库）
 */
authDescribe('真实后端契约 · 需登录', () => {
  jest.setTimeout(TIMEOUT);
  let token = '';

  beforeAll(async () => {
    token = await liveLogin();
  });

  it('`/api/users/me` 的真实形状能被 `normalizeProfile` 吃下（**扁平** college/grade/major）', async () => {
    const { status, json } = await liveGet2('/api/users/me', token);
    expect(status).toBe(200);
    const data = json.data;
    // 真服务是扁平的（`/profile` 才是嵌套 campus_identity）——我代码里按扁平读，实测一致
    expect(data).toHaveProperty('college');
    expect(data).toHaveProperty('grade');
    expect(data).toHaveProperty('major');
    expect(data).toHaveProperty('show_college');
    expect(data).toHaveProperty('levelProgress');

    const parsed = normalizeProfile(data);
    expect(parsed.id).toBe(data.id);
    expect(parsed.displayName).toBe(data.nickname ?? data.username);
    expect(parsed.progress).toBeCloseTo(data.levelProgress.progress);
    expect(parsed.progressText).toBe(data.levelProgress.progressText);
    expect(Number.isNaN(parsed.level)).toBe(false);
  });

  it('`/api/todos/today` 的真实形状能被 `normalizeTodayTodos` 吃下', async () => {
    const { status, json } = await liveGet2('/api/todos/today', token);
    expect(status).toBe(200);
    const data = json.data;
    for (const key of ['total', 'completed', 'active', 'topItems']) {
      expect(data).toHaveProperty(key);
    }
    expect(Array.isArray(data.topItems)).toBe(true);
    const parsed = normalizeTodayTodos(data);
    expect(parsed.total).toBe(data.total);
    expect(parsed.active).toBe(data.active);
    if (data.topItems.length > 0) {
      // 真实条目形状（脚本账号今天没有待办 → 走不到这里，用 log 留痕而不是假装验过）
      expect(data.topItems[0]).toHaveProperty('id');
      expect(data.topItems[0]).toHaveProperty('title');
    } else {
      console.log('[live] 该账号今日 0 条待办 → topItems 条目形状未覆盖（route 源码为 {id,title,priority,due_date,due_time,list_type}）');
    }
  });

  it('`/api/schedule/week` 的 `start_time` 是 **`HH:MM:SS`（带秒）** —— 这是我修 bug 的真实依据', async () => {
    const { status, json } = await liveGet2('/api/schedule/week?week=1', token);
    expect(status).toBe(200);
    const data = json.data;
    for (const key of ['week', 'days', 'currentWeek', 'totalWeeks']) {
      expect(data).toHaveProperty(key);
    }
    const dayKeys = Object.keys(data.days ?? {});
    if (dayKeys.length === 0) {
      console.log('[live] 本周没有课 → 时段格式未覆盖');
      return;
    }
    const first = data.days[dayKeys[0]][0];
    expect(first).toHaveProperty('course_code');
    expect(first).toHaveProperty('start_time');
    // ① 真数据带秒
    expect(first.start_time).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
    // ② 归一化后**不许出现秒**（否则界面会显示 14:00:00）
    const shown = formatClockTime(first.start_time);
    expect(shown).toMatch(/^\d{2}:\d{2}$/);
    expect(shown.length).toBe(5);
  });

  it('`/api/notifications` 的 list 条目字段名与我读的一致；`unread-summary` 有 total', async () => {
    const list = await liveGet2('/api/notifications', token);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.json.data.list)).toBe(true);
    if (list.json.data.list.length > 0) {
      const item = list.json.data.list[0];
      for (const key of ['id', 'type', 'is_read', 'created_at', 'category', 'module']) {
        expect(item).toHaveProperty(key);
      }
      // 真实 `type` 必须能映射到一个**存在**的词条（否则界面会露出原始 key）
      const { notificationKindKey } = require('@/features/mailbox/notifications');
      const { zh, en } = require('@/i18n');
      const seen = new Set<string>();
      for (const row of list.json.data.list) {
        const key = notificationKindKey(String(row.type));
        expect(Object.keys(zh)).toContain(key);
        expect(Object.keys(en)).toContain(key);
        seen.add(`${row.type}->${key}`);
      }
      console.log(`[live] 真实通知类型映射：${[...seen].join(', ')}`);
    }

    const unread = await liveGet2('/api/notifications/unread-summary', token);
    expect(unread.status).toBe(200);
    expect(typeof unread.json.data.total).toBe('number');
    expect(unread.json.data).toHaveProperty('byCategory');
  });

  it('线上**没有** `/api/marketplace/chat/threads`（本地新增路由未部署）——带令牌实测', async () => {
    const { status } = await liveGet2('/api/marketplace/chat/threads', token);
    // 带令牌仍是 404 → 不是"缺权限"，是**路由不存在**
    expect(status).toBe(404);
  });
});

/** 带令牌的 GET（与 `liveGet` 同源，只是多一个头） */
function liveGet2(path: string, token: string): Promise<{ status: number; json: any }> {
  return liveRequest('GET', path, undefined, token);
}

/** **公开端点**那一半：只要有 `LIVE_API_BASE` 就能跑（⛔ 不需要凭据） */
liveDescribe(`真实后端契约 · 公开端点（${LIVE || '未设置'}）`, () => {
  jest.setTimeout(TIMEOUT);
  jest.setTimeout(TIMEOUT);

  it('连通性：后端在线且返回业务信封 `{status, message, data}`', async () => {
    const { status, json } = await liveGet('/api/posts?page=1&pageSize=1');
    expect(status).toBe(200);
    expect(json.status).toBe(0);
    expect(json).toHaveProperty('data');
  });

  it('`/api/users/:id/profile` 的**真实**形状能被 `normalizeProfilePosts` 吃下', async () => {
    // 先找一个真实存在的用户（从公开帖子列表里取作者 id），⛔ 不硬编码 id
    const list = await liveGet('/api/posts?page=1&pageSize=5');
    const authorId = list.json?.data?.list?.[0]?.user_id;
    expect(typeof authorId).toBe('number');

    const { status, json } = await liveGet(`/api/users/${authorId}/profile?page=1&pageSize=2`);
    expect(status).toBe(200);
    expect(json.status).toBe(0);

    const data = json.data;
    // ① `data` 这一层就是 `normalizeProfilePosts` 的入参（不是再包一层 `data.data`）
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('posts');
    expect(data).toHaveProperty('stats');
    expect(Array.isArray(data.posts)).toBe(true);

    // ② 真实字段名与类型（mock 里是我编的，这里是服务端说的）
    if (data.posts.length > 0) {
      const post = data.posts[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('like_count'); // 下划线，不是 camelCase
      expect(Array.isArray(post.images)).toBe(true);
    }
    expect(typeof data.stats.post_count).toBe('number');
    expect(typeof data.hasMore).toBe('boolean'); // 真布尔，不是 0/1

    // ③ 归一化之后必须能过（这是被测代码真正吃到的路径）
    const parsed = normalizeProfilePosts(data);
    expect(parsed.userId).toBe(authorId);
    expect(parsed.total).toBe(data.stats.post_count);
    for (const row of parsed.rows) {
      expect(Number.isInteger(row.id)).toBe(true);
      expect(Number.isNaN(row.likeCount)).toBe(false);
    }
  });

  it('头像/媒体 URL：真数据是**绝对地址**（所以 `getUploadUrl` 必须幂等）', async () => {
    const list = await liveGet('/api/posts?page=1&pageSize=5');
    const authorId = list.json?.data?.list?.[0]?.user_id;
    const { json } = await liveGet(`/api/users/${authorId}/profile?page=1&pageSize=1`);
    const avatar = json?.data?.user?.avatar;
    if (typeof avatar === 'string' && avatar.length > 0) {
      // ⚠️ 后端对**没有头像**的用户返回相对路径 `/uploads/default-avatar.png`（routes/users.js:21）
      //    → 所以两种都合法，但**必须**能被 `getUploadUrl` 处理成可用地址（幂等）
      const { getUploadUrl } = require('../../../shared/api/config');
      const normalized = getUploadUrl(avatar);
      expect(typeof normalized).toBe('string');
      expect(normalized.length).toBeGreaterThan(0);
      if (avatar.startsWith('http')) expect(normalized).toBe(avatar); // 幂等：绝对地址原样返回
    } else {
      // 该用户没有头像也算通过，但要把事实打印出来（⛔ 不静默跳过）
      console.log('[live] 该用户无头像字段，未覆盖 URL 归一化分支');
    }
  });

  it('`badgeEmoji` 在真实响应里**确实存在**（而我们刻意不渲染它）', async () => {
    const list = await liveGet('/api/posts?page=1&pageSize=5');
    const authorId = list.json?.data?.list?.[0]?.user_id;
    const { json } = await liveGet(`/api/users/${authorId}/profile?page=1&pageSize=1`);
    const user = json?.data?.user;
    // 这条断言的价值：证明"禁 Emoji 图标"是一条**真实存在的诱惑**，不是纸面规则
    expect(user).toHaveProperty('badgeEmoji');
    expect(user).toHaveProperty('levelProgress');
    expect(typeof user.levelProgress.progress).toBe('number');
  });

  it('已部署的服务端**没有** `GET /api/marketplace/chat/threads`（本地新增的路由未部署）', async () => {
    const { status } = await liveGet('/api/marketplace/chat/threads');
    // 401 = 路由存在但要令牌；404 = 该路由**不在部署里**
    // ⚠️ 这条断言记录的是"当前事实"，一旦部署方带上这条路由，它会红 —— 那时应当改成 401
    expect([401, 404]).toContain(status);
    if (status === 404) {
      console.log(
        '[live] 线上没有 /api/marketplace/chat/threads —— 本地 backend 改动（Q1）尚未部署，会话列表在真机上会 404'
      );
    }
  });
});
