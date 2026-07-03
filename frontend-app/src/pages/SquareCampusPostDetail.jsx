import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getCampusPostDetail,
  getCampusPostComments,
  postCampusPostComment,
  likeCampusPost,
} from '@shared/api/square';
import { API_BASE_URL, getUploadUrl } from '@shared/api/config';
import { Toast } from '../context/ToastContext';
import { getApiErrorMessage } from '../utils/apiError';
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

export default function SquareCampusPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, token, user, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const postId = parseInt(id, 10);
  const tokenKey = token ?? 'guest';

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  const detailQuery = useQuery({
    queryKey: QK.campusPostDetail(postId, tokenKey),
    queryFn: () => getCampusPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 30 * 1000,
    select: (data) => {
      const post = data?.data || data || {};
      return {
        ...post,
        author: post.author
          ? { ...post.author, avatar: prefixAvatar(post.author.avatar) }
          : post.author,
        organization: post.organization
          ? { ...post.organization, avatar: prefixAvatar(post.organization.avatar) }
          : post.organization,
      };
    },
  });

  const commentsQuery = useQuery({
    queryKey: QK.campusPostComments(postId),
    queryFn: () => getCampusPostComments(postId),
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
      const data = await likeCampusPost(postId);
      if (data?.liked != null) setLiked(!!data.liked);
      if (data?.like_count != null) setLikeCount(data.like_count);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Toast.error(getApiErrorMessage(err));
    }
  }, [liked, likeCount, postId]);

  const handleSubmitComment = useCallback(
    async ({ content, parentId }) => {
      setSubmitLoading(true);
      try {
        await postCampusPostComment(postId, {
          content,
          parent_id: parentId ?? undefined,
        });
        await queryClient.invalidateQueries({ queryKey: QK.campusPostComments(postId) });
        await queryClient.invalidateQueries({ queryKey: QK.campusPostDetail(postId, tokenKey) });
        Toast.success(isEn ? 'Comment posted' : '评论成功');
      } catch (err) {
        Toast.error(getApiErrorMessage(err));
        throw err;
      } finally {
        setSubmitLoading(false);
      }
    },
    [postId, queryClient, tokenKey, isEn]
  );

  const org = post?.organization;
  const feedLabel =
    post?.feed_tab === 'college'
      ? (isEn ? 'College Updates' : '学院通知')
      : post?.feed_tab === 'school'
        ? (isEn ? 'School Bulletin' : '学校公告')
        : '';

  const headerSlot =
    org && org.name ? (
      <div className="post-detail-org-header">
        {org.avatar ? (
          <img src={getUploadUrl(org.avatar)} alt="" className="post-detail-org-avatar" />
        ) : null}
        <div className="post-detail-org-meta">
          <span className="post-detail-org-name">{org.name}</span>
          <span className="post-detail-org-badge">{isEn ? 'Verified official' : '官方认证'}</span>
        </div>
      </div>
    ) : null;

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
      emptyTitle={isEn ? 'Notice not found' : '通知不存在'}
      emptyActionLabel={isEn ? 'Back to square' : '返回广场'}
      onEmptyAction={() => navigate('/about')}
      headerSlot={headerSlot}
      title={post?.title || null}
      metaSlot={feedLabel ? ` · ${feedLabel}` : null}
      reportTargetType="campus_post"
      commentReportType="campus_comment"
    />
  );
}
