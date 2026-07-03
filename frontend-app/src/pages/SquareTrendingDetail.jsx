import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { getTrendingTopicDetail, getTrendingPosts } from '@shared/api/square';
import { QK } from '../query/queryKeys';
import { getUploadUrl } from '@shared/api/config';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

function getHeatTone(postCount, isEn) {
  if (postCount >= 20) {
    return {
      badge: isEn ? 'High heat' : '高热讨论',
      icon: '🔥',
      summary: isEn ? 'The topic is still accelerating' : '热度还在继续上升',
    };
  }

  if (postCount >= 8) {
    return {
      badge: isEn ? 'Rising fast' : '快速升温',
      icon: '🚀',
      summary: isEn ? 'Discussion is pulling more people in' : '讨论正在持续聚集',
    };
  }

  return {
    badge: isEn ? 'Still brewing' : '持续发酵',
    icon: '✨',
    summary: isEn ? 'More attention is starting to gather' : '已经开始吸引更多关注',
  };
}

export default function SquareTrendingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const topicId = parseInt(id, 10);

  const { data: topicData, isLoading: topicLoading } = useQuery({
    queryKey: QK.trendingTopicDetail(topicId),
    queryFn: () => getTrendingTopicDetail(topicId),
    staleTime: 30 * 1000,
  });
  const topic = topicData?.data || topicData || {};
  const heatTone = getHeatTone(topic.post_count || 0, isEn);

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
      const data = lastPage?.data || lastPage;
      return data?.hasMore && data?.page ? data.page + 1 : undefined;
    },
    staleTime: 30 * 1000,
    initialPageParam: 1,
  });

  const pages = postsData?.pages || [];
  const posts = pages.flatMap((page) => {
    const data = page?.data || page;
    return Array.isArray(data?.list) ? data.list : [];
  });

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        {topicLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : (
          <div className="square-section square-home-block square-trending-detail-hero">
            <div className="square-section-header square-trending-topic-header">
              <div className="square-trending-topic-header-main">
                <div className="square-trending-topic-hero-topline">
                  <span className="square-trending-topic-eyebrow">{isEn ? 'Trending Now' : '正在热议'}</span>
                  <span className="square-trending-topic-badge">
                    <span aria-hidden="true">{heatTone.icon}</span>
                    <span>{heatTone.badge}</span>
                  </span>
                </div>

                <h3 className="square-section-title square-trending-topic-title">
                  {topic.title || (isEn ? 'Trending topic' : '热搜详情')}
                </h3>

                {topic.description && (
                  <p className="square-trending-topic-desc">{topic.description}</p>
                )}

                <div className="square-trending-topic-stats">
                  <span className="square-trending-topic-meta">
                    <span aria-hidden="true">💬</span>
                    <span>{topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}</span>
                  </span>
                  <span className="square-trending-topic-meta square-trending-topic-meta--soft">
                    <span aria-hidden="true">{heatTone.icon}</span>
                    <span>{heatTone.summary}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="square-trending-join-btn pressable"
                onClick={() => navigate(`/about/trending/${topicId}/new`)}
              >
                {isEn ? 'Join discussion' : '参与讨论'}
              </button>
            </div>
          </div>
        )}

        <div className="square-section square-home-block square-trending-discussion">
          <div className="square-section-header square-section-header--stack">
            <div>
              <h3 className="square-section-title">{isEn ? 'Discussion' : '讨论区'}</h3>
              <p className="square-trending-discussion__meta">
                {isEn ? 'Latest replies first, ordered by time' : '按时间倒序展示，先看最新发言'}
              </p>
            </div>
          </div>

          {postsLoading ? (
            <div className="state-loading" style={{ paddingTop: 60 }} />
          ) : postsError ? (
            <div className="state-error">{isEn ? 'Load failed' : '加载失败'}</div>
          ) : posts.length === 0 ? (
            <div className="state-empty">{isEn ? 'No discussion yet. Be the first to speak.' : '暂无讨论，来做第一个发言的人吧'}</div>
          ) : (
            <div className="square-trending-discussion-list">
              {posts.map((post, index) => {
                const firstImage = post.images && post.images.length > 0 ? post.images[0] : null;

                return (
                  <div
                    key={post.id}
                    className="square-trending-post-card pressable"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/about/trending/post/${post.id}`)}
                  >
                    <div className="square-trending-post-card__inner">
                      {firstImage && (
                        <img
                          src={getUploadUrl(firstImage.url)}
                          alt=""
                          className="square-trending-post-card__image"
                          loading="lazy"
                        />
                      )}

                      <div className="square-trending-post-card__content">
                        <div className="square-trending-post-card__header">
                          <span className="square-trending-post-card__author">
                            {post.author?.name || (isEn ? 'Anonymous' : '匿名')}
                          </span>
                          <span className="square-trending-post-card__time">
                            {formatPostTime(post.created_at)}
                          </span>
                        </div>

                        <p className="square-trending-post-card__text">
                          {post.content}
                        </p>

                        <div className="square-trending-post-card__meta">
                          <span>👍 {post.like_count || 0}</span>
                          <span>💬 {post.comment_count || 0}</span>
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
                  {isFetchingNextPage ? (isEn ? 'Loading...' : '加载中...') : (isEn ? 'Load more' : '加载更多')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
