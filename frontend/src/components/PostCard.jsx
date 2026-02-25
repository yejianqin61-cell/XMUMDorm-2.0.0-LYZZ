import { Link } from 'react-router-dom';
import { getAuthor } from '../data/mockPosts';
import './PostCard.css';

/**
 * 帖子卡片：头像+用户名，内容摘要，点赞/评论数；点击进入详情
 */
function PostCard({ post }) {
  const { id, content, likeCount, commentCount, authorId } = post;
  const author = getAuthor(authorId);
  const preview = content.length > 50 ? content.slice(0, 50) + '…' : content;

  return (
    <Link to={`/post/${id}`} className="post-card" aria-label={`查看帖子 ${preview}`}>
      <div className="post-card-header">
        <div className="post-card-avatar-wrap">
          {author.avatar ? (
            <img src={author.avatar} alt="" className="post-card-avatar" />
          ) : (
            <img src="/default-avatar.svg" alt="" className="post-card-avatar post-card-avatar-default" />
          )}
        </div>
        <span className="post-card-username">{author.username}</span>
      </div>
      <p className="post-card-content">{preview}</p>
      <div className="post-card-meta">
        <span className="post-card-stat">♥ {likeCount}</span>
        <span className="post-card-stat">💬 {commentCount}</span>
      </div>
    </Link>
  );
}

export default PostCard;
