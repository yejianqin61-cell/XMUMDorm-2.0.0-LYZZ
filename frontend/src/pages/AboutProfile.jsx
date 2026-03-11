import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './AboutUs.css';

/** 关于我们详情页：团队介绍 / 编者的话 / 评分算法说明，使用与广场相同的列表布局 */
function AboutProfile() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-page">
      <ul className="about-list" aria-label={isZh ? '关于我们详情列表' : 'About details'}>
        <li className="about-list-item">
          <Link to="/about/team" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <TeamIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '团队介绍' : 'Team'}
              </span>
              <span className="about-list-hint">
                {isZh ? '哈基米方阵' : 'Hakimi Matrix team'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/editor-note" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <EditorNoteIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '编者的话' : "Editor's Note"}
              </span>
              <span className="about-list-hint">
                {isZh ? 'Dorm 的故事' : 'Story behind Dorm'}
              </span>
            </div>
            <span className="about-list-arrow" aria-hidden>
              &gt;
            </span>
          </Link>
        </li>
        <li className="about-list-item">
          <Link to="/about/algorithm" className="about-list-row about-list-row-link">
            <span className="about-list-icon" aria-hidden>
              <AlgorithmIcon />
            </span>
            <div className="about-list-body">
              <span className="about-list-label">
                {isZh ? '评分算法说明' : 'Scoring Algorithm'}
              </span>
              <span className="about-list-hint">
                {isZh ? '如何计算菜品/商家评分' : 'How scores are calculated'}
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

function EditorNoteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function AlgorithmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h10M4 18h6" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="14" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </svg>
  );
}

export default AboutProfile;


