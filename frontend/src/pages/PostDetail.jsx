import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, MoreHorizontal, SendHorizonal, Smile } from 'lucide-react';
import ReportButton from '../components/ReportButton';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPostDetail,
  getPostComments,
  toggleLike,
  createComment,
  deletePost,
  deleteComment,
} from '@shared/api/posts';
import { API_BASE_URL } from '@shared/api/config';
import { Toast } from '../context/ToastContext';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import UserLevelBadge from '../components/UserLevelBadge';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';
import { StackedCardCarousel } from '../components/StackedCardCarousel';
import LikeBurst from '../components/LikeBurst';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import DetailPageLayout from '../components/templates/DetailPageLayout';
import { formatPostTime } from '@shared/utils/formatTime';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
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
  const { handleExpResponse } = useExpFeedback();
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
    select: (list) => (Array.isArray(list) ? list : []).map(mapCommentTree),
  });

  const post = detailQuery.data ?? null;
  const comments = commentsQuery.data ?? [];

  useEffect(() => {
    if (!post) return;
    setLikeCount(post.like_count ?? 0);
    setLiked(!!post.user_liked);
  }, [post]);

  useEffect(() => {
    setCarouselIndex(0);
    setCarouselDir(1);
  }, [postId]);

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/post/${id}` } } });
      return true;
    }
    return false;
  }, [id, isLoggedIn, navigate]);

  const focusComposer = useCallback(() => {
    try {
      composerInputRef.current?.focus?.();
    } catch {
      // ignore
    }
  }, []);

  const handleLike = async (event) => {
    if (requireLogin()) return;
    likeBurstRef.current?.trigger(event);
    const prevLiked = liked;
    const prevCount = likeCount;
    const optimisticLiked = !prevLiked;
    setLiked(optimisticLiked);
    setLikeCount((count) => (optimisticLiked ? count + 1 : Math.max(0, count - 1)));

    const patchPost = (candidate) => {
      if (!candidate || candidate.id !== postId) return candidate;
      return {
        ...candidate,
        user_liked: optimisticLiked,
        like_count: optimisticLiked ? Number(candidate.like_count || 0) + 1 : Math.max(0, Number(candidate.like_count || 0) - 1),
      };
    };

    queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => patchPost(old));
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          const key = query.queryKey || [];
          return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
        },
      },
      (old) => {
        if (!old || !old.pages || !Array.isArray(old.pages)) return old;
        return {
          ...old,
          pages: old.pages.map((page) => {
            const list = Array.isArray(page.list) ? page.list : [];
            return { ...page, list: list.map((item) => patchPost(item)) };
          }),
        };
      }
    );

    try {
      const data = await toggleLike(postId);
      handleExpResponse(data);
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
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => {
        if (!old || old.id !== postId) return old;
        return { ...old, user_liked: prevLiked, like_count: prevCount };
      });
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey || [];
            return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
          },
        },
        (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages)) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              const list = Array.isArray(page.list) ? page.list : [];
              return {
                ...page,
                list: list.map((item) => {
                  if (!item || item.id !== postId) return item;
                  return { ...item, user_liked: prevLiked, like_count: prevCount };
                }),
              };
            }),
          };
        }
      );
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (requireLogin()) return;
    if (!newComment.trim()) return;
    const content = newComment.trim();
    const parentId = replyingTo?.id ?? null;

    setSubmitLoading(true);

    const prevComments = queryClient.getQueryData(QK.postComments(postId));
    const prevDetail = queryClient.getQueryData(QK.postDetail(postId, tokenKey));
    const tempId = -Date.now();
    const nowIso = new Date().toISOString();
    const me = user
      ? {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: prefixAvatar(user.avatar),
        }
      : null;

    const optimisticNode = {
      id: tempId,
      post_id: postId,
      user_id: user?.id,
      parent_id: parentId,
      content,
      created_at: nowIso,
      author: me,
      replies: [],
      __optimistic: true,
    };

    const bumpCommentCountInPostCaches = (delta) => {
      queryClient.setQueryData(QK.postDetail(postId, tokenKey), (old) => {
        if (!old || old.id !== postId) return old;
        return { ...old, comment_count: Math.max(0, Number(old.comment_count || 0) + delta) };
      });

      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey || [];
            return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
          },
        },
        (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages)) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              const list = Array.isArray(page.list) ? page.list : [];
              return {
                ...page,
                list: list.map((item) => {
                  if (!item || item.id !== postId) return item;
                  return { ...item, comment_count: Math.max(0, Number(item.comment_count || 0) + delta) };
                }),
              };
            }),
          };
        }
      );
    };

    setNewComment('');
    setReplyingTo(null);

    queryClient.setQueryData(QK.postComments(postId), (old) => {
      const list = Array.isArray(old) ? [...old] : [];
      if (!parentId) {
        return [optimisticNode, ...list];
      }
      return list.map((comment) => {
        if (!comment || comment.id !== parentId) return comment;
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        return { ...comment, replies: [...replies, { ...optimisticNode, replies: undefined }] };
      });
    });
    bumpCommentCountInPostCaches(1);

    try {
      const created = await createComment(postId, {
        content,
        parent_id: parentId ?? undefined,
      });
      handleExpResponse(created);
      const normalized = created ? mapCommentTree({ ...created, replies: [] }) : null;

      queryClient.setQueryData(QK.postComments(postId), (old) => {
        const list = Array.isArray(old) ? [...old] : [];
        if (!parentId) {
          return list.map((comment) => (comment && comment.id === tempId ? normalized || comment : comment));
        }
        return list.map((comment) => {
          if (!comment || comment.id !== parentId) return comment;
          const replies = Array.isArray(comment.replies) ? comment.replies : [];
          return {
            ...comment,
            replies: replies.map((reply) => (reply && reply.id === tempId ? normalized || reply : reply)),
          };
        });
      });

      Toast.success('评论成功');
    } catch (error) {
      queryClient.setQueryData(QK.postComments(postId), prevComments);
      queryClient.setQueryData(QK.postDetail(postId, tokenKey), prevDetail);
      bumpCommentCountInPostCaches(-1);
      Toast.error(getApiErrorMessage(error));
    } finally {
      setSubmitLoading(false);
    }
  };

  const startReply = (comment) => setReplyingTo({ id: comment.id, content: comment.content });
  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const handleDeleteComment = async (commentId) => {
    if (requireLogin()) return;
    if (!window.confirm('Delete this comment? This action cannot be undone.')) return;
    try {
      await deleteComment(postId, commentId);
      Toast.success('Deleted');
      await queryClient.invalidateQueries({ queryKey: QK.postComments(postId) });
    } catch (error) {
      Toast.error(getApiErrorMessage(error));
    }
  };

  const isAuthor = post && (post.user_id === user?.id || post.author?.id === user?.id || isAdmin);

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await deletePost(postId);
      Toast.success('Deleted');
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey || [];
            return key[0] === 'posts' && key[1] === 'infinite' && key[2] === tokenKey;
          },
        },
        (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages)) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              const list = Array.isArray(page.list) ? page.list : [];
              return { ...page, list: list.filter((item) => !item || item.id !== postId) };
            }),
          };
        }
      );
      queryClient.removeQueries({ queryKey: QK.postDetail(postId, tokenKey) });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/', { replace: true });
    } catch (error) {
      Toast.error(getApiErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const loading = detailQuery.isPending && !post;
  const error = detailQuery.error ? getApiErrorMessage(detailQuery.error) : null;

  if (loading) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-loading state-loading">Loading...</p>
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
  const totalCommentCount = comments.reduce((sum, comment) => sum + 1 + (comment.replies?.length || 0), 0);
  const heroUrl = post.images?.[0]?.url ? prefixImageUrl(post.images[0].url) : null;
  const imageUrls = Array.isArray(post.images) ? post.images.map((img) => prefixImageUrl(img.url)).filter(Boolean) : [];

  const detailTags = (() => {
    if (post.type === 'announcement') {
      return [{ key: 'ann', slug: null, label: isEn ? 'Announcement' : '公告' }];
    }
    const tags = Array.isArray(post.tags) ? post.tags : [];
    return tags.map((tag) => ({
      key: tag.id,
      slug: tag.slug,
      label: isEn ? (tag.name_en || tag.name_zh || tag.slug) : (tag.name_zh || tag.name_en || tag.slug),
    }));
  })();

  const pageMeta = [
    { key: 'comments', label: isEn ? `${totalCommentCount} comments` : `${totalCommentCount} 条评论` },
    { key: 'likes', label: isEn ? `${likeCount} likes` : `${likeCount} 个点赞` },
    { key: 'type', label: post.type === 'announcement' ? (isEn ? 'Announcement' : '公告') : (isEn ? 'Community post' : '社区帖子') },
  ];

  return (
    <div className="post-detail-page">
      {heroUrl ? (
        <div className="post-detail-atmo" aria-hidden="true">
          <div className="post-detail-atmo-img" style={{ backgroundImage: `url('${heroUrl}')` }} />
          <div className="post-detail-atmo-fade" />
        </div>
      ) : null}

      {commentsQuery.isError ? (
        <p className="post-detail-error" role="alert">
          {getApiErrorMessage(commentsQuery.error)}
        </p>
      ) : null}

      <DetailPageLayout
        className="post-detail-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isEn ? 'Community Post' : '社区帖子'}
            title={post.title || (isEn ? 'Post Detail' : '帖子详情')}
            description={
              isEn
                ? 'Keep the reading flow, comment thread, and secondary actions separated into a clearer desktop detail rhythm.'
                : '把正文阅读、评论互动和次级操作拆进更清晰的桌面详情节奏里，避免所有内容都挤在同一张卡片里。'
            }
            backTo="/"
            backLabel={isEn ? 'Back to home' : '返回首页'}
            meta={pageMeta}
            actions={(
              <div className="post-detail-page-header-actions">
                <Button variant="secondary" size="sm" onClick={focusComposer}>
                  {isEn ? 'Write comment' : '写评论'}
                </Button>
                {isAuthor ? (
                  <Button variant="secondary" size="sm" onClick={handleDeletePost} disabled={deleteLoading}>
                    {deleteLoading ? (isEn ? 'Deleting...' : '删除中...') : (isEn ? 'Delete post' : '删除帖子')}
                  </Button>
                ) : null}
              </div>
            )}
          />
        )}
        content={(
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
                  {author.level ? (
                    <UserLevelBadge level={author.level} badgeEmoji={author.badgeEmoji} size="sm" isZh={!isEn} />
                  ) : null}
                  {detailTags.length > 0 ? (
                    <div className="post-detail-tags" aria-label={isEn ? 'Tags' : '标签'}>
                      {detailTags.map((tag) =>
                        tag.slug ? (
                          <Link
                            key={tag.key}
                            to={`/posts/tag/${encodeURIComponent(tag.slug)}`}
                            className="post-detail-tag"
                          >
                            {tag.label}
                          </Link>
                        ) : (
                          <span key={tag.key} className="post-detail-tag post-detail-tag--static">
                            {tag.label}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
                {post.created_at ? (
                  <span className="post-detail-time" title={formatPostTime(post.created_at, true)}>
                    {formatPostTime(post.created_at)}
                  </span>
                ) : null}
              </div>

              {isAuthor ? (
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
              ) : null}
            </div>

            <div className="post-detail-reading-meta">
              <Tag tone="neutral" variant="soft">{isEn ? 'Main reading column' : '正文主阅读列'}</Tag>
              <Tag tone="neutral" variant="outline">
                {post.type === 'announcement' ? (isEn ? 'Announcement mode' : '公告模式') : (isEn ? 'Community discussion' : '社区讨论')}
              </Tag>
            </div>

            <p className="post-detail-content">{post.content}</p>

            {imageUrls.length > 0 ? (
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
                    onOpenPreview={(index) => setImagePreview({ open: true, index })}
                    dir={carouselDir}
                  />
                )}
              </div>
            ) : null}

            {imagePreview.open && post.images?.length > 0 ? (
              <ImagePreview
                urls={post.images.map((img) => prefixImageUrl(img.url))}
                initialIndex={imagePreview.index}
                onClose={() => setImagePreview({ open: false, index: 0 })}
              />
            ) : null}

            <div className="post-detail-actions">
              <motion.button
                type="button"
                className={`post-detail-like-btn ${liked ? 'is-liked' : ''}`}
                onClick={handleLike}
                aria-pressed={liked}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 700, damping: 28 }}
              >
                <Heart size={18} aria-hidden fill={liked ? 'currentColor' : 'none'} />
                <span className="post-detail-like-count">{likeCount}</span>
              </motion.button>
              {!isAuthor ? (
                <ReportButton target_type="post" target_id={post.id} className="post-detail-report-btn" />
              ) : null}
            </div>
          </article>
        )}
        meta={(
          <Card className="post-detail-action-card">
            <SectionHeader
              title={isEn ? 'Quick actions' : '快捷操作'}
              description={
                isEn
                  ? 'Keep the likely next steps grouped below the main reading card.'
                  : '把最可能继续发生的操作集中放在正文卡片下方，桌面阅读时路径更稳定。'
              }
            />
            <div className="post-detail-action-card__actions">
              <Button variant="secondary" size="sm" onClick={focusComposer}>
                {isEn ? 'Comment now' : '立即评论'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLike}>
                {liked ? (isEn ? 'Liked' : '已点赞') : (isEn ? 'Like this post' : '点赞帖子')}
              </Button>
            </div>
          </Card>
        )}
        comments={(
          <section className="post-detail-comments">
            <SectionHeader
              title={isEn ? `Comments (${totalCommentCount})` : `评论 (${totalCommentCount})`}
              description={
                isEn
                  ? 'The comment tree stays intact; only the page rhythm is being reorganized into the shared detail template.'
                  : '评论树结构和交互逻辑保持不变，本次只把页面节奏整理进共享详情模板里。'
              }
            />
            <ul className="post-detail-comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="post-detail-comment-wrap">
                  <div className="post-detail-thread">
                    <div className="post-detail-thread-avatar">
                      {comment.author?.avatar ? (
                        <img src={comment.author.avatar} alt="" />
                      ) : (
                        <img src="/default-avatar.svg" alt="" className="is-default" />
                      )}
                    </div>
                    <div className="post-detail-thread-body">
                      <div className="post-detail-thread-meta">
                        <span className="post-detail-thread-name">
                          {(comment.author?.nickname ?? comment.author?.username) || 'Anonymous'}
                          {comment.author?.level ? (
                            <UserLevelBadge level={comment.author.level} badgeEmoji={comment.author.badgeEmoji} size="sm" isZh={!isEn} />
                          ) : null}
                        </span>
                        <button type="button" className="post-detail-reply-btn" onClick={() => { startReply(comment); focusComposer(); }}>
                          {isEn ? 'Reply' : '回复'}
                        </button>
                        <ReportButton target_type="comment" target_id={comment.id} className="post-detail-report-btn" iconOnly />
                        {comment.user_id === user?.id || isAdmin ? (
                          <button
                            type="button"
                            className="post-detail-comment-delete"
                            onClick={() => handleDeleteComment(comment.id)}
                            title={isEn ? 'Delete' : '删除'}
                            aria-label={isEn ? 'Delete' : '删除'}
                          >
                            ...
                          </button>
                        ) : null}
                      </div>
                      <p className="post-detail-thread-text">{comment.content}</p>
                    </div>
                  </div>
                  {comment.replies && comment.replies.length > 0 ? (
                    <ul className="post-detail-reply-list">
                      {comment.replies.map((reply) => (
                        <li key={reply.id} className="post-detail-thread post-detail-thread--reply">
                          <div className="post-detail-thread-avatar">
                            {reply.author?.avatar ? (
                              <img src={reply.author.avatar} alt="" />
                            ) : (
                              <img src="/default-avatar.svg" alt="" className="is-default" />
                            )}
                          </div>
                          <div className="post-detail-thread-body">
                            <div className="post-detail-thread-meta">
                              <span className="post-detail-thread-name">
                                {(reply.author?.nickname ?? reply.author?.username) || 'Anonymous'}
                                {reply.author?.level ? (
                                  <UserLevelBadge level={reply.author.level} badgeEmoji={reply.author.badgeEmoji} size="sm" isZh={!isEn} />
                                ) : null}
                              </span>
                              <ReportButton target_type="comment" target_id={reply.id} className="post-detail-report-btn" iconOnly />
                              {reply.user_id === user?.id || isAdmin ? (
                                <button
                                  type="button"
                                  className="post-detail-comment-delete"
                                  onClick={() => handleDeleteComment(reply.id)}
                                  title={isEn ? 'Delete' : '删除'}
                                  aria-label={isEn ? 'Delete' : '删除'}
                                >
                                  ...
                                </button>
                              ) : null}
                            </div>
                            <p className="post-detail-thread-text">{reply.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}
        aside={(
          <>
            <Card className="post-detail-aside-card">
              <SectionHeader
                title={isEn ? 'Post snapshot' : '帖子快照'}
                description={
                  isEn
                    ? 'Keep the key numbers visible while the main column stays focused on reading.'
                    : '把关键数字收进右侧，正文主列专注阅读与评论，不再把所有信息都堆进正文卡片。'
                }
                compact
              />
              <div className="post-detail-aside-card__stats">
                <div className="post-detail-aside-card__stat">
                  <span className="post-detail-aside-card__label">{isEn ? 'Likes' : '点赞'}</span>
                  <strong>{likeCount}</strong>
                </div>
                <div className="post-detail-aside-card__stat">
                  <span className="post-detail-aside-card__label">{isEn ? 'Comments' : '评论'}</span>
                  <strong>{totalCommentCount}</strong>
                </div>
                <div className="post-detail-aside-card__stat">
                  <span className="post-detail-aside-card__label">{isEn ? 'Author' : '作者'}</span>
                  <strong>{displayName}</strong>
                </div>
              </div>
            </Card>

            <Card className="post-detail-aside-card">
              <SectionHeader
                title={isEn ? 'Next step' : '下一步'}
                description={
                  isEn
                    ? 'Use the right rail for orientation and keep the next actions predictable on desktop.'
                    : '右侧辅助栏负责承接下一步操作，让桌面阅读场景下的动作路径更稳定。'
                }
                compact
              />
              <div className="post-detail-aside-card__links">
                <Button variant="secondary" size="sm" block onClick={focusComposer}>
                  {isEn ? 'Join discussion' : '参与讨论'}
                </Button>
                {!isAuthor ? (
                  <Button variant="secondary" size="sm" block onClick={handleLike}>
                    {liked ? (isEn ? 'Liked already' : '已点赞过') : (isEn ? 'Support this post' : '支持这篇帖子')}
                  </Button>
                ) : null}
              </div>
            </Card>
          </>
        )}
      />

      <LikeBurst ref={likeBurstRef} />

      {replyingTo ? (
        <div className="post-detail-replying-inline">
          <span>
            {isEn ? 'Reply:' : '回复:'} {replyingTo.content.slice(0, 20)}
            {replyingTo.content.length > 20 ? '...' : ''}
          </span>
          <button type="button" onClick={cancelReply}>
            {isEn ? 'Cancel' : '取消'}
          </button>
        </div>
      ) : null}

      <form className="post-detail-bottom-bar" onSubmit={handleSubmitComment}>
        <button type="button" className="post-detail-bottom-emoji" aria-label="emoji">
          <Smile size={18} aria-hidden />
        </button>
        <input
          ref={composerInputRef}
          type="text"
          className="post-detail-bottom-input"
          placeholder={replyingTo ? (isEn ? 'Reply...' : '回复...') : (isEn ? 'Add a comment...' : '添加评论...')}
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
