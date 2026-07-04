import { useQuery } from '@tanstack/react-query';
import { BookOpenText, HandHelping, PenSquare, Shapes, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSquareBanners, getSquareHomeSummary } from '@shared/api/square';
import { useLanguage } from '../context/LanguageContext';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusPreviewRail from '../components/square/TodayCampusPreviewRail';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import MyCampusRecommendations from '../components/square/MyCampusRecommendations';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '@shared/query/queryKeys';
import './SquareHome.css';

const PRIMARY_ACTIONS = [
  {
    label: '社团广场',
    labelEn: 'Club Plaza',
    to: '/about/club',
    icon: <Shapes size={18} strokeWidth={2} />,
    hint: '看社团、找活动、认识同好',
    hintEn: 'Discover clubs, activities, and like-minded people',
    tone: 'club',
  },
  {
    label: '马校一站通',
    labelEn: 'XMUM Guide',
    to: '/about/freshman-guide',
    icon: <BookOpenText size={18} strokeWidth={2} />,
    hint: '攻略、课程与新生信息',
    hintEn: 'Guides, courses, and freshman essentials',
    tone: 'guide',
  },
  {
    label: '帮帮我',
    labelEn: 'Help Me',
    to: '/about/errands',
    icon: <HandHelping size={18} strokeWidth={2} />,
    hint: '跑腿求助，解决生活小事',
    hintEn: 'Get quick help with daily errands',
    tone: 'help',
  },
  {
    label: '出物',
    labelEn: 'Marketplace',
    to: '/about/second-hand',
    icon: <Store size={18} strokeWidth={2} />,
    hint: '校园二手流通更快一点',
    hintEn: 'Move second-hand items faster on campus',
    tone: 'market',
  },
];

function formatMeta(item, fallback) {
  const meta = [];
  if (item.organization_name) meta.push(item.organization_name);
  if (item.club_name) meta.push(item.club_name);
  if (item.location) meta.push(item.location);
  if (item.status_label) meta.push(item.status_label);
  return meta.filter(Boolean).join(' · ') || fallback;
}

function buildRecommendationSummary(summary, isEn) {
  const cards = [];

  (summary.campus_highlights || []).slice(0, 1).forEach((item) => {
    cards.push({
      id: `campus-${item.id}`,
      badge: isEn ? 'Campus' : '校园',
      reason: isEn ? 'Latest official update' : '最新官方动态',
      title: item.title,
      subtitle: isEn ? 'Follow the latest school updates first.' : '先看学校里的重点更新。',
      meta: formatMeta(item, isEn ? 'Campus bulletin' : '校园公告'),
      href: `/about/campus/posts/${item.id}`,
    });
  });

  (summary.hot_activities || []).slice(0, 1).forEach((item) => {
    cards.push({
      id: `activity-${item.id}`,
      badge: isEn ? 'Event' : '活动',
      reason: isEn ? 'Worth checking today' : '今天值得去看看',
      title: item.title,
      subtitle: item.summary || (isEn ? 'A campus event close to happening.' : '一条离你很近的校园活动线索。'),
      meta: formatMeta(item, isEn ? 'Club activity' : '社团活动'),
      href: '/about/club',
    });
  });

  (summary.hot_treeholes || []).slice(0, Math.max(0, 2 - cards.length)).forEach((item) => {
    cards.push({
      id: `treehole-${item.id}`,
      badge: isEn ? 'Discussion' : '讨论',
      reason: isEn ? 'People are talking about it' : '现在很多人都在聊',
      title: item.excerpt || (isEn ? 'Open the discussion' : '打开这条讨论'),
      subtitle: isEn ? 'Catch the recent campus mood in one tap.' : '一键补上最近校园里的情绪与话题。',
      meta: `${item.like_count || 0}${isEn ? ' likes' : ' 赞'} · ${item.comment_count || 0}${isEn ? ' comments' : ' 评论'}`,
      href: `/posts/${item.id}`,
    });
  });

  return {
    is_personalized: false,
    profile: {},
    cards: cards.slice(0, 2),
  };
}

function buildPreviewRailItems(summary, isEn) {
  const items = [];

  (summary.hot_activities || []).slice(0, 1).forEach((item) => {
    items.push({
      id: item.id,
      kind: 'activity',
      badge: isEn ? 'Event' : '活动',
      title: item.title,
      meta: formatMeta(item, isEn ? 'Club activity' : '社团活动'),
      to: `/about/club/activity/${item.id}`,
    });
  });

  (summary.hot_treeholes || []).slice(0, 2).forEach((item) => {
    items.push({
      id: item.id,
      kind: 'discussion',
      badge: isEn ? 'Discussion' : '热议',
      title: item.excerpt || (isEn ? 'Open the discussion' : '打开这条讨论'),
      meta: `${item.like_count || 0}${isEn ? ' likes' : ' 赞'} · ${item.comment_count || 0}${isEn ? ' comments' : ' 评论'}`,
      to: `/posts/${item.id}`,
    });
  });

  return items.slice(0, 3);
}

