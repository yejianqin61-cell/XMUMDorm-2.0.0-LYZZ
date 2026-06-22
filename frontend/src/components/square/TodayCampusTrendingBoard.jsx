import { Link } from 'react-router-dom';

export default function TodayCampusTrendingBoard({ topics = [] }) {
  const items = topics.slice(0, 5);
  if (!items.length) return null;

  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">热搜榜</h2>
          <p className="square-section-subtitle">先看今天校园里最有讨论度的话题，再决定往哪条线深入。</p>
        </div>
        <Link to="/about/trending" className="square-section-more">
          查看全部 →
        </Link>
      </div>
      <div className="square-trending-board">
        {items.map((topic, index) => (
          <Link key={topic.id} to={`/about/trending/${topic.id}`} className="square-trending-item">
            <span className={`square-trending-item__rank square-trending-item__rank--${Math.min(index + 1, 3)}`}>
              #{index + 1}
            </span>
            <div className="square-trending-item__body">
              <h3 className="square-trending-item__title">{topic.title}</h3>
              <p className="square-trending-item__meta">{topic.post_count || 0} 条讨论</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
