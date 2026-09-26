/**
 * 万能墙评论弹窗 — M09
 *
 * 设计文档 §7.5。以**悬浮居中弹窗**呈现（portal 到 body）：
 * 把评论区从文档流里拿走，翻页视图的高度与翻页几何不再被评论列表挤压。
 *
 * 弹窗自己负责三件无障碍的事——portal 之后事件不再冒泡到墙容器，这些必须在内部处理：
 *   1. Esc 关闭；若内部还开着更深的浮层（如举报弹层），让给它
 *   2. Tab / Shift+Tab 焦点陷阱（环绕逻辑在 shared/utils/focusTrap.js，已单测）
 *   3. 打开时锁背景滚动，关闭时把焦点还给触发元素
 *
 * 评论同样匿名：后端不下发任何身份字段，本组件也不接收。
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { formatPostTime } from '@shared/utils/formatTime';
import { FOCUSABLE_SELECTOR, computeTabTargetIndex } from '@shared/utils/focusTrap';
import ReportButton from '../ReportButton';

/** 与后端保持一致的单条评论长度上限 */
export const COMMENT_MAX_LENGTH = 500;

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

/**
 * 面板内部是否还开着更深的浮层（如 ReportButton 的举报弹层）。
 * 这类浮层用 position: fixed 自绘覆盖，没有可辨识的 role，
 * 因此从事件目标往上找到面板根节点，遇到 fixed 祖先就认定「还有一层」。
 */
function hasNestedOverlay(target, root) {
  if (typeof window === 'undefined' || !root) return false;
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (window.getComputedStyle(node).position === 'fixed') return true;
    node = node.parentElement;
  }
  return false;
}

/** 面板内当前真正可见（非 display:none）的可聚焦元素 */
function visibleFocusable(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node) => node.getClientRects().length > 0
  );
}

