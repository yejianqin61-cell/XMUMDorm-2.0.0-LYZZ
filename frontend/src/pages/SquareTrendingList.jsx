import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTrendingTopics, deleteTrendingTopic } from '../api/square';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

const rankDecor = {
  zh: [
    { icon: '🔥', label: '爆热', kicker: '现在最热', signal: '讨论最密集' },
    { icon: '🚀', label: '上升', kicker: '快速升温', signal: '热度持续上升' },
    { icon: '✨', label: '关注', kicker: '值得关注', signal: '正在扩散' },
  ],
  en: [
    { icon: '🔥', label: 'Hot', kicker: 'Trending now', signal: 'Highest discussion density' },
    { icon: '🚀', label: 'Rising', kicker: 'Heating up fast', signal: 'Momentum is still climbing' },
    { icon: '✨', label: 'Watch', kicker: 'Worth watching', signal: 'Spreading across campus' },
  ],
};

export default function SquareTrendingList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    staleTime: 30 * 1000,
  });

  const topics = Array.isArray(data) ? data : data?.data || [];
  const rankColors = ['#e74c3c', '#e67e22', '#f1c40f'];
  const decorSet = isEn ? rankDecor.en : rankDecor.zh;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(isEn ? 'Delete this trending topic?' : '确定删除此热搜？')) return;

    try {
      await deleteTrendingTopic(id);
      queryClient.invalidateQueries({ queryKey: QK.trendingTopics() });
    } catch (error) {
      console.error('Failed to delete trending topic', error);
      window.alert(isEn ? 'Delete failed. Please try again later.' : '删除失败，请稍后再试');
    }
  };

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section square-home-block square-trending-shell">
          <div className="square-section-header">
            <div className="square-trending-shell__head">
              <h3 className="square-section-title">{isEn ? 'Trending Board' : '热搜榜'}</h3>
              <p className="square-trending-shell__meta">
                {isEn ? 'A live ranking of campus topics by discussion heat' : '按讨论热度整理校园里正在升温的话题'}
              </p>
            </div>
            {isAdmin && (
              <button type="button" className="square-section-more" onClick={() => navigate('/about/admin/orgs?tab=trending')}>
                {isEn ? 'Manage trending' : '管理热搜'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : isError ? (
          <div className="state-error">{isEn ? 'Load failed' : '加载失败'}</div>
        ) : topics.length === 0 ? (
          <div className="state-empty">{isEn ? 'No trending topics yet' : '暂无热搜话题'}</div>
        ) : (
          <div className="square-trending-list square-trending-list--page">
            {topics.map((topic, index) => {
              const decor = decorSet[index] || {
                icon: '📈',
                label: isEn ? 'Live' : '热议中',
                kicker: isEn ? 'Still growing' : '持续发酵',
                signal: isEn ? 'More people are joining the discussion' : '正在被更多人讨论',
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
                      <span className="square-trending-count">
                        {topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}
                      </span>
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
                      {isEn ? 'Delete' : '删除'}
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
