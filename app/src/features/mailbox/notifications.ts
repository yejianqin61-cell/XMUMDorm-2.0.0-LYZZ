/**
 * 信箱（`F-01`）的**纯规则**（P2B-04）
 *
 * 数据来自 `GET /api/notifications`：`{ list, hasMore, page, pageSize, unreadSummary }`
 * （`routes/notifications.js:156-267`）。本文件只做四件事：
 *   1. **规范化**列表（形状不对的行丢掉，⛔ 不画半截页面）；
 *   2. **分批**：`read-batch` 的服务端硬上限是 **100**（`MAX_READ_BATCH_SIZE`），前端必须自己分批；
 *   3. **可点性 / 可清空性**：`target.available === false` 要置灰；**公告永不可清**；
 *   4. **类型 → 词条**：通知类型有几十种，界面上只需要 5 个说法（不逐类型造 key）。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

import type { MessageKey } from '@/i18n';

export type NotificationCategory = 'interaction' | 'transaction' | 'system';

/** 三分类的显示顺序（宪法/页面清单 `F-01`：互动 / 交易 / 系统） */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  'interaction',
  'transaction',
  'system',
];

/** 服务端 `MAX_READ_BATCH_SIZE`（`routes/notifications.js:23`）—— ⛔ 不许超过 */
export const READ_BATCH_SIZE = 100;

/** 公告类型：**清空时永远排除**（`routes/notifications.js:34,43-45`） */
const ANNOUNCEMENT_TYPES = ['announcement', 'system_announcement'];

export type NotificationTarget = {
  type: string;
  id: number;
  title: string | null;
  path: string;
  available: boolean;
  /** 阶段3-01：评论定位 ID（null 也返回；服务端固定带这个字段） */
  comment_id?: number | null;
};

export type NotificationRow = {
  id: number;
  type: string;
  isRead: boolean;
  title: string | null;
  target: NotificationTarget;
  category: string | null;
  module: string | null;
  fromName: string | null;
  createdAt: string | null;
  /** 阶段3-01：来源正文摘要（帖子类由服务端 JOIN 给；其余域未注册时为 null） */
  sourceExcerpt?: string | null;
  /** 阶段3-01：被回复评论摘要（评论类才有；⛔ 不是新评论内容） */
  replyExcerpt?: string | null;
};

export type NotificationPage = {
  list: NotificationRow[];
  hasMore: boolean;
  unreadByCategory: Record<string, number>;
  unreadTotal: number | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

function normalizeTarget(raw: unknown): NotificationTarget {
  const target = isObject(raw) ? raw : {};
  const commentId = Number(target.comment_id);
  return {
    type: asString(target.type) ?? 'unknown',
    id: Number(target.id) || 0,
    title: asString(target.title),
    path: asString(target.path) ?? '#',
    // ⚠️ `available` 只在帖子类目标上出现；**缺失按可用**处理（后端只用 false 表达不可用）
    available: target.available !== false,
    comment_id: Number.isSafeInteger(commentId) && commentId > 0 ? commentId : null,
  };
}

/**
 * `GET /api/notifications/unread-summary` 的载荷 → 分类未读数（纯函数）。
 *
 * 阶段D-01 起有第二个消费方：信箱「交易」分类列的是会话，不再加载通知页，
 * 所以它的分类角标改读这个端点（契约 L83-85：分类角标读未读汇总）。
 * ⛔ 拿不到/形状不对就返回空对象（页面显示 0），不猜一个数字。
 */
export function unreadCountsByCategory(payload: unknown): Record<string, number> {
  const summary = isObject(payload) ? payload : {};
  const byCategory = isObject(summary.byCategory) ? summary.byCategory : {};
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(byCategory)) {
    counts[key] = Math.max(0, Number(value) || 0);
  }
  return counts;
}

/** 列表载荷 → 行（`id` 不是正整数就整行丢掉：没有 id 就标不了已读） */
export function normalizeNotificationPage(payload: unknown): NotificationPage {
  const body = isObject(payload) ? payload : {};
  const rawList = Array.isArray(body.list) ? body.list : [];
  const list: NotificationRow[] = [];
  for (const entry of rawList) {
    if (!isObject(entry)) continue;
    const id = Number(entry.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const fromUser = isObject(entry.from_user) ? entry.from_user : null;
    const target = normalizeTarget(entry.target);
    list.push({
      id,
      type: asString(entry.type) ?? 'unknown',
      isRead: entry.is_read === true || entry.is_read === 1 || entry.is_read === '1',
      title: target.title ?? asString(entry.post_title),
      target,
      category: asString(entry.category),
      module: asString(entry.module),
      fromName: fromUser ? asString(fromUser.nickname) ?? asString(fromUser.username) : null,
      createdAt: asString(entry.created_at),
      // 阶段3-01：摘要缺失即为 null（页面回退到类型/标题）
      sourceExcerpt: asString(entry.source_excerpt),
      replyExcerpt: asString(entry.reply_to_excerpt),
    });
  }

  const summary = isObject(body.unreadSummary) ? body.unreadSummary : null;
  const unreadByCategory = unreadCountsByCategory(summary);

  return {
    list,
    hasMore: body.hasMore === true,
    unreadByCategory,
    unreadTotal: summary && typeof summary.total === 'number' ? summary.total : null,
  };
}

/** 按 100 条一批切开（⛔ 传超上限的一批会被服务端 400） */
export function chunkIds(ids: readonly number[], size: number = READ_BATCH_SIZE): number[][] {
  const limit = size > 0 ? Math.floor(size) : READ_BATCH_SIZE;
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += limit) {
    chunks.push(ids.slice(index, index + limit));
  }
  return chunks;
}

/** 未读且 id 有效的行（批量已读只针对它们） */
export function unreadIds(rows: readonly NotificationRow[]): number[] {
  return rows.filter((row) => !row.isRead).map((row) => row.id);
}

/** 公告永不可清空（清空时排除）；其余都可清 */
export function isClearable(type: string): boolean {
  return !ANNOUNCEMENT_TYPES.includes(type);
}

/** 这一行能不能点：目标不可用、或没有落点（`#`）→ 置灰（宪法 10.4：不可点的要给得出原因） */
export function canOpenNotification(row: NotificationRow): boolean {
  return row.target.available && row.target.path !== '#';
}

/**
 * 通知类型 → 界面上的一个说法。
 * ⚠️ 后端有几十种 `type`（`treehole_like`/`trending_comment`/`marketplace_chat`/…），
 *    ⛔ 不给每一种造一个词条 —— 按**后缀语义**收敛到 5 个。
 */
export function notificationKindKey(type: string): MessageKey {
  if (ANNOUNCEMENT_TYPES.includes(type)) return 'mailbox.kind.announcement';
  if (type === 'marketplace_chat') return 'mailbox.kind.chat';
  if (type.endsWith('_like') || type === 'like') return 'mailbox.kind.like';
  if (type.endsWith('_comment') || type === 'comment') return 'mailbox.kind.comment';
  return 'mailbox.kind.other';
}
