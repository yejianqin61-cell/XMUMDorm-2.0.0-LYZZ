import './Skeleton.css';
import './SkeletonPost.css';

/** 帖子列表骨架：与 PostCard 布局一致（标签 + 内容 + 图 + 元信息 + 底栏作者+点赞） */
function SkeletonPost() {
  return (
    <div className="skeleton-post" aria-hidden>
      <div className="skeleton-post-main">
        <div className="skeleton skeleton-post-tag skeleton-shimmer" />
        <div className="skeleton skeleton-post-line skeleton-shimmer" />
        <div className="skeleton skeleton-post-line skeleton-post-line-short skeleton-shimmer" />
        <div className="skeleton-post-images">
          <div className="skeleton skeleton-post-img skeleton-shimmer" />
        </div>
        <div className="skeleton-post-meta">
          <div className="skeleton skeleton-post-meta-item skeleton-shimmer" />
          <div className="skeleton skeleton-post-meta-item skeleton-shimmer" />
        </div>
      </div>
      <div className="skeleton-post-footer">
        <div className="skeleton-post-footer-left">
          <div className="skeleton skeleton-post-avatar skeleton-shimmer" />
          <div className="skeleton skeleton-post-username skeleton-shimmer" />
        </div>
        <div className="skeleton skeleton-post-like skeleton-shimmer" />
      </div>
    </div>
  );
}

export default SkeletonPost;
