import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { MOCK_RANKINGS } from '../data/mockRankings';
import './Rankings.css';

/** 五大榜单标识（与后端接口对应） */
export const RANKING_SECTIONS = [
  { id: 'hot-products', title: '最夯单品', titleEn: 'Hot Products', desc: '上线至今综合评分 Top 5' },
  { id: 'busy-shops', title: '门庭若市', titleEn: 'Busy Shops', desc: '当周点评量 Top 5' },
  { id: 'top-shops', title: '最夯商家', titleEn: 'Top Shops', desc: '商家综合评分 Top 5' },
  { id: 'new-hit-products', title: '爆款新品', titleEn: 'New Hits', desc: '上架 7 天内评分 Top 3' },
  { id: 'active-users', title: '点评达人', titleEn: 'Active Reviewers', desc: '当周点评数 Top 5' },
];

/** 排行榜主页：五大榜单，当前用 Mock 展示 */
function Rankings() {
  return (
    <div className="rankings-page">
      <p className="rankings-intro">每周一 0 点（东八区）更新 Rankings update weekly</p>
      <ul className="rankings-list" aria-label="排行榜列表">
        {RANKING_SECTIONS.map((section) => {
          const list = MOCK_RANKINGS[section.id] || [];
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
                  {section.id === 'hot-products' && list.map((item) => (
                    <Link key={item.product_id} to={`/eat/food/${item.product_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.product_name}</span>
                      <span className="rankings-meta">{item.shop_name} · 评分 {item.comprehensive_score?.toFixed(1)}</span>
                    </Link>
                  ))}
                  {section.id === 'busy-shops' && list.map((item) => (
                    <Link key={item.shop_id} to={`/eat/merchant/${item.shop_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.shop_name}</span>
                      <span className="rankings-meta">当周 {item.weekly_review_count} 条点评</span>
                    </Link>
                  ))}
                  {section.id === 'top-shops' && list.map((item) => (
                    <Link key={item.shop_id} to={`/eat/merchant/${item.shop_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.shop_name}</span>
                      <span className="rankings-meta">评分 {item.comprehensive_score?.toFixed(1)}</span>
                    </Link>
                  ))}
                  {section.id === 'new-hit-products' && list.map((item) => (
                    <Link key={item.product_id} to={`/eat/food/${item.product_id}`} className="rankings-row">
                      <span className="rankings-rank">{item.rank}</span>
                      <span className="rankings-name">{item.product_name}</span>
                      <span className="rankings-meta">{item.shop_name} · {item.comprehensive_score?.toFixed(1)}</span>
                    </Link>
                  ))}
                  {section.id === 'active-users' && list.map((item) => (
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
