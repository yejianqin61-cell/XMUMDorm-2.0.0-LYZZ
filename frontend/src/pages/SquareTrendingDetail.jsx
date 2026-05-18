import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getTrendingTopicDetail, getTrendingPosts } from '../api/square';
import { QK } from '../query/queryKeys';
import { getUploadUrl } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

export default function SquareTrendingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const topicId = parseInt(id, 10);

  const { data: topicData, isLoading: topicLoading } = useQuery({
    queryKey: QK.trendingTopicDetail(topicId),
    queryFn: () => getTrendingTopicDetail(topicId),
    staleTime: 30 * 1000,
  });
  const topic = topicData?.data || topicData || {};

  const {
    data: postsData,
    isLoading: postsLoading,
    isError: postsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QK.trendingPosts(topicId, 1),
    queryFn: ({ pageParam = 1 }) => getTrendingPosts(topicId, { page: pageParam, pageSize: 10 }),
    getNextPageParam: (lastPage) => {
      const d = lastPage?.data || lastPage;
      return d?.hasMore && d?.page ? d.page + 1 : undefined;
    },
    staleTime: 30 * 1000,
    initialPageParam: 1,
  });

  const pages = postsData?.pages || [];
  const posts = pages.flatMap((p) => {
    const d = p?.data || p;
    return Array.isArray(d?.list) ? d.list : [];
  });

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        {topicLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : (
          <div className="square-section">
            <div className="square-section-header square-trending-topic-header">
              <div className="square-trending-topic-header-main">
                <h3 className="square-section-title" style={{ marginBottom: topic.description ? 6 : 4 }}>
                  {topic.title || '热搜详情'}
                </h3>
                {topic.description && (
                  <p className="square-trending-topic-desc">{topic.description}</p>
                )}
                <span className="square-trending-topic-meta">
                  {topic.post_count || 0} 条讨论
                </span>
              </div>
              <button
                type="button"
                className="square-trending-join-btn pressable"
                onClick={() => navigate(`/about/trending/${topicId}/new`)}
              >
                参与讨论
              </button>
            </div>
          </div>
        )}

        <div className="square-section">
          <h3 className="square-section-title">讨论区</h3>
          {postsLoading ? (
            <div className="state-loading" style={{ paddingTop: 60 }} />
          ) : postsError ? (
            <div className="state-error">加载失败</div>
          ) : posts.length === 0 ? (
            <div className="state-empty">暂无讨论，来做第一个发言的人吧</div>
          ) : (
            <div className="square-campus-list">
              {posts.map((p) => {
                const firstImage = p.images && p.images.length > 0 ? p.images[0] : null;
                return (
                  <div
                    key={p.id}
                    className="square-campus-item pressable"
                    onClick={() => navigate(`/about/trending/post/${p.id}`)}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {firstImage && (
                        <img
                          src={getUploadUrl(firstImage.url)}
                          alt=""
                          style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                          loading="lazy"
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="square-campus-org">
                          {p.author?.name || '匿名'}
                        </span>
                        <p style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.5, color: 'var(--post-ios-label)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {p.content}
                        </p>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--post-ios-tertiary-label)' }}>
                          <span>{formatPostTime(p.created_at)}</span>
                          <span>👍 {p.like_count || 0}</span>
                          <span>💬 {p.comment_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasNextPage && (
                <button
                  type="button"
                  className="canteen-food-more pressable"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  style={{ border: 'none', borderTop: '1px solid var(--post-ios-separator)' }}
                >
                  {isFetchingNextPage ? '加载中...' : '加载更多'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
