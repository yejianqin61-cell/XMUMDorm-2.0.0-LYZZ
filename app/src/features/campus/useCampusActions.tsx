import * as React from 'react';

import type { CommentNode } from '@/components/ui/CommentThread';
import { useListPagination } from '@/components/ui/ListScreen';
import type { CommentReplyContext } from '@/components/ui/CommentComposer';
import { useSession } from '@/features/auth/session';
import { classifyAuthFailure, isSessionInvalid } from '@/features/auth/authFailure';
import { useI18n } from '@/i18n';
import type { Translate } from '@/i18n';
import { levelNameKey } from '@/features/me/profile';
import {
  toggleLike,
  getPostComments,
  createComment,
  getPostDetail,
} from '../../../../shared/api/posts';
import {
  toggleConfessionLike,
  toggleConfessionFavorite,
  getConfessionComments,
  createConfessionComment,
  deleteConfessionComment,
  toggleConfessionCommentLike,
  featureConfessionComment,
} from '../../../../shared/api/confessions';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import { useCampusReport, type CampusReportReason, type CampusReportState } from './useCampusReport';

/**
 * 校园内容（树洞 / 万能墙）的**互动与评论状态**（不含任何 JSX）
 *
 * ⚠️ 本文件从"返回一段 JSX 的 body"改为**返回数据与动作**：视觉层（PostRow / Detail）
 * 现在由页面组合。原因有两个：
 *   1. 详情要粘性底栏 + 顶部提示两种位置，JSX 塞在 hook 里无法同时满足；
 *   2. 评论时间必须在**投影层**格式化（旧实现把后端 ISO 字符串直接显示到界面）。
 *
 * 阶段 3 新增：详情收藏、评论排序、评论点赞、楼主精选、评论举报、回复任意评论。
 * 匿名边界：这里只消费 `anonymous_no` / `is_author` / `viewer_is_mine`，
 * ⛔ 不读取也不保存任何 user_id / nickname / avatar。
 */

export type CampusInteractionPost = {
  id: number;
  user_liked?: boolean;
  liked?: boolean;
  favorited?: boolean;
  /** 后端 viewer_is_author（匿名域里唯一允许的「是不是楼主」信号） */
  is_mine?: boolean;
  like_count?: number;
  comment_count?: number;
};
export type CampusKind = 'confession' | 'wall';

/** 点赞/收藏/评论失败的可感知状态（页面据此渲染 InlineNotice / 登录入口） */
export type CampusNotice = 'login' | 'denied' | 'likeFailed' | 'favoriteFailed' | 'sendFailed' | null;

/** 一级评论排序：默认最热（App）；Web 不传 sort 时仍用服务端旧顺序 */
export type CampusCommentSort = 'hot' | 'latest';

export type CampusCommentNotice = 'likeFailed' | 'featureFailed' | 'featureLimit' | null;

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** 帖内匿名编号 → 展示名（匿名01/匿名02）；无编号时退回「匿名」 */
function anonymousLabel(t: Translate, no: number | null): string {
  return no === null
    ? t('screen.campus.read.anonymous')
    : t('screen.campus.read.anonymousWithNumber', { number: String(no).padStart(2, '0') });
}

