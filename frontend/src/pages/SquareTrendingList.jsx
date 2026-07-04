import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import FilterBar from '../components/templates/FilterBar';
import ListPageLayout from '../components/templates/ListPageLayout';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTrendingTopics, deleteTrendingTopic } from '@shared/api/square';
import { QK } from '@shared/query/queryKeys';
import './SquareTrendingList.css';

const rankDecor = {
  zh: [
    { icon: '🔥', label: '爆热', kicker: '现在最热', signal: '讨论密度最高' },
    { icon: '🚀', label: '上升', kicker: '快速升温', signal: '热度还在继续攀升' },
    { icon: '✨', label: '关注', kicker: '值得关注', signal: '正在扩散到更多讨论里' },
  ],
  en: [
    { icon: '🔥', label: 'Hot', kicker: 'Trending now', signal: 'Highest discussion density' },
    { icon: '🚀', label: 'Rising', kicker: 'Heating up fast', signal: 'Momentum is still climbing' },
    { icon: '✨', label: 'Watch', kicker: 'Worth watching', signal: 'Spreading across campus' },
  ],
};

function TopicMetaPill({ children, tone = 'neutral' }) {
  return <span className={`square-trending-list-page__meta-pill square-trending-list-page__meta-pill--${tone}`}>{children}</span>;
}

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
  const topTopic = topics[0] || null;
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

  const pageMeta = [
    { key: 'topics', label: isEn ? `${topics.length} live topics` : `${topics.length} 个实时话题` },
    { key: 'mode', label: isEn ? 'Desktop list validation' : '桌面列表模板验证' },
    { key: 'audience', label: isEn ? 'Campus-wide discussion pulse' : '校园级讨论热度脉冲' },
  ];

  return (
    <div className="square-trending-list-page">
      <ListPageLayout
        className="square-trending-list-page__layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isEn ? 'Campus Pulse' : '校园热度脉冲'}
            title={isEn ? 'Trending Board' : '热搜榜'}
            description={
              isEn
                ? 'A desktop-ready ranking page for the topics that are currently pulling the most discussion across campus.'
                : '把当前全校讨论最密集的话题收进一张更像网页的榜单页里，方便快速浏览、判断热度和继续进入详情。'
            }
            backTo="/"
            backLabel={isEn ? 'Back to home' : '返回首页'}
            meta={pageMeta}
            actions={(
              <div className="square-trending-list-page__header-actions">
                {topTopic ? (
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/about/trending/${topTopic.id}`)}>
                    {isEn ? 'Open top topic' : '查看榜首话题'}
                  </Button>
                ) : null}
                {isAdmin ? (
                  <Button variant="primary" size="sm" onClick={() => navigate('/about/admin/orgs?tab=trending')}>
                    {isEn ? 'Manage trending' : '管理热搜'}
                  </Button>
                ) : null}
              </div>
            )}
          />
        )}
        filterBar={(
          <FilterBar
            filters={(
              <>
                <Tag tone="info" variant="soft">{isEn ? 'Live ranking' : '实时榜单'}</Tag>
                <Tag tone="neutral" variant="outline">
                  {isEn ? `${topics.length} active topics` : `${topics.length} 个活跃话题`}
                </Tag>
                <Tag tone="neutral" variant="outline">
                  {isEn ? 'Updated by discussion heat' : '按讨论热度排序'}
                </Tag>
              </>
            )}
            actions={(
              <>
                {topTopic ? (
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/about/trending/${topTopic.id}`)}>
                    {isEn ? 'Jump to #1' : '跳到榜首'}
                  </Button>
                ) : null}
                <Button variant="tertiary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: QK.trendingTopics() })}>
                  {isEn ? 'Refresh list' : '刷新榜单'}
                </Button>
              </>
            )}
          />
        )}
        list={(
          <section className="square-trending-list-page__main">
            <SectionHeader
              title={isEn ? 'Live topic ranking' : '实时话题排行'}
              description={
                isEn
                  ? 'This page now validates the shared list template on a second list-style scenario instead of leaning on the square home shell.'
                  : '这里不是首页模块放大版，而是独立用共享列表页模板承载的第二个列表型场景，用来验证模板能稳定覆盖不同业务列表。'
              }
            />

            {isLoading ? (
              <div className="square-trending-list-page__state state-loading" style={{ paddingTop: 72 }} />
            ) : isError ? (
              <div className="square-trending-list-page__state state-error">{isEn ? 'Load failed' : '加载失败'}</div>
            ) : topics.length === 0 ? (
              <div className="square-trending-list-page__empty">
                <EmptyState
                  title={isEn ? 'No trending topics yet' : '暂无热搜话题'}
                  description={
                    isEn
                      ? 'Once discussion starts to gather, the live ranking will appear here.'
                      : '等校园里的讨论开始聚集之后，这里会显示实时热搜榜。'
                  }
                />
              </div>
            ) : (
              <div className="square-trending-topic-list">
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
                        <span className="square-trending-rank">#{index + 1}</span>
                      </div>

                      <div className="square-trending-topic-card__content">
                        <div className="square-trending-topic-card__headline">
                          <span className="square-trending-topic-card__spark" aria-hidden="true">
                            {decor.icon}
                          </span>
                          <span className="square-trending-topic-card__kicker">{decor.kicker}</span>
                        </div>

                        <span className="square-trending-topic-card__title">{topic.title}</span>

                        {topic.description ? (
                          <span className="square-trending-topic-card__description">{topic.description}</span>
                        ) : null}

                        <div className="square-trending-topic-card__info-strip">
                          <span className="square-trending-count">
                            {topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}
                          </span>
                          <span className="square-trending-topic-card__divider" aria-hidden="true" />
                          <span className="square-trending-topic-card__signal">{decor.signal}</span>
                        </div>
                      </div>

                      <div className="square-trending-topic-card__side">
                        <Button variant="secondary" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/about/trending/${topic.id}`);
                        }}>
                          {isEn ? 'Open' : '查看'}
                        </Button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="square-trending-topic-card__danger"
                            onClick={(e) => handleDelete(e, topic.id)}
                          >
                            {isEn ? 'Delete' : '删除'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
        aside={(
          <div className="square-trending-list-page__aside">
            <section className="square-trending-list-page__aside-card">
              <SectionHeader
                title={isEn ? 'How to read this board' : '怎么看这张榜'}
                description={
                  isEn
                    ? 'Use the main list for comparison and keep the right rail for orientation, rules, and quick jumps.'
                    : '主列负责横向比较话题，右侧辅助栏负责解释规则、快速定位和保持上下文，不再把所有说明都塞回列表主体里。'
                }
                compact
              />
              <div className="square-trending-list-page__aside-stack">
                <TopicMetaPill tone="hot">{isEn ? 'Heat comes from live discussion density' : '热度来自实时讨论密度'}</TopicMetaPill>
                <TopicMetaPill>{isEn ? 'Top 3 signals are highlighted first' : '榜单前 3 会优先高亮信号'}</TopicMetaPill>
                <TopicMetaPill>{isEn ? 'This page validates the shared list layout' : '这个页面正在验证共享列表模板'}</TopicMetaPill>
              </div>
            </section>

            <section className="square-trending-list-page__aside-card square-trending-list-page__aside-card--focus">
              <SectionHeader
                title={isEn ? 'Top topic snapshot' : '榜首快照'}
                description={
                  topTopic
                    ? isEn
                      ? 'Keep the hottest topic visible while browsing the rest of the list.'
                      : '在浏览整张榜时，把最热的话题固定保留在侧栏里。'
                    : isEn
                      ? 'The board will surface its leading topic here once data arrives.'
                      : '等榜单有数据后，榜首话题会固定显示在这里。'
                }
                compact
              />
              {topTopic ? (
                <button
                  type="button"
                  className="square-trending-list-page__focus-topic pressable"
                  onClick={() => navigate(`/about/trending/${topTopic.id}`)}
                >
                  <span className="square-trending-list-page__focus-kicker">{isEn ? 'Now #1' : '当前榜首'}</span>
                  <span className="square-trending-list-page__focus-title">{topTopic.title}</span>
                  {topTopic.description ? (
                    <span className="square-trending-list-page__focus-description">{topTopic.description}</span>
                  ) : null}
                  <span className="square-trending-list-page__focus-meta">
                    {topTopic.post_count || 0} {isEn ? 'discussions are active now' : '条讨论正在活跃中'}
                  </span>
                </button>
              ) : (
                <div className="square-trending-list-page__focus-empty">
                  {isEn ? 'Waiting for the board to warm up.' : '等待榜单开始升温。'}
                </div>
              )}
            </section>
          </div>
        )}
      />
    </div>
  );
}
