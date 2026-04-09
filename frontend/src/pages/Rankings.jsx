import { Link } from 'react-router-dom';
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
} from '../api/rankings';
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

/** 排行榜主页：五大榜单；结果缓存，重复进入更快 */
function Rankings() {
  const { data, isPending, error } = useQuery({
    queryKey: QK.rankingsAll(),
    queryFn: fetchAllRankings,
    staleTime: 10 * 60 * 1000,
  });

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
    <div className="rankings-page">
      <p className="rankings-intro">每周一 0 点（东八区）更新 Rankings update weekly</p>
      <ul className="rankings-list" aria-label="排行榜列表">
        {RANKING_SECTIONS.map((section) => {
          const list = data?.[section.id] || [];
          return (
            <li key={section.id}>
              <Card as="div" className="rankings-section-card">
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
                  {section.id === 'hot-products' && list.length > 0 && list.map((item) => (
                    <Link key={item.product_id} to={`/eat/food/${item.product_id}`} className="rankings-row rankings-row--product">
                      <span className="rankings-rank">{item.rank}</span>
                      <div className="rankings-row-main">
                        <span className="rankings-name">{item.product_name}</span>
                        {item.shop_name != null && item.shop_name !== '' && (
                          <span className="rankings-shop">{item.shop_name}</span>
                        )}
                        {item.comprehensive_score != null && (
                          <span className="rankings-score">评分 {item.comprehensive_score.toFixed(1)}/10</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {section.id === 'busy-shops' && list.length > 0 && list.map((item) => (
                    <Link key={item.shop_id} to={`/eat/merchant/${item.shop_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.shop_name}</span>
                      <span className="rankings-meta">当周 {item.weekly_review_count} 条点评</span>
                    </Link>
                  ))}
                  {section.id === 'top-shops' && list.length > 0 && list.map((item) => (
                    <Link key={item.shop_id} to={`/eat/merchant/${item.shop_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.shop_name}</span>
                      <span className="rankings-meta">评分 {item.comprehensive_score?.toFixed(1)}/10</span>
                    </Link>
                  ))}
                  {section.id === 'new-hit-products' && list.length > 0 && list.map((item) => (
                    <Link key={item.product_id} to={`/eat/food/${item.product_id}`} className="rankings-row rankings-row--product">
                      <span className="rankings-rank">{item.rank}</span>
                      <div className="rankings-row-main">
                        <span className="rankings-name">{item.product_name}</span>
                        {item.shop_name != null && item.shop_name !== '' && (
                          <span className="rankings-shop">{item.shop_name}</span>
                        )}
                        {item.comprehensive_score != null && (
                          <span className="rankings-score">评分 {item.comprehensive_score.toFixed(1)}/10</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {section.id === 'active-users' && list.length > 0 && list.map((item) => (
                    <div key={item.user_id} className="rankings-row rankings-row-static">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.nickname || item.username}</span>
                      <span className="rankings-meta">当周 {item.weekly_comment_count} 条点评</span>
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
