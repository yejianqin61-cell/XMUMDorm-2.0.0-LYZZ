import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Eye, Heart, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getHandbookTabs, listHandbookArticles } from '../../api/handbook';
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

function HandbookHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const qs = useQueryString();

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

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => {
      searchInputRef.current?.focus?.();
    }, 60);
    return () => clearTimeout(t);
  }, [searchOpen]);

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

  return (
    <div className="handbook-page">
      <div className="handbook-hero">
        <div className="handbook-hero-top">
          <div className="handbook-hero-title-wrap">
            <Link to="/about/freshman-guide/me" className="handbook-hero-me" aria-label={isZh ? '我的收藏' : 'My'}>
              <Bookmark size={18} aria-hidden />
            </Link>
            <div className="handbook-hero-title">{isZh ? '新生手册' : 'Handbook'}</div>
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
          {isZh ? '指南 · 课程测评 · 生活技巧 · 避坑 · FAQ' : 'Guide · Reviews · Tips · FAQ'}
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
            to={`/about/freshman-guide?tab=${encodeURIComponent(t.slug)}&q=${encodeURIComponent(keyword || '')}`}
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

