import { useNavigate } from 'react-router-dom';
import { formatPostTime } from '../../utils/formatTime';

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
        <div className="square-panel-empty">今天还没有上新的活动，稍后再来看看。</div>
      ) : (
        <div className="today-campus-list">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              className="today-campus-list-item pressable"
              onClick={() => navigate(`/about/club/activity/${activity.id}`)}
            >
              <div className="today-campus-list-item__main">
                <span className="today-campus-list-item__eyebrow">
                  {activity.club_name || '社团活动'} · {formatPostTime(activity.start_time || activity.created_at)}
                </span>
                <strong className="today-campus-list-item__title">{activity.title}</strong>
                <span className="today-campus-list-item__desc">{activity.summary || activity.location || '点击查看活动详情'}</span>
              </div>
              <span className="today-campus-list-item__meta">{activity.status_label || '进行中'}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
