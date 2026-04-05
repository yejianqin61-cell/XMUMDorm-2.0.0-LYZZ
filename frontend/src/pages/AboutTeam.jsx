import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutTeam.css';

/** 团队介绍（静态）：与关于我们入口「哈基米方阵」一致，可按需扩展成员列表 */
const TEAM_MEMBERS = [
  {
    roleZh: '创始人',
    roleEn: 'Founder',
    nameZh: '叶健钦',
    nameEn: 'Ye Jianqin',
    tagsZh: '产品 · 全栈开发',
    tagsEn: 'Product · Full-stack',
  },
];

function AboutTeam() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-team-page">
      <Card as="div" className="about-team-card">
        <section className="about-team-section">
          <h2 className="about-team-title">{isZh ? '哈基米方阵' : 'Hakimi Matrix'}</h2>
          <p className="about-team-tags about-team-intro">
            {isZh
              ? 'Dorm（厦马小筑）由一群热爱校园生活的同学发起与维护。我们希望通过产品与社区，让校园信息更透明、连接更温暖。'
              : 'Dorm (XMUM Dorm) is built and maintained by students who care about campus life. We hope to make campus information clearer and connections warmer through product and community.'}
          </p>
        </section>
        <section className="about-team-section">
          <h3 className="about-team-subtitle">{isZh ? '核心成员' : 'Core team'}</h3>
          <ul className="about-team-list about-team-member-list">
            {TEAM_MEMBERS.map((m) => (
              <li key={m.nameEn}>
                <p className="about-team-role">{isZh ? m.roleZh : m.roleEn}</p>
                <p className="about-team-name">{isZh ? m.nameZh : m.nameEn}</p>
                <p className="about-team-tags">{isZh ? m.tagsZh : m.tagsEn}</p>
              </li>
            ))}
          </ul>
        </section>
      </Card>
    </div>
  );
}

export default AboutTeam;
