import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { getApiErrorMessage } from '@shared/utils/apiError';
import {
  getRankingsHotProducts,
  getRankingsBusyShops,
  getRankingsTopShops,
  getRankingsNewHitProducts,
  getRankingsActiveUsers,
} from '@shared/api/rankings';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../context/LanguageContext';
import './Rankings.css';

/** 五大榜单标识（与后端接口对应） */
export const RANKING_SECTIONS = [
  { id: 'hot-products', zh: '最夯单品', en: 'Hot products', zhDesc: '上线至今综合评分前 5 名', enDesc: 'Top 5 by all-time score' },
  { id: 'busy-shops', zh: '门庭若市', en: 'Busy shops', zhDesc: '本周点评量前 5 名', enDesc: 'Top 5 by weekly reviews' },
  { id: 'top-shops', zh: '最夯商家', en: 'Top shops', zhDesc: '商家综合评分前 5 名', enDesc: 'Top 5 by overall score' },
  { id: 'new-hit-products', zh: '爆款新品', en: 'New hits', zhDesc: '上架 7 天内评分前 3 名', enDesc: 'Top 3 new dishes by score' },
  { id: 'active-users', zh: '点评达人', en: 'Active reviewers', zhDesc: '本周点评数前 5 名', enDesc: 'Top 5 by weekly reviews' },
];

async function fetchAllRankings() {
  const [hotProducts, busyShops, topShops, newHitProducts, activeUsers] = await Promise.all([
    getRankingsHotProducts(),
    getRankingsBusyShops(),
    getRankingsTopShops(),
    getRankingsNewHitProducts(),
    getRankingsActiveUsers(),
  ]);
  return {
    'hot-products': Array.isArray(hotProducts) ? hotProducts : [],
    'busy-shops': Array.isArray(busyShops) ? busyShops : [],
    'top-shops': Array.isArray(topShops) ? topShops : [],
    'new-hit-products': Array.isArray(newHitProducts) ? newHitProducts : [],
    'active-users': Array.isArray(activeUsers) ? activeUsers : [],
  };
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="rankings-badge rankings-badge--1">1</span>;
  if (rank === 2) return <span className="rankings-badge rankings-badge--2">2</span>;
  if (rank === 3) return <span className="rankings-badge rankings-badge--3">3</span>;
  return <span className="rankings-badge rankings-badge--n">{rank}</span>;
}

