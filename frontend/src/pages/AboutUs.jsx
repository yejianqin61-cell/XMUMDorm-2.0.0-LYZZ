import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './AboutUs.css';

/** 关于我们：白底 70% 透明、左侧图标、右侧箭头、无缝排列（语言切换已移至顶栏） */
function AboutUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-page">
      <ul className="about-list" aria-label={isZh ? '关于我们入口列表' : 'About entries'}>
        <li className="about-list-item">
          <Link to="/about/thanks" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <ThanksIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '特别鸣谢' : 'Special Thanks'}
              </span>
              <span className="about-list-hint">
                {isZh ? '点击查看' : 'Tap to view'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/profile" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <TeamIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '关于我们' : 'About us'}
              </span>
              <span className="about-list-hint">
                {isZh ? '点击查看' : 'Tap to view'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/schedule" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <ScheduleIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '课程表' : 'Schedule'}
              </span>
              <span className="about-list-hint">
                {isZh ? '导入并查看' : 'Import & view'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/diary" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <ScheduleIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '往年今日' : 'On this day'}
              </span>
              <span className="about-list-hint">
                {isZh ? '看看时间留下的脚注' : 'A small diary for this day'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/disclaimer" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <DisclaimerIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '特别说明' : 'Notice'}
              </span>
              <span className="about-list-hint">
                {isZh ? '免责声明与内容来源' : 'Disclaimer & content sources'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/contact" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <ContactIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '联系我们' : 'Contact us'}
              </span>
              <span className="about-list-hint">
                {isZh ? '建议反馈与商家认领' : 'Feedback & merchant requests'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ThanksIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l3 7h7l-5.5 5 2 7L12 17l-6.5 4 2-7L3 9h7l3-7z" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="17" cy="10" r="3" />
      <path d="M14 21v-2a3 3 0 0 1 1.5-2.6 3 3 0 0 0 3-2.6" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M7 14h3M7 18h3M14 14h3M14 18h3" />
    </svg>
  );
}

function DisclaimerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2 4.18 2 2 0 0 1 4 2h2.08a2 2 0 0 1 2 1.72c.12.86.32 1.7.57 2.5a2 2 0 0 1-.45 2.11L7.1 9.9a16 16 0 0 0 6 6l1.57-1.1a2 2 0 0 1 2.11-.45c.8.25 1.64.45 2.5.57A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default AboutUs;
