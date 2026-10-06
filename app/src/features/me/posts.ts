/**
 * 我的帖子（`M-04`）的**纯规则**（P2C-04）
 *
 * ## 一个必须写下来的事实
 * **不存在 `GET /api/posts?mine`** —— 页面清单里那一行是错的（开发设计文档 §7 第 3 条已登记更正）。
 * Web 侧的做法就是本任务的做法：先 `GET /api/users/me` 拿自己的 `id`，
 * 再 `GET /api/users/:id/profile?page&pageSize`（`routes/users.js:185-273`）。
 *
 * 另外两条服务端事实会影响界面观感，必须如实对待：
 *   · 该接口**排除 `hidden_by_admin`** 的帖子 → 被隐藏的帖子不会出现在这里；
 *   · 它有 **10s 进程内缓存** → 删帖之后可能还会回来一次（所以删除成功后**本地先移除**）。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

import { getUploadUrl } from '../../../../shared/api/config';

export type MyPostRow = {
  id: number;
  /** 正文摘要（后端 `posts` 载荷只给 `content`，没有 title） */
  excerpt: string;
  likeCount: number;
  commentCount: number;
  imageUri: string | null;
  createdAt: string | null;
  type: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const asCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** 媒体 URL 归一化（幂等；头像与帖子图都走它，⛔ 不直接吃后端相对路径） */
export function imageUriOf(raw: unknown): string | null {
  const value = asString(raw);
  return value === null ? null : getUploadUrl(value);
}

/**
 * 正文 → 一行摘要（纯函数）。
 * 后端**没有 title**，所以列表的"标题"就是正文；超长要截断（⛔ 不让一张卡吃掉整屏）。
 */
export function postExcerpt(content: unknown, fallback: string, max = 60): string {
  const text = asString(content);
  if (text === null) return fallback;
  const collapsed = text.replace(/\s+/g, ' ');
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

export type ProfilePosts = {
  rows: MyPostRow[];
  hasMore: boolean;
  /** 服务端 `stats.post_count`（含被隐藏？不 —— 它也算 `hidden_by_admin = 0`） */
  total: number;
  userId: number | null;
};

/** `GET /api/users/:id/profile` 载荷 → 行（缺 id 的行丢掉：没有 id 就删不掉、也点不开） */
export function normalizeProfilePosts(payload: unknown): ProfilePosts {
  const raw = isObject(payload) ? payload : {};
  const user = isObject(raw.user) ? raw.user : {};
  const stats = isObject(raw.stats) ? raw.stats : {};
  const list = Array.isArray(raw.posts) ? raw.posts : [];

  const rows: MyPostRow[] = [];
  for (const entry of list) {
    if (!isObject(entry)) continue;
    const id = Number(entry.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const images = Array.isArray(entry.images) ? entry.images : [];
    const firstImage = images.find((image) => isObject(image) && asString(image.url) !== null);
    rows.push({
      id,
      excerpt: String(entry.content ?? ''),
      likeCount: asCount(entry.like_count),
      commentCount: asCount(entry.comment_count),
      imageUri: isObject(firstImage) ? imageUriOf(firstImage.url) : null,
      createdAt: asString(entry.created_at),
      type: asString(entry.type) ?? 'normal',
    });
  }

  const userId = Number(user.id);
  return {
    rows,
    hasMore: raw.hasMore === true,
    total: asCount(stats.post_count),
    userId: Number.isInteger(userId) && userId > 0 ? userId : null,
  };
}

/** 合并去重（追加下一页时用）：按 `id` 去重，**保持服务端顺序**（`created_at DESC`） */
export function mergePostRows(
  previous: readonly MyPostRow[],
  incoming: readonly MyPostRow[]
): MyPostRow[] {
  const seen = new Set(previous.map((row) => row.id));
  const merged = [...previous];
  for (const row of incoming) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

/** 本地移除（删帖成功后立刻生效，⛔ 不等服务端那 10s 缓存过期） */
export function removePostRow(rows: readonly MyPostRow[], id: number): MyPostRow[] {
  return rows.filter((row) => row.id !== id);
}
