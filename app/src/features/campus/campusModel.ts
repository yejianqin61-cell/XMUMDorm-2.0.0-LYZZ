/**
 * 校园内容（树洞 / 万能墙）的**数据投影与校验**（纯函数，可测）
 *
 * 从旧的 `CampusScreens.tsx` 抽出：页面只组合视觉，校验/投影留在这里。
 * ⛔ 不把后端的 snake_case 直接交给组件；⛔ 不显示被隐藏/删除的帖子。
 */

import type { AppError } from '@/i18n/errors';

export type Post = {
  id: number;
  liked?: boolean;
  user_liked?: boolean;
  like_count?: number;
  comment_count?: number;
  /** 万能墙专属：这条投稿是不是当前登录用户发的（后端 viewer_is_author，匿名域唯一身份信号） */
  is_mine?: boolean;
  title?: string | null;
  content: string;
  created_at?: string;
  template_key?: string;
  author?: {
    id?: number;
    avatar?: string;
    nickname?: string;
    username?: string;
    level?: number;
    badge?: string;
  } | null;
  tags?: { id?: number; slug?: string; name_zh?: string; name_en?: string }[];
  images?: { url: string }[];
};

/** 树洞列表分页大小（后端 `pageSize ≤ 50`） */
export const TREEHOLE_PAGE_SIZE = 10;

/** 搜索关键词上限（后端 `q ≤ 200`） */
export const SEARCH_MAX_LENGTH = 200;

/** 校验一条树洞列表/详情行；隐藏、已删除、字段不合法的行一律拒绝 */
export function asPost(value: unknown): Post {
  if (!value || typeof value !== 'object') throw { kind: 'content' };
  const row = value as Post & { hidden?: boolean; deleted_at?: unknown; hidden_by_admin?: boolean };
  if (
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    typeof row.content !== 'string' ||
    row.hidden ||
    row.deleted_at ||
    row.hidden_by_admin
  ) {
    throw { kind: 'content' };
  }
  if (row.title != null && typeof row.title !== 'string') throw { kind: 'content' };
  if (row.created_at != null && typeof row.created_at !== 'string') throw { kind: 'content' };
  return row;
}

/** 万能墙行：**永远不保留原始身份、标题与图片**（匿名是后端写死的不变量） */
export function asWall(value: unknown): Post {
  const row = asPost(value);
  return {
    id: row.id,
    content: row.content,
    template_key: row.template_key,
    created_at: row.created_at,
    liked: row.liked,
    like_count: row.like_count,
    comment_count: row.comment_count,
    is_mine: (value as { viewer_is_author?: unknown } | null)?.viewer_is_author === true ? true : undefined,
  };
}

/** 把任意失败映射成 AppError（文案由 i18n/errors 统一给出，⛔ 不外泄技术细节） */
export function errorFor(failure: unknown): AppError {
  if (failure && typeof failure === 'object') {
    const e = failure as { kind?: AppError['kind']; status?: number; name?: string };
    if (
      e.kind &&
      ['offline', 'unreachable', 'timeout', 'validation', 'permission', 'content', 'conflict', 'unknown'].includes(
        e.kind
      )
    ) {
      return { kind: e.kind };
    }
    if (e.status === 404) return { kind: 'content' };
    if (e.status === 401 || e.status === 403) return { kind: 'permission' };
    if (e.name === 'AbortError') return { kind: 'timeout' };
    if (failure instanceof TypeError) return { kind: 'unreachable' };
  }
  return { kind: 'unknown' };
}
