import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutTeam.css';

/** 团队介绍详情页（静态） */
function AboutTeam() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-team-page">
      <Card as="div" className="about-team-card">
        <h2 className="about-team-title">
          {isZh ? '团队介绍' : 'Dorm 2.0 Team'}
        </h2>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">
              {isZh ? '创始人&开发者' : 'Founder & Developer'}
            </dt>
            <dd className="about-team-name">
              {isZh ? '叶健钦' : 'Ye Jianqin'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST Student in Xiamen University Malaysia'}
            </dd>
            {isZh && <dd className="about-team-tags">哈基米</dd>}
          </dl>
        </section>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">
              {isZh ? '美术顾问' : 'Art advisor'}
            </dt>
            <dd className="about-team-name">
              {isZh ? '厦门 涂宜晖女士' : 'Ms. Tu Yihui, Xiamen'}
            </dd>
          </dl>
        </section>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">
              {isZh ? '宣发团队 Promotion team' : 'Promotion team'}
            </dt>
            <dd className="about-team-name">
              {isZh ? '许栀窈' : 'Xu Zhiyao'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '田文奇' : 'Tian Wenqi'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '郑黄泽' : 'Zheng Huangze'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '叶健钦' : 'Ye Jianqin'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '王琳晰' : 'Wang Linxi'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 传播学专业' : 'COS student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '凌邦耀' : 'Ling Bangyao'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 网络安全专业' : 'CYS student in Xiamen Universiry Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '林灏云' : 'Lin Haoyun'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '夏悠然' : 'Xia Youran'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>
          </dl>
        </section>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">
              {isZh ? 'Dorm 3.0探索 Explore for Dorm future' : 'Explore for Dorm future'}
            </dt>
            <dd className="about-team-name">
              {isZh ? '叶健钦' : 'Ye Jianqin'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>

            <dd className="about-team-name">
              {isZh ? '郑黄泽' : 'Zheng Huangze'}
            </dd>
            <dd className="about-team-subtitle">
              {isZh ? '厦门大学马来西亚分校 计算机科学与技术专业' : 'CST student in Xiamen University Malaysia'}
            </dd>
          </dl>
        </section>
      </Card>
    </div>
  );
}

export default AboutTeam;
