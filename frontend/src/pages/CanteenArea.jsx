import AreaCard from '../components/AreaCard';
import { AREAS } from '../data/mockCanteen';
import './CanteenArea.css';

/** 食堂分区页：展示 5 个分区入口（B1, LY3, D6, BELL, Others） */
function CanteenArea() {
  return (
    <div className="canteen-area-page">
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
