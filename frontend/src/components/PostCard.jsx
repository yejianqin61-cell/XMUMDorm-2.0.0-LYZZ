import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import ImagePreview from './ImagePreview';
import './PostCard.css';

/** 兼容 API 与 Mock：author 为对象时用 nickname/username、avatar（需补全 URL） */
function useAuthor(post) {
  if (post.author && typeof post.author === 'object') {
    const a = post.author;
    const avatar = a.avatar ? (a.avatar.startsWith('http') ? a.avatar : `${API_BASE_URL}${a.avatar}`) : null;
    return { username: a.nickname ?? a.username ?? '匿名', avatar };
  }
  return { username: '匿名', avatar: null };
}

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/**
 * 帖子卡片：头像+用户名，内容摘要，点赞/评论数；点击进入详情
 * post 支持 API 形状：author, like_count, comment_count 或 Mock：authorId, likeCount, commentCount
 */
function PostCard({ post }) {
  const { id, content, like_count, comment_count, likeCount, commentCount } = post;
  const author = useAuthor(post);
  const likeNum = like_count ?? likeCount ?? 0;
  const commentNum = comment_count ?? commentCount ?? 0;
  const preview = (content || '').length > 50 ? (content || '').slice(0, 50) + '…' : (content || '');
  const timeStr = formatPostTime(post.created_at);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const imageUrls = post.images?.length ? post.images.map((img) => prefixImageUrl(img.url)) : [];

  return (
    <>
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
        {post.images && post.images.length > 0 && (
          <div className="post-card-images" aria-hidden>
            {post.images.slice(0, 3).map((img, i) => (
              <span
                key={img.url || i}
                role="button"
                tabIndex={0}
                className="post-card-image-wrap"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setImagePreview({ open: true, index: i });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setImagePreview({ open: true, index: i });
                  }
                }}
              >
                <img
                  src={prefixImageUrl(img.url)}
                  alt=""
                  className="post-card-image"
                />
              </span>
            ))}
          </div>
        )}
        <div className="post-card-meta">
          {timeStr && <span className="post-card-time">{timeStr}</span>}
          <span className="post-card-stat">♥ {likeNum}</span>
          <span className="post-card-stat">💬 {commentNum}</span>
        </div>
      </Link>
      {imagePreview.open && imageUrls.length > 0 && (
        <ImagePreview
          urls={imageUrls}
          initialIndex={imagePreview.index}
          onClose={() => setImagePreview({ open: false, index: 0 })}
        />
      )}
    </>
  );
}

export default PostCard;