function comment(
  value: unknown,
  kind: CampusKind,
  t: Translate,
  locale: 'zh' | 'en'
): CommentNode {
  if (!value || typeof value !== 'object') throw new Error('Invalid comment');
  const row = value as {
    id: number;
    content: string;
    parent_id?: number | null;
    root_id?: number | null;
    anonymous_no?: number | null;
    is_author?: boolean;
    featured?: boolean;
    reply_to_id?: number | null;
    reply_to_excerpt?: string | null;
    like_count?: number;
    liked?: boolean;
    author?: { nickname?: string; username?: string; avatar?: string; level?: number; badge?: string };
    created_at?: string;
    viewer_is_mine?: boolean;
  };
  if (!Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.content !== 'string') {
    throw new Error('Invalid comment');
  }
  const level =
    typeof row.author?.level === 'number' &&
    Number.isSafeInteger(row.author.level) &&
    row.author.level >= 1 &&
    row.author.level <= 6
      ? row.author.level
      : null;
  const parentId = positiveId(row.parent_id);
  const rootId = positiveId(row.root_id);
  const anonymousNo = positiveId(row.anonymous_no);
  const replyToId = positiveId(row.reply_to_id) ?? parentId;
  const likeCount = count(row.like_count);
  return {
    id: String(row.id),
    parentId: parentId === null ? null : String(parentId),
    depth: parentId === null ? 0 : 1,
    rootId: rootId === null ? null : String(rootId),
    content: row.content,
    // 万能墙专属：viewer_is_mine 只回答「是不是你自己发的」，不泄露任何身份（树洞契约不同，恒 undefined）
    canDelete: kind === 'wall' && row.viewer_is_mine === true ? true : undefined,
    isMine: row.viewer_is_mine === true,
    isAuthor: row.is_author === true,
    featured: row.featured === true,
    authorLabel: kind === 'wall' ? anonymousLabel(t, anonymousNo) : undefined,
    replyToId: replyToId === null ? null : String(replyToId),
    replyToExcerpt:
      typeof row.reply_to_excerpt === 'string' && row.reply_to_excerpt.trim()
        ? row.reply_to_excerpt
        : null,
    liked: row.liked === true,
    likeCount: likeCount ?? undefined,
    // 投影层就格式化：界面不再出现 `2026-10-15T10:42:00.000Z` 这种后端原文
    createdAtLabel: typeof row.created_at === 'string' ? formatPostTime(row.created_at, { locale }) : '',
    author:
      kind === 'wall'
        ? { kind: 'anonymous' }
        : {
            kind: 'named',
            name: row.author?.nickname || row.author?.username || '—',
            avatarUri:
              typeof row.author?.avatar === 'string' && row.author.avatar.trim()
                ? row.author.avatar
                : undefined,
            levelLabel: level === null ? undefined : t(levelNameKey(level)),
          },
  };
}

/** 把后端评论（一级 + replies）投影成扁平节点表（纯逻辑，未知身份在万能墙被丢弃） */
export function projectComments(
  value: unknown,
  kind: CampusKind,
  t: Translate,
  locale: 'zh' | 'en'
): CommentNode[] {
  if (!Array.isArray(value)) throw new Error('Invalid comments');
  const result: CommentNode[] = [];
  for (const row of value) {
    const root = comment(row, kind, t, locale);
    result.push(root);
    if (row.replies != null && !Array.isArray(row.replies)) throw new Error('Invalid replies');
    for (const reply of row.replies ?? []) result.push(comment(reply, kind, t, locale));
  }
  return Array.from(new Map(result.map((node) => [node.id, node])).values());
}

/** 删除评论时连带它的下级回复一起移除（与服务端级联保持一致） */
export function removeCommentWithDescendants(
  nodes: readonly CommentNode[],
  id: string
): { nodes: CommentNode[]; removed: number } {
  const removed = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId !== null && removed.has(node.parentId) && !removed.has(node.id)) {
        removed.add(node.id);
        changed = true;
      }
    }
  }
  return { nodes: nodes.filter((node) => !removed.has(node.id)), removed: removed.size };
}

