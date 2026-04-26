import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPostDetail,
  getPostComments,
  toggleLike,
  createComment,
  deletePost,
  deleteComment,
} from '../api/posts';
import { API_BASE_URL } from '../api/config';
import { Toast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';
import LikeBurst from '../components/LikeBurst';
import { formatPostTime } from '../utils/formatTime';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import './PostDetail.css';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function mapCommentTree(c) {
  return {
    ...c,
    author: c.author ? { ...c.author, avatar: prefixAvatar(c.author.avatar) } : c.author,
    replies: (c.replies || []).map((r) => ({
      ...r,
      author: r.author ? { ...r.author, avatar: prefixAvatar(r.author.avatar) } : r.author,
    })),
  };
}

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { isLoggedIn, token, user, isAdmin } = useAuth();
  const postId = Number(id);
  const tokenKey = token ?? 'guest';

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const likeBurstRef = useRef(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const composerWrapRef = useRef(null);
  const composerInputRef = useRef(null);

  const detailQuery = useQuery({
    queryKey: QK.postDetail(postId, tokenKey),
    queryFn: () => getPostDetail(postId, token),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 60 * 1000,
    select: (postData) => ({
      ...postData,
      author: postData.author
        ? { ...postData.author, avatar: prefixAvatar(postData.author.avatar) }
        : postData.author,
    }),
  });

  const commentsQuery = useQuery({
    queryKey: QK.postComments(postId),
    queryFn: () => getPostComments(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 30 * 1000,
    select: (list) =>
      (Array.isArray(list) ? list : []).map(mapCommentTree),
  });

  const post = detailQuery.data ?? null;
  const comments = commentsQuery.data ?? [];

  useEffect(() => {
    if (!post) return;
    setLikeCount(post.like_count ?? 0);
    setLiked(!!post.user_liked);
  }, [post]);

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/post/${id}` } } });
      return true;
    }
    return false;
  }, [isLoggedIn, navigate, id]);

  const handleLike = async (e) => {
    if (requireLogin()) return;
    likeBurstRef.current?.trigger(e);
    try {
      const data = await toggleLike(postId);
      setLiked(data?.liked ?? !liked);
      setLikeCount((c) => (data?.liked ? c + 1 : c - 1));
    } catch (_) {}
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (requireLogin()) return;
    if (!newComment.trim()) return;
    setSubmitLoading(true);
    try {
      await createComment(postId, {
        content: newComment.trim(),
        parent_id: replyingTo?.id ?? undefined,
      });
      Toast.success('评论成功');
      await queryClient.invalidateQueries({ queryKey: QK.postComments(postId) });
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  const startReply = (c) => setReplyingTo({ id: c.id, content: c.content });
  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  useEffect(() => {
    if (!composerOpen) return;
    const t = setTimeout(() => composerInputRef.current?.focus?.(), 60);
    return () => clearTimeout(t);
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen) return;
    const onDoc = (e) => {
      const el = composerWrapRef.current;
      if (el && !el.contains(e.target)) {
        setComposerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [composerOpen]);

  const handleDeleteComment = async (commentId) => {
    if (requireLogin()) return;
    if (!window.confirm('Delete this comment? This action cannot be undone.')) return;
    try {
      await deleteComment(postId, commentId);
      Toast.success('Deleted');
      await queryClient.invalidateQueries({ queryKey: QK.postComments(postId) });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const isAuthor =
    post && (post.user_id === user?.id || post.author?.id === user?.id || isAdmin);
  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await deletePost(postId);
      Toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/', { replace: true });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const loading = detailQuery.isPending && !post;
  const error = detailQuery.error ? getApiErrorMessage(detailQuery.error) : null;

  if (loading) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-loading state-loading">Loading…</p>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-error state-error">{error}</p>
        <button type="button" className="post-detail-text-btn" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <EmptyState
          title="Post not found"
          description="Post not found"
          actionLabel="Back to Home"
          onActionClick={() => navigate('/')}
        />
      </div>
    );
  }

  const author = post.author || {};
  const displayName = author.nickname ?? author.username ?? 'Anonymous';
  const totalCommentCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  const detailTags = (() => {
    if (post.type === 'announcement') {
      return [{ key: 'ann', slug: null, label: isEn ? 'Announcement' : '公告' }];
    }
    const arr = Array.isArray(post.tags) ? post.tags : [];
    return arr.map((t) => ({
      key: t.id,
      slug: t.slug,
      label: isEn ? (t.name_en || t.name_zh || t.slug) : (t.name_zh || t.name_en || t.slug),
    }));
  })();

  return (
    <div className="post-detail-page">
      {commentsQuery.isError && (
        <p className="post-detail-error" role="alert">
          {getApiErrorMessage(commentsQuery.error)}
        </p>
      )}
      <article className="post-detail-card">
        <div className="post-detail-author">
          <button
            type="button"
            className="post-detail-avatar-wrap"
            onClick={() => {
              if (author.id) {
                navigate(`/user/${author.id}`);
              }
            }}
            aria-label={`查看 ${displayName} 的主页`}
          >
            {author.avatar ? (
              <img src={author.avatar} alt="" className="post-detail-avatar" />
            ) : (
              <img src="/default-avatar.svg" alt="" className="post-detail-avatar post-detail-avatar-default" />
            )}
          </button>
          <div className="post-detail-author-info">
            <div className="post-detail-name-tags">
              <span className="post-detail-username">{displayName}</span>
              {detailTags.length > 0 && (
                <div className="post-detail-tags" aria-label={isEn ? 'Tags' : '标签'}>
                  {detailTags.map((t) =>
                    t.slug ? (
                      <Link
                        key={t.key}
                        to={`/posts/tag/${encodeURIComponent(t.slug)}`}
                        className="post-detail-tag"
                      >
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
            {post.created_at && (
              <span className="post-detail-time" title={formatPostTime(post.created_at, true)}>
                {formatPostTime(post.created_at)}
              </span>
            )}
          </div>
          {isAuthor && (
            <button
              type="button"
              className="post-detail-delete-btn"
              onClick={handleDeletePost}
              disabled={deleteLoading}
              title="删除帖子"
              aria-label="删除帖子"
            >
              <span className="post-detail-delete-icon" aria-hidden>🗑</span>
            </button>
          )}
        </div>
        <p className="post-detail-content">{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className="post-detail-images" aria-label="帖子图片">
            {post.images.map((img, i) => (
              <button
                key={img.url || i}
                type="button"
                className="post-detail-image-wrap"
                onClick={() => setImagePreview({ open: true, index: i })}
              >
                <img
                  src={prefixImageUrl(img.url)}
                  alt=""
                  className="post-detail-image"
                />
              </button>
            ))}
          </div>
        )}
        {imagePreview.open && post.images?.length > 0 && (
          <ImagePreview
            urls={post.images.map((img) => prefixImageUrl(img.url))}
            initialIndex={imagePreview.index}
            onClose={() => setImagePreview({ open: false, index: 0 })}
          />
        )}
        <div className="post-detail-actions">
          <button
            type="button"
            className={`post-detail-like ${liked ? 'is-liked' : ''}`}
            onClick={handleLike}
            aria-pressed={liked}
          >
            ♥ {likeCount}
          </button>
        </div>
      </article>
      <LikeBurst ref={likeBurstRef} />

      <section className="post-detail-comments">
        <div className="post-detail-comments-head">
          <h2 className="post-detail-comments-title">
            {isEn ? `Comments (${totalCommentCount})` : `评论 Comments (${totalCommentCount})`}
          </h2>

          <div className="post-detail-composer-wrap" ref={composerWrapRef}>
            <AnimatePresence initial={false} mode="wait">
              {composerOpen ? (
                <motion.form
                  key="composer-open"
                  className="post-detail-composer-form"
                  onSubmit={handleSubmitComment}
                  initial={{ width: 44, opacity: 0.98 }}
                  animate={{ width: 220, opacity: 1 }}
                  exit={{ width: 44, opacity: 0.98 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  style={{ maxWidth: 'min(240px, 56vw)' }}
                >
                  <input
                    ref={composerInputRef}
                    type="text"
                    className="post-detail-composer-input"
                    placeholder={replyingTo ? (isEn ? 'Reply…' : '回复…') : (isEn ? 'Write a comment…' : '写评论…')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setComposerOpen(false);
                    }}
                    maxLength={500}
                  />
                  <button type="submit" className="post-detail-composer-send" disabled={!newComment.trim() || submitLoading}>
                    {submitLoading ? (isEn ? '…' : '…') : (isEn ? 'Send' : '发送')}
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  key="composer-closed"
                  type="button"
                  className="post-detail-composer-pill"
                  onClick={() => setComposerOpen(true)}
                  whileTap={{ scale: 0.98 }}
                  aria-label={isEn ? 'Write a comment' : '写评论'}
                >
                  {isEn ? 'Comment' : '评论'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        <ul className="post-detail-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="post-detail-comment-wrap">
              <div className="post-detail-comment">
                <p className="post-detail-comment-content">{c.content}</p>
                <div className="post-detail-comment-meta">
                  <span className="post-detail-comment-stat">
                    {(c.author?.nickname ?? c.author?.username) || 'Anonymous'}
                  </span>
                  <button
                    type="button"
                    className="post-detail-reply-btn"
                    onClick={() => startReply(c)}
                  >
                    {isEn ? 'Reply' : '回复 Reply'}
                  </button>
                  {(c.user_id === user?.id || isAdmin) && (
                    <button
                      type="button"
                      className="post-detail-comment-delete"
                      onClick={() => handleDeleteComment(c.id)}
                      title="删除评论"
                      aria-label="删除评论"
                    >
                      <span aria-hidden>🗑</span>
                    </button>
                  )}
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <ul className="post-detail-reply-list">
                  {c.replies.map((r) => (
                    <li key={r.id} className="post-detail-comment post-detail-comment-reply">
                      <p className="post-detail-comment-content">
                        <span className="post-detail-reply-label">{isEn ? 'Reply:' : '回复:'}</span>
                        {r.content}
                      </p>
                      <div className="post-detail-comment-meta">
                        <span className="post-detail-comment-stat">
                          {(r.author?.nickname ?? r.author?.username) || 'Anonymous'}
                        </span>
                        {(r.user_id === user?.id || isAdmin) && (
                          <button
                            type="button"
                            className="post-detail-reply-delete"
                            onClick={() => handleDeleteComment(r.id)}
                          >
                            {isEn ? 'Delete' : '删除 Delete'}
                          </button>
                        )}
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
    </div>
  );
}

export default PostDetail;
