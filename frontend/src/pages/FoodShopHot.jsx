import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MerchantHeader from '../components/MerchantHeader';
import SkeletonFood from '../components/SkeletonFood';
import EmptyState from '../components/EmptyState';
import { getShop, getShopHotProducts } from '../api/canteen';
import { getUploadUrl } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import './FoodList.css';

/** 本店热门菜品页：展示当前店铺综合评分最高的前 10 个菜品 */
function FoodShopHot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const shopId = id ? parseInt(id, 10) : 0;
    if (!shopId) {
      setMerchant(null);
      setFoods([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getShop(shopId), getShopHotProducts(shopId)])
      .then(([shopData, hotList]) => {
        if (cancelled) return;
        const shop = shopData;
        const list = Array.isArray(hotList) ? hotList : [];
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
        const firstImage = (p) => {
          const imgs = p.images || [];
          const url = imgs.length ? imgs[0].url : null;
          return getUploadUrl(url);
        };
        setFoods(
          list.map((p, index) => ({
            id: p.id,
            rank: index + 1,
            name: p.name,
            description: p.description ?? undefined,
            price: p.price,
            image: firstImage(p),
            comprehensiveScore: p.comprehensive_score != null ? Number(p.comprehensive_score) : null,
            reviewCount: p.review_count != null ? Number(p.review_count) : null,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  return (
    <div className="food-list-page">
      <MerchantHeader merchant={merchant} />
      <div className="food-list-layout">
        <div className="food-list-main">
          <div className="food-shop-hot-header">
            <h2 className="food-shop-hot-title">本店热门 Hot in this shop</h2>
            <button
              type="button"
              className="food-shop-hot-back pressable"
              onClick={() => navigate(`/eat/merchant/${merchant.id}`)}
            >
              返回全部 Return
            </button>
          </div>
          {foods.length === 0 ? (
            <EmptyState
              title="暂无热门菜品"
              description="本店还没有足够点评的菜品，去多点几单试试吧。"
            />
          ) : (
            <ul className="food-shop-hot-list">
              {foods.map((f) => (
                <li
                  key={f.id}
                  className="food-shop-hot-item pressable"
                  onClick={() => navigate(`/eat/food/${f.id}`)}
                >
                  <div className="food-shop-hot-rank">#{f.rank}</div>
                  <div className="food-shop-hot-thumb-wrap">
                    {f.image ? (
                      <img src={f.image} alt="" className="food-shop-hot-thumb" />
                    ) : (
                      <div className="food-shop-hot-thumb placeholder" aria-hidden>
                        Food
                      </div>
                    )}
                  </div>
                  <div className="food-shop-hot-body">
                    <div className="food-shop-hot-name-row">
                      <span className="food-shop-hot-name">{f.name}</span>
                      {f.price != null && (
                        <span className="food-shop-hot-price">RM {Number(f.price).toFixed(2)}</span>
                      )}
                    </div>
                    {f.description && (
                      <p className="food-shop-hot-desc">{f.description}</p>
                    )}
                    <div className="food-shop-hot-meta">
                      {f.comprehensiveScore != null && (
                        <span className="food-shop-hot-score">
                          ★ {f.comprehensiveScore.toFixed(1)} 综合评分
                        </span>
                      )}
                      {f.reviewCount != null && (
                        <span className="food-shop-hot-reviews">
                          {f.reviewCount} 条点评
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodShopHot;