export default function SquareHome() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const summaryQuery = useQuery({
    queryKey: QK.squareHomeSummary(),
    queryFn: getSquareHomeSummary,
    staleTime: 30 * 1000,
  });

  const summary = summaryQuery.data || {
    hot_topics: [],
    hot_activities: [],
    hot_treeholes: [],
    campus_highlights: [],
    quick_stats: {},
  };
  const recommendationSummary = buildRecommendationSummary(summary, isEn);
  const previewRailItems = buildPreviewRailItems(summary, isEn);
  const exploreTopics = (summary.hot_topics || []).slice(0, 6);

  return (
    <RouteTransition className="square-home-page">
      <div className="square-home-inner">
        <FadeInSection className="square-home-slot square-home-slot--banner" delay={0}>
          <CanteenBannerCarousel
            fetchFn={getSquareBanners}
            queryKey={QK.squareBanners()}
            adminTo="/about/admin/orgs?tab=banners"
          />
        </FadeInSection>

        {summaryQuery.isLoading ? (
          <PageSkeleton variant="dashboard" hero metrics={3} items={2} className="square-home-skeleton" />
        ) : summaryQuery.isError ? (
          <ErrorState
            className="square-home-state square-home-slot square-home-slot--state"
            title={isEn ? 'Failed to load square summary' : '首页摘要加载失败'}
            description={isEn ? 'Pull down and try again.' : '请下拉刷新后重试。'}
            onActionClick={() => summaryQuery.refetch()}
          />
        ) : (
          <>
            <FadeInSection className="square-home-slot square-home-slot--actions" delay={0.03}>
              <TodayCampusQuickActions actions={PRIMARY_ACTIONS} />
            </FadeInSection>

            <FadeInSection className="square-home-slot square-home-slot--hero" delay={0.06}>
              <TodayCampusHero quickStats={summary.quick_stats} />
            </FadeInSection>

            <FadeInSection className="square-home-slot square-home-slot--recommendations" delay={0.1}>
              <MyCampusRecommendations summary={recommendationSummary} />
            </FadeInSection>

            <FadeInSection className="square-home-slot square-home-slot--trending" delay={0.14}>
              <div className="square-home-explore square-home-block">
                <div className="square-section-header square-section-header--stack">
                  <div>
                    <h2 className="square-section-title">{isEn ? 'Keep Exploring' : '继续探索'}</h2>
                    <p className="square-section-subtitle">
                      {isEn
                        ? 'Keep the homepage skimmable with horizontal tags, softer links, and compact previews.'
                        : '用横向标签、低干扰入口和缩略预览，继续把首页保持在可快速扫读的节奏里。'}
                    </p>
                  </div>
                </div>

                {exploreTopics.length ? (
                  <div className="square-home-explore__topics" aria-label={isEn ? 'Hot topics' : '热门话题'}>
                    {exploreTopics.map((topic) => (
                      <Link key={topic.id} to={`/about/trending/${topic.id}`} className="square-home-explore__topic">
                        #{topic.title}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="square-home-explore__links">
                  <Link to="/about/trending" className="square-home-explore__link">
                    <span className="square-home-explore__link-kicker">{isEn ? 'Trending' : '热搜榜'}</span>
                    <span className="square-home-explore__link-title">{isEn ? 'View all' : '查看全部'}</span>
                  </Link>
                  <Link to="/about/campus" className="square-home-explore__link">
                    <span className="square-home-explore__link-kicker">{isEn ? 'Campus feed' : '校园动态'}</span>
                    <span className="square-home-explore__link-title">{isEn ? 'View all' : '查看全部'}</span>
                  </Link>
                </div>

                <TodayCampusPreviewRail
                  items={previewRailItems}
                  title={isEn ? 'Quick Preview' : '轻浏览'}
                  description={
                    isEn
                      ? 'Keep activities and hot discussions in a compact horizontal strip instead of full-height detail cards.'
                      : '把活动和热议压成横向缩略带，不再在首页继续平铺大卡片详情。'
                  }
                  moreTo="/about/trending"
                  moreLabel={isEn ? 'View all' : '查看全部'}
                  ariaLabel={isEn ? 'Quick preview rail' : '轻浏览预览'}
                />

                <Link to="/publish" className="square-home-publish-entry">
                  <span className="square-home-publish-entry__icon" aria-hidden="true">
                    <PenSquare size={16} strokeWidth={2} />
                  </span>
                  <span className="square-home-publish-entry__body">
                    <span className="square-home-publish-entry__title">{isEn ? 'Publish from one place' : '从统一入口发布内容'}</span>
                    <span className="square-home-publish-entry__meta">
                      {isEn
                        ? 'Open the publish center without adding a floating button above the Tab bar.'
                        : '保留发布入口，但不再额外悬浮压住底部导航。'}
                    </span>
                  </span>
                  <span className="square-home-publish-entry__action">{isEn ? 'Open' : '进入'}</span>
                </Link>

              </div>
            </FadeInSection>
          </>
        )}
      </div>
    </RouteTransition>
  );
}
