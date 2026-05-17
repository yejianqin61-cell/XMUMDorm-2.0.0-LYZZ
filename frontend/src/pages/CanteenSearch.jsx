import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchCanteen } from '../api/canteen';
import { QK } from '../query/queryKeys';
import { productImageUrl } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import './CanteenSearch.css';

export default function CanteenSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const [input, setInput] = useState(q);
  const [type, setType] = useState('all');

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
    const t = input.trim();
    if (t) setSearchParams({ q: t });
  };

  return (
    <div className="canteen-search-page">
      {/* 搜索栏 */}
      <form className="canteen-search-form" onSubmit={handleSubmit}>
        <input
          type="search"
          className="canteen-search-input"
          placeholder="搜索菜品、美食文章..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={50}
          autoFocus
        />
        <button type="button" className="canteen-search-cancel" onClick={() => navigate(-1)}>
          取消
        </button>
      </form>

      {/* 类型切换 */}
      {q && (
        <div className="canteen-search-tabs">
          {[
            { key: 'all', label: '全部' },
            { key: 'products', label: '菜品' },
            { key: 'articles', label: '文章' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className={`canteen-search-tab${type === t.key ? ' canteen-search-tab--active' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 结果 */}
      <div className="canteen-search-results">
        {!q ? (
          <div className="canteen-search-empty-hint">输入关键词搜索菜品和美食文章</div>
        ) : isLoading ? (
          <div className="state-loading" />
        ) : isError ? (
          <div className="state-error">搜索失败，请稍后重试</div>
        ) : (
          <>
            {(type === 'all' || type === 'products') && (
              <div className="canteen-search-section">
                <h3 className="canteen-search-section-title">菜品 ({products.length})</h3>
                {products.length === 0 ? (
                  <div className="state-empty">未找到相关菜品</div>
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
                            {p.comprehensive_score > 0 && ` · ${Number(p.comprehensive_score).toFixed(1)}分`}
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
                <h3 className="canteen-search-section-title">文章 ({articles.length})</h3>
                {articles.length === 0 ? (
                  <div className="state-empty">未找到相关文章</div>
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
                          {a.author?.name || '匿名'} · {formatPostTime(a.created_at)}
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
