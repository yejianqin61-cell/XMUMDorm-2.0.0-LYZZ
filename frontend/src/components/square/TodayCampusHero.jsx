export default function TodayCampusHero({ quickStats = {}, latestTopicTitle = '', latestCampusTitle = '' }) {
  const unreadNotifications = quickStats.unread_notifications || 0;
  const eventsToday = quickStats.events_today || 0;

  return (
    <section className="today-campus-hero">
      <div className="today-campus-hero__content">
        <span className="today-campus-hero__eyebrow">Today on Campus</span>
        <h1 className="today-campus-hero__title">今日校园</h1>
        <p className="today-campus-hero__subtitle">
          从校园热点到活动提醒，把今天最值得打开的内容放在首页第一屏。
        </p>
        <div className="today-campus-hero__chips" aria-label="首页摘要">
          <span className="today-campus-chip">今日活动 {eventsToday > 99 ? '99+' : eventsToday}</span>
          <span className="today-campus-chip">未读通知 {unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
        </div>
      </div>
      <div className="today-campus-hero__briefs" aria-label="校园动态摘要">
        <div className="today-campus-brief-card">
          <span className="today-campus-brief-card__label">热点话题</span>
          <strong className="today-campus-brief-card__title">
            {latestTopicTitle || '新的讨论正在路上'}
          </strong>
        </div>
        <div className="today-campus-brief-card">
          <span className="today-campus-brief-card__label">校园提醒</span>
          <strong className="today-campus-brief-card__title">
            {latestCampusTitle || '学校和学院通知会出现在这里'}
          </strong>
        </div>
      </div>
    </section>
  );
}