/** 单条评论（含其 replies） */
function CommentRow({
  comment,
  isZh,
  isLoggedIn,
  isAdmin,
  viewerCanDelete,
  onReply,
  onDelete,
  depth = 0,
}) {
  const anonymousLabel = isZh ? '匿名' : 'Anonymous';
  const canDelete = isLoggedIn && (viewerCanDelete(comment) || isAdmin);

  return (
    <li className={`cf-comment cf-comment--depth-${depth}`}>
      <div className="cf-comment__head">
        <span className="cf-comment__author">{anonymousLabel}</span>
        <time className="cf-comment__time" dateTime={comment.created_at}>
          {formatPostTime(comment.created_at, { locale: isZh ? 'zh' : 'en' })}
        </time>
      </div>
      <p className="cf-comment__content">{comment.content}</p>

      <div className="cf-comment__actions">
        {isLoggedIn && depth === 0 && (
          <button type="button" className="cf-comment__action" onClick={() => onReply(comment)}>
            <ReplyIcon />
            <span>{isZh ? '回复' : 'Reply'}</span>
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="cf-comment__action cf-comment__action--danger"
            onClick={() => onDelete(comment)}
          >
            <TrashIcon />
            <span>{isZh ? '删除' : 'Delete'}</span>
          </button>
        )}
        {isLoggedIn && (
          <ReportButton
            target_type="confession_comment"
            target_id={comment.id}
            className="cf-comment__action"
            iconOnly
          />
        )}
      </div>

      {depth === 0 && comment.replies && comment.replies.length > 0 && (
        <ul className="cf-comment__replies">
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              isZh={isZh}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              viewerCanDelete={viewerCanDelete}
              onReply={onReply}
              onDelete={onDelete}
              depth={1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * @param {Object} props
 * @param {number} props.confessionId
 * @param {Array} props.comments
 * @param {boolean} props.isLoading
 * @param {boolean} props.isError
 * @param {boolean} props.isLoggedIn
 * @param {boolean} props.isAdmin
 * @param {boolean} props.viewerIsAuthor - 当前帖子是否本人发布
 * @param {number|null} props.viewerId - 当前用户 id（仅用于判断「自己的评论」，不用于展示）
 * @param {Function} props.onSubmit - ({content, parentId}) => Promise
 * @param {Function} props.onDelete
 * @param {Function} props.onClose
 * @param {boolean} [props.submitting]
 */
export default function ConfessionCommentPanel({
  confessionId,
  comments = [],
  isLoading = false,
  isError = false,
  isLoggedIn = false,
  isAdmin = false,
  viewerIsAuthor = false,
  viewerId = null,
  onSubmit,
  onDelete,
  onClose,
  submitting = false,
}) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null); // 被回复的评论对象
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const backdropPressedRef = useRef(false);

  // 挂载时锁背景滚动，并记下打开弹窗前的焦点；卸载时恢复（含焦点归还）。
  // 必须声明在下面的聚焦 effect 之前——activeElement 得是「打开弹窗的那个元素」。
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      if (
        previousFocus &&
        previousFocus !== document.body &&
        typeof previousFocus.focus === 'function' &&
        document.contains(previousFocus)
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  // 打开时聚焦：登录 → 直接开写；未登录 → 关闭按钮（保证焦点一定进入弹窗，陷阱才有意义）
  useEffect(() => {
    if (isLoggedIn) {
      inputRef.current?.focus();
    } else {
      closeBtnRef.current?.focus();
    }
  }, [isLoggedIn, replyTo]);

  // Esc 关闭 + Tab 焦点陷阱
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        // 内部还有举报弹层等更深的浮层时，Esc 归它
        if (hasNestedOverlay(event.target, panelRef.current)) return;
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const nodes = visibleFocusable(panel);
      const target = computeTabTargetIndex(
        nodes.length,
        nodes.indexOf(document.activeElement),
        event.shiftKey
      );
      if (target == null) return;
      event.preventDefault();
      nodes[target].focus();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
    0
  );

  /**
   * 删除权限判定：后端才是权威。这里仅决定是否渲染按钮，
   * 且只用「本人」这一个条件——不做任何「作者是谁」的推断。
   * 帖子作者可以删自己帖子下的任意评论（与树洞一致）。
   */
  const viewerCanDelete = (comment) => {
    if (viewerIsAuthor) return true;
    return viewerId != null && comment.viewer_is_mine === true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;
    if (text.length > COMMENT_MAX_LENGTH) return;

    await onSubmit({ content: text, parentId: replyTo ? replyTo.id : null });
    setContent('');
    setReplyTo(null);
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    if (inputRef.current) inputRef.current.focus();
  };

  // 只在「按下」和「松开」都落在遮罩本身时才关闭：
  // 从弹窗内拖选文字到外面松手，不应误判为点击遮罩。
  const handleBackdropMouseDown = (event) => {
    backdropPressedRef.current = event.target === event.currentTarget;
  };

  const handleBackdropClick = (event) => {
    const shouldClose = backdropPressedRef.current && event.target === event.currentTarget;
    backdropPressedRef.current = false;
    if (shouldClose) onClose?.();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cf-comments-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <section
        className="cf-comments"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-comments-title"
        tabIndex={-1}
      >
        <header className="cf-comments__head">
          <h3 className="cf-comments__title" id="cf-comments-title">
            {isZh ? '评论' : 'Comments'}
            {totalCount > 0 && <span className="cf-comments__count">{totalCount}</span>}
          </h3>
          <button
            type="button"
            className="cf-comments__close"
            ref={closeBtnRef}
            onClick={onClose}
            aria-label={isZh ? '关闭评论区' : 'Close comments'}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="cf-comments__body">
          {isLoading && (
            <p className="cf-comments__state">{isZh ? '评论加载中…' : 'Loading comments…'}</p>
          )}

          {isError && !isLoading && (
            <p className="cf-comments__state cf-comments__state--error">
              {isZh ? '评论加载失败，请稍后重试' : 'Failed to load comments'}
            </p>
          )}

          {!isLoading && !isError && comments.length === 0 && (
            <p className="cf-comments__state">
              {isZh ? '还没有评论，来说第一句吧' : 'No comments yet. Be the first to reply.'}
            </p>
          )}

          {!isLoading && !isError && comments.length > 0 && (
            <ul className="cf-comments__list">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  isZh={isZh}
                  isLoggedIn={isLoggedIn}
                  isAdmin={isAdmin}
                  viewerCanDelete={viewerCanDelete}
                  onReply={handleReply}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>

        {isLoggedIn ? (
          <form className="cf-comments__form" onSubmit={handleSubmit}>
            {replyTo && (
              <div className="cf-comments__reply-hint">
                <span>
                  {isZh ? '正在回复：' : 'Replying to: '}
                  {String(replyTo.content).slice(0, 24)}
                  {String(replyTo.content).length > 24 ? '…' : ''}
                </span>
                <button type="button" onClick={() => setReplyTo(null)}>
                  {isZh ? '取消' : 'Cancel'}
                </button>
              </div>
            )}

            <div className="cf-comments__input-row">
              <textarea
                ref={inputRef}
                className="cf-comments__input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isZh ? '以匿名身份写下你的评论…' : 'Comment anonymously…'}
                maxLength={COMMENT_MAX_LENGTH}
                rows={2}
                aria-label={isZh ? '评论内容' : 'Comment content'}
              />
              <button
                type="submit"
                className="cf-comments__submit"
                disabled={!content.trim() || submitting || content.length > COMMENT_MAX_LENGTH}
              >
                {submitting ? (isZh ? '发送中…' : 'Sending…') : isZh ? '发送' : 'Send'}
              </button>
            </div>

            <div className="cf-comments__counter">
              {content.length} / {COMMENT_MAX_LENGTH}
            </div>
          </form>
        ) : (
          <p className="cf-comments__login-hint">
            {isZh ? '登录后即可匿名评论' : 'Sign in to comment anonymously'}
          </p>
        )}
      </section>
    </div>,
    document.body
  );
}
