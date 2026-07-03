import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { getApiErrorMessage } from '../utils/apiError';
import {
  getRankingsHotProducts,
  getRankingsBusyShops,
  getRankingsTopShops,
  getRankingsNewHitProducts,
  getRankingsActiveUsers,
} from '@shared/api/rankings';
import { QK } from '../query/queryKeys';
import './Rankings.css';

/** 五大榜单标识（与后端接口对应） */
export const RANKING_SECTIONS = [
  { id: 'hot-products', title: 'Hot Products', titleEn: '最夯单品', desc: '上线至今综合评分 Top 5' },
  { id: 'busy-shops', title: 'Busy Shops', titleEn: '门庭若市', desc: '当周点评量 Top 5' },
  { id: 'top-shops', title: 'Top Shops', titleEn: '最夯商家', desc: '商家综合评分 Top 5' },
  { id: 'new-hit-products', title: 'New Hits', titleEn: '爆款新品', desc: '上架 7 天内评分 Top 3' },
  { id: 'active-users', title: 'Active Reviewers', titleEn: '点评达人', desc: '当周点评数 Top 5' },
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
        <p className="rankings-loading state-loading">加载中…</p>
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
        每周一 0 点（东八区）更新 <span className="rankings-intro-en">Rankings update weekly</span>
      </p>
      <ul className="rankings-list" aria-label="排行榜列表">
        {RANKING_SECTIONS.map((section) => {
          const list = data?.[section.id] || [];
          return (
            <li key={section.id}>
              <Card as="div" className="rankings-section-card rankings-glass">
                <div className="rankings-section-header">
                  <h2 className="rankings-section-title">
                    {section.title}
                    <span className="rankings-section-title-en">{section.titleEn}</span>
                  </h2>
                  <p className="rankings-section-desc">{section.desc}</p>
                </div>
                <div className="rankings-section-content">
                  {list.length === 0 && (
                    <EmptyState title="暂无数据" description="No data yet." />
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
                            <span className="rankings-mono">{item.weekly_review_count}</span> 条点评
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
                          当周 <span className="rankings-mono">{item.weekly_comment_count}</span> 条点评
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
