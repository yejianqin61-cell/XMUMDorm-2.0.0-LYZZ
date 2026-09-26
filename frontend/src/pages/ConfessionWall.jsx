/**
 * 万能墙（Confession Wall）页面 — M09
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md
 * 路由：/confession（挂载于 frontend/src/routes/layoutRoutes.jsx）
 *
 * 形态：一屏一篇 + 键盘翻页 + 同页展开评论区。
 * 数据：游标分页（GET /window）+ 前端有界滑窗（shared/utils/confessionWindow.js）。
 * 键盘：规则集中在 shared/utils/confessionKeyboard.js（纯逻辑，已单测）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { QK } from '@shared/query/queryKeys';
import {
  getConfessionWindow,
  getConfessionComments,
  toggleConfessionLike,
  createConfessionComment,
  deleteConfession,
  deleteConfessionComment,
} from '@shared/api/confessions';
import {
  createWindowState,
  applyWindowPage,
  appendOlder,
  prependNewer,
  trimWindow,
  currentEntry,
  canGoNext,
  canGoPrev,
  move,
  jump,
  shouldPrefetch,
  patchEntry,
  removeEntry,
} from '@shared/utils/confessionWindow';
import {
  resolveKeyboardAction,
  keyboardContextFromEvent,
  CONFESSION_KEY_ACTIONS,
} from '@shared/utils/confessionKeyboard';
import ConfessionCard from '../components/confession/ConfessionCard';
import ConfessionPager from '../components/confession/ConfessionPager';
import ConfessionCommentPanel from '../components/confession/ConfessionCommentPanel';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import './ConfessionWall.css';

/** 单次窗口大小（与后端钳制范围 1..10 兼容） */
const WINDOW_LIMIT = 5;

