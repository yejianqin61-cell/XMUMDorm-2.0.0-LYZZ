import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import MerchantCard from '../components/MerchantCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { AREA_LABELS } from '../components/AreaCard';
import { getRegions, getShopsByRegion, getRegionTopProducts } from '../api/canteen';
import { getUploadUrl, DEFAULT_PRODUCT_IMAGE_PATH } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import { findRegionByCode, normalizeAreaCodeParam } from '../utils/regionCode';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenAreaRankingStrings } from '../i18n/canteenAreaRanking';
import { QK } from '../query/queryKeys';
import './MerchantList.css';

const REGIONS_STALE_MS = 5 * 60 * 1000;
const SHOPS_STALE_MS = 3 * 60 * 1000;
const TOP_LIMIT = 20;

/** 区域商家列表页：本区最夯商品 Top20 + 当前分区下的商家（API）；shops 等接口带缓存，再次进入同分区更快 */
function MerchantList() {
  const { lang } = useLanguage();
  const t = getCanteenAreaRankingStrings(lang, 50);
  const { area } = useParams();
  const code = normalizeAreaCodeParam(area ?? '');

  const {
    data: regions = [],
    isPending: regionsPending,
    isError: regionsIsError,
    error: regionsError,
  } = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    select: (d) => (Array.isArray(d) ? d : []),
    staleTime: REGIONS_STALE_MS,
    enabled: !!code,
  });

  const region = useMemo(() => findRegionByCode(regions, code), [regions, code]);
  const regionId = region?.id;

  const areaLabel = region?.name ?? AREA_LABELS[code] ?? code ?? '';

  const shopsQuery = useQuery({
    queryKey: QK.canteenRegionShops(regionId),
    queryFn: () => getShopsByRegion(regionId),
    enabled: !!regionId,
    staleTime: SHOPS_STALE_MS,
  });

  const hotQuery = useQuery({
    queryKey: QK.canteenRegionTopProducts(regionId, TOP_LIMIT),
    queryFn: () => getRegionTopProducts(regionId, { limit: TOP_LIMIT }).catch(() => []),
    enabled: !!regionId,
    staleTime: SHOPS_STALE_MS,
  });

  const merchants = useMemo(() => {
    const list = Array.isArray(shopsQuery.data) ? shopsQuery.data : [];
    return list.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo ? getUploadUrl(s.logo) : undefined,
      description: s.region_name ? `${s.region_name}` : undefined,
      status: 'open',
      openingHours: s.opening_hours ?? undefined,
    }));
  }, [shopsQuery.data]);

  const hotProducts = useMemo(() => {
    const hotRaw = Array.isArray(hotQuery.data) ? hotQuery.data : [];
    return hotRaw.map((p) => {
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
    });
  }, [hotQuery.data]);

  const loading =
    !code
      ? false
      : regionsPending ||
        (!!regionId && (shopsQuery.isPending || hotQuery.isPending));

  const error =
    !code
      ? null
      : regionsIsError
        ? getApiErrorMessage(regionsError)
        : shopsQuery.isError
          ? getApiErrorMessage(shopsQuery.error)
          : hotQuery.isError
            ? getApiErrorMessage(hotQuery.error)
            : null;

  if (!code) {
    return (
      <div className="merchant-list-page">
        <EmptyState title="无效分区" description="请从食堂首页选择分区。" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="merchant-list-page">
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

  if (!regionId) {
    return (
      <div className="merchant-list-page">
        <EmptyState title="分区不存在" description="未找到该分区，请返回食堂首页重试。" />
      </div>
    );
  }

  return (
    <div className="merchant-list-page">
      <Card as="section" className="merchant-list-ranking-card" aria-label={t.cardAria(areaLabel)}>
        <div className="merchant-list-ranking-card-head">
          <span className="merchant-list-ranking-icon" aria-hidden>
            🏆
          </span>
          <div className="merchant-list-ranking-card-titles">
            <h2 className="merchant-list-ranking-card-title">
              {t.cardTitle}
              <span className="merchant-list-ranking-card-title-alt">{t.cardTitleAlt}</span>
            </h2>
            <p className="merchant-list-ranking-card-zone">{areaLabel}</p>
            <p className="merchant-list-ranking-card-rule">{t.cardRule}</p>
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
                    <div className="merchant-list-hot-tail">
                      {p.score != null && (
                        <span className="merchant-list-hot-score">{t.scoreLabel(p.score)}</span>
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
              {t.fullListLink}
            </Link>
          </>
        ) : (
          <div className="merchant-list-ranking-empty">
            <p className="merchant-list-ranking-empty-text">{t.emptyRankingText}</p>
            <Link
              to={`/eat/${encodeURIComponent(area)}/ranking`}
              className="merchant-list-ranking-full-link merchant-list-ranking-full-link--ghost pressable"
            >
              {t.emptyRankingLink}
            </Link>
          </div>
        )}
      </Card>

      <p className="merchant-list-title merchant-list-title--merchants-section">{t.merchantsSection}</p>

      {merchants.length === 0 ? (
        <EmptyState title={t.emptyMerchantsTitle} description={t.emptyMerchantsDesc} />
      ) : (
        <ul className="merchant-list-list" aria-label={t.merchantsListAria(areaLabel)}>
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
