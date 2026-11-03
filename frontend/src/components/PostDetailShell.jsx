import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MoreHorizontal, SendHorizonal, Smile } from 'lucide-react';
import ReportButton from './ReportButton';
import { useLanguage } from '../context/LanguageContextState';
import { API_BASE_URL } from '@shared/api/config';
import EmptyState from './ui/EmptyState';
import ImagePreview from './ImagePreview';
import { StackedCardCarousel } from './StackedCardCarousel';
import LikeBurst from './LikeBurst';
import { formatPostTime } from '@shared/utils/formatTime';
import UserLevelBadge from './UserLevelBadge';
import '../pages/PostDetail.css';

const COMMENT_EMOJIS = [
  { emoji: '😀', zh: '开心', en: 'Grinning' },
  { emoji: '😄', zh: '大笑', en: 'Smiling' },
  { emoji: '😂', zh: '笑哭', en: 'Laughing' },
  { emoji: '🥰', zh: '喜欢', en: 'Love' },
  { emoji: '😍', zh: '爱心眼', en: 'Heart eyes' },
  { emoji: '🥹', zh: '感动', en: 'Touched' },
  { emoji: '😭', zh: '哭泣', en: 'Crying' },
  { emoji: '😡', zh: '生气', en: 'Angry' },
  { emoji: '🤔', zh: '思考', en: 'Thinking' },
  { emoji: '🥺', zh: '委屈', en: 'Pleading' },
  { emoji: '😎', zh: '酷', en: 'Cool' },
  { emoji: '🤗', zh: '拥抱', en: 'Hugging' },
  { emoji: '👍', zh: '赞', en: 'Thumbs up' },
  { emoji: '👎', zh: '踩', en: 'Thumbs down' },
  { emoji: '👏', zh: '鼓掌', en: 'Clapping' },
  { emoji: '🙌', zh: '欢呼', en: 'Celebration' },
  { emoji: '🙏', zh: '谢谢', en: 'Thanks' },
  { emoji: '💪', zh: '加油', en: 'Strong' },
  { emoji: '❤️', zh: '爱心', en: 'Heart' },
  { emoji: '💕', zh: '喜欢', en: 'Two hearts' },
  { emoji: '🎉', zh: '庆祝', en: 'Party' },
  { emoji: '✨', zh: '闪耀', en: 'Sparkles' },
  { emoji: '🔥', zh: '火', en: 'Fire' },
  { emoji: '☕', zh: '咖啡', en: 'Coffee' },
  { emoji: '🍜', zh: '面', en: 'Noodles' },
  { emoji: '🥤', zh: '饮料', en: 'Drink' },
];

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/**
 * 树洞帖子详情 UI 壳（广场热搜/校园此刻等复用）
 */
