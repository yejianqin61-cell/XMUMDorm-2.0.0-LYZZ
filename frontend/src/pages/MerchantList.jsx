import { useParams } from 'react-router-dom';
import MerchantCard from '../components/MerchantCard';
import { AREA_LABELS } from '../components/AreaCard';
import { getMerchantsByArea } from '../data/mockCanteen';
import './MerchantList.css';

/** 区域商家列表页：展示当前分区下的商家，点击进入该商家菜品列表 */
function MerchantList() {
  const { area } = useParams();
  const merchants = getMerchantsByArea(area ?? '');

  const areaLabel = AREA_LABELS[area] ?? area ?? '';

  return (
    <div className="merchant-list-page">
      <p className="merchant-list-title">{areaLabel}</p>
      {merchants.length === 0 ? (
        <p className="merchant-list-empty">
          该分区暂无商家 No merchants in this area yet.
        </p>
      ) : (
        <ul className="merchant-list-list" aria-label={`${areaLabel} 商家列表`}>
          {merchants.map((m) => (
            <li key={m.id}>
              <MerchantCard merchant={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MerchantList;
