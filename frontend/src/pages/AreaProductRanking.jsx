import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { getRegions, getRegionTopProductsByCode } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { AREA_LABELS } from '../components/AreaCard';
import { findRegionByCode, normalizeAreaCodeParam } from '../utils/regionCode';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenAreaRankingStrings } from '../i18n/canteenAreaRanking';
import { QK } from '../query/queryKeys';
import './Rankings.css';
import './AreaProductRanking.css';

const FULL_LIMIT = 50;
const REGIONS_STALE_MS = 5 * 60 * 1000;
const LIST_STALE_MS = 3 * 60 * 1000;

/**
 * 分区商品排行榜完整页：与全站排行榜「最夯单品」样式一致，数据仅限本区域
 * 路由：/eat/:area/ranking
 */
function AreaProductRanking() {
  const { lang } = useLanguage();
  const t = getCanteenAreaRankingStrings(lang, FULL_LIMIT);
  const { area } = useParams();
  const code = normalizeAreaCodeParam(area ?? '');

  const { data: regions = [], isPending: regionsPending, isError: regionsErr, error: regError } = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    select: (d) => (Array.isArray(d) ? d : []),
    staleTime: REGIONS_STALE_MS,
    enabled: !!code,
  });

  const regionMeta = useMemo(() => findRegionByCode(regions, code), [regions, code]);
  const areaLabel = regionMeta?.name ?? AREA_LABELS[code] ?? code ?? '';

  const {
    data: list = [],
    isPending: listPending,
    isError: listIsError,
    error: listError,
  } = useQuery({
    queryKey: QK.canteenRegionTopProductsByCode(code, FULL_LIMIT),
    queryFn: () => getRegionTopProductsByCode(code, { limit: FULL_LIMIT }).catch(() => []),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!code,
    staleTime: LIST_STALE_MS,
  });

  const loading = !code ? false : regionsPending || listPending;
  const error = regionsErr
    ? getApiErrorMessage(regError)
    : listIsError
      ? getApiErrorMessage(listError)
      : null;

  if (!code) {
    return (
      <div className="area-ranking-page">
        <EmptyState title="无效分区" description="请从分区商家列表进入榜单。" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="area-ranking-page">
        <p className="rankings-loading state-loading">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="area-ranking-page">
        <p className="rankings-error state-error">{error}</p>
        <Link to={`/eat/${encodeURIComponent(code)}`} className="area-ranking-back-link">
          {t.backToArea}
        </Link>
      </div>
    );
  }

  return (
    <div className="area-ranking-page">
      <p className="area-ranking-back">
        <Link to={`/eat/${encodeURIComponent(code)}`} className="area-ranking-back-link">
          {t.backToZone(areaLabel)}
        </Link>
      </p>

      <Card as="div" className="rankings-section-card area-ranking-main-card">
        <div className="rankings-section-header">
          <h1 className="rankings-section-title area-ranking-h1">
            {t.pageTitle}
            <span className="rankings-section-title-en">
              {areaLabel} · {t.pageTitleAlt}
            </span>
          </h1>
          <p className="rankings-section-desc">{t.pageDesc}</p>
        </div>
        <div className="rankings-section-content">
          {list.length === 0 ? (
            <EmptyState title={t.emptyListTitle} description={t.emptyListDesc} />
          ) : (
            list.map((item) => (
              <Link key={item.id} to={`/eat/food/${item.id}`} className="rankings-row rankings-row--product">
                <span className="rankings-rank">{item.rank}</span>
                <div className="rankings-row-main">
                  <span className="rankings-name">{item.name}</span>
                  {item.shop_name != null && item.shop_name !== '' && (
                    <span className="rankings-shop">{item.shop_name}</span>
                  )}
                  {(item.comprehensive_score != null || (item.price != null && Number(item.price) > 0)) && (
                    <div className="rankings-score-row">
                      {item.comprehensive_score != null && (
                        <span className="rankings-score">{t.scoreLine(item.comprehensive_score)}</span>
                      )}
                      {item.price != null && Number(item.price) > 0 && (
                        <span>RM {Number(item.price).toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>

      <p className="area-ranking-footnote">{t.footnote}</p>
    </div>
  );
}

export default AreaProductRanking;
