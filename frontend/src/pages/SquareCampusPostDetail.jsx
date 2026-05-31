import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getCampusPostDetail,
  getCampusPostComments,
  postCampusPostComment,
  likeCampusPost,
} from '../api/square';
import { API_BASE_URL, getUploadUrl } from '../api/config';
import { Toast } from '../context/ToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import PostDetailShell from '../components/PostDetailShell';

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

export default function SquareCampusPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, token, user, isAdmin } = useAuth();
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
    select: (d) => {
      const post = d?.data || d || {};
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
    setLikeCount((c) => (optimistic ? c + 1 : Math.max(0, c - 1)));
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
        Toast.success('评论成功');
      } catch (err) {
        Toast.error(getApiErrorMessage(err));
        throw err;
      } finally {
        setSubmitLoading(false);
      }
    },
    [postId, queryClient, tokenKey]
  );

  const org = post?.organization;
  const feedLabel =
    post?.feed_tab === 'college' ? '学院通知' : post?.feed_tab === 'school' ? '学校公告' : '';

  const headerSlot =
    org && org.name ? (
      <div className="post-detail-org-header">
        {org.avatar ? (
          <img src={getUploadUrl(org.avatar)} alt="" className="post-detail-org-avatar" />
        ) : null}
        <div className="post-detail-org-meta">
          <span className="post-detail-org-name">{org.name}</span>
          <span className="post-detail-org-badge">官方认证</span>
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
      emptyTitle="通知不存在"
      emptyActionLabel="返回广场"
      onEmptyAction={() => navigate('/about')}
      headerSlot={headerSlot}
      title={post?.title || null}
      metaSlot={feedLabel ? ` · ${feedLabel}` : null}
      reportTargetType="campus_post"
    />
  );
}
