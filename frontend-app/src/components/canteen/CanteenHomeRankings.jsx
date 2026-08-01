import { useId, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import {
  getRankingsHotProducts,
  getRankingsTopShops,
  getRankingsNewHitProducts,
} from '@shared/api/rankings';
import { productImageUrl } from '@shared/api/config';

export default function CanteenHomeRankings() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const TABS = useMemo(
    () => [
      { key: 'products', label: t.tabProducts },
      { key: 'shops', label: t.tabShops },
      { key: 'new', label: t.tabNew },
    ],
    [t.tabProducts, t.tabShops, t.tabNew]
  );
  const [tab, setTab] = useState(0);
  const tabId = useId();
  const tabRefs = useRef([]);
  const results = useQueries({
    queries: [
      { queryKey: ['rankings', 'hot-products'], queryFn: getRankingsHotProducts, staleTime: 60 * 1000 },
      { queryKey: ['rankings', 'top-shops'], queryFn: getRankingsTopShops, staleTime: 60 * 1000 },
      { queryKey: ['rankings', 'new-hit-products'], queryFn: getRankingsNewHitProducts, staleTime: 60 * 1000 },
    ],
  });

  const query = results[tab];
  const items = query.data?.data || query.data || [];
  const isLoading = query.isLoading;
  const isError = query.isError;

  const renderItem = (item, i) => {
    if (tab === 1) {
      return (
        <button key={item.shop_id || i} type="button" className="canteen-rank-item" onClick={() => navigate(`/eat/merchant/${item.shop_id}`)}>
          <span className="canteen-rank-badge">{i + 1}</span>
          <div className="canteen-rank-icon-wrap">
            <img src={item.logo_url ? productImageUrl(item.logo_url) : '/shops/default.jpg'} alt={item.shop_name} className="canteen-rank-thumb" />
          </div>
          <div className="canteen-rank-body">
            <span className="canteen-rank-name">{item.shop_name}</span>
            {item.comprehensive_score != null && (
              <span className="canteen-rank-meta">
                {t.rankScore} {Number(item.comprehensive_score).toFixed(1)}
              </span>
            )}
          </div>
        </button>
      );
    }
    return (
      <button key={item.product_id || item.product_name || i} type="button" className="canteen-rank-item" onClick={() => navigate(`/eat/food/${item.product_id}`)}>
        <span className="canteen-rank-badge">{i + 1}</span>
        <div className="canteen-rank-icon-wrap">
          <img src={productImageUrl(item.cover_url || item.image_url)} alt={item.product_name || item.name} className="canteen-rank-thumb" />
        </div>
        <div className="canteen-rank-body">
          <span className="canteen-rank-name">{item.product_name || item.name}</span>
          <span className="canteen-rank-meta">
            {item.shop_name || item.region_code || ''}
            {item.comprehensive_score != null
              ? ` · ${Number(item.comprehensive_score).toFixed(1)}${t.rankPoints}`
              : ''}
          </span>
        </div>
      </button>
    );
  };

  const selectTab = (nextTab) => {
    setTab(nextTab);
  };

  const handleTabKeyDown = (event, index) => {
    let nextTab = index;
    if (event.key === 'ArrowRight') nextTab = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextTab = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') nextTab = 0;
    else if (event.key === 'End') nextTab = TABS.length - 1;
    else return;

    event.preventDefault();
    selectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <section className="canteen-section canteen-rank-section">
      <div className="canteen-section-header">
        <h3 className="canteen-section-title">{t.rankingsTitle}</h3>
        <button type="button" className="canteen-section-more" onClick={() => navigate('/eat/rankings')}>
          {t.rankingsViewAll}
        </button>
      </div>
      <div className="canteen-rank-tabs" role="tablist" aria-label={t.rankingsTitle}>
        {TABS.map((tabItem, i) => (
          <button
            key={tabItem.key}
            type="button"
            id={`${tabId}-${tabItem.key}-tab`}
            ref={(node) => { tabRefs.current[i] = node; }}
            role="tab"
            aria-selected={tab === i}
            aria-controls={`${tabId}-${tabItem.key}-panel`}
            tabIndex={tab === i ? 0 : -1}
            className={`canteen-rank-tab${tab === i ? ' canteen-rank-tab--active' : ''}`}
            onClick={() => selectTab(i)}
            onKeyDown={(event) => handleTabKeyDown(event, i)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>
      <div
        id={`${tabId}-${TABS[tab].key}-panel`}
        className="canteen-rank-list"
        role="tabpanel"
        aria-labelledby={`${tabId}-${TABS[tab].key}-tab`}
      >
        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : isError ? (
          <div className="state-error">{t.loadFailed}</div>
        ) : items.length === 0 ? (
          <div className="state-empty">{t.noData}</div>
        ) : (
          items.slice(0, 5).map(renderItem)
        )}
      </div>
    </section>
  );
}
