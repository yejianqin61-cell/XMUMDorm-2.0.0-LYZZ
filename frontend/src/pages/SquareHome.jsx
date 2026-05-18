import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTrendingTopics, getCampusFeed, getSquareBanners } from '../api/square';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import { useAuth } from '../context/AuthContext';
import { getUploadUrl } from '../api/config';
import { QK } from '../query/queryKeys';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

/** 四宫格子定义 */
const GRID_ITEMS = [
  { label: '社团广场', enLabel: 'Clubs', to: '/about/club', icon: '🎨' },
  { label: '马校一站通', enLabel: 'Handbook', to: '/about/freshman-guide', icon: '📚' },
  { label: '帮帮我', enLabel: 'Errands', to: '/about/errands', icon: '🤝' },
  { label: '出物', enLabel: 'Market', to: '/about/second-hand', icon: '🛍️' },
];

function TrendingBlock() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    staleTime: 30 * 1000,
  });
  const topics = Array.isArray(data) ? data : data?.data || [];

  const rankColors = ['#e74c3c', '#e67e22', '#f1c40f'];

  return (
    <div className="square-section">
      <div className="square-section-header">
        <h3 className="square-section-title">🔥 热搜榜</h3>
        <button type="button" className="square-section-more" onClick={() => navigate('/about/trending')}>
          查看全部 →
        </button>
      </div>
      {isLoading ? (
        <div className="state-loading" style={{ paddingTop: 40 }} />
      ) : isError ? (
        <div className="state-error" style={{ padding: 12, fontSize: 13 }}>加载失败</div>
      ) : topics.length === 0 ? (
        <div className="state-empty" style={{ padding: 12, fontSize: 13 }}>暂无热搜话题</div>
      ) : (
        <div className="square-trending-list">
          {topics.slice(0, 5).map((t, i) => (
            <div
              key={t.id}
              className="square-trending-item pressable"
              onClick={() => navigate(`/about/trending/${t.id}`)}
            >
              <span className="square-trending-rank" style={{ color: rankColors[i] || '#999' }}>
                {i + 1}
              </span>
              <span className="square-trending-title">{t.title}</span>
              <span className="square-trending-count">{t.post_count || 0} 讨论</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SquareGrid() {
  return (
    <div className="square-section">
      <h3 className="square-section-title">核心功能</h3>
      <div className="square-grid">
        {GRID_ITEMS.map((g) => (
          <Link key={g.to} to={g.to} className="square-grid-card pressable">
            <span className="square-grid-icon">{g.icon}</span>
            <span className="square-grid-label">{g.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CampusBlock() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = useState('school');
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.campusFeed(tab, 1),
    queryFn: () => getCampusFeed({ tab, page: 1, pageSize: 5 }),
    staleTime: 30 * 1000,
  });
  const result = data?.data || data;
  const list = Array.isArray(result?.list) ? result.list : Array.isArray(result) ? result : [];

  return (
    <div className="square-section">
      <div className="square-section-header">
        <h3 className="square-section-title">📢 校园此刻</h3>
        {isLoggedIn && (
          <button
            type="button"
            className="square-section-more"
            onClick={() => navigate(`/about/campus/new?tab=${tab}`)}
          >
            + 发布
          </button>
        )}
      </div>
      <div className="square-campus-tabs">
        {[
          { key: 'school', label: '学校公告' },
          { key: 'college', label: '学院通知' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`square-campus-tab${tab === t.key ? ' square-campus-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="state-loading" style={{ paddingTop: 40 }} />
      ) : isError ? (
        <div className="state-error" style={{ padding: 12, fontSize: 13 }}>加载失败</div>
      ) : list.length === 0 ? (
        <div className="state-empty" style={{ padding: 12, fontSize: 13 }}>暂无通知</div>
      ) : (
        <div className="square-campus-list">
          {list.map((p) => (
            <div
              key={p.id}
              className="square-campus-item pressable"
              onClick={() => navigate(`/about/campus/${p.id}`)}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {p.images && p.images.length > 0 && (
                  <img
                    src={getUploadUrl(p.images[0].url)}
                    alt=""
                    style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    loading="lazy"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="square-campus-org">
                    📢 {p.organization?.name || ''}
                    <span className="square-campus-badge">官方认证</span>
                  </span>
                  <span className="square-campus-title">{p.title}</span>
                  <span className="square-campus-meta">{formatPostTime(p.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** V3.0 广场信息流首页 */
export default function SquareHome() {
  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <CanteenBannerCarousel
          fetchFn={getSquareBanners}
          queryKey={QK.squareBanners()}
          adminTo="/about/admin/orgs?tab=banners"
        />
        <TrendingBlock />
        <SquareGrid />
        <CampusBlock />
        <div className="square-section square-home-footer">
          <Link to="/about/map" className="square-home-map-link">
            地图模式
          </Link>
        </div>
      </div>
    </div>
  );
}
