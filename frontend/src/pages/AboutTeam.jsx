import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutTeam.css';

/**
 * 团队介绍（静态）：与关于我们入口「哈基米方阵」一致。
 * 分组 + 成员（姓名 / 院系英文与中文分行展示）
 */
const TEAM_SECTIONS = [
  {
    roleZh: '创始人&开发者',
    roleEn: 'Founder & Developer',
    members: [
      {
        nameZh: '叶健钦',
        nameEn: 'Ye Jianqin',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST Student in Xiamen University Malaysia',
        tagZh: '哈基米',
      },
    ],
  },
  {
    roleZh: '技术顾问',
    roleEn: 'Technical advisor',
    members: [
      {
        nameZh: '叶以翔',
        nameEn: 'Ye Yixiang',
        lineZh: '四川大学',
        lineEn: 'Sichuan University',
      },
    ],
  },
  {
    roleZh: '宣发团队 Promotion team',
    roleEn: 'Promotion team',
    members: [
      {
        nameZh: '许栀窈',
        nameEn: 'Xu Zhiyao',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '田文奇',
        nameEn: 'Tian Wenqi',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '郑黄泽',
        nameEn: 'Zheng Huangze',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '王琳晰',
        nameEn: 'Wang Linxi',
        lineZh: '厦门大学马来西亚分校 传播学专业',
        lineEn: 'COS student in Xiamen University Malaysia',
      },
      {
        nameZh: '凌邦耀',
        nameEn: 'Ling Bangyao',
        lineZh: '厦门大学马来西亚分校 网络安全专业',
        lineEn: 'CYS student in Xiamen University Malaysia',
      },
      {
        nameZh: '林灏云',
        nameEn: 'Lin Haoyun',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '夏悠然',
        nameEn: 'Xia Youran',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '阴沛森',
        nameEn: 'Yin Peisen',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
    ],
  },
  {
    roleZh: '美术顾问',
    roleEn: 'Art advisor',
    members: [
      {
        nameZh: '厦门 涂宜晖女士',
        nameEn: 'Ms. Tu Yihui, Xiamen',
        lineZh: '',
        lineEn: '',
      },
    ],
  },
  {
    roleZh: 'Dorm 3.0探索 Explore for Dorm future',
    roleEn: 'Explore for Dorm future',
    members: [
      {
        nameZh: '叶健钦',
        nameEn: 'Ye Jianqin',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
      {
        nameZh: '郑黄泽',
        nameEn: 'Zheng Huangze',
        lineZh: '厦门大学马来西亚分校 计算机科学与技术专业',
        lineEn: 'CST student in Xiamen University Malaysia',
      },
    ],
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

        {TEAM_SECTIONS.map((section, sIdx) => (
          <section key={section.roleEn || sIdx} className="about-team-section">
            <p className="about-team-role about-team-section-role">
              {isZh ? section.roleZh : section.roleEn}
            </p>
            {section.members.map((m, mIdx) => {
              const line = isZh ? m.lineZh : m.lineEn;
              return (
                <div
                  key={`${m.nameEn}-${mIdx}`}
                  className={mIdx > 0 ? 'about-team-person about-team-person-spaced' : 'about-team-person'}
                >
                  <p className="about-team-name">{isZh ? m.nameZh : m.nameEn}</p>
                  {line ? <p className="about-team-school">{line}</p> : null}
                  {isZh && m.tagZh ? <p className="about-team-tags">{m.tagZh}</p> : null}
                </div>
              );
            })}
          </section>
        ))}
      </Card>
    </div>
  );
}

export default AboutTeam;
