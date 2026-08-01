import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTrendingTopics, deleteTrendingTopic } from '@shared/api/square';
import { QK } from '@shared/query/queryKeys';
import './SquareHome.css';

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
          <div className="square-section square-trending-shell">
            <div className="square-section-header">
              <div className="square-trending-shell__head">
                <h3 className="square-section-title">{isEn ? 'Trending Board' : '热搜榜'}</h3>
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
            {topics.map((topic, index) => (
              <div key={topic.id} className="square-trending-topic-row">
                <Link to={`/about/trending/${topic.id}`} className="square-trending-topic-row__link">
                  <span className="square-trending-topic-row__rank">{index + 1}</span>
                  <span className="square-trending-topic-row__body">
                    <span className="square-trending-topic-row__title">{topic.title}</span>
                    <span className="square-content-meta">{topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}</span>
                  </span>
                </Link>
                {isAdmin && (
                  <button type="button" className="square-section-more" onClick={(e) => handleDelete(e, topic.id)}>
                    {isEn ? 'Delete' : '删除'}
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
