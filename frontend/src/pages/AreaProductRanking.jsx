import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { getRegions, getRegionTopProductsByCode } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { AREA_LABELS } from '../components/AreaCard';
import { findRegionByCode, normalizeAreaCodeParam } from '../utils/regionCode';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenAreaRankingStrings } from '../i18n/canteenAreaRanking';
import './Rankings.css';
import './AreaProductRanking.css';

const FULL_LIMIT = 50;

/**
 * 分区商品排行榜完整页：与全站排行榜「最夯单品」样式一致，数据仅限本区域
 * 路由：/eat/:area/ranking
 */
function AreaProductRanking() {
  const { lang } = useLanguage();
  const t = getCanteenAreaRankingStrings(lang, FULL_LIMIT);
  const { area } = useParams();
  const code = normalizeAreaCodeParam(area ?? '');
  const [areaLabel, setAreaLabel] = useState(AREA_LABELS[code] ?? code ?? '');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setList([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getRegions(), getRegionTopProductsByCode(code, { limit: FULL_LIMIT }).catch(() => [])])
      .then(([regions, products]) => {
        if (cancelled) return;
        const arr = Array.isArray(regions) ? regions : [];
        const r = findRegionByCode(arr, code);
        setAreaLabel(r?.name ?? AREA_LABELS[code] ?? code);
        setList(Array.isArray(products) ? products : []);
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
  }, [code]);

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
