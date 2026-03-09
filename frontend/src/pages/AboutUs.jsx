import { Link } from 'react-router-dom';
import Card from '../components/Card';
import './AboutUs.css';

/** 关于我们：两个卡片（团队介绍 → 详情页；评分算法说明 → 暂空），复用站内 Card 风格 */
function AboutUs() {
  return (
    <div className="about-page">
      <ul className="about-card-list" aria-label="关于我们入口列表">
        <li>
          <Link to="/about/thanks" className="about-card-link" aria-label="特别鸣谢">
            <Card as="div" className="about-card">
              <span className="about-card-label">特别鸣谢 Special Thanks</span>
              <span className="about-card-hint">点击查看 Tap to view</span>
            </Card>
          </Link>
        </li>
        <li>
          <Link to="/about/team" className="about-card-link" aria-label="团队介绍">
            <Card as="div" className="about-card">
              <span className="about-card-label">团队介绍 Team Intro</span>
              <span className="about-card-hint">点击查看 Tap to view</span>
            </Card>
          </Link>
        </li>
        <li>
          <Card as="div" className="about-card about-card-static">
            <span className="about-card-label">评分算法说明 Scoring Algorithm</span>
            <span className="about-card-hint">暂无内容 Empty</span>
          </Card>
        </li>
      </ul>
    </div>
  );
}

export default AboutUs;
