import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getRankingsHotProducts,
  getRankingsTopShops,
  getRankingsNewHitProducts,
} from '../../api/rankings';
import { QK } from '../../query/queryKeys';
import { productImageUrl } from '../../api/config';

const TABS = [
  { key: 'products', label: '菜品榜' },
  { key: 'shops', label: '店铺榜' },
  { key: 'new', label: '新品榜' },
];

export default function CanteenHomeRankings() {
  const navigate = useNavigate();
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
  const isLoading = query.isLoading;
  const isError = query.isError;

  const renderItem = (item, i) => {
    if (tab === 1) return (
      <div key={item.shop_id || i} className="canteen-rank-item" onClick={() => navigate(`/eat/merchant/${item.shop_id}`)}>
        <span className={`canteen-rank-badge canteen-rank-badge--${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
        <div className="canteen-rank-icon-wrap">
          <img src={item.logo_url ? productImageUrl(item.logo_url) : '/shops/default.jpg'} alt={item.shop_name} className="canteen-rank-thumb" />
        </div>
        <div className="canteen-rank-body">
          <span className="canteen-rank-name">{item.shop_name}</span>
          <span className="canteen-rank-meta">综合分 {Number(item.comprehensive_score || 0).toFixed(1)}</span>
        </div>
      </div>
    );
    return (
      <div key={item.product_id || item.product_name || i} className="canteen-rank-item" onClick={() => navigate(`/eat/food/${item.product_id}`)}>
        <span className={`canteen-rank-badge canteen-rank-badge--${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
        <div className="canteen-rank-icon-wrap">
          <img src={productImageUrl(item.cover_url || item.image_url)} alt={item.product_name || item.name} className="canteen-rank-thumb" />
        </div>
        <div className="canteen-rank-body">
          <span className="canteen-rank-name">{item.product_name || item.name}</span>
          <span className="canteen-rank-meta">
            {item.shop_name || item.region_code || ''}
            {item.comprehensive_score != null ? ` · ${Number(item.comprehensive_score).toFixed(1)}分` : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="canteen-section">
      <div className="canteen-section-header">
        <h3 className="canteen-section-title">排行榜</h3>
        <button type="button" className="canteen-section-more" onClick={() => navigate('/eat/rankings')}>
          查看完整榜单 →
        </button>
      </div>
      <div className="canteen-rank-tabs">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            className={`canteen-rank-tab${tab === i ? ' canteen-rank-tab--active' : ''}`}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="canteen-rank-list">
        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : isError ? (
          <div className="state-error">加载失败，请稍后重试</div>
        ) : items.length === 0 ? (
          <div className="state-empty">暂无数据</div>
        ) : (
          items.slice(0, 5).map(renderItem)
        )}
      </div>
    </div>
  );
}
