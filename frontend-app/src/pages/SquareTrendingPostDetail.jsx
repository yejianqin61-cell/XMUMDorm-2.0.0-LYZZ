import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getTrendingPostDetail,
  getTrendingPostComments,
  postTrendingPostComment,
  likeTrendingPost,
} from '@shared/api/square';
import { API_BASE_URL } from '@shared/api/config';
import { Toast } from '../context/ToastContext';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '../query/queryKeys';
import PostDetailShell from '../components/PostDetailShell';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function mapCommentTree(comment) {
  return {
    ...comment,
    author: comment.author ? { ...comment.author, avatar: prefixAvatar(comment.author.avatar) } : comment.author,
    replies: (comment.replies || []).map((reply) => ({
      ...reply,
      author: reply.author ? { ...reply.author, avatar: prefixAvatar(reply.author.avatar) } : reply.author,
    })),
  };
}

export default function SquareTrendingPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, token, user, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { handleExpResponse } = useExpFeedback();
  const postId = parseInt(id, 10);
  const tokenKey = token ?? 'guest';

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  const detailQuery = useQuery({
    queryKey: QK.trendingPostDetail(postId, tokenKey),
    queryFn: () => getTrendingPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 30 * 1000,
    select: (data) => {
      const post = data?.data || data || {};
      return {
        ...post,
        author: post.author
          ? { ...post.author, avatar: prefixAvatar(post.author.avatar) }
          : post.author,
      };
    },
  });

  const commentsQuery = useQuery({
    queryKey: QK.trendingPostComments(postId),
    queryFn: () => getTrendingPostComments(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 15 * 1000,
    select: (list) => (Array.isArray(list) ? list : list?.data || []).map(mapCommentTree),
  });

  const post = detailQuery.data ?? null;
  const comments = commentsQuery.data ?? [];

  useEffect(() => {
    if (!post) return;
    setLiked(!!post.user_liked);
    setLikeCount(post.like_count ?? 0);
  }, [post]);

  const handleLike = useCallback(async () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    const optimistic = !prevLiked;
    setLiked(optimistic);
    setLikeCount((count) => (optimistic ? count + 1 : Math.max(0, count - 1)));
    try {
      const data = await likeTrendingPost(postId);
      handleExpResponse(data);
      if (data?.liked != null) setLiked(!!data.liked);
      if (data?.like_count != null) setLikeCount(data.like_count);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Toast.error(getApiErrorMessage(err));
    }
  }, [liked, likeCount, postId, handleExpResponse]);

  const handleSubmitComment = useCallback(
    async ({ content, parentId }) => {
      setSubmitLoading(true);
      try {
        const res = await postTrendingPostComment(postId, {
          content,
          parent_id: parentId ?? undefined,
        });
        handleExpResponse(res);
        await queryClient.invalidateQueries({ queryKey: QK.trendingPostComments(postId) });
        await queryClient.invalidateQueries({ queryKey: QK.trendingPostDetail(postId, tokenKey) });
        Toast.success(isEn ? 'Comment posted' : '评论成功');
      } catch (err) {
        Toast.error(getApiErrorMessage(err));
        throw err;
      } finally {
        setSubmitLoading(false);
      }
    },
    [postId, queryClient, tokenKey, handleExpResponse, isEn]
  );

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
      loginPath="/login"
      emptyTitle={isEn ? 'Post not found' : '帖子不存在'}
      emptyActionLabel={isEn ? 'Back' : '返回'}
      onEmptyAction={() => navigate(-1)}
      reportTargetType="trending_post"
      commentReportType="trending_comment"
    />
  );
}
