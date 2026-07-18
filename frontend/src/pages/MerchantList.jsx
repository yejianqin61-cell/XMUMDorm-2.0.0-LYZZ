import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
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
const TOP_LIMIT = 6;

function extractEndTime(openingHours) {
  if (!openingHours) return null;
  const text = String(openingHours);
  const range = text.match(/(\d{1,2}:\d{2})\s*(?:-|~|\u2014|\u2013|\u81f3|\u5230)\s*(\d{1,2}:\d{2})/);
  if (range?.[2]) return range[2];
  const last = text.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);
  return last ? last[1] : null;
}

export default function MerchantList() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const t = getCanteenAreaRankingStrings(lang, 50);
  const { area } = useParams();
  const code = normalizeAreaCodeParam(area ?? '');

  const regionsQuery = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    select: (data) => (Array.isArray(data) ? data : []),
    staleTime: REGIONS_STALE_MS,
    enabled: Boolean(code),
  });

  const region = useMemo(
    () => findRegionByCode(regionsQuery.data || [], code),
    [regionsQuery.data, code]
  );
  const regionId = region?.id;
  const areaLabel = region?.name ?? AREA_LABELS[code] ?? code;

  const shopsQuery = useQuery({
    queryKey: QK.canteenRegionShops(regionId),
    queryFn: () => getShopsByRegion(regionId),
    enabled: Boolean(regionId),
    staleTime: SHOPS_STALE_MS,
  });
  const hotQuery = useQuery({
    queryKey: QK.canteenRegionTopProducts(regionId, TOP_LIMIT),
    queryFn: () => getRegionTopProducts(regionId, { limit: TOP_LIMIT }),
    enabled: Boolean(regionId),
    staleTime: SHOPS_STALE_MS,
  });

  const merchants = useMemo(() => {
    const list = Array.isArray(shopsQuery.data) ? shopsQuery.data : [];
    return list.map((shop) => ({ id: shop.id, name: shop.name, openingHours: shop.opening_hours }));
  }, [shopsQuery.data]);
  const hotProducts = useMemo(() => {
    const list = Array.isArray(hotQuery.data) ? hotQuery.data : [];
    return list.map((product) => ({
      id: product.id,
      name: product.name,
      shopName: product.shop_name,
      image: product.images?.[0]?.url ? getUploadUrl(product.images[0].url) : DEFAULT_PRODUCT_IMAGE_PATH,
    }));
  }, [hotQuery.data]);

  const isLoading = regionsQuery.isPending || (Boolean(regionId) && shopsQuery.isPending);
  const error = regionsQuery.isError
    ? getApiErrorMessage(regionsQuery.error)
    : shopsQuery.isError
      ? getApiErrorMessage(shopsQuery.error)
      : null;

  if (!code || (!regionsQuery.isPending && !regionId && !regionsQuery.isError)) {
    return (
      <div className="merchant-list-page">
        <EmptyState title={isEn ? 'Zone not found' : '没有这个分区'} description={isEn ? 'Choose a canteen zone to continue.' : '请从食堂首页重新选择。'} />
        <Link to="/eat" className="merchant-list-return">{isEn ? 'Back to canteen' : '返回食堂'}</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="merchant-list-page">
        <div className="merchant-list-skeleton skeleton skeleton-shimmer" />
        <div className="merchant-list-skeleton skeleton skeleton-shimmer" />
        <div className="merchant-list-skeleton skeleton skeleton-shimmer" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="merchant-list-page merchant-list-page--feedback">
        <p className="state-error">{error}</p>
        <Link to="/eat" className="merchant-list-return">{isEn ? 'Back to canteen' : '返回食堂'}</Link>
      </div>
    );
  }

  const rankingLink = `/eat/${encodeURIComponent(area)}/ranking`;

  return (
    <div className="merchant-list-page">
      <ListPageLayout
        className="merchant-list-layout"
        header={(
          <PageHeader
            title={areaLabel}
            backTo="/eat"
            backLabel={t.backToArea}
            actions={<Button as={Link} to={rankingLink} variant="secondary" size="sm">{isEn ? 'Full ranking' : '完整榜单'}</Button>}
          />
        )}
        list={(
          <div className="merchant-list-content">
            <section>
              <SectionHeader title={isEn ? 'Merchants' : '商家'} compact />
              {merchants.length === 0 ? (
                <div className="merchant-list-empty">
                  <p>{isEn ? 'No merchants here yet.' : '这个分区暂时没有商家。'}</p>
                  <Link to="/eat" className="merchant-list-return">{isEn ? 'Browse other zones' : '浏览其他分区'}</Link>
                </div>
              ) : (
                <ul className="merchant-list-list" aria-label={t.merchantsListAria(areaLabel)}>
                  {merchants.map((merchant) => {
                    const endTime = extractEndTime(merchant.openingHours);
                    return (
                      <li key={merchant.id}>
                        <Link to={`/eat/merchant/${merchant.id}`} className="merchant-min">
                          <span className="merchant-min-name">{merchant.name}</span>
                          <span className="merchant-min-meta">
                            {endTime ? (isEn ? `Until ${endTime}` : `营业至 ${endTime}`) : (isEn ? 'View menu' : '查看菜单')}
                          </span>
                          <span className="merchant-min-arrow" aria-hidden>›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="merchant-list-hot">
              <SectionHeader
                title={isEn ? 'Popular here' : '本区热门'}
                compact
                action={<Link to={rankingLink} className="merchant-list-ranking-link">{isEn ? 'See all' : '查看全部'}</Link>}
              />
              {hotQuery.isError ? (
                <div className="merchant-list-empty">
                  <p>{isEn ? 'The ranking is unavailable right now.' : '榜单暂时不可用。'}</p>
                  <Link to={rankingLink} className="merchant-list-return">{isEn ? 'Open full ranking' : '查看完整榜单'}</Link>
                </div>
              ) : hotProducts.length === 0 ? (
                <div className="merchant-list-empty">
                  <p>{isEn ? 'No ranked dishes yet.' : '暂时还没有上榜菜品。'}</p>
                  <Link to={rankingLink} className="merchant-list-return">{isEn ? 'Open full ranking' : '查看完整榜单'}</Link>
                </div>
              ) : (
                <div className="merchant-list-hot-grid">
                  {hotProducts.map((product) => (
                    <Link key={product.id} to={`/eat/food/${product.id}`} className="merchant-list-hot-item">
                      <img src={product.image} alt="" className="merchant-list-hot-image" loading="lazy" />
                      <span className="merchant-list-hot-name">{product.name}</span>
                      {product.shopName && <span className="merchant-list-hot-shop">{product.shopName}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      />
    </div>
  );
}
