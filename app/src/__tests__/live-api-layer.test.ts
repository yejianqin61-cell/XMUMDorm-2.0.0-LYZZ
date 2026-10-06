/**
 * 真实后端 · **端到端层验证**（可选运行，需凭据）
 *
 * ## 与 `live-backend-contract.test.ts` 的分工
 * 那个文件用裸 `node:https` 验**服务端契约**（响应长什么样）；
 * 本文件把**我们自己的真实传输层**接上去 —— `shared/api/request.js` + 各域 API + App 的归一化函数
 * —— 也就是**除了 UI 之外，整条真实链路**。它专门验证那些"只靠 mock 永远验不到"的环节：
 *   1. `request()` 是否真的**拆开 `data`**（`request.js:109`：`data.data !== undefined ? data.data : data`）；
 *   2. `Authorization: Bearer` 是否真的被注入（`request.js` 读 `getToken()` 或显式 `token`）；
 *   3. 归一化函数吃**真实响应**是否成立（此前只有我自己编的 mock 喂养过它们）。
 *
 * ## 怎么跑
 * ```powershell
 * cd app
 * $env:LIVE_API_BASE='https://xmumdorm-200-lyzz-production.up.railway.app'
 * $env:LIVE_API_USER='admin1'; $env:LIVE_API_PASS='<密码>'   # ⛔ 凭据只从环境变量读
 * npx jest src/__tests__/live-api-layer --ci
 * ```
 * ⛔ 不设变量时整组 skip。
 *
 * ## ⚠️ 为什么需要自己装一个 fetch
 * jest-expo 环境里的 `fetch` 是替身（实测 `res.status === undefined`）→ 真实传输层跑不起来。
 * 这里用 `node:https` 装一个**真** fetch（只实现本项目用到的部分），
 * 从而让**未被 mock 的** `shared/api/*` 真正发请求。
 */

import { formatClockTime } from '@/features/me/dashboard';
import { normalizeProfile } from '@/features/me/profile';
import { normalizeTodayTodos } from '@/features/me/dashboard';
import { normalizeTimetableWeek } from '@/features/tools/timetable';

const LIVE = (process.env.LIVE_API_BASE ?? '').replace(/\/$/, '');
const LIVE_USER = process.env.LIVE_API_USER ?? '';
const LIVE_PASS = process.env.LIVE_API_PASS ?? '';
const TIMEOUT = 20000;
const liveLayerDescribe = LIVE && LIVE_USER && LIVE_PASS ? describe : describe.skip;

/** 装一个真 fetch（基于 node:https），让 `shared/api/request.js` 真发请求 */
function installRealFetch(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const https = require('node:https');
  const realFetch = (input: any, init: any = {}): Promise<any> =>
    new Promise((resolve, reject) => {
      const url = new URL(String(input));
      const headers = init.headers ?? {};
      const payload: string | null = typeof init.body === 'string' ? init.body : null;
      const req = https.request(
        { hostname: url.hostname, path: `${url.pathname}${url.search}`, method: init.method ?? 'GET', headers },
        (res: any) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => {
            text += c;
          });
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: { get: (name: string) => res.headers[String(name).toLowerCase()] ?? null },
              json: async () => JSON.parse(text),
              text: async () => text,
            });
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(TIMEOUT, () => req.destroy(new Error('timeout')));
      if (payload !== null) req.write(payload);
      req.end();
    });
  (global as any).fetch = realFetch;
}

liveLayerDescribe('真实后端 · 端到端层（真传输 + 真归一化）', () => {
  jest.setTimeout(TIMEOUT);

  let token = '';
  let request: (path: string, options?: any) => Promise<any>;
  let requestRaw: (path: string, options?: any) => Promise<any>;

  beforeAll(async () => {
    installRealFetch();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const platform = require('../../../shared/api/platform');
    platform.configureApi({ baseUrl: LIVE });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const req = require('../../../shared/api/request');
    request = req.request;
    requestRaw = req.requestRaw;

    const body = LIVE_USER.includes('@')
      ? { email: LIVE_USER, password: LIVE_PASS }
      : { username: LIVE_USER, password: LIVE_PASS };
    // ⚠️ 登录必须走 `requestRaw`：`request()` 会**拆掉 `data`**，而 token 在**顶层**
    //    （`{status,message,token,data}`）—— 这正是 `shared/api/auth.js` 用 `requestRaw` 的原因，
    //    本用例顺带把这条设计约束**实测**了一遍。
    const login = await requestRaw('/api/auth/login', { method: 'POST', body, skipAuth: true });
    token = login.token;
    expect(typeof token).toBe('string');
  });

  it('`request()` **真的拆开了 `data`**：`/api/users/me` 返回的是业务对象本身', async () => {
    const payload = await request('/api/users/me', { token });
    // 若没拆，这里会是 `{status, message, data}`；拆对了才有 `id`
    expect(payload).toHaveProperty('id');
    expect(payload).not.toHaveProperty('data');
    expect(payload).not.toHaveProperty('status');
    // 且能被 App 的归一化直接吃下
    const profile = normalizeProfile(payload);
    expect(profile.id).toBe(payload.id);
    expect(profile.displayName).toBe(payload.nickname ?? payload.username);
  });

  it('`Authorization: Bearer` 真的被注入（不传令牌就 401）', async () => {
    await expect(request('/api/users/me', { token: null })).rejects.toBeTruthy();
    const withToken = await request('/api/users/me', { token });
    expect(withToken.id).toBeGreaterThan(0);
  });

  it('`/api/todos/today` 真数据能被 `normalizeTodayTodos` 吃下', async () => {
    const payload = await request('/api/todos/today', { token });
    const parsed = normalizeTodayTodos(payload);
    expect(parsed.total).toBe(payload.total);
    expect(parsed.active).toBe(payload.active);
    expect(Number.isNaN(parsed.active)).toBe(false);
  });

  it('`/api/schedule/week` 真数据过**乙的** `normalizeTimetableWeek`，时段必须去秒', async () => {
    const payload = await request('/api/schedule/week?week=1', { token });
    const week = normalizeTimetableWeek(payload);
    expect(week).not.toBeNull();
    expect(week?.week).toBe(1);
    const dayKeys = Object.keys(week?.days ?? {});
    if (dayKeys.length === 0) {
      console.log('[live-layer] 本周无课 → 时段格式未覆盖');
      return;
    }
    const first = (week as any).days[dayKeys[0]][0];
    // 归一化后字段名是 camelCase（`startTime`）—— 证明映射成立
    expect(first).toHaveProperty('startTime');
    const shown = formatClockTime(first.startTime);
    expect(shown).toMatch(/^\d{2}:\d{2}$/);
    console.log(`[live-layer] 真实时段 raw=${first.startTime} shown=${shown}`);
  });

  it('`/api/notifications/unread-summary` 真数据能被 `totalUnread` 吃下', async () => {
    const payload = await request('/api/notifications/unread-summary', { token });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { totalUnread } = require('@/features/mailbox/unread');
    const total = totalUnread(payload);
    expect(total).toBe(payload.total);
    expect(Number.isInteger(total)).toBe(true);
  });

  it('本地新增的 `/api/marketplace/chat/threads` 在线上返回 404（**未部署**，带令牌也一样）', async () => {
    let status = 0;
    try {
      await request('/api/marketplace/chat/threads', { token });
      status = 200;
    } catch (error: any) {
      status = error?.status ?? error?.body?.__httpStatus ?? 0;
    }
    expect(status).toBe(404);
  });
});
