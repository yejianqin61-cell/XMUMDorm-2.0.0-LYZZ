import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import PostDetailShell from '../components/PostDetailShell';
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
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import './PostDetail.css';

function prefixAvatar(url) {
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

export default function PostDetail() {
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
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/post/${id}` } } });
      return true;
    }
    return false;
  }, [id, isLoggedIn, navigate]);

  const handleLike = useCallback(async () => {
    if (requireLogin()) return;
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
  }, [liked, likeCount, postId, tokenKey, queryClient, requireLogin, handleExpResponse]);

  const handleSubmitComment = useCallback(
    async ({ content, parentId }) => {
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
        parent_id: parentId ?? null,
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
            return list.map((c) => (c && c.id === tempId ? normalized || c : c));
          }
          return list.map((c) => {
            if (!c || c.id !== parentId) return c;
            const replies = Array.isArray(c.replies) ? c.replies : [];
            return {
              ...c,
              replies: replies.map((r) => (r && r.id === tempId ? normalized || r : r)),
            };
          });
        });

        Toast.success(isEn ? 'Comment posted' : '评论成功');
      } catch (error) {
        queryClient.setQueryData(QK.postComments(postId), prevComments);
        queryClient.setQueryData(QK.postDetail(postId, tokenKey), prevDetail);
        bumpCommentCountInPostCaches(-1);
        Toast.error(getApiErrorMessage(error));
      } finally {
        setSubmitLoading(false);
      }
    },
    [postId, tokenKey, user, queryClient, handleExpResponse, isEn]
  );

  const handleDeleteComment = useCallback(
    async (commentId) => {
      if (requireLogin()) return;
      if (!window.confirm(isEn ? 'Delete this comment? This action cannot be undone.' : '确定删除这条评论？此操作不可撤销。')) return;
      try {
        await deleteComment(postId, commentId);
        Toast.success(isEn ? 'Deleted' : '已删除');
        await queryClient.invalidateQueries({ queryKey: QK.postComments(postId) });
      } catch (error) {
        Toast.error(getApiErrorMessage(error));
      }
    },
    [postId, queryClient, requireLogin, isEn]
  );

  const isAuthor = post ? (post.user_id === user?.id || post.author?.id === user?.id || isAdmin) : false;

  const handleDeletePost = useCallback(async () => {
    if (!window.confirm(isEn ? 'Delete this post? This action cannot be undone.' : '确定删除这条帖子？此操作不可撤销。')) return;
    setDeleteLoading(true);
    try {
      await deletePost(postId);
      Toast.success(isEn ? 'Deleted' : '已删除');
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
  }, [postId, tokenKey, queryClient, navigate, isEn]);

  const headerSlot = (
    <Link
      to="/"
      className="post-detail-back"
      aria-label={isEn ? 'Back to home' : '返回首页'}
      title={isEn ? 'Back to home' : '返回首页'}
    >
      <ArrowLeft size={18} aria-hidden />
    </Link>
  );

  const detailTags = (() => {
    if (post?.type === 'announcement') {
      return [{ key: 'ann', slug: null, label: isEn ? 'Announcement' : '公告' }];
    }
    const tags = Array.isArray(post?.tags) ? post.tags : [];
    return tags.map((tag) => ({
      key: tag.id,
      slug: tag.slug,
      label: isEn ? (tag.name_en || tag.name_zh || tag.slug) : (tag.name_zh || tag.name_en || tag.slug),
      to: tag.slug ? `/posts/tag/${encodeURIComponent(tag.slug)}` : '#',
    }));
  })();

  return (
    <PostDetailShell
      post={post}
      comments={comments}
      loading={detailQuery.isPending && !post}
      error={detailQuery.error ? getApiErrorMessage(detailQuery.error) : null}
      liked={liked}
      likeCount={likeCount}
      onLike={handleLike}
      onSubmitComment={handleSubmitComment}
      submitLoading={submitLoading}
      isLoggedIn={isLoggedIn}
      user={user}
      isAdmin={isAdmin}
      onDeleteComment={handleDeleteComment}
      loginPath="/login"
      emptyTitle={isEn ? 'Post not found' : '帖子不存在'}
      emptyActionLabel={isEn ? 'Back to Home' : '返回首页'}
      onEmptyAction={() => navigate('/')}
      headerSlot={headerSlot}
      title={null}
      metaSlot={null}
      tags={detailTags}
      reportTargetType={isAuthor ? null : 'post'}
      commentReportType="comment"
      isAuthor={isAuthor}
      onDeletePost={handleDeletePost}
      deleteLoading={deleteLoading}
      showAtmo
      showCommentCountBtn
    />
  );
}