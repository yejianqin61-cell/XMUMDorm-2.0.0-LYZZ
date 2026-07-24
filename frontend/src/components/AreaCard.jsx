import { Link } from 'react-router-dom';
import Card from './ui/Card';
import { useLanguage } from '../context/LanguageContext';
import './AreaCard.css';

/** 分区名称展示（用于 UI 显示，如 others -> Others） */
const AREA_LABELS = {
  B1: 'B1',
  LY3: 'LY3',
  D6: 'D6',
  BELL: 'BELL',
  other: 'Other',
  others: 'Others',
};

/**
 * 食堂分区卡片：点击进入该分区商家列表
 * @param {string} area - 分区标识（用于 URL，如 code）
 * @param {string} [label] - 展示名称，不传则用 AREA_LABELS[area] ?? area
 */
function AreaCard({ area, label: labelProp }) {
  const { isZh } = useLanguage();
  const label = labelProp ?? AREA_LABELS[area] ?? area;

  return (
    <Link to={`/eat/${encodeURIComponent(area)}`} className="area-card-wrap" aria-label={isZh ? `进入分区 ${label}` : `Open area ${label}`}>
      <Card as="div" className="area-card">
        <span className="area-card-name">{label}</span>
        <span className="area-card-hint">{isZh ? '点击进入' : 'Open area'}</span>
      </Card>
    </Link>
  );
}

export default AreaCard;
export { AREA_LABELS };
