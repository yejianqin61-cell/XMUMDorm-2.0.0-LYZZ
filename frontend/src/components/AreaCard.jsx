import { Link } from 'react-router-dom';
import Card from './Card';
import './Card.css';
import './AreaCard.css';

/** 分区名称展示（用于 UI 显示，如 others -> Others） */
const AREA_LABELS = {
  B1: 'B1',
  LY3: 'LY3',
  D6: 'D6',
  BELL: 'BELL',
  others: 'Others',
};

/**
 * 食堂分区卡片：点击进入该分区商家列表
 * @param {string} area - 分区标识：B1 | LY3 | D6 | BELL | others
 */
function AreaCard({ area }) {
  const label = AREA_LABELS[area] ?? area;

  return (
    <Link to={`/eat/${encodeURIComponent(area)}`} className="area-card-wrap" aria-label={`进入分区 ${label}`}>
      <Card as="div" className="area-card">
        <span className="area-card-name">{label}</span>
        <span className="area-card-hint">点击进入 Tap to enter</span>
      </Card>
    </Link>
  );
}

export default AreaCard;
export { AREA_LABELS };
