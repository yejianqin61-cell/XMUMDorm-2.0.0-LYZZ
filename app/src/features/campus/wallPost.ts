/**
 * 万能墙**两卡模型**（阶段 1）
 *
 * 产品口径（2026-11-02 所有者）：万能墙只有两种帖子 —— **自由帖**与**招募帖**，
 * 旧六卡（海报/档案/便签/公告/对话/清单）不再作为独立类型；旧公告等历史行
 * 一律并入**自由帖**的纯文本呈现。
 *
 * 本文件只做**投影**（纯数据，可测），⛔ 不含任何视觉与文案：
 *   · 后端行 → `WallPost`（自由帖），匿名是后端写死的不变量，这里不保留作者字段；
 *   · 招募帖的结构化字段属于**样板形状**，阶段 5 才接真实发布与状态维护。
 */

import type { Post } from './campusModel';
import type { WallPosterStyle, WallPosterTemplateId } from './wallPosterTemplates';

export type WallPostKind = 'free' | 'recruit';

export type WallRecruitStatus = 'open' | 'full';

/** 招募帖的结构化信息（阶段 1 样板；字段名不承诺为最终契约） */
export type WallRecruit = {
  title: string;
  description: string;
  /** 已确认 / 目标人数，例：`3/4`。由发起人手动维护，不由系统推断 */
  headcount: string;
  /** 活动或集合时间（展示用字符串） */
  time: string;
  place: string;
  status: WallRecruitStatus;
};

export type WallPost = {
  /** 后端 id；示例帖用 900001+ 的保留段，保证不与真实投稿冲突 */
  id: number;
  kind: WallPostKind;
  /** 自由帖正文；招募帖留空 */
  content: string;
  /**
   * 阶段 2：自由帖已确认的文字海报模板（阶段 2-B 起随帖子持久化）。
   * 缺省表示"还没有选过"——信息流按正文特征**确定性**推荐，不会每次随机。
   */
  posterStyle?: WallPosterStyle;
  posterTemplateId?: WallPosterTemplateId;
  /** ISO 时间；缺失时卡片只显示「匿名」 */
  createdAt?: string;
  likeCount: number;
  commentCount: number;
  /** 阶段 3：当前账号是否已赞 / 已收藏（列表互动的初始态） */
  liked?: boolean;
  favorited?: boolean;
  /** 招募帖才有 */
  recruit?: WallRecruit;
  /** 阶段 1 的静态样板，界面上必须显式标注「示例」 */
  sample?: boolean;
};

/**
 * 后端万能墙行 → 自由帖。
 *
 * 旧行的 `template_key` 一律**忽略**：六卡版式不再参与呈现，
 * 历史内容按纯文本自由帖阅读（所有者 2026-11-02 裁决：旧卡并入自由帖）。
 */
export function wallPostFromRow(row: Post): WallPost {
  return {
    id: row.id,
    kind: 'free',
    content: row.content,
    ...(row.poster_style ? { posterStyle: row.poster_style } : {}),
    ...(row.created_at === undefined ? {} : { createdAt: row.created_at }),
    likeCount: typeof row.like_count === 'number' && row.like_count > 0 ? row.like_count : 0,
    commentCount: typeof row.comment_count === 'number' && row.comment_count > 0 ? row.comment_count : 0,
    liked: row.liked === true,
    favorited: row.favorited === true,
  };
}
