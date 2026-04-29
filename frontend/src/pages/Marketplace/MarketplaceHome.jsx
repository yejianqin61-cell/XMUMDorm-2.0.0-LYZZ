import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { getMarketplaceCategories, listMarketplaceItems } from '../../api/marketplace';
import { QK } from '../../query/queryKeys';
import './Marketplace.css';

function statusLabel(s, isZh) {
  if (s === 'sold') return isZh ? '已售出' : 'Sold';
  if (s === 'reserved') return isZh ? '已预订' : 'Reserved';
  return isZh ? '在售' : 'On sale';
}

function MarketplaceHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const catQuery = useQuery({
    queryKey: QK.marketplaceCategories(),
    queryFn: getMarketplaceCategories,
    staleTime: 60 * 60 * 1000,
    select: (d) => d || [],
  });

  const itemsQuery = useQuery({
    queryKey: QK.marketplaceItems({ category, status, priceMin, priceMax, page: 1, pageSize: 30 }),
    queryFn: () => listMarketplaceItems({ category, status, priceMin, priceMax, page: 1, pageSize: 30 }),
    staleTime: 10 * 1000,
    select: (d) => d || { list: [], hasMore: false },
  });

  const categories = useMemo(() => catQuery.data || [], [catQuery.data]);
  const list = useMemo(() => itemsQuery.data?.list || [], [itemsQuery.data]);

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <div className="mp-title">{isZh ? '二手市场' : 'Second-hand'}</div>
        <div className="mp-top-actions">
          <Link to="/about/second-hand/new" className="mp-btn mp-btn-primary">
            {isZh ? '发布' : 'Publish'}
          </Link>
        </div>
      </div>

      <div className="mp-tabs" aria-label={isZh ? '分类' : 'Categories'}>
        {(categories?.length ? categories : [{ id: 0, slug: 'all', name_zh: '全部', name_en: 'All' }]).map((c) => {
          const on = category === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              className={`mp-chip ${on ? 'is-on' : ''}`}
              onClick={() => setCategory(c.slug)}
            >
              {isZh ? c.name_zh : c.name_en}
            </button>
          );
        })}
      </div>

      <div className="mp-filters">
        <button
          type="button"
          className={`mp-chip ${status === 'all' ? 'is-on' : ''}`}
          onClick={() => setStatus('all')}
        >
          {isZh ? '全部状态' : 'All status'}
        </button>
        {['on_sale', 'reserved', 'sold'].map((s) => {
          const on = status === s;
          return (
            <button key={s} type="button" className={`mp-chip ${on ? 'is-on' : ''}`} onClick={() => setStatus(s)}>
              {statusLabel(s, isZh)}
            </button>
          );
        })}

        <input
          className="mp-input"
          inputMode="decimal"
          placeholder={isZh ? '最低价' : 'Min price'}
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
        />
        <input
          className="mp-input"
          inputMode="decimal"
          placeholder={isZh ? '最高价' : 'Max price'}
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
        />
        <button type="button" className="mp-btn" onClick={() => itemsQuery.refetch()}>
          {isZh ? '筛选' : 'Filter'}
        </button>
      </div>

      <div className="mp-grid">
        {list.map((it) => (
          <Link key={it.id} to={`/about/second-hand/item/${it.id}`} className="mp-card">
            <div className="mp-card-cover">
              {it.cover ? <img src={it.cover} alt={it.title} /> : <div>{isZh ? '暂无图片' : 'No image'}</div>}
            </div>
            <div className="mp-card-body">
              <div className="mp-card-title">{it.title}</div>
              <div className="mp-card-sub">
                <div className="mp-price">{isZh ? `RM ${it.price}` : `RM ${it.price}`}</div>
                <div className={`mp-badge ${it.status === 'sold' ? 'sold' : it.status === 'reserved' ? 'reserved' : ''}`}>
                  {statusLabel(it.status, isZh)}
                </div>
              </div>
              <div className="mp-card-sub" style={{ marginTop: 8 }}>
                <div>{it.sellerName || (isZh ? '匿名卖家' : 'Seller')}</div>
                <div>{isZh ? `想要 ${it.wants_count || 0}` : `Wants ${it.wants_count || 0}`}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!itemsQuery.isFetching && list.length === 0 ? (
        <div className="mp-empty">{isZh ? '暂无商品，去发布一个吧' : 'No items yet. Publish one.'}</div>
      ) : null}
    </div>
  );
}

export default MarketplaceHome;

