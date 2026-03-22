import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import MerchantCard from '../components/MerchantCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { AREA_LABELS } from '../components/AreaCard';
import { getRegions, getShopsByRegion, getRegionTopProducts } from '../api/canteen';
import { getUploadUrl, DEFAULT_PRODUCT_IMAGE_PATH } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import './MerchantList.css';

/** 区域商家列表页：本区最夯商品 Top20 + 当前分区下的商家（API） */
function MerchantList() {
  const { area } = useParams();
  const [merchants, setMerchants] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [areaLabel, setAreaLabel] = useState(AREA_LABELS[area] ?? area ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = area ?? '';
    if (!code) {
      setMerchants([]);
      setHotProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRegions()
      .then((regions) => {
        if (cancelled) return;
        const list = Array.isArray(regions) ? regions : [];
        const region = list.find((r) => r.code === code);
        setAreaLabel(region?.name ?? AREA_LABELS[code] ?? code);
        if (!region) {
          setMerchants([]);
          setHotProducts([]);
          return null;
        }
        return Promise.all([
          getShopsByRegion(region.id),
          getRegionTopProducts(region.id, { limit: 20 }).catch(() => []),
        ]).then(([shops, hot]) => ({ shops, hot }));
      })
      .then((pack) => {
        if (cancelled || pack == null) return;
        const list = Array.isArray(pack.shops) ? pack.shops : [];
        setMerchants(
          list.map((s) => ({
            id: s.id,
            name: s.name,
            logo: s.logo ? getUploadUrl(s.logo) : undefined,
            description: s.region_name ? `${s.region_name}` : undefined,
            status: 'open',
            openingHours: s.opening_hours ?? undefined,
          }))
        );
        const hotRaw = Array.isArray(pack.hot) ? pack.hot : [];
        setHotProducts(
          hotRaw.map((p) => {
            const img0 = p.images?.[0]?.url;
            return {
              id: p.id,
              name: p.name,
              shopName: p.shop_name,
              score: p.comprehensive_score,
              price: p.price,
              image: img0 ? getUploadUrl(img0) : DEFAULT_PRODUCT_IMAGE_PATH,
            };
          })
        );
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [area]);

  if (loading) {
    return (
      <div className="merchant-list-page">
        {/* 与正式页一致：顶栏下先占位「商品榜」再商家 */}
        <div className="merchant-list-hot-skeleton" aria-hidden>
          <div className="merchant-list-hot-skeleton-title skeleton skeleton-shimmer" />
          <div className="merchant-list-hot-skeleton-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="merchant-list-hot-skeleton-card skeleton skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="skeleton-merchant-list-title skeleton skeleton-shimmer" style={{ width: 120, height: 22, borderRadius: 6, marginBottom: 16 }} aria-hidden />
        <ul className="merchant-list-list" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className="merchant-list-page">
        <p className="merchant-list-error state-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="merchant-list-page">
      {/*
        布局顺序（顶栏 TopBar 之下、底部 Tab 之上）：
        1. 本区商品排行榜 — 紧贴主内容顶部，在商家列表之上
        2. 分区标题 + 商家列表
      */}
      {hotProducts.length > 0 && (
        <section
          className="merchant-list-hot merchant-list-hot--page-top"
          aria-label={`${areaLabel} 本区商品榜`}
        >
          <div className="merchant-list-hot-head">
            <h2 className="merchant-list-hot-title">{areaLabel} · 商品榜 Top 20</h2>
            <p className="merchant-list-hot-sub">按综合评分 · 同分则更晚上架在前</p>
          </div>
          <div className="merchant-list-hot-scroll">
            {hotProducts.map((p, idx) => (
              <Link
                key={p.id}
                to={`/eat/food/${p.id}`}
                className="merchant-list-hot-card pressable"
              >
                <span className="merchant-list-hot-rank" aria-hidden>{idx + 1}</span>
                <div className="merchant-list-hot-img-wrap">
                  <img src={p.image} alt="" className="merchant-list-hot-img" />
                </div>
                <div className="merchant-list-hot-body">
                  <span className="merchant-list-hot-name">{p.name}</span>
                  <span className="merchant-list-hot-shop">{p.shopName}</span>
                  <div className="merchant-list-hot-meta">
                    {p.score != null && (
                      <span className="merchant-list-hot-score">{Number(p.score).toFixed(1)} 分</span>
                    )}
                    {p.price != null && Number(p.price) > 0 && (
                      <span className="merchant-list-hot-price">RM {Number(p.price).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p
        className={
          hotProducts.length > 0
            ? 'merchant-list-title merchant-list-title--merchants-section'
            : 'merchant-list-title'
        }
      >
        {hotProducts.length > 0 ? '本区商家' : areaLabel}
      </p>

      {merchants.length === 0 ? (
        <EmptyState
          title="暂无商家"
          description="该分区暂无商家。No merchants in this area yet."
        />
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
