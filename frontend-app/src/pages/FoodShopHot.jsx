import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import MerchantHeader from '../components/MerchantHeader';
import SkeletonFood from '../components/SkeletonFood';
import EmptyState from '../components/EmptyState';
import { getShop, getShopHotProducts } from '@shared/api/canteen';
import { getUploadUrl, productImageUrl } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import './FoodList.css';

const STALE_MS = 3 * 60 * 1000;

/** 本店热门菜品页：展示当前店铺综合评分最高的前 10 个菜品 */
function FoodShopHot() {
  const { id } = useParams();
  const navigate = useNavigate();

  const shopId = useMemo(() => {
    const n = id ? parseInt(id, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);

  const [shopQ, hotQ] = useQueries({
    queries: [
      {
        queryKey: QK.canteenShop(shopId),
        queryFn: () => getShop(shopId),
        enabled: shopId > 0,
        staleTime: STALE_MS,
      },
      {
        queryKey: QK.canteenShopHotProducts(shopId),
        queryFn: () => getShopHotProducts(shopId),
        enabled: shopId > 0,
        staleTime: STALE_MS,
      },
    ],
  });

  const loading = shopId > 0 && (shopQ.isPending || hotQ.isPending);
  const error =
    shopId > 0 && (shopQ.error || hotQ.error)
      ? getApiErrorMessage(shopQ.error || hotQ.error)
      : null;

  const { merchant, foods } = useMemo(() => {
    if (shopId === 0 || shopQ.isPending || hotQ.isPending) {
      return { merchant: null, foods: [] };
    }
    const shop = shopQ.data;
    const hotList = Array.isArray(hotQ.data) ? hotQ.data : [];
    if (!shop) return { merchant: null, foods: [] };
    const merchantObj = {
      id: shop.id,
      name: shop.name,
      logo: shop.logo ? getUploadUrl(shop.logo) : undefined,
      description: shop.region_name ? `${shop.region_name}` : undefined,
      status: 'open',
      openingHours: shop.opening_hours ?? undefined,
    };
    const firstImage = (p) => {
      const imgs = p.images || [];
      const url = imgs.length ? imgs[0].url : null;
      return productImageUrl(url);
    };
    const foodRows = hotList.map((p, index) => ({
      id: p.id,
      rank: index + 1,
      name: p.name,
      description: p.description ?? undefined,
      price: p.price,
      image: firstImage(p),
      comprehensiveScore: p.comprehensive_score != null ? Number(p.comprehensive_score) : null,
      reviewCount: p.review_count != null ? Number(p.review_count) : null,
    }));
    return { merchant: merchantObj, foods: foodRows };
  }, [shopId, shopQ.data, shopQ.isPending, hotQ.data, hotQ.isPending]);

  if (shopId === 0 && !loading) {
    return (
      <div className="food-list-page">
        <EmptyState title="商家不存在" description="该商家可能已下架或不存在。" />
      </div>
    );
  }

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
                    <img src={f.image} alt="" className="food-shop-hot-thumb" />
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