/** 列表与详情共享同一个已鉴权点赞动作；⛔ 列表行不因此去加载评论 */
export function useCampusLike(post: CampusInteractionPost | null, kind: CampusKind) {
  const session = useSession();
  const [liked, setLiked] = React.useState(false),
    [favorited, setFavorited] = React.useState(false),
    [likeCount, setLikeCount] = React.useState<number | null>(null);
  const [commentCount, setCommentCount] = React.useState<number | null>(null);
  const [notice, setNotice] = React.useState<CampusNotice>(null);
  const epoch = React.useRef(0),
    likeLocked = React.useRef(false),
    favoriteLocked = React.useRef(false);
  React.useEffect(() => {
    ++epoch.current;
    likeLocked.current = false;
    favoriteLocked.current = false;
    setNotice(null);
    setLiked(kind === 'wall' ? post?.liked === true : post?.user_liked === true);
    setFavorited(post?.favorited === true);
    setLikeCount(count(post?.like_count));
    setCommentCount(count(post?.comment_count));
    return () => {
      ++epoch.current;
    };
  }, [post, kind]);
  const allowed = () => {
    if (session.isSignedIn) return true;
    setNotice('login');
    return false;
  };
  const fail = async (error: unknown, request: number, fallback: CampusNotice) => {
    const auth = classifyAuthFailure(error);
    if (request !== epoch.current) return;
    if (isSessionInvalid(auth)) await session.handleAuthFailure(error);
    if (request === epoch.current) {
      setNotice(isSessionInvalid(auth) ? 'login' : auth === 'sanctioned' ? 'denied' : fallback);
    }
  };
  const like = async () => {
    if (!post || likeLocked.current || !allowed()) return;
    likeLocked.current = true;
    const request = epoch.current;
    setNotice(null);
    try {
      const data =
        kind === 'wall' ? await toggleConfessionLike(post.id) : await toggleLike(post.id);
      if (request !== epoch.current) return;
      const target = kind === 'wall' ? data?.confession_id : data?.post_id;
      if (target !== post.id || typeof data?.liked !== 'boolean') {
        throw new Error('Invalid like response');
      }
      setLiked(data.liked);
      // 树洞响应不带计数：保持上一次的服务端计数，⛔ 不发明新数字
      if (count(data.like_count) !== null) setLikeCount(data.like_count);
      else if (kind === 'confession') {
        setLikeCount(null);
        try {
          const fresh = await getPostDetail(post.id);
          if (request === epoch.current && fresh?.id === post.id) setLikeCount(count(fresh.like_count));
        } catch {
          /* 计数未知就保持占位，点赞态仍以成功响应为准 */
        }
      }
    } catch (error) {
      await fail(error, request, 'likeFailed');
    } finally {
      if (request === epoch.current) likeLocked.current = false;
    }
  };
  const favorite = async () => {
    if (kind !== 'wall' || !post || favoriteLocked.current || !allowed()) return;
    favoriteLocked.current = true;
    const request = epoch.current;
    setNotice(null);
    try {
      const data = await toggleConfessionFavorite(post.id);
      if (request !== epoch.current) return;
      if (data?.confession_id !== post.id || typeof data?.favorited !== 'boolean') {
        throw new Error('Invalid favorite response');
      }
      setFavorited(data.favorited);
    } catch (error) {
      await fail(error, request, 'favoriteFailed');
    } finally {
      if (request === epoch.current) favoriteLocked.current = false;
    }
  };
  return {
    liked,
    favorited,
    likeCount,
    commentCount,
    notice,
    onToggleLike: () => void like(),
    onToggleFavorite: () => void favorite(),
    incrementCommentCount: () =>
      setCommentCount((current) => (current === null ? null : current + 1)),
    adjustCommentCount: (delta: number) =>
      setCommentCount((current) =>
        current === null ? null : Math.max(0, current + Math.trunc(delta))
      ),
  };
}

export type CampusActions = {
  interactions: {
    liked: boolean;
    favorited: boolean;
    likeCount: number | null;
    commentCount: number | null;
  };
  onToggleLike: () => void;
  onToggleFavorite: () => void;
  likeNotice: CampusNotice;
  comments: {
    nodes: readonly CommentNode[];
    loading: boolean;
    error: boolean;
    retry: () => void;
    onReply: (id: string) => void;
    /** 万能墙：删除自己的评论（乐观移除本条与下级回复，失败回滚并置 deleteFailed） */
    deleteComment: (id: string) => void;
    deleteFailed: boolean;
    /** 一级评论排序（仅万能墙；树洞忽略） */
    sort: CampusCommentSort;
    setSort: (next: CampusCommentSort) => void;
    onToggleLike: (id: string) => void;
    /** 楼主精选 / 取消（服务端仍校验作者与 3 条上限） */
    onToggleFeature: (id: string) => void;
    notice: CampusCommentNotice;
    /** 评论举报：targetId 决定抽屉针对哪一条 */
    report: {
      targetId: number | null;
      state: CampusReportState;
      open: (id: string) => void;
      close: () => void;
      submit: (reason: CampusReportReason, detail: string) => Promise<void>;
    };
  };
  reply: CommentNode | null;
  cancelReply: () => void;
  replyContext: CommentReplyContext | undefined;
  draft: string;
  setDraft: (next: string) => void;
  sending: boolean;
  send: () => void;
  composeNotice: CampusNotice;
  report: {
    state: CampusReportState;
    submit: (reason: CampusReportReason, detail: string) => Promise<void>;
  };
};

