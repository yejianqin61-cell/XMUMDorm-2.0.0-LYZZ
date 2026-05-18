import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTrendingTopics, deleteTrendingTopic } from '../api/square';
import { QK } from '../query/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import './SquareHome.css';

export default function SquareTrendingList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    staleTime: 30 * 1000,
  });
  const topics = Array.isArray(data) ? data : data?.data || [];
  const rankColors = ['#e74c3c', '#e67e22', '#f1c40f'];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('确定删除此热搜？')) return;
    try {
      await deleteTrendingTopic(id);
      queryClient.invalidateQueries({ queryKey: QK.trendingTopics() });
    } catch {}
  };

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section">
          <div className="square-section-header">
            <h3 className="square-section-title">🔥 热搜榜</h3>
            {isAdmin && (
              <button type="button" className="square-section-more" onClick={() => navigate('/about/admin/orgs?tab=trending')}>
                管理热搜
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : isError ? (
          <div className="state-error">加载失败</div>
        ) : topics.length === 0 ? (
          <div className="state-empty">暂无热搜话题</div>
        ) : (
          <div className="square-trending-list">
            {topics.map((t, i) => (
              <div
                key={t.id}
                className="square-trending-item pressable"
                onClick={() => navigate(`/about/trending/${t.id}`)}
              >
                <span className="square-trending-rank" style={{ color: rankColors[i] || '#999' }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="square-trending-title" style={{ display: 'block' }}>{t.title}</span>
                  {t.description && (
                    <span style={{ fontSize: 12, color: 'var(--post-ios-secondary-label)', display: 'block', marginTop: 2 }}>
                      {t.description}
                    </span>
                  )}
                </div>
                <span className="square-trending-count">{t.post_count || 0} 讨论</span>
                {isAdmin && (
                  <button
                    type="button"
                    className="square-section-more"
                    style={{ color: 'var(--post-ios-red)', marginLeft: 6 }}
                    onClick={(e) => handleDelete(e, t.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
