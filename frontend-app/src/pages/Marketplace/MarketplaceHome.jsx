import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, UserCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMarketplaceCategories, listMarketplaceItems } from '@shared/api/marketplace';
import { QK } from '../../query/queryKeys';
import MarketplaceItemCard from './MarketplaceItemCard';
import './Marketplace.css';

function statusLabel(s, isZh) {
  if (s === 'sold') return isZh ? '已售出' : 'Sold';
  return isZh ? '在售' : 'On sale';
}

function deliveryLabel(v, isZh) {
  if (v === 'delivery') return isZh ? '配送' : 'Delivery';
  return isZh ? '自提' : 'Pickup';
}

function MarketplaceHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const nav = useNavigate();
  const { isLoggedIn } = useAuth();

  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftPriceMin, setDraftPriceMin] = useState('');
  const [draftPriceMax, setDraftPriceMax] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [q, setQ] = useState('');
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [searchOpen]);

  const catQuery = useQuery({
    queryKey: QK.marketplaceCategories(),
    queryFn: getMarketplaceCategories,
    staleTime: 60 * 60 * 1000,
    select: (d) => d || [],
  });

  const itemsQuery = useQuery({
    queryKey: QK.marketplaceItems({ category, status, q, priceMin, priceMax, page: 1, pageSize: 30 }),
    queryFn: () => listMarketplaceItems({ category, status, q, priceMin, priceMax, page: 1, pageSize: 30 }),
    staleTime: 10 * 1000,
    select: (d) => d || { list: [], hasMore: false },
  });

  const categories = useMemo(() => catQuery.data || [], [catQuery.data]);
  const list = useMemo(() => itemsQuery.data?.list || [], [itemsQuery.data]);
  const isLoading = itemsQuery.isFetching && !itemsQuery.data;
  const showSkeletons = itemsQuery.isFetching && (itemsQuery.data?.list || []).length === 0;

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <div className="mp-title">{isZh ? '二手市场' : 'Second-hand'}</div>
        <div className="mp-top-actions">
          <div className="mp-search-wrap" ref={searchWrapRef}>
            {searchOpen ? (
              <form
                className="mp-search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const next = keyword.trim();
                  setQ(next);
                  setSearchOpen(false);
                }}
              >
                <div className="mp-search-pill">
                  <Search size={18} aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setSearchOpen(false);
                    }}
                    placeholder={isZh ? '搜索商品…' : 'Search…'}
                    className="mp-search-input"
                  />
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="mp-icon-btn"
                aria-label={isZh ? '搜索' : 'Search'}
                onClick={() => setSearchOpen(true)}
              >
                <Search size={18} aria-hidden />
              </button>
            )}
          </div>

          <button
            type="button"
            className="mp-icon-btn"
            aria-label={isZh ? '我的收藏' : 'My saved'}
            title={isZh ? '我的收藏' : 'My saved'}
            onClick={() => {
              if (!isLoggedIn) {
                nav('/login', { state: { from: { pathname: '/about/second-hand/me/wants' } } });
                return;
              }
              nav('/about/second-hand/me/wants');
            }}
          >
            <UserCircle size={18} aria-hidden />
          </button>

          <button
            type="button"
            className="mp-btn mp-btn-primary"
            onClick={() => {
              if (!isLoggedIn) {
                nav('/login', { state: { from: { pathname: '/publish', search: '?entry=marketplace' } } });
                return;
              }
              nav('/publish?entry=marketplace');
            }}
          >
            {isZh ? '发布' : 'Publish'}
          </button>
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

      <div className="mp-filterbar" aria-label={isZh ? '筛选' : 'Filters'}>
        <div className="mp-filterbar-scroll">
          <button
            type="button"
            className={`mp-chip ${status === 'all' ? 'is-on' : ''}`}
            onClick={() => setStatus('all')}
          >
            {isZh ? '全部' : 'All'}
          </button>
          {['on_sale', 'sold'].map((s) => {
            const on = status === s;
            return (
              <button key={s} type="button" className={`mp-chip ${on ? 'is-on' : ''}`} onClick={() => setStatus(s)}>
                {statusLabel(s, isZh)}
              </button>
            );
          })}

          <button
            type="button"
            className={`mp-chip mp-chip-icon ${drawerOpen ? 'is-on' : ''}`}
            onClick={() => {
              if (!drawerOpen) {
                setDraftPriceMin(priceMin);
                setDraftPriceMax(priceMax);
              }
              setDrawerOpen((v) => !v);
            }}
            aria-label={isZh ? '高级筛选' : 'Advanced filters'}
            title={isZh ? '高级筛选' : 'Advanced filters'}
          >
            <Filter size={16} aria-hidden />
            {isZh ? '筛选' : 'Filter'}
          </button>
        </div>

        <div className={`mp-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
          <div className="mp-drawer-inner">
            <div className="mp-drawer-row">
              <div className="mp-drawer-label">{isZh ? '价格区间' : 'Price range'}</div>
              <div className="mp-drawer-fields">
                <input
                  className="mp-input mp-input-sm"
                  inputMode="decimal"
                  placeholder={isZh ? '最低价' : 'Min'}
                  value={draftPriceMin}
                  onChange={(e) => setDraftPriceMin(e.target.value)}
                />
                <span className="mp-drawer-sep" aria-hidden="true">—</span>
                <input
                  className="mp-input mp-input-sm"
                  inputMode="decimal"
                  placeholder={isZh ? '最高价' : 'Max'}
                  value={draftPriceMax}
                  onChange={(e) => setDraftPriceMax(e.target.value)}
                />
              </div>
            </div>

            <div className="mp-drawer-actions">
              <button
                type="button"
                className="mp-btn"
                onClick={() => {
                  setDraftPriceMin('');
                  setDraftPriceMax('');
                  setPriceMin('');
                  setPriceMax('');
                  setDrawerOpen(false);
                }}
              >
                {isZh ? '清除' : 'Clear'}
              </button>
              <button
                type="button"
                className="mp-btn mp-btn-primary"
                onClick={() => {
                  setPriceMin(draftPriceMin);
                  setPriceMax(draftPriceMax);
                  setDrawerOpen(false);
                  itemsQuery.refetch();
                }}
              >
                {isZh ? '应用' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-list">
        {showSkeletons
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={`sk-${i}`} className="mp-hcard mp-hcard--skeleton" aria-hidden="true">
                <div className="mp-hcard-img mp-skel-cover" />
                <div className="mp-hcard-body">
                  <div className="mp-skel-line mp-skel-line--title" />
                  <div className="mp-skel-line mp-skel-line--meta" />
                  <div className="mp-skel-line mp-skel-line--price" />
                  <div className="mp-skel-line mp-skel-line--meta" />
                </div>
              </div>
            ))
          : list.map((it) => <MarketplaceItemCard key={it.id} item={it} />)}
      </div>

      {!itemsQuery.isFetching && list.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-illus" aria-hidden="true">
            <svg width="120" height="92" viewBox="0 0 120 92" fill="none">
              <path d="M12 66c10-12 22-18 36-18 22 0 26 14 44 14 8 0 14-2 16-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 30h80c6 0 10 4 10 10v26c0 6-4 10-10 10H20c-6 0-10-4-10-10V40c0-6 4-10 10-10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M36 30l6-12h36l6 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="44" cy="50" r="5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="mp-empty-title">{isZh ? '没有找到商品' : 'No items found'}</div>
          <div className="mp-empty-sub">{isZh ? '试试换个分类或调整筛选条件。' : 'Try a different category or adjust filters.'}</div>
        </div>
      ) : null}
    </div>
  );
}

export default MarketplaceHome;

