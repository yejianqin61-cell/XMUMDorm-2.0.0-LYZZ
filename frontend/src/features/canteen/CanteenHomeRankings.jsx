import { useState, useMemo } from 'react';
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
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NeoTab from '../../components/retroui/Tab';
import { NeoLoader } from '../../components/retroui/Loader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';

export default function CanteenHomeRankings({ title, showTabs = true, footer }) {
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
  const results = useQueries({
    queries: [
      { queryKey: ['rankings', 'hot-products'], queryFn: getRankingsHotProducts, staleTime: 60 * 1000 },
      { queryKey: ['rankings', 'top-shops'], queryFn: getRankingsTopShops, staleTime: 60 * 1000 },
      { queryKey: ['rankings', 'new-hit-products'], queryFn: getRankingsNewHitProducts, staleTime: 60 * 1000 },
    ],
  });

  const query = results[tab];
  const items = query.data?.data || query.data || [];
  const isLoadingVal = query.isLoading;
  const isErrorVal = query.isError;

  const rankTone = (i) => {
    if (i === 0) return 'warning';
    if (i === 1) return 'secondary';
    if (i === 2) return 'primary';
    return 'default';
  };

  const renderItem = (item, i) => {
    if (tab === 1) {
      return (
        <Card
          key={item.shop_id || i}
          className="flex items-center justify-between gap-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => navigate(`/eat/merchant/${item.shop_id}`)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Badge tone={rankTone(i)}>{i + 1}</Badge>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{item.shop_name}</span>
              <span className="text-xs text-muted-foreground">
                {t.rankScore} {Number(item.comprehensive_score || 0).toFixed(1)}
              </span>
            </div>
          </div>
          <img
            src={item.logo_url ? productImageUrl(item.logo_url) : '/shops/default.jpg'}
            alt={item.shop_name}
            className="w-14 h-14 object-cover border-2 border-black shrink-0"
          />
        </Card>
      );
    }
    return (
      <Card
        key={item.product_id || item.product_name || i}
        className="flex items-center justify-between gap-3 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => navigate(`/eat/food/${item.product_id}`)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge tone={rankTone(i)}>{i + 1}</Badge>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate">{item.product_name || item.name}</span>
            <span className="text-xs text-muted-foreground">
              {item.shop_name || item.region_code || ''}
              {item.comprehensive_score != null
                ? ` · ${Number(item.comprehensive_score).toFixed(1)}${t.rankPoints}`
                : ''}
            </span>
          </div>
        </div>
        <img
          src={productImageUrl(item.cover_url || item.image_url)}
          alt={item.product_name || item.name}
          className="w-14 h-14 object-cover border-2 border-black shrink-0"
        />
      </Card>
    );
  };

  const tabValues = TABS.map((_, i) => String(i));
  const currentTabValue = String(tab);

  return (
    <div className="canteen-section">
      <div className="canteen-section-header">
        <h3 className="canteen-section-title">{title || t.rankingsTitle}</h3>
        <Button variant="link" size="sm" onClick={() => navigate('/eat/rankings')}>
          {t.rankingsViewAll}
        </Button>
      </div>

      {showTabs && (
        <NeoTab
          value={currentTabValue}
          onValueChange={(v) => setTab(Number(v))}
          className="mb-4"
        >
          <NeoTab.List className="flex flex-row space-x-2 w-full">
            {TABS.map((tabItem, i) => (
              <NeoTab.Trigger key={tabItem.key} value={String(i)} className="flex-1 justify-center">
                {tabItem.label}
              </NeoTab.Trigger>
            ))}
          </NeoTab.List>
        </NeoTab>
      )}

      <div className="flex flex-col gap-2">
        {isLoadingVal ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <NeoLoader />
            <span className="text-sm text-muted-foreground">{t.loading}</span>
          </div>
        ) : isErrorVal ? (
          <ErrorState message={t.loadFailed} />
        ) : items.length === 0 ? (
          <EmptyState message={t.noData} />
        ) : (
          items.slice(0, 5).map(renderItem)
        )}
      </div>
      {footer}
    </div>
  );
}