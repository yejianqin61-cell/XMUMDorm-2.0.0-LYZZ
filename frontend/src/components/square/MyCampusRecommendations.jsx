import { Link } from 'react-router-dom';
import EmptyState from '../ui/EmptyState';
import AppCard from '../ui/AppCard';
import { useLanguage } from '../../context/LanguageContext';

export default function MyCampusRecommendations({ summary }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const cards = (summary?.cards || []).slice(0, 2);
  const title = summary?.is_personalized ? (isEn ? 'For You' : '和我有关') : (isEn ? 'Campus Picks' : '校园推荐');
  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">{title}</h2>
        </div>
        <Link to="/posts/search" className="square-section-more">
          {isEn ? 'More topics →' : '查看更多 →'}
        </Link>
      </div>
      {cards.length === 0 ? (
        <EmptyState
          className="square-panel-empty"
          title={isEn ? 'Recommendations are on the way' : '推荐正在准备中'}
          description={
            isEn
              ? 'Browse a few hot topics first and the homepage will get smarter over time.'
              : '先逛逛热门内容，首页会逐步补上更贴近你的校园线索。'
          }
          icon="✨"
        />
      ) : (
        <div className="square-recommend-grid">
          {cards.map((card) => (
            <Link key={`${card.badge}-${card.id}`} to={card.href} className="square-recommend-link">
              <AppCard className="square-recommend-card" interactive>
                <div className="square-recommend-card__top">
                  <span className="square-recommend-card__badge">{card.badge}</span>
                </div>
                <h3 className="square-recommend-card__title">{card.title}</h3>
                {card.meta ? <p className="square-recommend-card__meta">{card.meta}</p> : null}
              </AppCard>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
