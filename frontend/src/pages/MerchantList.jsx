import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import Card from '../components/Card';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import FilterBar from '../components/templates/FilterBar';
import ListPageLayout from '../components/templates/ListPageLayout';
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
  const text = String(openingHours);
  const range = text.match(/(\d{1,2}:\d{2})\s*(?:-|~|—|–|至|到)\s*(\d{1,2}:\d{2})/);
  if (range && range[2]) return range[2];
  const last = text.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);
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
      <path
        d="M8 4h8v3c0 2.4-1.3 4.2-4 4.8V14h3v2H9v-2h3v-2.2C9.3 11.2 8 9.4 8 7V4z"
        fill="url(#trophyGold)"
        opacity="0.95"
      />
      <path
        d="M6.2 6.2H4.6c.1 2 1.2 3.3 3 3.8M17.8 6.2h1.6c-.1 2-1.2 3.3-3 3.8"
        fill="none"
        stroke="url(#trophyGold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M10 18h4M9 20h6"
        stroke="url(#trophyGold)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />
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

export default function MerchantList() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
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
    select: (data) => (Array.isArray(data) ? data : []),
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
    return list.map((shop) => ({
      id: shop.id,
      name: shop.name,
      openingHours: shop.opening_hours ?? undefined,
    }));
  }, [shopsQuery.data]);

  const hotProducts = useMemo(() => {
    const list = Array.isArray(hotQuery.data) ? hotQuery.data : [];
    return list.map((product) => {
      const cover = product.images?.[0]?.url;
      return {
        id: product.id,
        name: product.name,
        shopName: product.shop_name,
        image: cover ? getUploadUrl(cover) : DEFAULT_PRODUCT_IMAGE_PATH,
      };
    });
  }, [hotQuery.data]);

  const loading = !code ? false : regionsPending || (!!regionId && (shopsQuery.isPending || hotQuery.isPending));
  const error = !code
    ? null
    : regionsIsError
      ? getApiErrorMessage(regionsError)
      : shopsQuery.isError
        ? getApiErrorMessage(shopsQuery.error)
        : hotQuery.isError
          ? getApiErrorMessage(hotQuery.error)
          : null;

  useEffect(() => {
    setReady(false);
    if (!regionId) return undefined;
    if (loading || error) return undefined;
    const timerId = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timerId);
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
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="merchant-list-hot-skeleton-card skeleton skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div
          className="skeleton-merchant-list-title skeleton skeleton-shimmer"
          style={{ width: 120, height: 22, borderRadius: 6, marginBottom: 16 }}
          aria-hidden
        />
        <ul className="merchant-list-list" aria-hidden>
          {[1, 2, 3, 4].map((item) => (
            <li key={item}>
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

  const rankingLink = `/eat/${encodeURIComponent(area)}/ranking`;
  const pageMeta = [
    { key: 'zone', label: `${isEn ? 'Zone' : '分区'} · ${String(code || '').toUpperCase()}` },
    { key: 'merchants', label: `${merchants.length} ${isEn ? 'merchants' : '家商户'}` },
    { key: 'ranking', label: `${hotProducts.length} ${isEn ? 'ranked picks' : '个榜单推荐'}` },
  ];

  return (
    <div className={`merchant-list-page ${ready ? 'merchant-list-page--ready' : ''}`}>
      <ListPageLayout
        className="merchant-list-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isEn ? 'Campus Canteen Zone' : '校园食堂分区'}
            title={areaLabel}
            description={
              isEn
                ? 'Browse the merchants in this zone and keep the local top dishes within reach while you compare where to eat.'
                : '查看这个分区里的商家，同时把本区热门单品榜单放在右侧，方便一边选店一边做决定。'
            }
            backTo="/eat"
            backLabel={t.backToArea}
            meta={pageMeta}
            actions={(
              <Button as={Link} to={rankingLink} size="sm">
                {isEn ? 'Open leaderboard' : '查看完整榜单'}
              </Button>
            )}
          />
        )}
        filterBar={(
          <FilterBar
            filters={(
              <>
                <Tag tone="canteen" variant="soft">{areaLabel}</Tag>
                <Tag tone="neutral" variant="outline">
                  {isEn ? `${merchants.length} merchants live` : `${merchants.length} 家商户营业中`}
                </Tag>
                <Tag tone="neutral" variant="outline">
                  {isEn ? `${hotProducts.length} ranked dishes` : `${hotProducts.length} 个榜单单品`}
                </Tag>
              </>
            )}
            actions={(
              <>
                <Button as={Link} to="/eat/map" variant="secondary" size="sm">
                  {isEn ? 'Open map' : '查看分区地图'}
                </Button>
                <Button as={Link} to={rankingLink} variant="secondary" size="sm">
                  {isEn ? 'Full Top 50' : '完整 Top 50'}
                </Button>
              </>
            )}
          />
        )}
        list={(
          <section className="merchant-list-main">
            <SectionHeader
              title={t.merchantsSection}
              description={
                isEn
                  ? 'A cleaner desktop list for the merchants in this zone, with opening hints kept readable at a glance.'
                  : '用更适合桌面浏览的列表方式展示本区商家，保留清晰的营业提示和快速进入路径。'
              }
            />
            {merchants.length === 0 ? (
              <EmptyState title={t.emptyMerchantsTitle} description={t.emptyMerchantsDesc} />
            ) : (
              <ul className="merchant-list-list" aria-label={t.merchantsListAria(areaLabel)}>
                {merchants.map((merchant, index) => (
                  <li key={merchant.id} style={{ '--i': index }}>
                    <Link
                      to={`/eat/merchant/${merchant.id}`}
                      className="merchant-min"
                      aria-label={`${isEn ? 'Open merchant' : '进入商家'} ${merchant.name}`}
                    >
                      <span className="merchant-min-row">
                        <span className="merchant-min-name">{merchant.name}</span>
                        <span className="merchant-min-open" aria-label={isEn ? 'Open now' : '营业中'}>
                          <span className="merchant-min-dot" aria-hidden />
                        </span>
                      </span>
                      <span className="merchant-min-sub">
                        {(code || '').toUpperCase()} · OPEN
                        {extractEndTime(merchant.openingHours) ? ` UNTIL ${extractEndTime(merchant.openingHours)}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        aside={(
          <section className="merchant-list-aside-section">
            <SectionHeader
              title={isEn ? 'Zone leaderboard' : '分区榜单'}
              description={
                isEn
                  ? 'Keep the top dishes visible while comparing merchants in the main list.'
                  : '把本区热门单品固定在侧栏里，边看商家边参考大家最常点的菜。'
              }
              action={(
                <Button as={Link} to={rankingLink} variant="tertiary" size="sm">
                  {isEn ? 'See all' : '查看全部'}
                </Button>
              )}
            />
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
                    {hotProducts[0] ? (
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
                    ) : null}
                    <div className="merchant-hero-side" aria-hidden>
                      {[hotProducts[1], hotProducts[2]].filter(Boolean).map((product, index) => (
                        <Link key={product.id} to={`/eat/food/${product.id}`} className="merchant-hero-orb pressable">
                          <span className={`merchant-hero-badge merchant-hero-badge--${index + 2}`} aria-hidden>
                            {index + 2}
                          </span>
                          <img src={product.image} alt="" className="merchant-hero-orb-img" />
                          <span className="merchant-hero-orb-cap">
                            <span className="merchant-hero-orb-name">{product.name}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link to={rankingLink} className="merchant-hero-morelink pressable">
                    {t.fullListLink}
                    <span className="merchant-hero-arrow" aria-hidden />
                  </Link>
                </>
              ) : (
                <div className="merchant-list-ranking-empty">
                  <p className="merchant-list-ranking-empty-text">{t.emptyRankingText}</p>
                  <Link to={rankingLink} className="merchant-hero-morelink merchant-hero-morelink--ghost pressable">
                    {t.emptyRankingLink}
                    <span className="merchant-hero-arrow" aria-hidden />
                  </Link>
                </div>
              )}
            </Card>
          </section>
        )}
      />
    </div>
  );
}
