import { Link } from 'react-router-dom';

const NOTICE_LINKS = [
  {
    key: 'school',
    title: '学校公告',
    description: '查看学校官方与部门最新发布',
    accent: 'school',
    to: '/about/campus?tab=school',
  },
  {
    key: 'college',
    title: '学院通知',
    description: '按学院分流浏览重要通知',
    accent: 'college',
    to: '/about/campus?tab=college',
  },
];

export default function TodayCampusHero({ quickStats = {} }) {
  const unreadNotifications = quickStats.unread_notifications || 0;
  const eventsToday = quickStats.events_today || 0;

  return (
    <section className="today-campus-panel square-home-block">
      <div className="today-campus-hero">
        <div className="today-campus-hero__content">
          <span className="today-campus-hero__eyebrow">Today on Campus</span>
          <h1 className="today-campus-hero__title">今日校园</h1>
          <div className="today-campus-hero__chips" aria-label="首页摘要">
            <span className="today-campus-chip">今日活动 {eventsToday > 99 ? '99+' : eventsToday}</span>
            <span className="today-campus-chip">未读通知 {unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
          </div>
        </div>
        <div className="today-campus-hero__notice-links" aria-label="校园公告入口">
          {NOTICE_LINKS.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`today-campus-hero__notice-link today-campus-hero__notice-link--${item.accent}`}
            >
              <span className="today-campus-hero__notice-kicker">查看</span>
              <strong className="today-campus-hero__notice-title">{item.title}</strong>
              <span className="today-campus-hero__notice-description">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
