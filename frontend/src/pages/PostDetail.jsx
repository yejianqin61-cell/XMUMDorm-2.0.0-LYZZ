import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_POSTS, getAuthor } from '../data/mockPosts';
import { getCommentsForPost } from '../data/mockComments';
import './PostDetail.css';

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const postId = Number(id);
  const post = MOCK_POSTS.find((p) => p.id === postId);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post ? post.likeCount : 0);
  const [comments, setComments] = useState(() => getCommentsForPost(postId));
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, content } 正在回复的评论

  const requireLogin = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/post/${id}` } }, replace: true });
      return true;
    }
    return false;
  };

  if (!post) {
    return (
      <div className="post-detail-page">
        <p className="post-detail-empty">帖子不存在 Post not found</p>
        <button type="button" onClick={() => navigate('/')}>返回首页 Back to Home</button>
      </div>
    );
  }

  const handleLike = () => {
    if (requireLogin()) return;
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (requireLogin()) return;
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      content: newComment.trim(),
      replyTo: replyingTo ? replyingTo.id : null,
      likeCount: 0,
    };
    setComments((prev) => [...prev, comment]);
    setNewComment('');
    setReplyingTo(null);
  };

  const startReply = (c) => setReplyingTo({ id: c.id, content: c.content });
  const cancelReply = () => { setReplyingTo(null); setNewComment(''); };

  const author = getAuthor(post.authorId);

  return (
    <div className="post-detail-page">
      <article className="post-detail-card">
        <div className="post-detail-author">
          <div className="post-detail-avatar-wrap">
            {author.avatar ? (
              <img src={author.avatar} alt="" className="post-detail-avatar" />
            ) : (
              <img src="/default-avatar.svg" alt="" className="post-detail-avatar post-detail-avatar-default" />
            )}
          </div>
          <span className="post-detail-username">{author.username}</span>
        </div>
        <p className="post-detail-content">{post.content}</p>
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

      <section className="post-detail-comments">
        <h2 className="post-detail-comments-title">评论 Comments ({comments.length})</h2>
        <ul className="post-detail-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="post-detail-comment">
              <p className="post-detail-comment-content">
                {c.replyTo ? (
                  <>
                    <span className="post-detail-reply-label">回复 Reply：</span>
                    {c.content}
                  </>
                ) : (
                  c.content
                )}
              </p>
              <div className="post-detail-comment-meta">
                <span className="post-detail-comment-stat">♥ {c.likeCount}</span>
                <button
                  type="button"
                  className="post-detail-reply-btn"
                  onClick={() => startReply(c)}
                >
                  回复 Reply
                </button>
              </div>
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
          <button type="submit" className="post-detail-send" disabled={!newComment.trim()}>
            发送 Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostDetail;
