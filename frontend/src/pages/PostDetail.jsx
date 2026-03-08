import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPostDetail,
  getPostComments,
  toggleLike,
  createComment,
  deletePost,
} from '../api/posts';
import { API_BASE_URL } from '../api/config';
import { Toast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';
import LikeBurst from '../components/LikeBurst';
import { formatPostTime } from '../utils/formatTime';
import { getApiErrorMessage } from '../utils/apiError';
import './PostDetail.css';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, token, user } = useAuth();
  const postId = Number(id);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const likeBurstRef = useRef(null);

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/post/${id}` } }, replace: true });
      return true;
    }
    return false;
  }, [isLoggedIn, navigate, id]);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getPostDetail(postId, token),
      getPostComments(postId),
    ])
      .then(([postData, commentsData]) => {
        if (cancelled) return;
        setPost({
          ...postData,
          author: postData.author ? { ...postData.author, avatar: prefixAvatar(postData.author.avatar) } : postData.author,
        });
        setLikeCount(postData.like_count ?? 0);
        const list = Array.isArray(commentsData) ? commentsData : [];
        setComments(list.map((c) => ({
          ...c,
          author: c.author ? { ...c.author, avatar: prefixAvatar(c.author.avatar) } : c.author,
          replies: (c.replies || []).map((r) => ({
            ...r,
            author: r.author ? { ...r.author, avatar: prefixAvatar(r.author.avatar) } : r.author,
          })),
        })));
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [postId, token]);

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
      setError(null);
      Toast.success('评论成功');
      const list = await getPostComments(postId);
      setComments(Array.isArray(list) ? list.map((c) => ({
        ...c,
        author: c.author ? { ...c.author, avatar: prefixAvatar(c.author.avatar) } : c.author,
        replies: (c.replies || []).map((r) => ({
          ...r,
          author: r.author ? { ...r.author, avatar: prefixAvatar(r.author.avatar) } : r.author,
        })),
      })) : []);
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  const startReply = (c) => setReplyingTo({ id: c.id, content: c.content });
  const cancelReply = () => { setReplyingTo(null); setNewComment(''); };

  const isAuthor = post && (post.user_id === user?.id || post.author?.id === user?.id);
  const handleDeletePost = async () => {
    if (!window.confirm('确定要删除这条帖子吗？删除后不可恢复。')) return;
    setDeleteLoading(true);
    try {
      await deletePost(postId);
      Toast.success('已删除');
      navigate('/', { replace: true });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-error state-error">{error}</p>
        <button type="button" onClick={() => navigate('/')}>返回首页 Back to Home</button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <EmptyState
          title="帖子不存在"
          description="Post not found"
          actionLabel="返回首页"
          onActionClick={() => navigate('/')}
        />
      </div>
    );
  }

  const author = post.author || {};
  const displayName = author.nickname ?? author.username ?? '匿名';
  const totalCommentCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="post-detail-page">
      {error && <p className="post-detail-error" role="alert">{error}</p>}
      <article className="post-detail-card">
        <div className="post-detail-author">
          <div className="post-detail-avatar-wrap">
            {author.avatar ? (
              <img src={author.avatar} alt="" className="post-detail-avatar" />
            ) : (
              <img src="/default-avatar.svg" alt="" className="post-detail-avatar post-detail-avatar-default" />
            )}
          </div>
          <div className="post-detail-author-info">
            <span className="post-detail-username">{displayName}</span>
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
        <h2 className="post-detail-comments-title">评论 Comments ({totalCommentCount})</h2>
        <ul className="post-detail-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="post-detail-comment-wrap">
              <div className="post-detail-comment">
                <p className="post-detail-comment-content">{c.content}</p>
                <div className="post-detail-comment-meta">
                  <span className="post-detail-comment-stat">
                    {(c.author?.nickname ?? c.author?.username) || '匿名'}
                  </span>
                  <button
                    type="button"
                    className="post-detail-reply-btn"
                    onClick={() => startReply(c)}
                  >
                    回复 Reply
                  </button>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <ul className="post-detail-reply-list">
                  {c.replies.map((r) => (
                    <li key={r.id} className="post-detail-comment post-detail-comment-reply">
                      <p className="post-detail-comment-content">
                        <span className="post-detail-reply-label">回复 Reply：</span>
                        {r.content}
                      </p>
                      <div className="post-detail-comment-meta">
                        <span className="post-detail-comment-stat">
                          {(r.author?.nickname ?? r.author?.username) || '匿名'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form className="post-detail-form" onSubmit={handleSubmitComment}>
        {replyingTo && (
          <div className="post-detail-replying">
            <span>回复 Reply：{replyingTo.content.slice(0, 20)}{replyingTo.content.length > 20 ? '…' : ''}</span>
            <button type="button" onClick={cancelReply}>取消 Cancel</button>
          </div>
        )}
        <div className="post-detail-form-row">
          <input
            type="text"
            className="post-detail-input"
            placeholder={replyingTo ? '输入回复… Reply…' : '写一条评论… Write a comment…'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="post-detail-send" disabled={!newComment.trim() || submitLoading}>
            {submitLoading ? '发送中…' : '发送 Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostDetail;
