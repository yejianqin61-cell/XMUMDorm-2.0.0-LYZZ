import './Skeleton.css';
import './SkeletonPost.css';

/** 帖子列表骨架：与 PostCard 布局一致（头像 + 用户名 + 内容行 + 可选图片区 + 元信息） */
function SkeletonPost() {
  return (
    <div className="skeleton-post" aria-hidden>
      <div className="skeleton-post-header">
        <div className="skeleton skeleton-post-avatar skeleton-shimmer" />
        <div className="skeleton skeleton-post-username skeleton-shimmer" />
      </div>
      <div className="skeleton skeleton-post-line skeleton-shimmer" />
      <div className="skeleton skeleton-post-line skeleton-post-line-short skeleton-shimmer" />
      <div className="skeleton-post-images">
        <div className="skeleton skeleton-post-img skeleton-shimmer" />
        <div className="skeleton skeleton-post-img skeleton-shimmer" />
      </div>
      <div className="skeleton-post-meta">
        <div className="skeleton skeleton-post-meta-item skeleton-shimmer" />
        <div className="skeleton skeleton-post-meta-item skeleton-shimmer" />
      </div>
    </div>
  );
}

export default SkeletonPost;
