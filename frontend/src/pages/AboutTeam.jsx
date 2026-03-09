import Card from '../components/Card';
import './AboutTeam.css';

/** 团队介绍详情页（静态）：当前仅创始人 CST叶健钦，全栈工程师、产品经理 */
function AboutTeam() {
  return (
    <div className="about-team-page">
      <Card as="div" className="about-team-card">
        <h2 className="about-team-title">团队介绍 Team</h2>
        <dl className="about-team-list">
          <dt className="about-team-role">创始人 Founder</dt>
          <dd className="about-team-name">叶健钦 YeJianqin</dd>
          <dd className="about-team-subtitle">CST Student in Xiamen University Malaysia</dd>
          <dd className="about-team-tags">哈基米</dd>
        </dl>
      </Card>
    </div>
  );
}

export default AboutTeam;
