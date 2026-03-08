import { useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import MerchantHeader from '../components/MerchantHeader';
import CategorySidebar from '../components/CategorySidebar';
import CategorySection from '../components/CategorySection';
import {
  getMerchantById,
  getCategoriesByMerchantId,
  getFoodGroupsByMerchantId,
} from '../data/mockCanteen';
import './FoodList.css';

/** 商家菜品列表页：MerchantHeader + 双栏（左侧分类导航 + 右侧按分类分组的 FoodCard） */
function FoodList() {
  const { id } = useParams();
  const merchant = getMerchantById(id);
  const categories = useMemo(() => getCategoriesByMerchantId(id ?? ''), [id]);
  const groups = useMemo(() => getFoodGroupsByMerchantId(id ?? ''), [id]);
  const [activeId, setActiveId] = useState(categories[0]?.id ?? null);
  const sectionRefs = useRef({});

  const handleCategorySelect = (catId) => {
    setActiveId(catId);
    const el = sectionRefs.current[catId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!merchant) {
    return (
      <div className="food-list-page">
        <p className="food-list-empty">商家不存在</p>
      </div>
    );
  }

  if (categories.length === 0 || groups.every((g) => g.foods.length === 0)) {
    return (
      <div className="food-list-page">
        <MerchantHeader merchant={merchant} />
        <p className="food-list-empty">暂无菜品 No dishes yet.</p>
      </div>
    );
  }

  return (
    <div className="food-list-page">
      <MerchantHeader merchant={merchant} />
      <div className="food-list-layout">
        <CategorySidebar
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          activeId={activeId}
          onSelect={handleCategorySelect}
        />
        <div className="food-list-main">
          {groups.map((g) => (
            <CategorySection
              key={g.category.id}
              ref={(el) => { sectionRefs.current[g.category.id] = el; }}
              category={g.category}
              foods={g.foods}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default FoodList;
