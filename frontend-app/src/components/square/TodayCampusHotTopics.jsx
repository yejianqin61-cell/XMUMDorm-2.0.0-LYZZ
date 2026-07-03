import { useNavigate } from 'react-router-dom';
import InfoCard from '../ui/InfoCard';
import EmptyState from '../ui/EmptyState';

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
        <EmptyState
          className="square-panel-empty"
          title="暂时没有热搜话题"
          description="下一条热门正在发酵。"
          icon="🔥"
        />
      ) : (
        <div className="today-campus-topic-grid">
          {topics.map((topic, index) => (
            <InfoCard
              key={topic.id}
              className="today-campus-topic-card pressable"
              as="button"
              type="button"
              onClick={() => navigate(`/about/trending/${topic.id}`)}
              eyebrow={`#${index + 1}`}
              title={topic.title}
              meta={`${topic.post_count || 0} 条讨论`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