export default function PostDetailShell({
  post,
  comments = [],
  loading = false,
  error = null,
  liked = false,
  likeCount = 0,
  onLike,
  likePending = false,
  onSubmitComment,
  submitLoading = false,
  isLoggedIn = false,
  user = null,
  isAdmin = false,
  onDeleteComment,
  loginPath = '/login',
  emptyTitle = 'Post not found',
  emptyActionLabel = 'Back',
  onEmptyAction,
  headerSlot = null,
  title = null,
  metaSlot = null,
  tags = [],
  reportTargetType = null,
  commentReportType = null,
  isAuthor = false,
  onDeletePost,
  deleteLoading = false,
  showCommentCountBtn = false,
  commentsSlot = null,
}) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const likeBurstRef = useRef(null);
  const composerInputRef = useRef(null);
  const composerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const commentsRef = useRef(null);
  const [newComment, setNewComment] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  useEffect(() => {
    if (!emojiPickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!composerRef.current?.contains(event.target)) setEmojiPickerOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEmojiPickerOpen(false);
        emojiButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [emojiPickerOpen]);

  const postId = post?.id;

  const [previousKey, setPreviousKey] = useState(postId);
  if (previousKey !== postId) {
    setPreviousKey(postId);
    setCarouselIndex(0);
    setCarouselDir(1);
  }

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      navigate(loginPath, { replace: true, state: { from: { pathname: window.location.pathname } } });
      return true;
    }
    return false;
  }, [isLoggedIn, navigate, loginPath]);

  const handleLikeClick = (e) => {
    if (requireLogin()) return;
    likeBurstRef.current?.trigger(e);
    onLike?.(e);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (requireLogin()) return;
    if (!newComment.trim() || !onSubmitComment) return;
    const content = newComment.trim();
    const parentId = replyingTo?.id ?? null;
    await onSubmitComment({ content, parentId });
    setNewComment('');
    setReplyingTo(null);
    setEmojiPickerOpen(false);
  };

  const insertEmoji = (emoji) => {
    const input = composerInputRef.current;
    const start = input?.selectionStart ?? newComment.length;
    const end = input?.selectionEnd ?? newComment.length;
    const nextComment = `${newComment.slice(0, start)}${emoji}${newComment.slice(end)}`;
    if (nextComment.length > 500) return;

    setNewComment(nextComment);
    setEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const startReply = (c) => setReplyingTo({ id: c.id, content: c.content });
  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const focusComposer = () => {
    try {
      composerInputRef.current?.focus?.();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-loading state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-error state-error">{error}</p>
        <button type="button" className="post-detail-text-btn" onClick={onEmptyAction || (() => navigate(-1))}>
          {emptyActionLabel}
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <EmptyState
          title={emptyTitle}
          description={emptyTitle}
          actionLabel={emptyActionLabel}
          onActionClick={onEmptyAction || (() => navigate(-1))}
        />
      </div>
    );
  }

  const author = post.author || {};
  const displayName = author.nickname ?? author.username ?? author.name ?? (isEn ? 'Anonymous' : '匿名');
  const totalCommentCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
  const imageUrls = Array.isArray(post.images)
    ? post.images.map((img) => prefixImageUrl(img.url)).filter(Boolean)
    : [];

  return (
    <div className="post-detail-page">
      <article className="post-detail-post">
        {headerSlot}

        <div className="post-detail-author">
          <button
            type="button"
            className="post-detail-avatar-wrap"
            onClick={() => {
              if (author.id) navigate(`/user/${author.id}`);
            }}
            aria-label={isEn ? `View ${displayName}` : `查看 ${displayName}`}
          >
            {author.avatar ? (
              <img src={prefixAvatar(author.avatar)} alt="" className="post-detail-avatar" />
            ) : (
              <img src="/default-avatar.svg" alt="" className="post-detail-avatar post-detail-avatar-default" />
            )}
          </button>
          <div className="post-detail-author-info">
            <button
              type="button"
              className="post-detail-username"
              onClick={() => author.id && navigate(`/user/${author.id}`)}
              aria-label={isEn ? `View ${displayName}'s profile` : `查看 ${displayName} 的主页`}
            >
              {displayName}
            </button>
            {author.level ? (
              <UserLevelBadge level={author.level} badgeEmoji={author.badgeEmoji} size="sm" isZh={!isEn} />
            ) : null}
            {post.created_at && (
              <span className="post-detail-time" title={formatPostTime(post.created_at, true)}>
                {formatPostTime(post.created_at)}
                {metaSlot ? <span className="post-detail-time-extra">{metaSlot}</span> : null}
              </span>
            )}
            {tags.length > 0 && (
              <div className="post-detail-tags" aria-label={isEn ? 'Tags' : '标签'}>
                {tags.map((t) =>
                  t.slug ? (
                    <Link key={t.key} to={t.to || `#`} className="post-detail-tag">
                      {t.label}
                    </Link>
                  ) : (
                    <span key={t.key} className="post-detail-tag post-detail-tag--static">
                      {t.label}
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          {isAuthor && onDeletePost ? (
            <div className="post-detail-owner-actions">
              <button
                type="button"
                className="post-detail-more-btn"
                onClick={() => setOwnerMenuOpen((open) => !open)}
                disabled={deleteLoading}
                title={isEn ? 'More' : '更多'}
                aria-label={isEn ? 'More' : '更多'}
                aria-expanded={ownerMenuOpen}
              >
                <MoreHorizontal size={18} aria-hidden />
              </button>
              {ownerMenuOpen ? (
                <button
                  type="button"
                  className="post-detail-delete-btn"
                  onClick={() => {
                    setOwnerMenuOpen(false);
                    onDeletePost();
                  }}
                >
                  {isEn ? 'Delete post' : '删除帖子'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {title ? <h1 className="post-detail-heading">{title}</h1> : null}
        <p className="post-detail-content">{post.content}</p>

        {imageUrls.length === 1 && (
          <button
            type="button"
            className="post-detail-image-wrap"
            onClick={() => setImagePreview({ open: true, index: 0 })}
            aria-label={isEn ? 'View image' : '查看图片'}
          >
            <img src={imageUrls[0]} alt="" className="post-detail-image" />
          </button>
        )}

        {imageUrls.length > 1 && (
          <StackedCardCarousel
            urls={imageUrls}
            index={carouselIndex}
            onChangeIndex={(next, dir) => {
              setCarouselDir(dir);
              setCarouselIndex(next);
            }}
            onOpenPreview={(i) => setImagePreview({ open: true, index: i })}
            dir={carouselDir}
          />
        )}

        {imagePreview.open && imageUrls.length > 0 && (
          <ImagePreview
            urls={imageUrls}
            initialIndex={imagePreview.index}
            onClose={() => setImagePreview({ open: false, index: 0 })}
          />
        )}

        <div className="post-detail-actions">
          <motion.button
            type="button"
            className={`post-detail-like-btn ${liked ? 'is-liked' : ''}`}
            onClick={handleLikeClick}
            disabled={likePending}
            aria-busy={likePending}
            aria-pressed={liked}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 700, damping: 28 }}
          >
            <Heart size={18} aria-hidden fill={liked ? 'currentColor' : 'none'} />
            <span className="post-detail-like-count">{likeCount}</span>
          </motion.button>
          {showCommentCountBtn ? (
            <button
              type="button"
              className="post-detail-comment-count"
              onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <MessageCircle size={18} aria-hidden />
              <span>{totalCommentCount}</span>
            </button>
          ) : null}
          {reportTargetType && postId && (
            <ReportButton target_type={reportTargetType} target_id={postId} className="post-detail-report-btn" />
          )}
        </div>
      </article>

      <LikeBurst ref={likeBurstRef} />

      {commentsSlot ?? <><section className="post-detail-comments" ref={commentsRef}>
        <h2 className="post-detail-comments-title">
          {isEn ? `Comments (${totalCommentCount})` : `评论 (${totalCommentCount})`}
        </h2>
        <ul className="post-detail-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="post-detail-comment-wrap">
              <div className="post-detail-thread">
                <div className="post-detail-thread-avatar">
                  {c.author?.avatar ? (
                    <img src={prefixAvatar(c.author.avatar)} alt="" />
                  ) : (
                    <img src="/default-avatar.svg" alt="" className="is-default" />
                  )}
                </div>
                <div className="post-detail-thread-body">
                  <div className="post-detail-thread-meta">
                    <span className="post-detail-thread-name">
                      {(c.author?.nickname ?? c.author?.username ?? c.author?.name) || (isEn ? 'Anonymous' : '匿名')}
                      {c.author?.level ? (
                        <UserLevelBadge level={c.author.level} badgeEmoji={c.author.badgeEmoji} size="sm" isZh={!isEn} />
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="post-detail-reply-btn"
                      onClick={() => {
                        startReply(c);
                        focusComposer();
                      }}
                    >
                      {isEn ? 'Reply' : '回复'}
                    </button>
                    {commentReportType && (
                      <ReportButton target_type={commentReportType} target_id={c.id} className="post-detail-report-btn" iconOnly />
                    )}
                    {onDeleteComment && (c.user_id === user?.id || isAdmin) && (
                      <button
                        type="button"
                        className="post-detail-comment-delete"
                        onClick={() => onDeleteComment(c.id)}
                        title={isEn ? 'Delete' : '删除'}
                        aria-label={isEn ? 'Delete' : '删除'}
                      >
                        ···
                      </button>
                    )}
                  </div>
                  <p className="post-detail-thread-text">{c.content}</p>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <ul className="post-detail-reply-list">
                  {c.replies.map((r) => (
                    <li key={r.id} className="post-detail-thread post-detail-thread--reply">
                      <div className="post-detail-thread-avatar">
                        {r.author?.avatar ? (
                          <img src={prefixAvatar(r.author.avatar)} alt="" />
                        ) : (
                          <img src="/default-avatar.svg" alt="" className="is-default" />
                        )}
                      </div>
                      <div className="post-detail-thread-body">
                        <div className="post-detail-thread-meta">
                          <span className="post-detail-thread-name">
                            {(r.author?.nickname ?? r.author?.username ?? r.author?.name) || (isEn ? 'Anonymous' : '匿名')}
                            {r.author?.level ? (
                              <UserLevelBadge level={r.author.level} badgeEmoji={r.author.badgeEmoji} size="sm" isZh={!isEn} />
                            ) : null}
                          </span>
                          {commentReportType && (
                            <ReportButton target_type={commentReportType} target_id={r.id} className="post-detail-report-btn" iconOnly />
                          )}
                          {onDeleteComment && (r.user_id === user?.id || isAdmin) && (
                            <button
                              type="button"
                              className="post-detail-comment-delete"
                              onClick={() => onDeleteComment(r.id)}
                              title={isEn ? 'Delete' : '删除'}
                              aria-label={isEn ? 'Delete' : '删除'}
                            >
                              ···
                            </button>
                          )}
                        </div>
                        <p className="post-detail-thread-text">{r.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {replyingTo && (
        <div className="post-detail-replying-inline">
          <span>
            {isEn ? 'Reply:' : '回复:'} {replyingTo.content.slice(0, 20)}
            {replyingTo.content.length > 20 ? '…' : ''}
          </span>
          <button type="button" onClick={cancelReply}>
            {isEn ? 'Cancel' : '取消'}
          </button>
        </div>
      )}

      <form className="post-detail-bottom-bar" onSubmit={handleSubmitComment}>
        <div className="post-detail-bottom-composer" ref={composerRef}>
          <button
            ref={emojiButtonRef}
            type="button"
            className="post-detail-bottom-emoji"
            aria-label={isEn ? 'Choose emoji' : '选择表情'}
            aria-expanded={emojiPickerOpen}
            aria-controls="post-comment-emoji-picker"
            onClick={() => setEmojiPickerOpen((open) => !open)}
          >
            <Smile size={18} aria-hidden />
          </button>
          {emojiPickerOpen ? (
            <div
              id="post-comment-emoji-picker"
              className="post-detail-emoji-picker"
              role="group"
              aria-label={isEn ? 'Comment emojis' : '评论表情'}
            >
              {COMMENT_EMOJIS.map(({ emoji, zh, en }) => (
                <button
                  key={emoji}
                  type="button"
                  className="post-detail-emoji-option"
                  aria-label={isEn ? en : zh}
                  title={isEn ? en : zh}
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          ref={composerInputRef}
          type="text"
          className="post-detail-bottom-input"
          placeholder={replyingTo ? (isEn ? 'Reply…' : '回复…') : (isEn ? 'Add a comment…' : '添加评论…')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={500}
          disabled={submitLoading}
        />
        <motion.button
          type="submit"
          className="post-detail-bottom-send"
          disabled={!newComment.trim() || submitLoading}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 700, damping: 28 }}
          aria-label={isEn ? 'Send' : '发送'}
        >
          <SendHorizonal size={18} aria-hidden />
        </motion.button>
      </form>
      </>}
    </div>
  );
}
