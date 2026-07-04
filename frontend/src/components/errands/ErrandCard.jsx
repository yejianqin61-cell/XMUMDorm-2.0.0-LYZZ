import { Link } from 'react-router-dom';
import { Clock3, MapPin, Tag } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import '../../pages/Errands/Errands.css';

function formatDeadline(deadline) {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

function typeLabel(type, isZh) {
  const dict = {
    delivery: { zh: '代取', en: 'Delivery' },
    purchase: { zh: '代购', en: 'Purchase' },
    urgent: { zh: '紧急', en: 'Urgent' },
  };
  return (dict[type] || dict.delivery)[isZh ? 'zh' : 'en'];
}

function statusLabel(status, isZh) {
  const dict = {
    open: { zh: '进行中', en: 'Open' },
    taken: { zh: '已接单', en: 'Taken' },
    done: { zh: '已完成', en: 'Done' },
  };
  return (dict[status] || dict.open)[isZh ? 'zh' : 'en'];
}

function ErrandCard({ errand }) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const deadline = formatDeadline(errand.deadline);

  return (
    <Link to={`/about/errands/${errand.id}`} className="err-card pressable">
      <div className="err-card-top">
        <div className={`err-badge err-badge--${errand.type || 'delivery'}`}>
          <Tag size={14} aria-hidden />
          <span>{typeLabel(errand.type, isZh)}</span>
        </div>
        <div className={`err-status err-status--${errand.status || 'open'}`}>{statusLabel(errand.status, isZh)}</div>
      </div>

      <div className="err-card-title">{errand.title}</div>

      <div className="err-card-meta">
        {deadline ? (
          <span className="err-meta-item">
            <Clock3 size={14} aria-hidden />
            <span>{deadline}</span>
          </span>
        ) : null}
        {errand.location ? (
          <span className="err-meta-item">
            <MapPin size={14} aria-hidden />
            <span className="err-meta-text">{errand.location}</span>
          </span>
        ) : null}
      </div>

      <div className="err-card-bottom">
        <div className="err-reward">RM {Number(errand.reward || 0).toFixed(2)}</div>
        <div className="err-owner">
          {errand.owner?.avatar ? <img src={errand.owner.avatar} alt="" className="err-owner-avatar" /> : null}
          <span className="err-owner-name">{errand.owner?.nickname || errand.owner?.username || ''}</span>
        </div>
      </div>
    </Link>
  );
}

export default ErrandCard;

