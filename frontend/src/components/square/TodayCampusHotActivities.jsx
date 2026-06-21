import { useNavigate } from 'react-router-dom';
import { formatPostTime } from '../../utils/formatTime';
import MediaCard from '../ui/MediaCard';
import EmptyState from '../ui/EmptyState';

export default function TodayCampusHotActivities({ activities }) {
  const navigate = useNavigate();

  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">热门活动</h2>
        <button type="button" className="square-section-more" onClick={() => navigate('/about/club')}>
          进入社团 →
        </button>
      </div>
      {activities.length === 0 ? (
        <EmptyState
          className="square-panel-empty"
          title="今天还没有上新的活动"
          description="稍后再来看看，新的活动会出现在这里。"
          icon="⌛"
        />
      ) : (
        <div className="today-campus-list">
          {activities.map((activity) => (
            <MediaCard
              key={activity.id}
              className="today-campus-list-item pressable"
              as="button"
              type="button"
              onClick={() => navigate(`/about/club/activity/${activity.id}`)}
              eyebrow={`${activity.club_name || '社团活动'} · ${formatPostTime(activity.start_time || activity.created_at)}`}
              title={activity.title}
              description={activity.summary || activity.location || '点击查看活动详情'}
              pill={activity.status_label || '进行中'}
            />
          ))}
        </div>
      )}
    </section>
  );
}
