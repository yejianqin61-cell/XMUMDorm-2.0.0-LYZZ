import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import { toggleLike } from '../api/posts';
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

/** 卡片顶栏标签（双语 + 可跳转话题页） */
function buildCardTags(post, lang) {
  const isEn = lang === 'en';
  if (post.type === 'announcement') {
    return [{ key: 'announcement', label: isEn ? 'Announcement' : '公告', slug: null }];
  }
  const raw =
    Array.isArray(post.tags) && post.tags.length > 0
      ? post.tags
      : Array.isArray(post.topics)
        ? post.topics
        : [];
  if (raw.length > 0) {
    return raw.slice(0, 3).map((t, i) => {
      const slug = t.slug != null ? String(t.slug) : null;
      const label = isEn
        ? (t.name_en || t.name_zh || t.name || slug || 'Topic')
        : (t.name_zh || t.name_en || t.name || slug || '话题');
      return { key: t.id ?? slug ?? i, label, slug };
    });
  }
  return [{ key: 'treehole', label: isEn ? 'Tree Hole' : '树洞', slug: null }];
}

/**
 * 帖子卡片：顶栏标签；正文+图；底栏头像+昵称+大点赞（列表可点赞）
 */
function PostCard({ post, variant = 'list' }) {
  const { lang } = useLanguage();
  const { id, title, content, like_count, comment_count, likeCount, commentCount } = post;
  const author = useAuthor(post);
  const initialLike = like_count ?? likeCount ?? 0;
  const commentNum = comment_count ?? commentCount ?? 0;
  const preview = (content || '').length > 50 ? (content || '').slice(0, 50) + '…' : (content || '');
  const displayTitle = (title || '').trim() || preview || '无标题';
  const timeStr = formatPostTime(post.created_at);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const imageUrls = post.images?.length ? post.images.map((img) => prefixImageUrl(img.url)) : [];
  const tags = buildCardTags(post, lang);
  const hasImages = Array.isArray(post.images) && post.images.length > 0;
  const showWaterfall = variant === 'waterfall';
  const coverUrl = hasImages ? prefixImageUrl(post.images[0]?.url) : null;

  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [likeNum, setLikeNum] = useState(initialLike);
  const [liked, setLiked] = useState(!!post.user_liked);

  useEffect(() => {
    setLikeNum(like_count ?? likeCount ?? 0);
    setLiked(!!post.user_liked);
  }, [post.id, post.user_liked, post.like_count, post.likeCount, like_count, likeCount]);

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/post/${id}` } } });
      return;
    }
    try {
      const data = await toggleLike(id);
      setLiked(data?.liked ?? !liked);
      setLikeNum((c) => (data?.liked ? c + 1 : Math.max(0, c - 1)));
    } catch (_) {
      /* 静默失败，避免打断浏览 */
    }
  };

  return (
    <>
      <div className={`post-card ${showWaterfall ? 'post-card--waterfall' : ''} ${showWaterfall && hasImages ? 'post-card--waterfall-image' : ''}`}>
        {!showWaterfall && (
          <div className="post-card-tags" aria-label="标签 Tags">
            {tags.map((t) =>
              t.slug ? (
                <Link
                  key={t.key}
                  to={`/posts/tag/${encodeURIComponent(t.slug)}`}
                  className="post-card-tag post-card-tag--link"
                >
                  {t.label}
                </Link>
              ) : (
                <span key={t.key} className="post-card-tag">
                  {t.label}
                </span>
              )
            )}
          </div>
        )}
        <Link to={`/post/${id}`} className="post-card-body" aria-label={`查看帖子 ${preview}`}>
          {showWaterfall && hasImages ? (
            <>
              <div
                className="post-card-cover"
                role="button"
                tabIndex={0}
                aria-label="预览图片"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setImagePreview({ open: true, index: 0 });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setImagePreview({ open: true, index: 0 });
                  }
                }}
              >
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt=""
                    className="post-card-cover-img"
                    loading="eager"
                    decoding="async"
                  />
                )}
              </div>
              <p className="post-card-title">{displayTitle}</p>
            </>
          ) : (
            <>
              {!showWaterfall && <p className="post-card-content">{preview}</p>}
              {hasImages && !showWaterfall && (
                <div className="post-card-images" aria-hidden>
                  {post.images.slice(0, 1).map((img, i) => (
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
                        loading="eager"
                        decoding="async"
                      />
                    </span>
                  ))}
                </div>
              )}
              {!showWaterfall && (
                <div className="post-card-meta">
                  {timeStr && <span className="post-card-time">{timeStr}</span>}
                  <span className="post-card-stat">💬 {commentNum}</span>
                </div>
              )}
            </>
          )}
        </Link>
        <div className="post-card-footer" aria-label="作者与点赞">
          <div className="post-card-footer-author">
            <div className="post-card-avatar-wrap">
              {author.avatar ? (
                <img src={author.avatar} alt="" className="post-card-avatar" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="post-card-avatar post-card-avatar-default" />
              )}
            </div>
            <span className="post-card-username">{author.username}</span>
          </div>
          <button
            type="button"
            className={`post-card-like-btn ${liked ? 'post-card-like-btn--active' : ''}`}
            onClick={handleLikeClick}
            aria-pressed={liked}
            aria-label={liked ? '取消点赞' : '点赞'}
          >
            <span className="post-card-like-icon" aria-hidden>
              {liked ? '♥' : '♡'}
            </span>
            <span className="post-card-like-count">{likeNum}</span>
          </button>
        </div>
      </div>
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
