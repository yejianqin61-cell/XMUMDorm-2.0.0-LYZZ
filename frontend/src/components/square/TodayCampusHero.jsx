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

export default function TodayCampusHero() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const links = isEn ? NOTICE_LINKS.en : NOTICE_LINKS.zh;

  return (
    <section className="today-campus-panel">
      <div className="today-campus-hero">
        <div className="today-campus-hero__content">
          <h2 className="today-campus-hero__title">{isEn ? 'Campus Notices' : '校园通知'}</h2>
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
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
