/**
 * 私信会话（`M-12`）的**纯规则**（P2B-06）
 *
 * 服务端现状（`routes/marketplace.js:907-980`）：
 *   · 读消息：按 `created_at` + `id` 倒序取页，再返回升序页和复合游标；
 *   · 写消息：`MARKETPLACE_CHAT_MAX_LEN = 1200`，而且是**静默截断**（`:67-72`）。
 *
 * 由此推出本文件的三条规则：
 *   1. 历史游标由服务端提供；轮询仍可按 `id > lastSeen` 过滤当前页；
 *   2. **顺序按 `id` 断胜负**（同秒 `created_at` 很常见，而 id 是自增的插入序）；
 *   3. **上限由客户端拦**（服务端会静默截断，用户会以为发全了）。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

/** 轮询间隔（C-07 建议 A：先做轮询，不做实时通道） */
export const CHAT_POLL_INTERVAL_MS = 4000;

/** 服务端 `MARKETPLACE_CHAT_MAX_LEN` 的镜像（⛔ 改一处要两处一起改） */
export const CHAT_MAX_MESSAGE_LEN = 1200;

export type ChatMessage = {
  id: number;
  /** 是不是我发的（由 `viewerId` 判定，⛔ 不猜） */
  mine: boolean;
  content: string;
  createdAt: string | null;
  senderName: string | null;
};

export type ChatThread = {
  id: number;
  itemId: number;
  itemTitle: string | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

function normalizeMessage(raw: unknown, viewerId: number): ChatMessage | null {
  if (!isObject(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const sender = isObject(raw.sender) ? raw.sender : null;
  return {
    id,
    mine: Number(raw.sender_user_id) === viewerId,
    content: asString(raw.content) ?? '',
    createdAt: asString(raw.created_at),
    senderName: sender ? asString(sender.name) : null,
  };
}

/**
 * 载荷 → 会话（`{ thread, list }`）。
 * `viewerId` 用来判 `mine`；⛔ 拿不到自己的 id 时**不能**猜（返回 `null` 的那条路留给调用方报错）。
 */
export function normalizeChat(
  payload: unknown,
  viewerId: number
): { thread: ChatThread; messages: ChatMessage[] } | null {
  if (!isObject(payload) || !isObject(payload.thread)) return null;
  const threadId = Number(payload.thread.id);
  if (!Number.isInteger(threadId) || threadId <= 0) return null;
  const rawList = Array.isArray(payload.list) ? payload.list : [];
  const messages: ChatMessage[] = [];
  for (const entry of rawList) {
    const message = normalizeMessage(entry, viewerId);
    if (message) messages.push(message);
  }
  return {
    thread: {
      id: threadId,
      itemId: Number(payload.thread.item_id) || 0,
      itemTitle: asString(payload.thread.item_title),
    },
    messages: orderMessages(messages),
  };
}

/** 顺序：按 `id` 升序（同秒 `created_at` 时 id 是唯一可靠的胜负手） */
export function orderMessages(messages: readonly ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.id - b.id);
}

/** 合并并去重（按 `id`）：轮询回来的整页与本地已显示的消息会重叠 */
export function mergeMessages(
  previous: readonly ChatMessage[],
  incoming: readonly ChatMessage[]
): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const message of previous) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return orderMessages([...byId.values()]);
}

/** 已经见过的最大 id（增量过滤的游标；⛔ 服务端没有游标，只能自己记） */
export function lastSeenId(messages: readonly ChatMessage[]): number {
  return messages.reduce((max, message) => (message.id > max ? message.id : max), 0);
}

/** 比游标新的消息（轮询时只用它们，避免整页覆盖导致的闪烁） */
export function messagesAfter(
  messages: readonly ChatMessage[],
  cursor: number
): ChatMessage[] {
  return messages.filter((message) => message.id > cursor);
}

/**
 * 能不能发：**trim 后非空**且**不超过 1200**。
 * ⛔ 超限是"拦住"（按钮不可用 + 计数器示警），**不是**静默截断 —— 服务端那一下截断用户看不见。
 */
export function canSend(text: string, max: number = CHAT_MAX_MESSAGE_LEN): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  return trimmed.length <= max;
}

/**
 * 该不该在跑轮询（离开页面 / 进后台 → 必须停）。
 * 抽成纯函数是为了让"离开即停"能被断言，而不是靠肉眼看代码。
 */
export function shouldPoll(state: {
  focused: boolean;
  appActive: boolean;
}): boolean {
  return state.focused && state.appActive;
}
