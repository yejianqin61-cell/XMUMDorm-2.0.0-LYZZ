/**
 * 私信会话列表的**纯规则**（P2B-03 / 页面 `M-11`）
 *
 * 数据来自 `P2B-02` 新加的后端接口 `GET /api/marketplace/chat/threads`
 * （买家 + 卖家**两侧合并**，带 item 标题与未读数）。本文件只做三件事：
 *   1. 把响应**规范化**成行（形状不对就不画半截页面）；
 *   2. 把可能为空的字段**兜底成词条**（⛔ 界面上不许出现 `undefined` / `null`）；
 *   3. 去重与未读判定（纯函数，可测）。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

import type { AppError } from '@/i18n/errors';

export type ChatThreadRow = {
  thread_id: number;
  item: { id: number; title: string | null; available: boolean };
  role: 'buyer' | 'seller';
  peer: { id: number; name: string | null; avatar: string | null };
  last_message_at: string | null;
  last_content: string | null;
  unread_count: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/**
 * 响应 → 行（`{list:[...]}` 或裸数组；形状不对的行**整行丢掉**，⛔ 不猜）。
 * `thread_id` 必须是正整数 —— 没有它就点不进去，留着只会得到一个死行。
 */
export function normalizeThreadRows(payload: unknown): ChatThreadRow[] {
  const raw = Array.isArray(payload)
    ? payload
    : isObject(payload) && Array.isArray(payload.list)
      ? payload.list
      : [];
  const rows: ChatThreadRow[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const threadId = Number(entry.thread_id);
    if (!Number.isInteger(threadId) || threadId <= 0) continue;
    const item = isObject(entry.item) ? entry.item : {};
    const peer = isObject(entry.peer) ? entry.peer : {};
    const role = entry.role === 'seller' ? 'seller' : 'buyer';
    rows.push({
      thread_id: threadId,
      item: {
        id: Number(item.id) || 0,
        title: asStringOrNull(item.title),
        available: item.available !== false,
      },
      role,
      peer: {
        id: Number(peer.id) || 0,
        name: asStringOrNull(peer.name),
        avatar: asStringOrNull(peer.avatar),
      },
      last_message_at: asStringOrNull(entry.last_message_at),
      last_content: asStringOrNull(entry.last_content),
      unread_count: Math.max(0, Number(entry.unread_count) || 0),
    });
  }
  return rows;
}

/** 同一条会话只留一条（列表刷新与追加重叠时会发生），并按 `thread_id` 稳定排序 */
export function mergeThreadRows(
  previous: readonly ChatThreadRow[],
  incoming: readonly ChatThreadRow[]
): ChatThreadRow[] {
  const byId = new Map<number, ChatThreadRow>();
  for (const row of previous) byId.set(row.thread_id, row);
  for (const row of incoming) byId.set(row.thread_id, row);
  return [...byId.values()].sort((a, b) => b.thread_id - a.thread_id);
}

/** 会话标题：商品名可能为空（商品被删/老数据）→ 兜底词条，⛔ 不显示 `undefined` */
export function conversationTitle(row: ChatThreadRow, fallback: string): string {
  return row.item.title ?? fallback;
}

/** 对方名字可能为空 → 兜底词条 */
export function conversationPeerName(row: ChatThreadRow, fallback: string): string {
  return row.peer.name ?? fallback;
}

/** 一行副标题：最后一条消息，没有消息时给"还没有消息" */
export function conversationSubtitle(row: ChatThreadRow, empty: string): string {
  return row.last_content ?? empty;
}

/** 未读角标只在 > 0 时出现（⛔ 不显示 0） */
export function hasUnread(row: ChatThreadRow): boolean {
  return row.unread_count > 0;
}

/**
 * 错误 → `AppError`。
 * ⚠️ 与 `features/square/useCanteenResource.ts:24` 的 `toResourceError` **同语义**：
 *    两处都在等一次收敛（Phase D 把它提到 `i18n/errors.ts`）。
 *    ⛔ 本轮不跨轨 import 乙的 feature —— 那会把两条轨道的目录绑在一起。
 */
export function toMailboxError(error: unknown): AppError {
  if (error !== null && typeof error === 'object' && 'kind' in error) {
    return error as AppError;
  }
  return { kind: 'unknown' };
}
