import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../components/Card';
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
              rank: p.rank,
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
        分区排行榜入口：始终在第一个商家之上；无数据时也展示说明，保证 UI 完备
      */}
      <Card as="section" className="merchant-list-ranking-card" aria-label={`${areaLabel} 分区商品榜`}>
        <div className="merchant-list-ranking-card-head">
          <span className="merchant-list-ranking-icon" aria-hidden>
            🏆
          </span>
          <div className="merchant-list-ranking-card-titles">
            <h2 className="merchant-list-ranking-card-title">分区商品榜</h2>
            <p className="merchant-list-ranking-card-zone">{areaLabel}</p>
            <p className="merchant-list-ranking-card-rule">
              按综合评分排序 · 同分则更晚上架在前 · 仅统计已有点评的商品
            </p>
          </div>
        </div>

        {hotProducts.length > 0 ? (
          <>
            <div className="merchant-list-hot-scroll merchant-list-hot-scroll--in-card">
              {hotProducts.map((p, idx) => (
                <Link
                  key={p.id}
                  to={`/eat/food/${p.id}`}
                  className="merchant-list-hot-card pressable"
                >
                  <span className="merchant-list-hot-rank" aria-hidden>
                    {p.rank ?? idx + 1}
                  </span>
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
            <Link
              to={`/eat/${encodeURIComponent(area)}/ranking`}
              className="merchant-list-ranking-full-link pressable"
            >
              查看完整榜单（最多 50 名）→
            </Link>
          </>
        ) : (
          <div className="merchant-list-ranking-empty">
            <p className="merchant-list-ranking-empty-text">
              本区暂无上榜商品。用户发表点评后，系统将按综合评分自动生成榜单。
            </p>
            <Link
              to={`/eat/${encodeURIComponent(area)}/ranking`}
              className="merchant-list-ranking-full-link merchant-list-ranking-full-link--ghost pressable"
            >
              打开榜单页（规则说明）
            </Link>
          </div>
        )}
      </Card>

      <p className="merchant-list-title merchant-list-title--merchants-section">本区商家</p>

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
