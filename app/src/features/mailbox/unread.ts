/**
 * 未读真源（P2B-01）—— **全 App 只有一个未读数**
 *
 * 宪法 4.7-4 的硬要求：角标是**单一未读真源**，客户端**不本地递减**。
 * 后端已经给了那个真源：`GET /api/notifications/unread-summary` 的
 * `data.total`（`routes/notifications.js:47-60, 272-286`）。
 *
 * ## 为什么是一个"模块级商店"而不是 Provider
 * 四个一级 Tab 页各自渲染 `Screen`，而既有的切片用例是**在没有 Provider 的情况下**
 * 渲染这些页面的（`p1-14/15/16/17`）。所以未读这层必须能"没有 Provider 也活着"。
 * 这与 `SecondaryTabStore` 的既有做法一致（应用级单例，⛔ 不在页面里 new）。
 *
 * ## 三条不变量
 *   1. **拿不到就不主张**：请求失败 / 载荷没给 `total` → `null`（角标不显示），⛔ 不是 0；
 *   2. **同一令牌只拉一次**：`loading` 中的重复请求合并；换令牌（换账号）必须重拉；
 *   3. **登出即清零**：令牌变 `null` → 立刻 `reset()`，⛔ 不把上一个账号的未读留给下一个。
 */

/** 未读汇总的载荷形状（后端 `buildUnreadSummary` 的实际字段） */
export type UnreadSummaryPayload = {
  total: number;
  byType: Record<string, number>;
  byModule: Record<string, number>;
  byCategory: Record<string, number>;
};

export type UnreadState = {
  /** `null` = 拿不到（⛔ 与"确实是 0"不同） */
  total: number | null;
  loading: boolean;
};

/**
 * 汇总载荷 → 未读总数（纯函数）。
 * ⛔ 缺 `total` / 非数字 / 负数一律返回 `null`：**不主张 0**。
 */
export function totalUnread(payload: unknown): number | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload !== 'object') return null;
  const raw = (payload as { total?: unknown }).total;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

export class UnreadStore {
  private state: UnreadState = { total: null, loading: false };

  /** 这份数字是**哪个令牌**拉来的（换账号要重拉） */
  private token: string | null = null;

  private inFlight: Promise<number | null> | null = null;

  private readonly listeners = new Set<() => void>();

  get(): UnreadState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private set(next: Partial<UnreadState>): void {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  /**
   * 拉一次未读（同一个令牌 + 已经在飞 → 复用同一个 Promise）。
   * `force` 用于"已读之后必须重新拉汇总"（⛔ 不本地递减）。
   */
  load(token: string, fetcher: () => Promise<unknown>, force = false): Promise<number | null> {
    if (this.token !== token) {
      // 换账号：先丢掉上一个账号的数字
      this.token = token;
      this.inFlight = null;
      this.set({ total: null });
    }
    if (this.inFlight) return this.inFlight;
    if (!force && this.state.total !== null) return Promise.resolve(this.state.total);

    this.set({ loading: true });
    const task = (async () => {
      try {
        const payload = await fetcher();
        const total = totalUnread(payload);
        this.set({ total, loading: false });
        return total;
      } catch {
        // 拿不到就不显示角标（⛔ 不显示 0）
        this.set({ total: null, loading: false });
        return null;
      } finally {
        this.inFlight = null;
      }
    })();
    this.inFlight = task;
    return task;
  }

  /** 登出 / 令牌失效 → 立刻清零 */
  reset(): void {
    this.token = null;
    this.inFlight = null;
    this.set({ total: null, loading: false });
  }
}

/** 应用级单例（⛔ 页面里不许 new 第二个，否则四个 Tab 各算一份） */
export const unreadStore = new UnreadStore();
