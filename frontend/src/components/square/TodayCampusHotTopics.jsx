import { useNavigate } from 'react-router-dom';

export default function TodayCampusHotTopics({ topics }) {
  const navigate = useNavigate();

  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">校园热议</h2>
        <button type="button" className="square-section-more" onClick={() => navigate('/about/trending')}>
          查看全部 →
        </button>
      </div>
      {topics.length === 0 ? (
        <div className="square-panel-empty">暂时没有热搜话题，下一条热门正在发酵。</div>
      ) : (
        <div className="today-campus-topic-grid">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              type="button"
              className="today-campus-topic-card pressable"
              onClick={() => navigate(`/about/trending/${topic.id}`)}
            >
              <span className="today-campus-topic-card__rank">#{index + 1}</span>
              <strong className="today-campus-topic-card__title">{topic.title}</strong>
              <span className="today-campus-topic-card__meta">{topic.post_count || 0} 条讨论</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
