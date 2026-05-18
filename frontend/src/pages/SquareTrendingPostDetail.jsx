import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTrendingPostDetail, getTrendingPostComments, postTrendingPostComment, likeTrendingPost } from '../api/square';
import { QK } from '../query/queryKeys';
import { getUploadUrl } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

export default function SquareTrendingPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const postId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: QK.trendingPostDetail(postId),
    queryFn: () => getTrendingPostDetail(postId),
    staleTime: 30 * 1000,
  });
  const post = postData?.data || postData || {};

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: QK.trendingPostComments(postId),
    queryFn: () => getTrendingPostComments(postId),
    staleTime: 15 * 1000,
  });
  const comments = Array.isArray(commentsData?.data) ? commentsData.data : Array.isArray(commentsData) ? commentsData : [];

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const commentMutation = useMutation({
    mutationFn: (body) => postTrendingPostComment(postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.trendingPostComments(postId) });
      queryClient.invalidateQueries({ queryKey: QK.trendingPostDetail(postId) });
      setCommentText('');
      setReplyTo(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: () => likeTrendingPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.trendingPostDetail(postId) });
    },
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    commentMutation.mutate(
      { content: commentText.trim(), parent_id: replyTo?.id || null },
      { onSettled: () => setSubmitting(false) }
    );
  };

  const topLevelComments = comments.filter((c) => !c.parent_id);
  const getReplies = (commentId) => comments.filter((c) => c.parent_id === commentId);

  if (postLoading) {
    return (
      <div className="square-home-page">
        <div className="square-home-inner">
          <div className="state-loading" style={{ paddingTop: 80 }} />
        </div>
      </div>
    );
  }

  const images = post.images || [];

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        {/* Post content */}
        <div className="square-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {post.author?.avatar && (
              <img src={getUploadUrl(post.author.avatar)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--post-ios-label)' }}>
                {post.author?.name || '匿名'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--post-ios-tertiary-label)' }}>
                {formatPostTime(post.created_at)}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--post-ios-label)', margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {post.content}
          </p>

          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={getUploadUrl(img.url)}
                  alt=""
                  style={{ width: images.length === 1 ? '100%' : 120, maxHeight: 200, borderRadius: 10, objectFit: 'cover' }}
                  loading="lazy"
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--post-ios-secondary-label)' }}>
            <button
              type="button"
              onClick={() => isLoggedIn && likeMutation.mutate()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13, padding: 0 }}
            >
              👍 {post.like_count || 0}
            </button>
            <span>💬 {post.comment_count || 0}</span>
          </div>
        </div>

        {/* Comment form */}
        {isLoggedIn && (
          <div className="square-section">
            <h3 className="square-section-title">
              {replyTo ? `回复 ${replyTo.author?.name || '匿名'}` : '发表评论'}
            </h3>
            {replyTo && (
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{ fontSize: 12, color: 'var(--post-ios-system-blue)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}
              >
                取消回复
              </button>
            )}
            <form onSubmit={handleSubmitComment}>
              <textarea
                className="canteen-search-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder={replyTo ? '写下回复...' : '写下评论...'}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={1000}
              />
              <button
                type="submit"
                className="canteen-pick-btn pressable"
                disabled={submitting || !commentText.trim()}
                style={{ marginTop: 8, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? '发送中...' : '发送'}
              </button>
            </form>
          </div>
        )}

        {/* Comments list */}
        <div className="square-section">
          <h3 className="square-section-title">评论 ({comments.length})</h3>
          {commentsLoading ? (
            <div className="state-loading" style={{ paddingTop: 30 }} />
          ) : topLevelComments.length === 0 ? (
            <div className="state-empty">暂无评论，来做第一个评论的人吧</div>
          ) : (
            <div className="square-campus-list">
              {topLevelComments.map((c) => {
                const replies = getReplies(c.id);
                return (
                  <div key={c.id} className="square-campus-item" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {c.author?.avatar && (
                        <img src={getUploadUrl(c.author.avatar)} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      )}
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--post-ios-label)' }}>
                        {c.author?.name || '匿名'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--post-ios-tertiary-label)' }}>
                        {formatPostTime(c.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--post-ios-label)', lineHeight: 1.5 }}>{c.content}</p>
                    <button
                      type="button"
                      onClick={() => isLoggedIn && setReplyTo(c)}
                      style={{ fontSize: 12, color: 'var(--post-ios-system-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      回复
                    </button>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div style={{ marginLeft: 16, marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--post-ios-separator)' }}>
                        {replies.map((r) => (
                          <div key={r.id} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--post-ios-label)' }}>
                                {r.author?.name || '匿名'}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--post-ios-tertiary-label)' }}>
                                {formatPostTime(r.created_at)}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--post-ios-label)' }}>{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
