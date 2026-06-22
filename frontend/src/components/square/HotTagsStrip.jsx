import { Link } from 'react-router-dom';

export default function HotTagsStrip({ tags = [] }) {
  if (!tags.length) return null;

  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">热标签</h2>
          <p className="square-section-subtitle">用横向浏览替代纵向堆叠，让信息更轻一点。</p>
        </div>
        <Link to="/posts/search" className="square-section-more">
          去发现 →
        </Link>
      </div>
      <div className="square-hot-tags-strip" role="list" aria-label="热门标签">
        {tags.map((tag) => (
          <Link key={tag.id || tag.slug} to={`/posts/tag/${tag.slug}`} className="square-hot-tag-chip" role="listitem">
            <span className="square-hot-tag-chip__name">#{tag.name}</span>
            <span className="square-hot-tag-chip__meta">{tag.usage_count || 0} 条</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
