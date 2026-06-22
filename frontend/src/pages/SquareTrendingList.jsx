import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTrendingTopics, deleteTrendingTopic } from '../api/square';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

const rankDecor = [
  { icon: '🔥', label: '爆热', kicker: '现在最热', signal: '讨论最密集' },
  { icon: '🚀', label: '上升', kicker: '快速升温', signal: '热度持续上升' },
  { icon: '✨', label: '关注', kicker: '值得关注', signal: '正在扩散' },
];

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
    } catch (error) {
      console.error('Failed to delete trending topic', error);
      window.alert('删除失败，请稍后再试');
    }
  };

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section square-home-block square-trending-shell">
          <div className="square-section-header">
            <div className="square-trending-shell__head">
              <h3 className="square-section-title">热搜榜</h3>
              <p className="square-trending-shell__meta">按讨论热度整理校园里正在升温的话题</p>
            </div>
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
          <div className="square-trending-list square-trending-list--page">
            {topics.map((topic, index) => {
              const decor = rankDecor[index] || {
                icon: '📈',
                label: '热议中',
                kicker: '持续发酵',
                signal: '正在被更多人讨论',
              };

              return (
                <div
                  key={topic.id}
                  className="square-trending-topic-card pressable"
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => navigate(`/about/trending/${topic.id}`)}
                >
                  <div className="square-trending-topic-card__rank-wrap">
                    <span className={`square-trending-rank-badge square-trending-rank-badge--${index < 3 ? index + 1 : 'soft'}`}>
                      <span aria-hidden="true">{decor.icon}</span>
                      <span>{decor.label}</span>
                    </span>
                    <span className="square-trending-rank" style={{ color: rankColors[index] || '#999' }}>
                      #{index + 1}
                    </span>
                  </div>

                  <div className="square-trending-topic-card__content">
                    <div className="square-trending-topic-card__headline">
                      <span className="square-trending-topic-card__spark" aria-hidden="true">
                        {decor.icon}
                      </span>
                      <span className="square-trending-topic-card__kicker">{decor.kicker}</span>
                    </div>

                    <span className="square-trending-topic-card__title">{topic.title}</span>

                    {topic.description && (
                      <span className="square-trending-topic-card__description">
                        {topic.description}
                      </span>
                    )}

                    <div className="square-trending-topic-card__info-strip">
                      <span className="square-trending-count">{topic.post_count || 0} 条讨论</span>
                      <span className="square-trending-topic-card__divider" aria-hidden="true" />
                      <span className="square-trending-topic-card__signal">{decor.signal}</span>
                    </div>

                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      className="square-section-more"
                      style={{ color: 'var(--post-ios-red)', marginLeft: 6, alignSelf: 'flex-start' }}
                      onClick={(e) => handleDelete(e, topic.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
