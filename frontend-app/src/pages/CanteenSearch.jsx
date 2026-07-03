import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenStrings } from '../i18n/canteenStrings';
import { searchCanteen } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { productImageUrl } from '@shared/api/config';
import { formatPostTime } from '@shared/utils/formatTime';
import './CanteenSearch.css';

export default function CanteenSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const q = searchParams.get('q') || '';
  const [input, setInput] = useState(q);
  const [type, setType] = useState('all');

  const tabs = useMemo(
    () => [
      { key: 'all', label: t.searchTabAll },
      { key: 'products', label: t.searchTabProducts },
      { key: 'articles', label: t.searchTabArticles },
    ],
    [t.searchTabAll, t.searchTabProducts, t.searchTabArticles]
  );

  useEffect(() => {
    setInput(q);
  }, [q]);

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.canteenSearch(q, type),
    queryFn: () => searchCanteen(q, { type }),
    enabled: q.length > 0,
    staleTime: 30 * 1000,
  });
  const result = data?.data || data;
  const products = Array.isArray(result?.products) ? result.products : [];
  const articles = Array.isArray(result?.articles) ? result.articles : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setSearchParams({ q: trimmed });
  };

  return (
    <div className="canteen-search-page">
      <form className="canteen-search-form" onSubmit={handleSubmit}>
        <input
          type="search"
          className="canteen-search-input"
          placeholder={t.searchPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={50}
          autoFocus
        />
        <button type="button" className="canteen-search-cancel" onClick={() => navigate(-1)}>
          {t.searchCancel}
        </button>
      </form>

      {q && (
        <div className="canteen-search-tabs">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              className={`canteen-search-tab${type === tabItem.key ? ' canteen-search-tab--active' : ''}`}
              onClick={() => setType(tabItem.key)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      )}

      <div className="canteen-search-results">
        {!q ? (
          <div className="canteen-search-empty-hint">{t.searchEmptyHint}</div>
        ) : isLoading ? (
          <div className="state-loading" />
        ) : isError ? (
          <div className="state-error">{t.searchFailed}</div>
        ) : (
          <>
            {(type === 'all' || type === 'products') && (
              <div className="canteen-search-section">
                <h3 className="canteen-search-section-title">{t.searchSectionProducts(products.length)}</h3>
                {products.length === 0 ? (
                  <div className="state-empty">{t.searchNoProducts}</div>
                ) : (
                  <div className="canteen-search-grid">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="canteen-search-product-card"
                        onClick={() => navigate(`/eat/food/${p.id}`)}
                      >
                        <img src={productImageUrl(p.cover_url)} alt={p.name} className="canteen-search-product-img" />
                        <div className="canteen-search-product-info">
                          <span className="canteen-search-product-name">{p.name}</span>
                          <span className="canteen-search-product-meta">
                            {p.shop_name} · {p.region_code}
                            {p.comprehensive_score > 0 && ` · ${Number(p.comprehensive_score).toFixed(1)}${t.rankPoints}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(type === 'all' || type === 'articles') && (
              <div className="canteen-search-section">
                <h3 className="canteen-search-section-title">{t.searchSectionArticles(articles.length)}</h3>
                {articles.length === 0 ? (
                  <div className="state-empty">{t.searchNoArticles}</div>
                ) : (
                  <div className="canteen-search-article-list">
                    {articles.map((a) => (
                      <div
                        key={a.id}
                        className="canteen-search-article-item"
                        onClick={() => navigate(`/post/${a.id}`)}
                      >
                        <p className="canteen-search-article-excerpt">{a.title_or_excerpt}</p>
                        <span className="canteen-search-article-meta">
                          {a.author?.name || t.anonymous} · {formatPostTime(a.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
