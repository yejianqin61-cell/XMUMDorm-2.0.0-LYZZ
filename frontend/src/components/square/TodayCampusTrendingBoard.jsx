import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function TodayCampusTrendingBoard({ topics = [] }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const items = topics.slice(0, 5);
  if (!items.length) return null;

  return (
    <section className="today-campus-panel square-home-block">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">{isEn ? 'Trending Board' : '热搜榜'}</h2>
        </div>
        <Link to="/about/trending" className="square-section-more">
          {isEn ? 'View all →' : '查看全部 →'}
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
              <p className="square-trending-item__meta">
                {topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
