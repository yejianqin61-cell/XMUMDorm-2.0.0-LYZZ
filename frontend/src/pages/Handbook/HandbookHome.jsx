import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, CalendarDays, Compass, Eye, Heart, MapPinned, Search, Soup, Ticket, BookOpenText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getHandbookTabs, listCourseReviews, listHandbookArticles } from '../../api/handbook';
import { listClubActivities } from '../../api/clubs';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function useQueryString() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

function tabLabel(t, isZh) {
  if (!t) return '';
  return isZh ? (t.name_zh || t.name_en || t.slug) : (t.name_en || t.name_zh || t.slug);
}

function formatActivityTime(value, isZh) {
  if (!value) return isZh ? '时间待定' : 'Time TBD';
  const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(isZh ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HandbookHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const qs = useQueryString();
  const navigate = useNavigate();

  const tab = (qs.get('tab') || 'all').trim();

  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState(() => (qs.get('q') || '').trim());
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  const tabsQuery = useQuery({
    queryKey: QK.handbookTabs(),
    queryFn: getHandbookTabs,
    staleTime: 60 * 60 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const reviewsQuery = useQuery({
    queryKey: QK.courseReviews({ hub: true }),
    queryFn: () => listCourseReviews({ page: 1, pageSize: 3 }),
    staleTime: 60 * 1000,
    select: (d) => (Array.isArray(d?.list) ? d.list : []),
  });

  const activitiesQuery = useQuery({
    queryKey: QK.clubActivities({ hub: true, pageSize: 3 }),
    queryFn: () => listClubActivities({ page: 1, pageSize: 3 }),
    staleTime: 60 * 1000,
    select: (d) => (Array.isArray(d?.list) ? d.list : []),
  });

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => {
      searchInputRef.current?.focus?.();
    }, 60);
    return () => clearTimeout(t);
  }, [searchOpen]);

  // course-review 是独立实体（course_reviews），不走文章列表
  useEffect(() => {
    if (tab !== 'course-review') return;
    navigate('/about/freshman-guide/course-review', { replace: true });
  }, [navigate, tab]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [searchOpen]);

  const infinite = useInfiniteQuery({
    queryKey: QK.handbookArticles({ tab, q: keyword }),
    queryFn: async ({ pageParam }) => {
      const data = await listHandbookArticles({
        tab,
        q: keyword,
        page: pageParam,
        pageSize: 10,
      });
      return { list: data?.list || [], hasMore: !!data?.hasMore, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? (Number(lastPage.page || 1) + 1) : undefined),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const list = useMemo(() => infinite.data?.pages?.flatMap((p) => p.list) ?? [], [infinite.data]);
  const quickLinks = [
    {
      key: 'map',
      to: '/about/map',
      icon: MapPinned,
      title: isZh ? '先看校园地图' : 'Campus map',
      description: isZh ? '快速熟悉教学楼、宿舍与常用地点。' : 'Find classrooms, dorms, and key campus spots fast.',
    },
    {
      key: 'canteen',
      to: '/eat',
      icon: Soup,
      title: isZh ? '食堂与踩点' : 'Canteen picks',
      description: isZh ? '从热门档口、榜单到真实点评一次看完。' : 'Browse stalls, rankings, and real food reviews.',
    },
    {
      key: 'clubs',
      to: '/about/club',
      icon: Ticket,
      title: isZh ? '社团与活动' : 'Clubs and events',
      description: isZh ? '找组织、看活动、认识同届同好。' : 'Join clubs, discover events, and meet your people.',
    },
    {
      key: 'reviews',
      to: '/about/freshman-guide/course-review',
      icon: BookOpenText,
      title: isZh ? '课程评价' : 'Course reviews',
      description: isZh ? '选课前先看老师、难度与学长学姐建议。' : 'Check teaching style, workload, and student feedback first.',
    },
    {
      key: 'schedule',
      to: '/myzone/schedule',
      icon: CalendarDays,
      title: isZh ? '课表与节奏' : 'Schedule setup',
      description: isZh ? '导入课表，把校园生活放进自己的节奏里。' : 'Import your timetable and settle into campus life.',
    },
    {
      key: 'articles',
      to: '/about/freshman-guide?tab=all',
      icon: Compass,
      title: isZh ? '攻略与经验' : 'Guides and tips',
      description: isZh ? '从报到到生活攻略，按主题继续深挖。' : 'Keep exploring articles for check-in, study, and daily life.',
    },
  ];

  return (
    <div className="handbook-page">
      <section className="handbook-hub">
        <div className="handbook-hub-banner">
          <div>
            <div className="handbook-hub-eyebrow">Freshman Hub</div>
            <h1 className="handbook-hub-title">{isZh ? '新生一页通关校园生活' : 'One page to start campus life'}</h1>
            <p className="handbook-hub-copy">
              {isZh
                ? '把地图、食堂、社团、课程评价和攻略放在一个入口里，新生可以先快速建立方向，再深入阅读具体内容。'
                : 'Map, canteen, clubs, course reviews, and guides live in one place so new students can orient fast and then dive deeper.'}
            </p>
          </div>
          <div className="handbook-hub-pills" aria-label={isZh ? '新生高频任务' : 'High-frequency freshman tasks'}>
            <span>{isZh ? '找教学楼' : 'Find buildings'}</span>
            <span>{isZh ? '选课避坑' : 'Pick courses'}</span>
            <span>{isZh ? '看活动' : 'Browse events'}</span>
          </div>
        </div>

        <div className="handbook-hub-grid">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} to={item.to} className="handbook-hub-card">
                <span className="handbook-hub-card-icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <div className="handbook-hub-card-title">{item.title}</div>
                <div className="handbook-hub-card-desc">{item.description}</div>
              </Link>
            );
          })}
        </div>

        <div className="handbook-hub-rails">
          <section className="handbook-hub-rail">
            <div className="handbook-hub-rail-head">
              <div>
                <div className="handbook-hub-rail-title">{isZh ? '近期热门活动' : 'Upcoming campus activities'}</div>
                <div className="handbook-hub-rail-sub">{isZh ? '方便新生从兴趣切入校园社交。' : 'A quick way for freshmen to enter campus communities.'}</div>
              </div>
              <Link to="/about/club" className="handbook-hub-rail-link">{isZh ? '看更多' : 'More'}</Link>
            </div>
            <div className="handbook-hub-mini-list">
              {activitiesQuery.data?.length ? activitiesQuery.data.map((item) => (
                <Link key={item.id} to={`/about/club/activity/${item.id}`} className="handbook-hub-mini-card">
                  <div className="handbook-hub-mini-kicker">{item.clubName || item.club_name || (isZh ? '社团活动' : 'Club activity')}</div>
                  <div className="handbook-hub-mini-title">{item.title}</div>
                  <div className="handbook-hub-mini-meta">{formatActivityTime(item.time || item.start_time, isZh)}</div>
                </Link>
              )) : (
                <div className="handbook-hub-mini-empty">{activitiesQuery.isLoading ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '暂时还没有活动推荐' : 'No activities yet')}</div>
              )}
            </div>
          </section>

          <section className="handbook-hub-rail">
            <div className="handbook-hub-rail-head">
              <div>
                <div className="handbook-hub-rail-title">{isZh ? '先看课程评价' : 'Course reviews first'}</div>
                <div className="handbook-hub-rail-sub">{isZh ? '帮助新生更快建立选课直觉。' : 'Build course intuition before enrollment starts.'}</div>
              </div>
              <Link to="/about/freshman-guide/course-review" className="handbook-hub-rail-link">{isZh ? '进入课程评价' : 'Open reviews'}</Link>
            </div>
            <div className="handbook-hub-mini-list">
              {reviewsQuery.data?.length ? reviewsQuery.data.map((item) => (
                <Link key={item.id} to={`/about/freshman-guide/course-review/${item.id}`} className="handbook-hub-mini-card">
                  <div className="handbook-hub-mini-kicker">{item.teacher || (isZh ? '课程评价' : 'Course review')}</div>
                  <div className="handbook-hub-mini-title">{item.courseName}</div>
                  <div className="handbook-hub-mini-meta">
                    {item?.stats?.avgRating == null ? (isZh ? '暂无均分' : 'No average yet') : `${Number(item.stats.avgRating).toFixed(1)} / 5.0`}
                  </div>
                </Link>
              )) : (
                <div className="handbook-hub-mini-empty">{reviewsQuery.isLoading ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '暂时还没有课程评价' : 'No course reviews yet')}</div>
              )}
            </div>
          </section>
        </div>
      </section>

      <div className="handbook-hero">
        <div className="handbook-hero-top">
          <div className="handbook-hero-title-wrap">
            <Link to="/about/freshman-guide/me" className="handbook-hero-me" aria-label={isZh ? '我的收藏' : 'My'}>
              <Bookmark size={18} aria-hidden />
            </Link>
            <div className="handbook-hero-title">{isZh ? '马校一站通' : 'Campus Handbook'}</div>
          </div>
          <div className="handbook-orbs handbook-orbs--top">
            <div className="handbook-orb-wrap" ref={searchWrapRef}>
              <AnimatePresence initial={false} mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="hb-search-open"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = keyword.trim();
                      setSearchOpen(false);
                      window.location.assign(
                        `/about/freshman-guide?tab=${encodeURIComponent(tab)}${q ? `&q=${encodeURIComponent(q)}` : ''}`
                      );
                    }}
                    initial={{ width: 44, opacity: 0.98 }}
                    animate={{ width: 176, opacity: 1 }}
                    exit={{ width: 44, opacity: 0.98 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    style={{ maxWidth: 'min(190px, 58vw)' }}
                    className="handbook-orb-form"
                  >
                    <div className="handbook-orb-form-inner">
                      <Search size={18} className="handbook-orb-icon" aria-hidden />
                      <input
                        ref={searchInputRef}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setSearchOpen(false);
                        }}
                        placeholder={isZh ? '搜索…' : 'Search…'}
                        className="handbook-orb-input"
                        type="search"
                      />
                    </div>
                  </motion.form>
                ) : (
                  <motion.button
                    key="hb-search-closed"
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    whileTap={{ scale: 0.98 }}
                    className="handbook-orb-btn"
                    aria-label={isZh ? '搜索' : 'Search'}
                  >
                    <Search size={18} aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="handbook-hero-sub">
          {isZh ? '美食 · 游玩 · 榴莲 · 校内周边咨询 · 学法分享 · 课程测评' : 'Food · Explore · Durian · Campus Guide · Study Tips · Reviews'}
        </div>
        <div className="handbook-hero-actions">
          <Link to="/about/freshman-guide/new" className="handbook-btn handbook-btn--primary">
            {isZh ? '投稿/发布' : 'Write'}
          </Link>
          <Link to="/about/freshman-guide/course-review/new" className="handbook-btn handbook-btn--ghost">
            {isZh ? '新建课程评价' : 'New course review'}
          </Link>
        </div>
      </div>

      <div className="handbook-tabs">
        {(tabsQuery.data || []).map((t) => (
          <Link
            key={t.slug}
            to={
              t.slug === 'course-review'
                ? '/about/freshman-guide/course-review'
                : `/about/freshman-guide?tab=${encodeURIComponent(t.slug)}&q=${encodeURIComponent(keyword || '')}`
            }
            className={`handbook-tab ${t.slug === tab ? 'is-active' : ''}`}
          >
            {tabLabel(t, isZh)}
          </Link>
        ))}
      </div>

      <div className="handbook-list">
        {list.map((a) => (
          <Link key={a.id} to={`/about/freshman-guide/a/${a.id}`} className="handbook-card">
            <div className="handbook-card-main">
              <div className="handbook-card-title">{a.title}</div>
              {a.summary ? <div className="handbook-card-summary">{a.summary}</div> : null}
              <div className="handbook-card-meta">
                {a.author ? (
                  <span className="handbook-card-author" title={a.author.nickname || a.author.username || ''}>
                    {a.author.avatar ? <img src={a.author.avatar} alt="" className="handbook-card-author-avatar" loading="lazy" decoding="async" /> : null}
                    <span className="handbook-card-author-name">
                      {a.author.nickname || a.author.username || (isZh ? '作者' : 'Author')}
                    </span>
                  </span>
                ) : null}
                <span className="handbook-meta-chip">{a.tab || 'all'}</span>
                <span className="handbook-meta-num" aria-label={isZh ? '浏览量' : 'Views'}>
                  <Eye size={16} aria-hidden />
                  {a?.stats?.views ?? 0}
                </span>
                <span className="handbook-meta-num" aria-label={isZh ? '点赞' : 'Likes'}>
                  <Heart size={16} aria-hidden />
                  {a?.stats?.likes ?? 0}
                </span>
                <span className="handbook-meta-num" aria-label={isZh ? '收藏' : 'Saves'}>
                  <Bookmark size={16} aria-hidden />
                  {a?.stats?.saves ?? 0}
                </span>
              </div>
            </div>
            {a.cover ? (
              <div className="handbook-card-cover">
                <img src={a.cover} alt="" loading="lazy" decoding="async" />
              </div>
            ) : null}
          </Link>
        ))}

        {infinite.hasNextPage && (
          <button
            type="button"
            className="handbook-loadmore"
            onClick={() => infinite.fetchNextPage()}
            disabled={infinite.isFetchingNextPage}
          >
            {infinite.isFetchingNextPage ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
          </button>
        )}

        {!infinite.isFetching && list.length === 0 ? (
          <div className="handbook-empty">
            <div className="handbook-empty-title">{isZh ? '暂无内容' : 'No articles yet'}</div>
            <div className="handbook-empty-sub">{isZh ? '试试切换标签或搜索关键词。' : 'Try switching tabs or searching.'}</div>
            <div className="handbook-empty-illu" aria-hidden>
              <img src="/gif/迪莫走猫步_爱给网_aigei_com.gif" alt="" />
            </div>
          </div>
        ) : null}
      </div>

      {/* 预留：后续可加“置顶/精选”等 */}
    </div>
  );
}

export default HandbookHome;