/**
 * 详情的互动 + 评论读写。**不产生任何 JSX**：
 * 页面把 `likeNotice` 渲染在动作区、把 `composeNotice` 渲染在粘性底栏上方。
 */
export function useCampusActions(
  post: CampusInteractionPost | null,
  kind: CampusKind
): CampusActions {
  const { t, locale } = useI18n();
  const session = useSession();
  const [commentReportId, setCommentReportId] = React.useState<number | null>(null);
  const report = useCampusReport(
    post ? { id: post.id, kind } : null,
    session.isSignedIn,
    session.handleAuthFailure
  );
  const commentReport = useCampusReport(
    kind === 'wall' && commentReportId !== null ? { id: commentReportId, kind: 'comment' } : null,
    session.isSignedIn,
    session.handleAuthFailure
  );
  const like = useCampusLike(post, kind);
  const [nodes, setNodes] = React.useState<CommentNode[]>([]),
    [draft, setDraft] = React.useState('');
  const [reply, setReply] = React.useState<CommentNode | null>(null),
    [sending, setSending] = React.useState(false),
    [commentDeleteFailed, setCommentDeleteFailed] = React.useState(false),
    [commentNotice, setCommentNotice] = React.useState<CampusCommentNotice>(null);
  const [commentSort, setCommentSortState] = React.useState<CampusCommentSort>('hot');
  const sortRef = React.useRef<CampusCommentSort>('hot');
  const [notice, setNotice] = React.useState<CampusNotice>(null);
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: false } });
  const epoch = React.useRef(0),
    locks = React.useRef({ send: false, read: false });
  const commentLocks = React.useRef(new Set<string>());
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const replyRef = React.useRef(reply);
  replyRef.current = reply;

  // 读评论的函数需要能在自己的 finally 里重跑（排序在请求期间被切换），
  // 用 ref 承接避免 useCallback 自引用导致 React Compiler 放弃记忆化。
  const reloadComments = React.useRef<(sort: CampusCommentSort) => void>(() => undefined);

  const loadComments = React.useCallback(
    async (sortOverride?: CampusCommentSort) => {
      if (!post || locks.current.read || locks.current.send) return;
      locks.current.read = true;
      const request = epoch.current;
      const requested = sortOverride ?? sortRef.current;
      dispatch({ type: 'append:start' });
      try {
        const data =
          kind === 'wall'
            ? await getConfessionComments(post.id, { sort: requested })
            : await getPostComments(post.id);
        if (request !== epoch.current) return;
        const list = projectComments(data, kind, t, locale).map((node) => ({
          ...node,
          // 只有楼主能精选，且只针对一级评论（服务端仍会再次校验）
          canFeature: kind === 'wall' && post.is_mine === true && node.depth === 0,
        }));
        setNodes(list);
        dispatch({ type: 'append:success', hasMore: false });
      } catch {
        if (request === epoch.current) dispatch({ type: 'append:failure', error: { kind: 'unknown' } });
      } finally {
        if (request === epoch.current) {
          locks.current.read = false;
          // 读取期间用户切了排序：本轮结果作废，按最新选择再读一次
          if (sortRef.current !== requested) reloadComments.current(sortRef.current);
        }
      }
    },
    [post, kind, dispatch, t, locale]
  );

  React.useEffect(() => {
    reloadComments.current = (next) => void loadComments(next);
  }, [loadComments]);

  /** 排序切换：只重读评论，不清空输入框 / 回复目标 */
  const setSort = React.useCallback(
    (next: CampusCommentSort): void => {
      if (kind !== 'wall' || next === sortRef.current) return;
      sortRef.current = next;
      setCommentSortState(next);
      setCommentNotice(null);
      // 不先清空列表：读取失败时仍可看到旧评论；成功后整表替换
      void loadComments(next);
    },
    [kind, loadComments]
  );

  const patchNode = React.useCallback((id: string, patch: Partial<CommentNode>) => {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  }, []);

  /** 万能墙：评论点赞（乐观更新，失败回滚） */
  const toggleCommentLike = React.useCallback(
    async (id: string): Promise<void> => {
      if (kind !== 'wall' || !post) return;
      if (!session.isSignedIn) {
        setNotice('login');
        return;
      }
      if (commentLocks.current.has(id)) return;
      const node = nodes.find((item) => item.id === id);
      if (!node) return;
      commentLocks.current.add(id);
      setCommentNotice(null);
      patchNode(id, {
        liked: node.liked !== true,
        likeCount: Math.max(0, (node.likeCount ?? 0) + (node.liked === true ? -1 : 1)),
      });
      try {
        const data = await toggleConfessionCommentLike(post.id, Number(id));
        if (data?.comment_id !== Number(id) || typeof data?.liked !== 'boolean') {
          throw new Error('Invalid comment like response');
        }
        patchNode(id, {
          liked: data.liked,
          ...(count(data.like_count) !== null ? { likeCount: data.like_count } : {}),
        });
      } catch {
        patchNode(id, { liked: node.liked, likeCount: node.likeCount });
        setCommentNotice('likeFailed');
      } finally {
        commentLocks.current.delete(id);
      }
    },
    [kind, nodes, patchNode, post, session.isSignedIn]
  );

  /** 楼主精选：只允许帖子作者操作一级评论；成功后按服务端顺序重读（置顶靠服务端） */
  const toggleFeature = React.useCallback(
    async (id: string): Promise<void> => {
      if (kind !== 'wall' || !post || post.is_mine !== true) return;
      const node = nodes.find((item) => item.id === id);
      if (!node || node.depth !== 0) return;
      if (!session.isSignedIn) {
        setNotice('login');
        return;
      }
      const next = node.featured !== true;
      setCommentNotice(null);
      patchNode(id, { featured: next });
      try {
        const data = await featureConfessionComment(post.id, Number(id), next);
        if (data?.comment_id !== Number(id) || typeof data?.featured !== 'boolean') {
          throw new Error('Invalid feature response');
        }
        await loadComments();
      } catch (error) {
        patchNode(id, { featured: node.featured });
        const status = (error as { status?: number } | null)?.status;
        setCommentNotice(status === 409 ? 'featureLimit' : 'featureFailed');
      }
    },
    [kind, loadComments, nodes, patchNode, post, session.isSignedIn]
  );

  /** 万能墙：删自己的评论——本条与下级回复一起移除，失败整组回滚并提示 */
  const deleteComment = React.useCallback(
    async (commentId: string): Promise<void> => {
      if (kind !== 'wall' || !post) return;
      const snapshotNodes = nodes;
      const { nodes: nextNodes, removed } = removeCommentWithDescendants(nodes, commentId);
      setCommentDeleteFailed(false);
      setNodes(nextNodes);
      try {
        const acknowledgement = await deleteConfessionComment(post.id, Number(commentId));
        if (!acknowledgement || typeof acknowledgement !== 'object' || (acknowledgement as { status?: unknown }).status !== 0) {
          throw new Error('Invalid comment delete acknowledgement');
        }
        like.adjustCommentCount(-removed);
      } catch {
        setNodes(snapshotNodes);
        setCommentDeleteFailed(true);
      }
    },
    [kind, like, nodes, post]
  );

  React.useEffect(() => {
    ++epoch.current;
    locks.current = { send: false, read: false };
    commentLocks.current.clear();
    setNodes([]);
    setDraft('');
    setReply(null);
    setSending(false);
    setNotice(null);
    setCommentNotice(null);
    setCommentDeleteFailed(false);
    setCommentReportId(null);
    sortRef.current = 'hot';
    setCommentSortState('hot');
    dispatch({ type: 'append:success', hasMore: false });
    void loadComments('hot');
    return () => {
      ++epoch.current;
    };
  }, [post, kind, loadComments, dispatch]);

  const allowed = () => {
    if (session.isSignedIn) return true;
    setNotice('login');
    return false;
  };

  const send = async () => {
    const content = draftRef.current.trim();
    const parent = replyRef.current;
    if (
      !post ||
      locks.current.send ||
      locks.current.read ||
      !allowed() ||
      !content ||
      (kind === 'wall' && content.length > 500)
    ) {
      return;
    }
    const original = draftRef.current;
    const request = epoch.current;
    locks.current.send = true;
    setSending(true);
    setNotice(null);
    try {
      const payload = parent ? { content, parent_id: Number(parent.id) } : { content };
      const data =
        kind === 'wall'
          ? await createConfessionComment(post.id, payload)
          : await createComment(post.id, payload);
      if (request !== epoch.current) return;
      const node = comment(data, kind, t, locale);
      // 新回复归到它所属的一级评论；如果是回复一条回复，不新增视觉层级
      const rootId = parent === null ? null : parent.depth === 0 ? parent.id : parent.rootId ?? null;
      const projected: CommentNode = {
        ...node,
        parentId: parent ? parent.id : null,
        depth: parent ? 1 : 0,
        rootId,
        replyToId: parent ? parent.id : null,
        replyToExcerpt: parent ? (parent.content.trim().slice(0, 40) || null) : null,
        canFeature: kind === 'wall' && parent === null && post.is_mine === true,
      };
      setNodes((current) => {
        if (current.some((item) => item.id === projected.id)) return current;
        // 最新排序下，新发的一级评论应在最前；回复仍按时间追加到所属一级评论下
        if (kind === 'wall' && parent === null && sortRef.current === 'latest') {
          return [projected, ...current];
        }
        return [...current, projected];
      });
      like.incrementCommentCount();
      // 发送成功后**只清空"这次发出的内容"**：发送期间用户新打的内容不得被旧响应清掉
      if (draftRef.current === original && replyRef.current?.id === parent?.id) {
        setDraft('');
        setReply(null);
      }
    } catch (error) {
      const auth = classifyAuthFailure(error);
      if (request !== epoch.current) return;
      if (isSessionInvalid(auth)) await session.handleAuthFailure(error);
      if (request === epoch.current) {
        setNotice(isSessionInvalid(auth) ? 'login' : auth === 'sanctioned' ? 'denied' : 'sendFailed');
      }
    } finally {
      if (request === epoch.current) {
        locks.current.send = false;
        setSending(false);
      }
    }
  };

  const replyContext: CommentReplyContext | undefined =
    reply === null
      ? undefined
      : kind === 'wall' || reply.author.kind === 'anonymous'
        ? {
            kind: 'anonymous',
            anonymousLabel: t('screen.campus.read.replyToAnonymous', {
              name:
                reply.authorLabel ??
                (reply.author.kind === 'named' ? reply.author.name : t('screen.campus.read.anonymous')),
            }),
            cancelLabel: t('action.cancel'),
            onCancel: () => setReply(null),
          }
        : {
            kind: 'named',
            label: t('screen.campus.write.namedReply', { name: reply.author.name }),
            cancelLabel: t('action.cancel'),
            onCancel: () => setReply(null),
          };

  return {
    interactions: {
      liked: like.liked,
      favorited: like.favorited,
      likeCount: like.likeCount,
      commentCount: like.commentCount,
    },
    onToggleLike: like.onToggleLike,
    onToggleFavorite: like.onToggleFavorite,
    likeNotice: like.notice,
    comments: {
      nodes,
      loading: pagination.append === 'loading',
      error: pagination.append === 'error',
      retry: () => void loadComments(),
      onReply: (id: string) => {
        const node = nodes.find(
          (item) => item.id === id && (kind === 'wall' || item.depth === 0)
        );
        if (node) setReply(node);
      },
      deleteComment: (id: string) => void deleteComment(id),
      deleteFailed: commentDeleteFailed,
      sort: commentSort,
      setSort,
      onToggleLike: (id: string) => void toggleCommentLike(id),
      onToggleFeature: (id: string) => void toggleFeature(id),
      notice: commentNotice,
      report: {
        targetId: commentReportId,
        state: commentReport.state,
        open: (id: string) => setCommentReportId(Number(id)),
        close: () => setCommentReportId(null),
        submit: commentReport.submit,
      },
    },
    reply,
    cancelReply: () => setReply(null),
    replyContext,
    draft,
    setDraft,
    sending,
    send: () => void send(),
    composeNotice: notice,
    report: { state: report.state, submit: report.submit },
  };
}