export default function ConfessionWall() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, isAdmin, user, token } = useAuth();
  const queryClient = useQueryClient();

  const [state, setState] = useState(createWindowState);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [edgeHint, setEdgeHint] = useState(null); // 'newest' | 'oldest' | null
  const [loadingEdge, setLoadingEdge] = useState(null); // 'older' | 'newer' | null

  const wallRef = useRef(null);
  const edgeHintTimerRef = useRef(null);
  const viewerId = user && user.id != null ? Number(user.id) : null;
  const tokenKey = token ?? '';

  const current = currentEntry(state);
  const currentId = current ? current.id : null;

  // ---------- 首屏 / 刷新：拉最新一窗 ----------
  const firstPageQuery = useQuery({
    queryKey: QK.confessionWindow(tokenKey),
    queryFn: () => getConfessionWindow({ limit: WINDOW_LIMIT, direction: 'older' }),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (firstPageQuery.data) {
      setState((prev) => {
        // 只在尚未加载任何内容时铺满首屏，避免手动补窗被覆盖
        if (prev.ids.length > 0) return prev;
        return applyWindowPage(prev, firstPageQuery.data);
      });
    }
  }, [firstPageQuery.data]);

  // ---------- 边界提示：短暂显示后自动消失 ----------
  const flashEdge = useCallback((edge) => {
    setEdgeHint(edge);
    if (edgeHintTimerRef.current) clearTimeout(edgeHintTimerRef.current);
    edgeHintTimerRef.current = setTimeout(() => setEdgeHint(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (edgeHintTimerRef.current) clearTimeout(edgeHintTimerRef.current);
    },
    []
  );

  // ---------- 补窗：往更旧 / 更新方向各取一窗 ----------
  const loadEdge = useCallback(
    async (direction) => {
      if (!state.ids.length) return;
      const cursor = direction === 'older' ? state.ids[state.ids.length - 1] : state.ids[0];
      setLoadingEdge(direction);
      try {
        const page = await getConfessionWindow({ cursor, direction, limit: WINDOW_LIMIT });
        setState((prev) => {
          const next = direction === 'older' ? appendOlder(prev, page) : prependNewer(prev, page);
          return trimWindow(next);
        });
      } catch (err) {
        Toast.error(isZh ? '加载失败，请稍后重试' : 'Failed to load');
      } finally {
        setLoadingEdge(null);
      }
    },
    [state.ids, isZh]
  );

  // ---------- 预取：接近窗口任一端时静默补数据 ----------
  useEffect(() => {
    const need = shouldPrefetch(state);
    if (!need || loadingEdge) return;
    loadEdge(need);
  }, [state, loadingEdge, loadEdge]);

  // ---------- 导航 ----------
  const go = useCallback(
    (direction) => {
      const result = move(state, direction);
      if (result.moved) {
        setState(result.state);
        setCommentsOpen(false);
        return;
      }
      if (result.needsLoad) {
        loadEdge(result.needsLoad);
        return;
      }
      // 真正到头了：回弹提示
      flashEdge(direction === 'older' ? 'oldest' : 'newest');
    },
    [state, loadEdge, flashEdge]
  );

  const handleFirst = useCallback(() => {
    setState((prev) => jump(prev, 'first'));
    setCommentsOpen(false);
  }, []);

  const handleLast = useCallback(() => {
    setState((prev) => jump(prev, 'last'));
    setCommentsOpen(false);
  }, []);

  // ---------- 键盘控制（规则见 shared/utils/confessionKeyboard.js） ----------
  useEffect(() => {
    const el = wallRef.current;
    if (!el) return undefined;

    const onKeyDown = (event) => {
      const action = resolveKeyboardAction(
        event.key,
        keyboardContextFromEvent(event, commentsOpen)
      );
      if (!action) return;

      switch (action) {
        case CONFESSION_KEY_ACTIONS.PREV:
          event.preventDefault();
          go('newer');
          break;
        case CONFESSION_KEY_ACTIONS.NEXT:
          event.preventDefault();
          go('older');
          break;
        case CONFESSION_KEY_ACTIONS.FIRST:
          event.preventDefault();
          handleFirst();
          break;
        case CONFESSION_KEY_ACTIONS.LAST:
          event.preventDefault();
          handleLast();
          break;
        case CONFESSION_KEY_ACTIONS.OPEN_COMMENTS:
          event.preventDefault();
          setCommentsOpen(true);
          break;
        case CONFESSION_KEY_ACTIONS.CLOSE_COMMENTS:
          setCommentsOpen(false);
          break;
        default:
          break;
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [commentsOpen, go, handleFirst, handleLast]);

  // ---------- 评论 ----------
  const commentsQuery = useQuery({
    queryKey: QK.confessionComments(currentId ?? 'none'),
    queryFn: () => getConfessionComments(currentId),
    enabled: commentsOpen && currentId != null,
    staleTime: 5 * 1000,
  });

  const likeMutation = useMutation({
    mutationFn: (id) => toggleConfessionLike(id),
    onSuccess: (data, id) => {
      // 乐观更新已即时生效；这里用服务端返回的真实 count 校正
      setState((prev) =>
        patchEntry(prev, id, { liked: data.liked, like_count: data.like_count })
      );
    },
    onError: (_err, id) => {
      setState((prev) => {
        const entry = prev.entries[id];
        if (!entry) return prev;
        // 回滚乐观更新
        return patchEntry(prev, id, {
          liked: !entry.liked,
          like_count: Math.max(0, (entry.like_count || 0) + (entry.liked ? 1 : -1)),
        });
      });
      Toast.error(isZh ? '操作失败，请稍后重试' : 'Action failed');
    },
  });

  const handleToggleLike = useCallback(
    (confession) => {
      if (!isLoggedIn) {
        Toast.error(isZh ? '登录后才能点赞' : 'Sign in to like');
        return;
      }
      // 乐观更新
      setState((prev) =>
        patchEntry(prev, confession.id, {
          liked: !confession.liked,
          like_count: Math.max(0, (confession.like_count || 0) + (confession.liked ? -1 : 1)),
        })
      );
      likeMutation.mutate(confession.id);
    },
    [isLoggedIn, isZh, likeMutation]
  );

  const commentMutation = useMutation({
    mutationFn: ({ id, content, parentId }) =>
      createConfessionComment(id, { content, parent_id: parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.confessionComments(currentId) });
      setState((prev) =>
        patchEntry(prev, currentId, {
          comment_count: (prev.entries[currentId]?.comment_count || 0) + 1,
        })
      );
    },
    onError: () => Toast.error(isZh ? '评论失败，请稍后重试' : 'Comment failed'),
  });

  const handleSubmitComment = useCallback(
    async ({ content, parentId }) => {
      if (!isLoggedIn || currentId == null) return;
      setCommentSubmitting(true);
      try {
        await commentMutation.mutateAsync({ id: currentId, content, parentId });
      } finally {
        setCommentSubmitting(false);
      }
    },
    [isLoggedIn, currentId, commentMutation]
  );

  const handleDeleteComment = useCallback(
    async (comment) => {
      if (currentId == null) return;
      const ok = typeof window === 'undefined'
        ? true
        : window.confirm(isZh ? '确定删除这条评论吗？' : 'Delete this comment?');
      if (!ok) return;
      try {
        await deleteConfessionComment(currentId, comment.id);
        queryClient.invalidateQueries({ queryKey: QK.confessionComments(currentId) });
        setState((prev) =>
          patchEntry(prev, currentId, {
            comment_count: Math.max(0, (prev.entries[currentId]?.comment_count || 1) - 1),
          })
        );
        Toast.success(isZh ? '已删除' : 'Deleted');
      } catch {
        Toast.error(isZh ? '删除失败，请稍后重试' : 'Delete failed');
      }
    },
    [currentId, isZh, queryClient]
  );

  const handleDeleteConfession = useCallback(
    async (confession) => {
      const ok = typeof window === 'undefined'
        ? true
        : window.confirm(isZh ? '确定删除这篇投稿吗？' : 'Delete this confession?');
      if (!ok) return;
      try {
        await deleteConfession(confession.id);
        setState((prev) => trimWindow(removeEntry(prev, confession.id)));
        setCommentsOpen(false);
        Toast.success(isZh ? '已删除' : 'Deleted');
      } catch {
        Toast.error(isZh ? '删除失败，请稍后重试' : 'Delete failed');
      }
    },
    [isZh]
  );

  // ---------- 绝对序号（第 n 篇 / 共 m 篇） ----------
  // 首屏是新 → 旧，因此窗口内下标 i 对应的绝对序号就是 i + 1。
  const positionNumber = state.ids.length > 0 ? state.index + 1 : 0;

  const items = useMemo(
    () => state.ids.map((id) => state.entries[id]).filter(Boolean),
    [state.ids, state.entries]
  );

  // ---------- 渲染 ----------
  if (firstPageQuery.isPending) {
    return (
      <div className="cf-wall" ref={wallRef} tabIndex={-1}>
        <PageSkeleton />
      </div>
    );
  }

  if (firstPageQuery.isError) {
    return (
      <div className="cf-wall" ref={wallRef} tabIndex={-1}>
        <ErrorState
          title={isZh ? '万能墙暂时打不开' : 'Wall unavailable'}
          description={isZh ? '加载失败，请稍后重试' : 'Failed to load, please retry'}
          actionLabel={isZh ? '重试' : 'Retry'}
          onActionClick={() => firstPageQuery.refetch()}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cf-wall cf-wall--empty" ref={wallRef} tabIndex={-1}>
        <div className="cf-wall__empty">
          <h2>{isZh ? '万能墙还空着' : 'The wall is empty'}</h2>
          <p>
            {isZh
              ? '表白、寻人、寻物、提问都可以贴上来，全部匿名。'
              : 'Confessions, lost & found, questions — all anonymous.'}
          </p>
          <Link className="cf-wall__empty-cta" to="/confession/new">
            {isZh ? '写下第一篇' : 'Write the first one'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cf-wall" ref={wallRef} tabIndex={-1}>
      <header className="cf-wall__header">
        <div className="cf-wall__heading">
          <h1 className="cf-wall__title">{isZh ? '万能墙' : 'Confession Wall'}</h1>
          <p className="cf-wall__subtitle">
            {isZh ? '一屏一篇，匿名投放' : 'One at a time, fully anonymous'}
          </p>
        </div>
        <div className="cf-wall__header-actions">
          <span className="cf-wall__kbd-hint" aria-hidden="true">
            {isZh ? '↑↓ 翻页 · Enter 评论 · Esc 关闭弹窗' : '↑↓ navigate · Enter comments'}
          </span>
          <Link className="cf-wall__cta" to="/confession/new">
            {isZh ? '我要投稿' : 'Post'}
          </Link>
        </div>
      </header>

      <ConfessionPager
        items={items}
        index={state.index}
        positionNumber={positionNumber}
        total={state.total}
        canPrev={canGoPrev(state)}
        canNext={canGoNext(state)}
        atNewestEdge={edgeHint === 'newest'}
        atOldestEdge={edgeHint === 'oldest'}
        onPrev={() => go('newer')}
        onNext={() => go('older')}
        onFirst={handleFirst}
        onLast={handleLast}
        renderCard={(item) => (
          <ConfessionCard
            confession={item}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            onToggleLike={handleToggleLike}
            onOpenComments={() => setCommentsOpen(true)}
            onDelete={handleDeleteConfession}
            likePending={likeMutation.isPending && likeMutation.variables === item.id}
            commentsOpen={commentsOpen && item.id === currentId}
          />
        )}
      />

      {commentsOpen && currentId != null && (
        <ConfessionCommentPanel
          confessionId={currentId}
          comments={commentsQuery.data || []}
          isLoading={commentsQuery.isPending}
          isError={commentsQuery.isError}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          viewerIsAuthor={Boolean(current && current.viewer_is_author)}
          viewerId={viewerId}
          onSubmit={handleSubmitComment}
          onDelete={handleDeleteComment}
          onClose={() => setCommentsOpen(false)}
          submitting={commentSubmitting}
        />
      )}

      {loadingEdge && (
        <p className="cf-wall__loading-edge" role="status">
          {isZh ? '正在加载…' : 'Loading…'}
        </p>
      )}
    </div>
  );
}
