import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { AREA_LABELS } from '../components/AreaCard';
import { getRegions, getShopsByRegion, getRegionTopProducts } from '@shared/api/canteen';
import { getUploadUrl, DEFAULT_PRODUCT_IMAGE_PATH } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { findRegionByCode, normalizeAreaCodeParam } from '@shared/utils/regionCode';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenAreaRankingStrings } from '../i18n/canteenAreaRanking';
import { QK } from '@shared/query/queryKeys';
import './MerchantList.css';

const REGIONS_STALE_MS = 5 * 60 * 1000;
const SHOPS_STALE_MS = 3 * 60 * 1000;
const TOP_LIMIT = 20;

function extractEndTime(openingHours) {
  if (!openingHours) return null;
  const s = String(openingHours);
  // 匹配最常见的形态：09:00-19:00 / 09:00 ~ 19:00 / ... 19:00
  const m = s.match(/(\d{1,2}:\d{2})\s*(?:-|~|—|–|至|到)\s*(\d{1,2}:\d{2})/);
  if (m && m[2]) return m[2];
  const last = s.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);
  return last ? last[1] : null;
}

function TrophyIcon() {
  return (
    <svg className="merchant-list-trophy" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="35%" stopColor="#ffd56a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id="trophyGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
      </defs>
      {/* cup */}
      <path
        d="M8 4h8v3c0 2.4-1.3 4.2-4 4.8V14h3v2H9v-2h3v-2.2C9.3 11.2 8 9.4 8 7V4z"
        fill="url(#trophyGold)"
        opacity="0.95"
      />
      {/* handles */}
      <path
        d="M6.2 6.2H4.6c.1 2 1.2 3.3 3 3.8M17.8 6.2h1.6c-.1 2-1.2 3.3-3 3.8"
        fill="none"
        stroke="url(#trophyGold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* stem + base */}
      <path
        d="M10 18h4M9 20h6"
        stroke="url(#trophyGold)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* glass highlight */}
      <path
        d="M9.1 5.4h2.1c-.2 2.9-1.2 4.6-2.2 5.3"
        fill="none"
        stroke="url(#trophyGlass)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** 区域商家列表页：本区最夯商品 Top20 + 当前分区下的商家（API）；shops 等接口带缓存，再次进入同分区更快 */
function MerchantList() {
  const { lang } = useLanguage();
  const t = getCanteenAreaRankingStrings(lang, 50);
  const { area } = useParams();
  const code = normalizeAreaCodeParam(area ?? '');
  const [ready, setReady] = useState(false);

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

  // 入场动画：必须在所有 return 之前声明 hook（避免黑屏）
  useEffect(() => {
    setReady(false);
    if (!regionId) return undefined;
    if (loading || error) return undefined;
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [regionId, loading, error]);

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
    <div className={`merchant-list-page ${ready ? 'merchant-list-page--ready' : ''}`}>
      <Card as="section" className="merchant-list-ranking-card" aria-label={t.cardAria(areaLabel)}>
        <div className="merchant-list-ranking-card-head">
          <span className="merchant-list-ranking-icon" aria-hidden>
            <TrophyIcon />
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
            <div className="merchant-hero" aria-label={t.cardTitle}>
              {hotProducts[0] && (
                <Link to={`/eat/food/${hotProducts[0].id}`} className="merchant-hero-top1 pressable">
                  <img src={hotProducts[0].image} alt="" className="merchant-hero-top1-img" />
                  <span className="merchant-hero-label">
                    <span className="merchant-hero-badge merchant-hero-badge--1" aria-hidden>
                      1
                    </span>
                    <span className="merchant-hero-label-main">
                      <span className="merchant-hero-name">{hotProducts[0].name}</span>
                      <span className="merchant-hero-meta">{hotProducts[0].shopName}</span>
                    </span>
                  </span>
                </Link>
              )}
              <div className="merchant-hero-side" aria-hidden>
                {[hotProducts[1], hotProducts[2]].filter(Boolean).map((p, i) => (
                  <Link key={p.id} to={`/eat/food/${p.id}`} className="merchant-hero-orb pressable">
                    <span className={`merchant-hero-badge merchant-hero-badge--${i + 2}`} aria-hidden>
                      {i + 2}
                    </span>
                    <img src={p.image} alt="" className="merchant-hero-orb-img" />
                    <span className="merchant-hero-orb-cap">
                      <span className="merchant-hero-orb-name">{p.name}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <Link to={`/eat/${encodeURIComponent(area)}/ranking`} className="merchant-hero-morelink pressable">
              {t.fullListLink}
              <span className="merchant-hero-arrow" aria-hidden />
            </Link>
          </>
        ) : (
          <div className="merchant-list-ranking-empty">
            <p className="merchant-list-ranking-empty-text">{t.emptyRankingText}</p>
            <Link
              to={`/eat/${encodeURIComponent(area)}/ranking`}
              className="merchant-hero-morelink merchant-hero-morelink--ghost pressable"
            >
              {t.emptyRankingLink}
              <span className="merchant-hero-arrow" aria-hidden />
            </Link>
          </div>
        )}
      </Card>

      <p className="merchant-list-title merchant-list-title--merchants-section">{t.merchantsSection}</p>

      {merchants.length === 0 ? (
        <EmptyState title={t.emptyMerchantsTitle} description={t.emptyMerchantsDesc} />
      ) : (
        <ul className="merchant-list-list" aria-label={t.merchantsListAria(areaLabel)}>
          {merchants.map((m, idx) => (
            <li key={m.id} style={{ '--i': idx }}>
              <Link to={`/eat/merchant/${m.id}`} className="merchant-min" aria-label={`进入商家 ${m.name}`}>
                <span className="merchant-min-row">
                  <span className="merchant-min-name">{m.name}</span>
                  <span className="merchant-min-open" aria-label="营业中">
                    <span className="merchant-min-dot" aria-hidden />
                  </span>
                </span>
                <span className="merchant-min-sub">
                  {(code || '').toUpperCase()} · OPEN{extractEndTime(m.openingHours) ? ` UNTIL ${extractEndTime(m.openingHours)}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MerchantList;
