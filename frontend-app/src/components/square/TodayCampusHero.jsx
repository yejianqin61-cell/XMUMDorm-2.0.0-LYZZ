import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const NOTICE_LINKS = {
  zh: [
    {
      key: 'school',
      title: '学校公告',
      description: '查看学校官方与部门最新发布',
      kicker: '查看',
      accent: 'school',
      to: '/about/campus?tab=school',
    },
    {
      key: 'college',
      title: '学院通知',
      description: '按学院分流浏览重要通知',
      kicker: '查看',
      accent: 'college',
      to: '/about/campus?tab=college',
    },
  ],
  en: [
    {
      key: 'school',
      title: 'School Bulletin',
      description: 'See the latest releases from the university and departments',
      kicker: 'Open',
      accent: 'school',
      to: '/about/campus?tab=school',
    },
    {
      key: 'college',
      title: 'College Updates',
      description: 'Browse important notices grouped by college',
      kicker: 'Open',
      accent: 'college',
      to: '/about/campus?tab=college',
    },
  ],
};

export default function TodayCampusHero({ quickStats = {} }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const unreadNotifications = quickStats.unread_notifications || 0;
  const eventsToday = quickStats.events_today || 0;
  const links = isEn ? NOTICE_LINKS.en : NOTICE_LINKS.zh;

  return (
    <section className="today-campus-panel square-home-block">
      <div className="today-campus-hero">
        <div className="today-campus-hero__content">
          <span className="today-campus-hero__eyebrow">Today on Campus</span>
          <h1 className="today-campus-hero__title">{isEn ? 'Campus Today' : '今日校园'}</h1>
          <div className="today-campus-hero__chips" aria-label={isEn ? 'Home summary' : '首页摘要'}>
            <span className="today-campus-chip">
              {isEn ? 'Events today' : '今日活动'} {eventsToday > 99 ? '99+' : eventsToday}
            </span>
            <span className="today-campus-chip">
              {isEn ? 'Unread notices' : '未读通知'} {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          </div>
        </div>
        <div className="today-campus-hero__notice-links" aria-label={isEn ? 'Campus notice entries' : '校园公告入口'}>
          {links.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`today-campus-hero__notice-link today-campus-hero__notice-link--${item.accent}`}
            >
              <span className="today-campus-hero__notice-kicker">{item.kicker}</span>
              <strong className="today-campus-hero__notice-title">{item.title}</strong>
              <span className="today-campus-hero__notice-description">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
