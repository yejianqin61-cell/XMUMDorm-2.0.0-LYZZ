import Card from '../components/Card';
import './AboutTeam.css';

/** 团队介绍详情页（静态）：当前仅创始人 CST叶健钦 */
function AboutTeam() {
  return (
    <div className="about-team-page">
      <Card as="div" className="about-team-card">
        <h2 className="about-team-title">团队介绍 Dorm 2.0 Team</h2>
        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">创始人&开发者 Founder&Developer </dt>
            <dd className="about-team-name">叶健钦 YeJianqin</dd>
            <dd className="about-team-subtitle">CST Student in Xiamen University Malaysia</dd>
            <dd className="about-team-tags">哈基米</dd>
          </dl>
        </section>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">美术顾问 Art advisor</dt>
            <dd className="about-team-name">厦门 涂宜晖女士 Ms. Tu Yihui, Xiamen</dd>
          </dl>
        </section>

        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">宣发团队 Promotion team</dt>
            <dd className="about-team-name">许栀窈 Xu Zhiyao</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>

            <dd className="about-team-name">田文奇 Tian Wenqi</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>

            <dd className="about-team-name">郑黄泽 Zheng Huangze</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>

            <dd className="about-team-name">叶健钦 Ye Jianqin</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>

            <dd className="about-team-name">王琳晰 Wang Linxi</dd>
            <dd className="about-team-subtitle">COS student in Xiamen University Malaysia</dd>
          </dl>
        </section>
        <section className="about-team-section">
          <dl className="about-team-list">
            <dt className="about-team-role">Dorm 3.0探索 Explore for Dorm future</dt>
            <dd className="about-team-name">叶健钦 Ye Jianqin</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>

            <dd className="about-team-name">郑黄泽 Zheng Huangze</dd>
            <dd className="about-team-subtitle">CST student in Xiamen University Malaysia</dd>


          </dl>
        </section>
      </Card>
    </div>
  );
}

export default AboutTeam;
