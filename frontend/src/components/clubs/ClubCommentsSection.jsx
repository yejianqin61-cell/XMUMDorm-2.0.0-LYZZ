import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SendHorizonal, PenLine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '@shared/api/config';
import { Toast } from '../../context/ToastContext';
import { getApiErrorMessage } from '@shared/utils/apiError';
import {
  getClubActivityComments,
  getClubPostComments,
  createClubActivityComment,
  createClubPostComment,
  deleteClubActivityComment,
  deleteClubPostComment,
} from '@shared/api/clubs';

function prefixUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function mapCommentTree(c) {
  return {
    ...c,
    author: c.author ? { ...c.author, avatar: c.author.avatar ? prefixUrl(c.author.avatar) : null } : c.author,
    replies: (c.replies || []).map((r) => ({
      ...r,
      author: r.author ? { ...r.author, avatar: r.author.avatar ? prefixUrl(r.author.avatar) : null } : r.author,
    })),
  };
}

/**
 * 社团活动 / 社团日常帖 评论区（一级 + 二级回复）
 * @param {{ targetType: 'activity'|'post', targetId: number, isZh: boolean, floatingComposer?: boolean, fillVertical?: boolean }} props
 */
export default function ClubCommentsSection({ targetType, targetId, isZh, floatingComposer = false, fillVertical = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user, isAdmin } = useAuth();
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [fabPulse, setFabPulse] = useState(false);

  const commentsKey = useMemo(() => ['clubs', 'comments', targetType, targetId], [targetType, targetId]);
  const detailKey = useMemo(
    () => (targetType === 'activity' ? ['clubs', 'activity', targetId] : ['clubs', 'post', targetId]),
    [targetType, targetId]
  );

  const loginPath = targetType === 'activity' ? `/about/club/activity/${targetId}` : `/about/club/post/${targetId}`;

  const requireLogin = useCallback(() => {
    if (!token) {
      navigate('/login', { replace: false, state: { from: { pathname: loginPath } } });
      return true;
    }
    return false;
  }, [token, navigate, loginPath]);

  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const raw =
        targetType === 'activity'
          ? await getClubActivityComments(targetId)
          : await getClubPostComments(targetId);
      const list = Array.isArray(raw) ? raw : [];
      return list.map(mapCommentTree);
    },
    enabled: Number.isFinite(targetId) && targetId > 0,
    staleTime: 20 * 1000,
  });

  const comments = commentsQuery.data ?? [];
  const totalCount = useMemo(
    () => comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0),
    [comments]
  );

  /** FAB 挂在 body，用 html 变量在 0 评论时上移 25px */
  useEffect(() => {
    if (!floatingComposer || !fillVertical || typeof document === 'undefined') return undefined;
    const el = document.documentElement;
    const zeroLoaded =
      !commentsQuery.isLoading && !commentsQuery.isError && commentsQuery.isSuccess && comments.length === 0;
    if (zeroLoaded) {
      el.style.setProperty('--club-fab-empty-lift', '25px');
    } else {
      el.style.removeProperty('--club-fab-empty-lift');
    }
    return () => {
      el.style.removeProperty('--club-fab-empty-lift');
    };
  }, [floatingComposer, fillVertical, commentsQuery.isLoading, commentsQuery.isError, commentsQuery.isSuccess, comments.length]);

  const createMut = useMutation({
    mutationFn: async ({ content, parent_id }) => {
      if (targetType === 'activity') {
        return createClubActivityComment(targetId, { content, parent_id });
      }
      return createClubPostComment(targetId, { content, parent_id });
    },
    onSuccess: async () => {
      setText('');
      setReplyingTo(null);
      if (floatingComposer) {
        setSheetOpen(false);
      }
      await queryClient.invalidateQueries({ queryKey: commentsKey });
      await queryClient.invalidateQueries({ queryKey: detailKey });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      Toast.success(isZh ? '评论成功' : 'Posted');
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (commentId) => {
      if (targetType === 'activity') {
        return deleteClubActivityComment(targetId, commentId);
      }
      return deleteClubPostComment(targetId, commentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentsKey });
      await queryClient.invalidateQueries({ queryKey: detailKey });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      Toast.success(isZh ? '已删除' : 'Deleted');
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
    },
  });

  const openSheet = useCallback(() => {
    setFabPulse(true);
    window.setTimeout(() => setFabPulse(false), 280);
    if (requireLogin()) return;
    setSheetOpen(true);
  }, [requireLogin]);

  useEffect(() => {
    if (!floatingComposer || !sheetOpen) {
      setKeyboardInset(0);
      return undefined;
    }
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKeyboardInset(inset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [floatingComposer, sheetOpen]);

  useEffect(() => {
    if (!floatingComposer || !sheetOpen) return undefined;
    const t = window.requestAnimationFrame(() => {
      textareaRef.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(t);
  }, [floatingComposer, sheetOpen]);

  useEffect(() => {
    if (!floatingComposer || !sheetOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSheetOpen(false);
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [floatingComposer, sheetOpen]);

  const startReply = useCallback(
    (node) => {
      setReplyingTo(node);
      if (floatingComposer) {
        if (requireLogin()) return;
        setSheetOpen(true);
        window.requestAnimationFrame(() => textareaRef.current?.focus?.());
      } else {
        window.setTimeout(() => inputRef.current?.focus?.(), 0);
      }
    },
    [floatingComposer, requireLogin]
  );

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const submitComment = useCallback(() => {
    if (requireLogin()) return;
    const content = text.trim();
    if (!content || createMut.isPending) return;
    const parent_id = replyingTo?.id > 0 ? replyingTo.id : undefined;
    createMut.mutate({ content, parent_id });
  }, [requireLogin, text, createMut, replyingTo]);

  const onSubmit = (e) => {
    e.preventDefault();
    submitComment();
  };

  const handleDelete = (commentId) => {
    if (requireLogin()) return;
    if (deleteMut.isPending) return;
    const ok = window.confirm(isZh ? '确定删除这条评论？' : 'Delete this comment?');
    if (!ok) return;
    deleteMut.mutate(commentId);
  };

  const closeSheet = useCallback(() => {
    if (createMut.isPending) return;
    setSheetOpen(false);
  }, [createMut.isPending]);

  const commentsSectionClass = [
    'club-comments',
    floatingComposer && 'club-comments--floating',
    floatingComposer && fillVertical && 'club-comments-container',
  ]
    .filter(Boolean)
    .join(' ');

  const overlay =
    floatingComposer && sheetOpen && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="club-comment-sheet-backdrop"
              aria-label={isZh ? '关闭' : 'Close'}
              onClick={closeSheet}
            />
            <div
              className="club-comment-sheet"
              style={{
                paddingBottom: `calc(14px + ${keyboardInset}px + env(safe-area-inset-bottom, 0px))`,
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="club-comment-sheet-title"
            >
              <div id="club-comment-sheet-title" className="club-comment-sheet-handle" aria-hidden />
              {replyingTo ? (
                <div className="club-comments-replying club-comments-replying--sheet">
                  <span className="club-comments-replying-label">
                    {isZh ? '回复' : 'Reply'}: {String(replyingTo.content || '').slice(0, 40)}
                    {String(replyingTo.content || '').length > 40 ? '…' : ''}
                  </span>
                  <button type="button" className="club-comments-replying-cancel" onClick={cancelReply}>
                    {isZh ? '取消' : 'Cancel'}
                  </button>
                </div>
              ) : null}
              <div className="club-comment-sheet-row">
                <textarea
                  ref={textareaRef}
                  className="club-comment-sheet-textarea"
                  placeholder={
                    replyingTo
                      ? isZh
                        ? '写下回复…'
                        : 'Write a reply…'
                      : isZh
                        ? '添加评论…'
                        : 'Add a comment…'
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <button
                  type="button"
                  className="club-comment-sheet-send"
                  disabled={!text.trim() || createMut.isPending}
                  onClick={submitComment}
                >
                  {createMut.isPending ? (isZh ? '发送中…' : 'Sending…') : isZh ? '发送' : 'Send'}
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  const fabEl =
    floatingComposer && typeof document !== 'undefined'
      ? createPortal(
          <button
            type="button"
            className={`club-comment-fab pressable ${fabPulse ? 'is-pulse' : ''}`}
            aria-label={isZh ? '写评论' : 'Write a comment'}
            onClick={openSheet}
          >
            <PenLine size={26} strokeWidth={2.2} color="#fff" aria-hidden />
          </button>,
          document.body
        )
      : null;

  return (
    <>
      <section className={commentsSectionClass} aria-label={isZh ? '评论' : 'Comments'}>
        <h2 className="club-comments-title">
          {isZh ? `评论 (${totalCount})` : `Comments (${totalCount})`}
        </h2>
        {commentsQuery.isError ? (
          <p className="club-comments-error" role="alert">
            {getApiErrorMessage(commentsQuery.error)}
          </p>
        ) : null}
        {commentsQuery.isLoading ? (
          <div className={fillVertical ? 'club-comments-loading club-comments-loading--fill' : 'club-comments-loading'}>
            {isZh ? '加载评论…' : 'Loading…'}
          </div>
        ) : (
          <ul
            className={[
              'club-comments-list',
              floatingComposer && 'club-comments-list--flush',
              floatingComposer && fillVertical && 'club-comments-list--stretch',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {comments.length === 0 ? (
              <li className={fillVertical ? 'club-comments-empty club-comments-empty--fill' : 'club-comments-empty'}>
                {isZh ? '暂无评论' : 'No comments yet'}
              </li>
            ) : (
              comments.map((c) => (
                <li key={c.id} className="club-comments-item">
                  <div className="club-comments-thread">
                    <div className="club-comments-avatar">
                      {c.author?.avatar ? (
                        <img src={c.author.avatar} alt="" />
                      ) : (
                        <img src="/default-avatar.svg" alt="" className="is-default" />
                      )}
                    </div>
                    <div className="club-comments-body">
                      <div className="club-comments-meta">
                        <span className="club-comments-name">{(c.author?.nickname ?? c.author?.username) || '—'}</span>
                        <button type="button" className="club-comments-reply" onClick={() => startReply(c)}>
                          {isZh ? '回复' : 'Reply'}
                        </button>
                        {(c.user_id === user?.id || isAdmin) && (
                          <button
                            type="button"
                            className="club-comments-delete"
                            onClick={() => handleDelete(c.id)}
                            disabled={deleteMut.isPending}
                          >
                            {isZh ? '删除' : 'Del'}
                          </button>
                        )}
                      </div>
                      <p className="club-comments-text">{c.content}</p>
                    </div>
                  </div>
                  {c.replies && c.replies.length > 0 ? (
                    <ul className="club-comments-replies">
                      {c.replies.map((r) => (
                        <li key={r.id} className="club-comments-thread club-comments-thread--reply">
                          <div className="club-comments-avatar">
                            {r.author?.avatar ? (
                              <img src={r.author.avatar} alt="" />
                            ) : (
                              <img src="/default-avatar.svg" alt="" className="is-default" />
                            )}
                          </div>
                          <div className="club-comments-body">
                            <div className="club-comments-meta">
                              <span className="club-comments-name">{(r.author?.nickname ?? r.author?.username) || '—'}</span>
                              {(r.user_id === user?.id || isAdmin) && (
                                <button
                                  type="button"
                                  className="club-comments-delete"
                                  onClick={() => handleDelete(r.id)}
                                  disabled={deleteMut.isPending}
                                >
                                  {isZh ? '删除' : 'Del'}
                                </button>
                              )}
                            </div>
                            <p className="club-comments-text">{r.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {!floatingComposer && replyingTo ? (
        <div className="club-comments-replying">
          <span className="club-comments-replying-label">
            {isZh ? '回复' : 'Reply'}: {String(replyingTo.content || '').slice(0, 24)}
            {String(replyingTo.content || '').length > 24 ? '…' : ''}
          </span>
          <button type="button" className="club-comments-replying-cancel" onClick={cancelReply}>
            {isZh ? '取消' : 'Cancel'}
          </button>
        </div>
      ) : null}

      {!floatingComposer ? (
        <form className="club-comments-bar" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="club-comments-input"
            placeholder={
              replyingTo
                ? isZh
                  ? '写下回复…'
                  : 'Write a reply…'
                : isZh
                  ? '添加评论…'
                  : 'Add a comment…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            className="club-comments-send"
            disabled={!text.trim() || createMut.isPending}
            aria-label={isZh ? '发送' : 'Send'}
          >
            <SendHorizonal size={18} aria-hidden />
          </button>
        </form>
      ) : null}

      {fabEl}
      {overlay}
    </>
  );
}
