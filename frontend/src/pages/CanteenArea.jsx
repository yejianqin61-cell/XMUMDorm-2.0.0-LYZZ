import { Link } from 'react-router-dom';
import AreaCard from '../components/AreaCard';
import Card from '../components/Card';
import { AREAS } from '../data/mockCanteen';
import './CanteenArea.css';

/** 食堂分区页：排行榜入口 + 5 个分区入口（B1, LY3, D6, BELL, Others） */
function CanteenArea() {
  return (
    <div className="canteen-area-page">
      <Link to="/eat/rankings" className="canteen-area-rankings-link" aria-label="进入排行榜">
        <Card as="div" className="canteen-area-rankings-card">
          <span className="canteen-area-rankings-label">排行榜 Rankings</span>
          <span className="canteen-area-rankings-hint">最夯单品 · 门庭若市 · 点评达人</span>
        </Card>
      </Link>
      <p className="canteen-area-intro">选择分区 Select area</p>
      <ul className="canteen-area-list" aria-label="食堂分区列表">
        {AREAS.map((area) => (
          <li key={area}>
            <AreaCard area={area} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CanteenArea;
