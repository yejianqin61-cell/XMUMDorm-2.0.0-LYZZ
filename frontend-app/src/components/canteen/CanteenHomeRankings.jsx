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
  const tabs = useMemo(
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

  const renderItem = (item, index, rankingTab) => {
    const score = Number(item.comprehensive_score);
    const hasScore = Number.isFinite(score);

    if (rankingTab === 1) {
      return (
        <button key={item.shop_id || index} type="button" className="canteen-rank-item" onClick={() => navigate(`/eat/merchant/${item.shop_id}`)}>
          <span className="canteen-rank-badge">{index + 1}</span>
          <div className="canteen-rank-icon-wrap">
            <img src="/shops/default.jpg" alt={item.shop_name} className="canteen-rank-thumb" />
          </div>
          <div className="canteen-rank-body">
            <span className="canteen-rank-name">{item.shop_name}</span>
            {item.region_name && <span className="canteen-rank-meta">{item.region_name}</span>}
            {hasScore && <span className="canteen-rank-meta">{t.rankScore} {score.toFixed(1)}</span>}
          </div>
        </button>
      );
    }

    return (
      <button key={item.product_id || item.product_name || index} type="button" className="canteen-rank-item" onClick={() => navigate(`/eat/food/${item.product_id}`)}>
        <span className="canteen-rank-badge">{index + 1}</span>
        <div className="canteen-rank-icon-wrap">
          <img src={productImageUrl(item.cover_url || item.image_url)} alt={item.product_name || item.name} className="canteen-rank-thumb" />
        </div>
        <div className="canteen-rank-body">
          <span className="canteen-rank-name">{item.product_name || item.name}</span>
          <span className="canteen-rank-meta">
            {item.shop_name || item.region_code || ''}
            {hasScore ? ` · ${score.toFixed(1)}${t.rankPoints}` : ''}
          </span>
        </div>
      </button>
    );
  };

  const handleTabKeyDown = (event, index) => {
    let nextTab = index;
    if (event.key === 'ArrowRight') nextTab = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextTab = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextTab = 0;
    else if (event.key === 'End') nextTab = tabs.length - 1;
    else return;

    event.preventDefault();
    setTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  const renderPanel = (rankingTab) => {
    const query = results[rankingTab];
    const items = query.data?.data || query.data || [];
    const tabItem = tabs[rankingTab];

    return (
      <div
        key={tabItem.key}
        id={`${tabId}-${tabItem.key}-panel`}
        className="canteen-rank-list"
        role="tabpanel"
        aria-labelledby={`${tabId}-${tabItem.key}-tab`}
        hidden={tab !== rankingTab}
      >
        {query.isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : query.isError ? (
          <div className="state-error">{t.loadFailed}</div>
        ) : items.length === 0 ? (
          <div className="state-empty">{t.noData}</div>
        ) : (
          items.slice(0, 5).map((item, index) => renderItem(item, index, rankingTab))
        )}
      </div>
    );
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
        {tabs.map((tabItem, index) => (
          <button
            key={tabItem.key}
            type="button"
            id={`${tabId}-${tabItem.key}-tab`}
            ref={(node) => { tabRefs.current[index] = node; }}
            role="tab"
            aria-selected={tab === index}
            aria-controls={`${tabId}-${tabItem.key}-panel`}
            tabIndex={tab === index ? 0 : -1}
            className={`canteen-rank-tab${tab === index ? ' canteen-rank-tab--active' : ''}`}
            onClick={() => setTab(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>
      {tabs.map((_, index) => renderPanel(index))}
    </section>
  );
}
