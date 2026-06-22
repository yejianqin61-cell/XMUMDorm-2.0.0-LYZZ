import { Link } from 'react-router-dom';
import EmptyState from '../ui/EmptyState';
import AppCard from '../ui/AppCard';

export default function MyCampusRecommendations({ summary }) {
  const cards = (summary?.cards || []).slice(0, 2);
  const profile = summary?.profile || {};
  const title = summary?.is_personalized ? '和我有关' : '校园推荐';
  const subtitle = summary?.is_personalized
    ? profile.college
      ? `${profile.nickname} · ${profile.college}`
      : `${profile.nickname} · 按你最近的校园节奏推荐`
    : '先用热门内容兜底，后续会越来越懂你';

  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">{title}</h2>
          <p className="square-section-subtitle">{subtitle}</p>
        </div>
      </div>
      {cards.length === 0 ? (
        <EmptyState
          className="square-panel-empty"
          title="推荐正在准备中"
          description="先逛逛热门内容，系统会逐步补足你的校园偏好。"
          icon="✨"
        />
      ) : (
        <div className="square-recommend-grid">
          {cards.map((card) => (
            <Link key={`${card.badge}-${card.id}`} to={card.href} className="square-recommend-link">
              <AppCard className="square-recommend-card" interactive>
                <div className="square-recommend-card__top">
                  <span className="square-recommend-card__badge">{card.badge}</span>
                  <span className="square-recommend-card__reason">{card.reason}</span>
                </div>
                <h3 className="square-recommend-card__title">{card.title}</h3>
                <p className="square-recommend-card__subtitle">
                  {card.subtitle || card.excerpt || '继续看看这条线索'}
                </p>
                {card.meta ? <p className="square-recommend-card__meta">{card.meta}</p> : null}
              </AppCard>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