/** 排行榜主页：五大榜单；结果缓存，重复进入更快 */
function Rankings() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { data, isPending, error } = useQuery({
    queryKey: QK.rankingsAll(),
    queryFn: fetchAllRankings,
    staleTime: 10 * 60 * 1000,
  });

  const ioRef = useRef(null);
  const itemRefs = useRef(new Map());
  useEffect(() => {
    if (ioRef.current) return;
    ioRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('rankings-inview');
          ioRef.current?.unobserve(e.target);
        }
      },
      { threshold: 0.12 }
    );
    return () => ioRef.current?.disconnect();
  }, []);

  const busyMax = useMemo(() => {
    const list = data?.['busy-shops'] || [];
    return Math.max(1, ...list.map((x) => Number(x.weekly_review_count || 0)));
  }, [data]);

  if (isPending) {
    return (
      <div className="rankings-page">
        <p className="rankings-loading state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-page">
        <p className="rankings-error state-error">{getApiErrorMessage(error)}</p>
      </div>
    );
  }

  return (
    <div className="rankings-page rankings-animate">
      <p className="rankings-intro">
        <span className="rankings-intro-dot" aria-hidden />
        {isEn ? 'Updates every Monday at 00:00 (UTC+8)' : '每周一 0 点（东八区）更新'}
      </p>
      <ul className="rankings-list" aria-label={isEn ? 'Rankings' : '排行榜列表'}>
        {RANKING_SECTIONS.map((section) => {
          const list = data?.[section.id] || [];
          return (
            <li key={section.id}>
              <Card as="div" className="rankings-section-card rankings-glass">
                <div className="rankings-section-header">
                  <h2 className="rankings-section-title">
                    {isEn ? section.en : section.zh}
                  </h2>
                  <p className="rankings-section-desc">{isEn ? section.enDesc : section.zhDesc}</p>
                </div>
                <div className="rankings-section-content">
                  {list.length === 0 && (
                    <EmptyState title={isEn ? 'No data yet' : '暂无数据'} description={isEn ? 'No ranking data is available.' : '暂无可用的榜单数据。'} />
                  )}
                  {section.id === 'hot-products' &&
                    list.length > 0 &&
                    list.map((item, idx) => (
                      <Link
                        key={item.product_id}
                        to={`/eat/food/${item.product_id}`}
                        className={`rankings-row rankings-row--product ${item.rank === 1 ? 'rankings-row--top1' : ''}`}
                        style={{ '--i': idx }}
                        ref={(el) => {
                          if (!el) return;
                          itemRefs.current.set(`hot-${item.product_id}`, el);
                          ioRef.current?.observe(el);
                        }}
                      >
                        <RankBadge rank={item.rank} />
                        <span className="rankings-thumb" aria-hidden>
                          <img
                            src={item.product_image || '/products/default.png'}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <div className="rankings-row-main">
                          <span className="rankings-name rankings-name--serif">{item.product_name}</span>
                          {item.shop_name != null && item.shop_name !== '' && (
                            <span className="rankings-shop">{item.shop_name}</span>
                          )}
                          {item.comprehensive_score != null && (
                            <span className="rankings-score">
                              <span className="rankings-score-chip">
                                <span className="rankings-score-star" aria-hidden>
                                  ★
                                </span>
                                <span className="rankings-score-num">{item.comprehensive_score.toFixed(1)}</span>
                                <span className="rankings-score-den">/10</span>
                              </span>
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  {section.id === 'busy-shops' && list.length > 0 && list.map((item) => (
                    <Link
                      key={item.shop_id}
                      to={`/eat/merchant/${item.shop_id}`}
                      className="rankings-row rankings-row--shop"
                      style={{ '--i': item.rank - 1 }}
                      ref={(el) => {
                        if (!el) return;
                        itemRefs.current.set(`busy-${item.shop_id}`, el);
                        ioRef.current?.observe(el);
                      }}
                    >
                      <RankBadge rank={item.rank} />
                      <div className="rankings-row-main">
                        <span className="rankings-name">{item.shop_name}</span>
                        <span className="rankings-heat">
                          <span className="rankings-heat-bar" aria-hidden>
                            <span
                              className="rankings-heat-barfill"
                              style={{ width: `${Math.round((Number(item.weekly_review_count || 0) / busyMax) * 100)}%` }}
                            />
                          </span>
                          <span className="rankings-heat-num">
                            <span className="rankings-mono">{item.weekly_review_count}</span> {isEn ? 'reviews' : '条点评'}
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                  {section.id === 'top-shops' && list.length > 0 && list.map((item) => (
                    <Link
                      key={item.shop_id}
                      to={`/eat/merchant/${item.shop_id}`}
                      className="rankings-row rankings-row--shop"
                      style={{ '--i': item.rank - 1 }}
                      ref={(el) => {
                        if (!el) return;
                        itemRefs.current.set(`top-${item.shop_id}`, el);
                        ioRef.current?.observe(el);
                      }}
                    >
                      <RankBadge rank={item.rank} />
                      <div className="rankings-row-main">
                        <span className="rankings-name">{item.shop_name}</span>
                        <span className="rankings-meta">
                          <span className="rankings-score-chip rankings-score-chip--mini">
                            <span className="rankings-score-star" aria-hidden>
                              ★
                            </span>
                            <span className="rankings-score-num rankings-mono">{item.comprehensive_score?.toFixed(1)}</span>
                            <span className="rankings-score-den">/10</span>
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                  {section.id === 'new-hit-products' && list.length > 0 && list.map((item) => (
                    <Link
                      key={item.product_id}
                      to={`/eat/food/${item.product_id}`}
                      className={`rankings-row rankings-row--product ${item.rank === 1 ? 'rankings-row--top1' : ''}`}
                      style={{ '--i': item.rank - 1 }}
                      ref={(el) => {
                        if (!el) return;
                        itemRefs.current.set(`new-${item.product_id}`, el);
                        ioRef.current?.observe(el);
                      }}
                    >
                      <RankBadge rank={item.rank} />
                      <span className="rankings-thumb" aria-hidden>
                        <img src={item.product_image || '/products/default.png'} alt="" loading="lazy" decoding="async" />
                      </span>
                      <div className="rankings-row-main">
                        <span className="rankings-name rankings-name--serif">{item.product_name}</span>
                        {item.shop_name != null && item.shop_name !== '' && (
                          <span className="rankings-shop">{item.shop_name}</span>
                        )}
                        {item.comprehensive_score != null && (
                          <span className="rankings-score">
                            <span className="rankings-score-chip">
                              <span className="rankings-score-star" aria-hidden>
                                ★
                              </span>
                              <span className="rankings-score-num">{item.comprehensive_score.toFixed(1)}</span>
                              <span className="rankings-score-den">/10</span>
                            </span>
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {section.id === 'active-users' && list.length > 0 && list.map((item) => (
                    <div
                      key={item.user_id}
                      className="rankings-row rankings-row-static"
                      style={{ '--i': item.rank - 1 }}
                      ref={(el) => {
                        if (!el) return;
                        itemRefs.current.set(`u-${item.user_id}`, el);
                        ioRef.current?.observe(el);
                      }}
                    >
                      <RankBadge rank={item.rank} />
                      <div className="rankings-row-main">
                        <span className="rankings-name">{item.nickname || item.username}</span>
                        <span className="rankings-meta">
                          {isEn ? 'This week ' : '当周 '}<span className="rankings-mono">{item.weekly_comment_count}</span> {isEn ? 'reviews' : '条点评'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Rankings;
