import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, MoreHorizontal, SendHorizonal, Smile } from 'lucide-react';
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
  const composerInputRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);

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

  useEffect(() => {
    // reset on post change
    setCarouselIndex(0);
    setCarouselDir(1);
  }, [postId]);

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
    // 乐观更新：先给用户即时反馈，再发请求；失败则回滚
    const prevLiked = liked;
    const prevCount = likeCount;
    const optimisticLiked = !prevLiked;
    setLiked(optimisticLiked);
    setLikeCount((c) => (optimisticLiked ? c + 1 : Math.max(0, c - 1)));

    // 同步写入详情缓存与列表缓存，避免返回上一页时状态跳回去
    const patchPost = (p) => {
      if (!p || p.id !== postId) return p;
      return {
        ...p,
        user_liked: optimisticLiked,
        like_count: optimisticLiked ? (Number(p.like_count || 0) + 1) : Math.max(0, Number(p.like_count || 0) - 1),
      };
    };
    queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => patchPost(old));
    queryClient.setQueriesData(
      {
        predicate: (q) => {
          const key = q.queryKey || [];
          return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
        },
      },
      (old) => {
        if (!old || !old.pages || !Array.isArray(old.pages)) return old;
        const nextPages = old.pages.map((pg) => {
          const list = Array.isArray(pg.list) ? pg.list : [];
          const nextList = list.map((it) => patchPost(it));
          if (nextList === list) return pg;
          return { ...pg, list: nextList };
        });
        return { ...old, pages: nextPages };
      }
    );
    try {
      const data = await toggleLike(postId);
      // 以服务端返回为准（如果和乐观状态不一致，纠正一次）
      const finalLiked = data?.liked ?? optimisticLiked;
      if (finalLiked !== optimisticLiked) {
        const finalCount = finalLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
        setLiked(finalLiked);
        setLikeCount(finalCount);
        queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => {
          if (!old || old.id !== postId) return old;
          return { ...old, user_liked: finalLiked, like_count: finalCount };
        });
      }
    } catch (_) {
      // 回滚
      setLiked(prevLiked);
      setLikeCount(prevCount);
      queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => {
        if (!old || old.id !== postId) return old;
        return { ...old, user_liked: prevLiked, like_count: prevCount };
      });
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            const key = q.queryKey || [];
            return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
          },
        },
        (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages)) return old;
          const nextPages = old.pages.map((pg) => {
            const list = Array.isArray(pg.list) ? pg.list : [];
            const nextList = list.map((it) => {
              if (!it || it.id !== postId) return it;
              return { ...it, user_liked: prevLiked, like_count: prevCount };
            });
            return { ...pg, list: nextList };
          });
          return { ...old, pages: nextPages };
        }
      );
    }
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

  // bottom composer: focus helper for mobile
  const focusComposer = () => {
    try {
      composerInputRef.current?.focus?.();
    } catch {
      // ignore
    }
  };

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
  const heroUrl = post.images?.[0]?.url ? prefixImageUrl(post.images[0].url) : null;
  const imageUrls = Array.isArray(post.images) ? post.images.map((img) => prefixImageUrl(img.url)).filter(Boolean) : [];

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
      {heroUrl ? (
        <div className="post-detail-atmo" aria-hidden="true">
          <div className="post-detail-atmo-img" style={{ backgroundImage: `url('${heroUrl}')` }} />
          <div className="post-detail-atmo-fade" />
        </div>
      ) : null}
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
              className="post-detail-more-btn"
              onClick={handleDeletePost}
              disabled={deleteLoading}
              title={isEn ? 'More' : '更多'}
              aria-label={isEn ? 'More' : '更多'}
            >
              <MoreHorizontal size={18} aria-hidden />
            </button>
          )}
        </div>
        <p className="post-detail-content">{post.content}</p>
        {imageUrls.length > 0 && (
          <div className="post-detail-media" aria-label="Post images">
            {imageUrls.length === 1 ? (
              <button
                type="button"
                className="post-detail-image-wrap"
                onClick={() => setImagePreview({ open: true, index: 0 })}
              >
                <img src={imageUrls[0]} alt="" className="post-detail-image" />
              </button>
            ) : (
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
          <motion.button
            type="button"
            className={`post-detail-like-btn ${liked ? 'is-liked' : ''}`}
            onClick={handleLike}
            aria-pressed={liked}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 700, damping: 28 }}
          >
            <Heart size={18} aria-hidden />
            <span className="post-detail-like-count">{likeCount}</span>
          </motion.button>
        </div>
      </article>
      <LikeBurst ref={likeBurstRef} />

      <section className="post-detail-comments">
        <h2 className="post-detail-comments-title">
          {isEn ? `Comments (${totalCommentCount})` : `评论 Comments (${totalCommentCount})`}
        </h2>
        <ul className="post-detail-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="post-detail-comment-wrap">
              <div className="post-detail-thread">
                <div className="post-detail-thread-avatar">
                  {c.author?.avatar ? (
                    <img src={c.author.avatar} alt="" />
                  ) : (
                    <img src="/default-avatar.svg" alt="" className="is-default" />
                  )}
                </div>
                <div className="post-detail-thread-body">
                  <div className="post-detail-thread-meta">
                    <span className="post-detail-thread-name">
                      {(c.author?.nickname ?? c.author?.username) || 'Anonymous'}
                    </span>
                    <button type="button" className="post-detail-reply-btn" onClick={() => { startReply(c); focusComposer(); }}>
                      {isEn ? 'Reply' : '回复'}
                    </button>
                    {(c.user_id === user?.id || isAdmin) && (
                      <button
                        type="button"
                        className="post-detail-comment-delete"
                        onClick={() => handleDeleteComment(c.id)}
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
                          <img src={r.author.avatar} alt="" />
                        ) : (
                          <img src="/default-avatar.svg" alt="" className="is-default" />
                        )}
                      </div>
                      <div className="post-detail-thread-body">
                        <div className="post-detail-thread-meta">
                          <span className="post-detail-thread-name">
                            {(r.author?.nickname ?? r.author?.username) || 'Anonymous'}
                          </span>
                          {(r.user_id === user?.id || isAdmin) && (
                            <button
                              type="button"
                              className="post-detail-comment-delete"
                              onClick={() => handleDeleteComment(r.id)}
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

      {/* Floating bottom glass comment bar */}
      <form className="post-detail-bottom-bar" onSubmit={handleSubmitComment}>
        <button type="button" className="post-detail-bottom-emoji" aria-label="emoji">
          <Smile size={18} aria-hidden />
        </button>
        <input
          ref={composerInputRef}
          type="text"
          className="post-detail-bottom-input"
          placeholder={replyingTo ? (isEn ? 'Reply…' : '回复…') : (isEn ? 'Add a comment…' : '添加评论…')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={500}
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
    </div>
  );
}

export default PostDetail;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function StackedCardCarousel({ urls, index, onChangeIndex, onOpenPreview, dir }) {
  const n = Array.isArray(urls) ? urls.length : 0;
  if (!n) return null;

  const stack = [
    { scale: 1, x: 0, y: 0, opacity: 1, blur: 0, rotate: 0 },
    { scale: 0.94, x: 15, y: -15, opacity: 0.6, blur: 4, rotate: -2 },
    { scale: 0.88, x: 30, y: -30, opacity: 0.3, blur: 8, rotate: -4 },
  ];

  const count = Math.min(3, n);
  const ids = Array.from({ length: count }, (_, i) => mod(index + i, n));

  const go = (delta) => {
    if (n <= 1) return;
    const next = mod(index + delta, n);
    onChangeIndex(next, delta > 0 ? 1 : -1);
  };

  const frontId = ids[0];

  return (
    <div className="post-detail-carousel" aria-label="Image carousel">
      <div className="post-detail-carousel-stack">
        {/* back -> middle */}
        {ids.slice(1).reverse().map((id, revIdx) => {
          const pos = ids.length - (revIdx + 1); // 2 or 1
          const s = stack[pos];
          return (
            <motion.button
              key={`stack-${id}`}
              type="button"
              className="post-detail-carousel-card"
              onClick={() => onOpenPreview(id)}
              style={{ zIndex: 10 + (3 - pos) }}
              animate={{
                scale: s.scale,
                x: s.x,
                y: s.y,
                opacity: s.opacity,
                rotate: s.rotate,
                filter: `blur(${s.blur}px)`,
              }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <img src={urls[id]} alt="" className="post-detail-carousel-img" draggable={false} />
            </motion.button>
          );
        })}

        {/* front card with fly-out */}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.button
            key={`front-${frontId}`}
            type="button"
            className="post-detail-carousel-card post-detail-carousel-card--front"
            onClick={() => onOpenPreview(frontId)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              const swipe = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 700;
              if (!swipe) return;
              if (info.offset.x < 0) go(1);
              else go(-1);
            }}
            custom={dir}
            initial={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
            animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
            exit={(d) => ({
              x: d > 0 ? 140 : -140,
              y: -40,
              rotate: d > 0 ? 14 : -14,
              opacity: 0,
              transition: { type: 'spring', stiffness: 520, damping: 40 },
            })}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            style={{ zIndex: 30 }}
          >
            <img src={urls[frontId]} alt="" className="post-detail-carousel-img" draggable={false} />
          </motion.button>
        </AnimatePresence>

        <button type="button" className="post-detail-carousel-arrow post-detail-carousel-arrow--left" onClick={() => go(-1)} aria-label="Previous">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" className="post-detail-carousel-arrow post-detail-carousel-arrow--right" onClick={() => go(1)} aria-label="Next">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="post-detail-carousel-dots" aria-label="Pagination">
        {urls.map((_, i) => (
          <button
            key={`dot-${i}`}
            type="button"
            className={`post-detail-carousel-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => onChangeIndex(i, i > index ? 1 : -1)}
            aria-label={`Go to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
