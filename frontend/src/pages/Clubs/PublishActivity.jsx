import { useLanguage } from '../../context/LanguageContext';
import './Clubs.css';

function PublishActivity() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '发布活动' : 'Post Activity'}</div>
      </div>
      <div className="state-empty">
        {isZh ? '开发中：发布活动表单下一步补齐（包含封面、时间、地点、外链报名）。' : 'Coming soon: activity publish form.'}
      </div>
    </div>
  );
}

export default PublishActivity;

