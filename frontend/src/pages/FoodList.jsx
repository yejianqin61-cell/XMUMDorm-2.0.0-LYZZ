import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MerchantHeader from '../components/MerchantHeader';
import CategorySidebar from '../components/CategorySidebar';
import CategorySection from '../components/CategorySection';
import SkeletonFood from '../components/SkeletonFood';
import EmptyState from '../components/EmptyState';
import { getShop, getCategories, getProducts } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { getUploadUrl } from '../api/config';
import './FoodList.css';

/** 商家菜品列表页：MerchantHeader + 双栏（左侧分类导航 + 右侧按分类分组的 FoodCard），数据来自 API */
function FoodList() {
  const { id } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    const shopId = id ? parseInt(id, 10) : 0;
    if (!shopId) {
      setMerchant(null);
      setCategories([]);
      setGroups([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveId(null);
    Promise.all([getShop(shopId), getCategories(shopId), getProducts(shopId)])
      .then(([shopData, catsData, productsData]) => {
        if (cancelled) return;
        const shop = shopData;
        const cats = Array.isArray(catsData) ? catsData : (shop?.categories ?? []);
        const products = Array.isArray(productsData) ? productsData : [];
        setMerchant(
          shop
            ? {
                id: shop.id,
                name: shop.name,
                logo: shop.logo ? getUploadUrl(shop.logo) : undefined,
                description: shop.region_name ? `${shop.region_name}` : undefined,
                status: 'open',
                openingHours: shop.opening_hours ?? undefined,
              }
            : null
        );
        setCategories(cats);
        const firstImage = (p) => {
          const imgs = p.images || [];
          const url = imgs.length ? imgs[0].url : null;
          return getUploadUrl(url);
        };
        const foodList = products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? undefined,
          price: p.price,
          image: firstImage(p),
          categoryId: p.category_id,
        }));
        const groupsNext = cats.map((c) => ({
          category: { id: c.id, name: c.name },
          foods: foodList.filter((f) => f.categoryId === c.id),
        }));
        setGroups(groupsNext);
        if (activeId === null && cats.length > 0) setActiveId(cats[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleCategorySelect = (catId) => {
    setActiveId(catId);
    const el = sectionRefs.current[catId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="food-list-page">
        <div className="food-list-layout">
          <div className="food-list-sidebar-skeleton" aria-hidden />
          <div className="food-list-main">
            <ul className="category-section-list" aria-hidden>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i}>
                  <SkeletonFood />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="food-list-page">
        <p className="food-list-error state-error">{error}</p>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="food-list-page">
        <EmptyState title="商家不存在" description="该商家可能已下架或不存在。" />
      </div>
    );
  }

  if (categories.length === 0 || groups.every((g) => g.foods.length === 0)) {
    return (
      <div className="food-list-page">
        <MerchantHeader merchant={merchant} />
        <EmptyState
          title="暂无商品"
          description="商家还没发布商品。No dishes yet."
        />
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
