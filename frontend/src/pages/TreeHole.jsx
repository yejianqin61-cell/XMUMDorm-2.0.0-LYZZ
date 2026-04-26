import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import TreeHoleToolbar from '../components/TreeHoleToolbar';
import SkeletonPost from '../components/SkeletonPost';
import { getPostList } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { API_BASE_URL } from '../api/config';
import { saveScroll, takeScroll } from '../utils/scrollCache';
import { getRegions } from '../api/canteen';
import { QK } from '../query/queryKeys';
import './TreeHole.css';

const SCROLL_CACHE_KEY = 'treehole';
// 首屏更快：先拉 10 条；首屏出来后后台再预取更多页
const PAGE_SIZE = 10;
const PREFETCH_PAGES_AFTER_FIRST = 3; // 额外预取 3 页 => 约 30 条

function getTreeHoleScrollEl() {
  // Tab 常驻模式下，滚动容器是当前激活的 tab pane；否则回退到 .app-main
  const pane = document.querySelector('.tab-stack-pane[data-active="true"]');
  if (pane) return pane;
  return document.querySelector('.app-main');
}

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function mapPostItem(p) {
  return {
    ...p,
    author: p.author ? { ...p.author, avatar: prefixAvatar(p.author.avatar) } : p.author,
  };
}

function getAuthor(post) {
  const a = post?.author;
  if (a && typeof a === 'object') {
    return {
      name: a.nickname ?? a.username ?? 'Anonymous',
      avatar: a.avatar ? prefixAvatar(a.avatar) : null,
    };
  }
  return { name: 'Anonymous', avatar: null };
}

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

const cardIn = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 520, damping: 38 } },
};

// Masonry virtual window + image cache
// NOTE: 线上体验优先：默认关闭虚拟瀑布流（避免白屏/空洞）
const USE_VIRTUAL_MASONRY = false;
const OVERSCAN_PX = 2200;
const COL_GAP_PX = 12;
const RIGHT_COL_OFFSET_PX = 32;
const IMG_CACHE = new Map(); // url -> HTMLImageElement
const IMG_LOADED = new Set(); // url -> boolean loaded (sticky)
function warmImage(url) {
  if (!url) return;
  if (IMG_CACHE.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    IMG_LOADED.add(url);
  };
  img.src = url;
  IMG_CACHE.set(url, img);
}

/** 从 sessionStorage 恢复无限查询结构（与写入格式一致：整表 list + page 页数 + hasMore） */
function readSessionInfinitePages(pageSize) {
  try {
    const raw = sessionStorage.getItem('treehole_data');
    if (!raw) return undefined;
    const d = JSON.parse(raw);
    const flat = Array.isArray(d.list) ? d.list : [];
    if (flat.length === 0) return undefined;
    const n = Math.max(1, Number(d.page) || 1);
    const hasMoreEnd = !!d.hasMore;
    const pages = [];
    const pageParams = [];
    for (let i = 0; i < n; i += 1) {
      const start = i * pageSize;
      const slice = flat.slice(start, start + pageSize);
      if (slice.length === 0) break;
      const isLast = i === n - 1;
      pages.push({
        list: slice,
        hasMore: isLast ? hasMoreEnd : true,
        page: i + 1,
      });
      pageParams.push(i + 1);
    }
    if (pages.length === 0) return undefined;
    return { pages, pageParams };
  } catch {
    return undefined;
  }
}

function TreeHole() {
  const location = useLocation();
  const debug = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }, [location.search]);

  const queryClient = useQueryClient();
  const { token, isAdmin } = useAuth();
  const tokenKey = token ?? 'guest';
  const prefetchRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const pageRef = useRef(1);
  /** 当前筛选的标签 slug，null 表示全部帖子 */
  const [selectedTagSlug, setSelectedTagSlug] = useState(null);

  const initialSessionData = useMemo(
    () => (selectedTagSlug ? undefined : readSessionInfinitePages(PAGE_SIZE)),
    [selectedTagSlug]
  );

  const infinite = useInfiniteQuery({
    queryKey: QK.postsInfinite(tokenKey, PAGE_SIZE, selectedTagSlug),
    queryFn: async ({ pageParam }) => {
      const data = await getPostList({
        page: pageParam,
        pageSize: PAGE_SIZE,
        token,
        ...(selectedTagSlug ? { tagSlug: selectedTagSlug } : {}),
      });
      return {
        list: (data?.list || []).map(mapPostItem),
        hasMore: !!data?.hasMore,
        page: pageParam,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastPageParam) => {
      if (!lastPage?.hasMore) return undefined;
      return lastPageParam + 1;
    },
    initialData: initialSessionData,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const list = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.list) ?? [],
    [infinite.data]
  );

  useEffect(() => {
    pageRef.current = infinite.data?.pages.length ?? 1;
  }, [infinite.data?.pages.length]);

  useEffect(() => {
    return () => {
      const main = getTreeHoleScrollEl();
      if (main && typeof main.scrollTop === 'number') {
        saveScroll(SCROLL_CACHE_KEY, main.scrollTop, pageRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRestoredRef.current || list.length === 0 || infinite.isFetching) return;
    if (selectedTagSlug) {
      scrollRestoredRef.current = true;
      return;
    }
    const cached = takeScroll(SCROLL_CACHE_KEY);
    if (cached?.scrollTop > 0) {
      const main = getTreeHoleScrollEl();
      if (main) {
        requestAnimationFrame(() => {
          main.scrollTop = cached.scrollTop;
        });
      }
    }
    scrollRestoredRef.current = true;
  }, [list.length, infinite.isFetching, selectedTagSlug]);

  useEffect(() => {
    if (selectedTagSlug) return;
    try {
      const last = infinite.data?.pages[infinite.data.pages.length - 1];
      const data = {
        list,
        hasMore: last?.hasMore ?? false,
        page: infinite.data?.pages.length ?? 1,
      };
      sessionStorage.setItem('treehole_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [list, infinite.data, selectedTagSlug]);

  const handleSelectTag = useCallback((slug) => {
    setSelectedTagSlug(slug);
    const main = getTreeHoleScrollEl();
    if (main) main.scrollTop = 0;
    if (slug == null) {
      scrollRestoredRef.current = true;
    } else {
      scrollRestoredRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (prefetchRef.current) return;
    prefetchRef.current = true;
    queryClient
      .prefetchQuery({
        queryKey: QK.canteenRegions(),
        queryFn: getRegions,
        staleTime: 5 * 60 * 1000,
      })
      .catch(() => {});
  }, [queryClient]);

  // 首屏出来后，后台“偷偷”多拉几页，减少继续下滑时的灰色空段与等待
  useEffect(() => {
    if (selectedTagSlug) return;
    if (!infinite.data || infinite.isFetching || infinite.isFetchingNextPage) return;
    if (!infinite.hasNextPage) return;
    if ((infinite.data?.pages?.length ?? 0) < 1) return;

    const already = infinite.data.pages.length;
    const target = 1 + PREFETCH_PAGES_AFTER_FIRST;
    if (already >= target) return;

    let cancelled = false;
    const run = async () => {
      for (let i = already; i < target; i += 1) {
        if (cancelled) return;
        // 如果中途没有更多页了就停
        if (!infinite.hasNextPage) return;
        // 这里用 await，确保顺序分页，不会并发炸后端/浪费流量
        // eslint-disable-next-line no-await-in-loop
        await infinite.fetchNextPage();
      }
    };
    run().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    selectedTagSlug,
    infinite.data,
    infinite.hasNextPage,
    infinite.isFetching,
    infinite.isFetchingNextPage,
    infinite.fetchNextPage,
  ]);

  const loadMore = () => {
    if (!infinite.isFetching && infinite.hasNextPage) {
      infinite.fetchNextPage();
    }
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);
  const showInitialSkeleton = infinite.isPending && list.length === 0;
  const errorMsg = infinite.error ? getApiErrorMessage(infinite.error) : null;

  const gridRef = useRef(null);
  const [gridW, setGridW] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [vpH, setVpH] = useState(0);
  const [gridTop, setGridTop] = useState(0); // grid offsetTop within scroll container

  // observe grid width for height estimation
  useEffect(() => {
    if (!USE_VIRTUAL_MASONRY) return undefined;
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (w) setGridW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // track scroll position of the real scroll container
  useEffect(() => {
    const sc = getTreeHoleScrollEl();
    if (!sc) return undefined;
    const onScroll = () => {
      const st = sc.scrollTop || 0;
      setScrollTop(st);
      setVpH(sc.clientHeight || window.innerHeight || 0);
      if (USE_VIRTUAL_MASONRY) {
        // robust: compute grid top relative to scroll container
        try {
          const scBox = sc.getBoundingClientRect?.();
          const g = gridRef.current;
          const gBox = g?.getBoundingClientRect?.();
          if (scBox && gBox) {
            setGridTop(Math.max(0, gBox.top - scBox.top + st));
          } else {
            setGridTop(g?.offsetTop ?? 0);
          }
        } catch {
          setGridTop(gridRef.current?.offsetTop ?? 0);
        }
      }
    };
    onScroll();
    sc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // auto load next page when near bottom (avoid white gaps)
  useEffect(() => {
    if (!infinite.hasNextPage || infinite.isFetchingNextPage) return;
    const sc = getTreeHoleScrollEl();
    if (!sc) return;
    const remain = sc.scrollHeight - (sc.scrollTop + sc.clientHeight);
    if (remain < 1400) {
      infinite.fetchNextPage().catch(() => {});
    }
  }, [scrollTop, vpH, infinite.hasNextPage, infinite.isFetchingNextPage, infinite.fetchNextPage]);

  const gridScrollTop = Math.max(0, scrollTop - (gridTop || 0));

  return (
    <div className="treehole-page treehole-page--light">
      <TreeHoleToolbar selectedSlug={selectedTagSlug} onSelectTagSlug={handleSelectTag} />
      {debug ? (
        <div className="treehole-debug" role="status" aria-live="polite">
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">posts</span>
            <span className="treehole-debug-v">{list.length}</span>
            <span className="treehole-debug-k">pages</span>
            <span className="treehole-debug-v">{infinite.data?.pages?.length ?? 0}</span>
          </div>
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">fetch</span>
            <span className="treehole-debug-v">{String(!!infinite.isFetching)}</span>
            <span className="treehole-debug-k">next</span>
            <span className="treehole-debug-v">{String(!!infinite.isFetchingNextPage)}</span>
          </div>
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">hasMore</span>
            <span className="treehole-debug-v">{String(!!infinite.hasNextPage)}</span>
            <span className="treehole-debug-k">imgLoaded</span>
            <span className="treehole-debug-v">{IMG_LOADED.size}</span>
          </div>
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">st</span>
            <span className="treehole-debug-v">{Math.round(scrollTop)}</span>
            <span className="treehole-debug-k">vh</span>
            <span className="treehole-debug-v">{Math.round(vpH)}</span>
          </div>
        </div>
      ) : null}
      {errorMsg && (
        <p className="treehole-error state-error" role="alert">
          {errorMsg}
        </p>
      )}
      {showInitialSkeleton ? (
        <div className="treehole-content">
          <div className="treehole-grid">
            <div className="treehole-column">
              {[1, 2, 3].map((i) => (
                <SkeletonPost key={i} />
              ))}
            </div>
            <div className="treehole-column treehole-column-right">
              {[1, 2, 3].map((i) => (
                <SkeletonPost key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="treehole-content">
          {USE_VIRTUAL_MASONRY ? (
            <div className="treehole-grid treehole-grid--perf" ref={gridRef}>
              <VirtualColumn
                items={leftColumn}
                columnWidth={gridW > 0 ? (gridW - COL_GAP_PX) / 2 : 0}
                scrollTop={gridScrollTop}
                viewportH={vpH}
                overscanPx={OVERSCAN_PX}
                topPad={0}
                fetchingTail={infinite.isFetchingNextPage}
              />
              <VirtualColumn
                items={rightColumn}
                columnWidth={gridW > 0 ? (gridW - COL_GAP_PX) / 2 : 0}
                scrollTop={gridScrollTop}
                viewportH={vpH}
                overscanPx={OVERSCAN_PX}
                topPad={RIGHT_COL_OFFSET_PX}
                fetchingTail={infinite.isFetchingNextPage}
              />
            </div>
          ) : (
            <div className="treehole-grid">
              <div className="treehole-column">
                {leftColumn.map((post) => (
                  <TreeHoleGlassCard key={post.id} post={post} />
                ))}
                {infinite.isFetchingNextPage ? (
                  <>
                    <TreeHoleGlassSkeleton />
                    <TreeHoleGlassSkeleton />
                  </>
                ) : null}
              </div>
              <div className="treehole-column treehole-column-right">
                {rightColumn.map((post) => (
                  <TreeHoleGlassCard key={post.id} post={post} />
                ))}
                {infinite.isFetchingNextPage ? (
                  <>
                    <TreeHoleGlassSkeleton />
                    <TreeHoleGlassSkeleton />
                  </>
                ) : null}
              </div>
            </div>
          )}
          {infinite.hasNextPage && (
            <button
              type="button"
              className="treehole-load-more"
              onClick={loadMore}
              disabled={infinite.isFetchingNextPage}
            >
              {infinite.isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function estItemH(post, colW) {
  const hasImg = !!post?.images?.[0]?.url;
  if (hasImg) {
    // exact placeholder ratio (matches CSS aspect-ratio 4/5)
    return colW > 0 ? (colW * 5) / 4 : 420;
  }
  // compact no-image card
  return 128;
}

function VirtualColumn({ items, columnWidth, scrollTop, viewportH, overscanPx, topPad, fetchingTail }) {
  const arr = items || [];
  const padTop = Number(topPad) || 0;
  const gap = COL_GAP_PX;
  const hList = useMemo(() => {
    const hs = new Array(arr.length);
    for (let i = 0; i < arr.length; i += 1) hs[i] = estItemH(arr[i], columnWidth) + (i === 0 ? 0 : gap);
    return hs;
  }, [arr, columnWidth]);

  const prefix = useMemo(() => {
    const p = new Array(hList.length + 1);
    p[0] = padTop;
    for (let i = 0; i < hList.length; i += 1) p[i + 1] = p[i] + hList[i];
    return p;
  }, [hList, padTop]);

  const totalH = prefix[prefix.length - 1] + (fetchingTail ? 2 * (estItemH({ images: [{ url: 'x' }] }, columnWidth) + gap) : 0);
  const from = Math.max(0, scrollTop - overscanPx);
  const to = scrollTop + viewportH + overscanPx;

  const start = useMemo(() => {
    // lower_bound(prefix, from)
    let lo = 0, hi = prefix.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid] < from) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 1);
  }, [prefix, from]);

  const end = useMemo(() => {
    let lo = 0, hi = prefix.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid] < to) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(arr.length, lo);
  }, [prefix, to, arr.length]);

  const visible = arr.slice(start, end);

  useEffect(() => {
    // warm images for visible window (and keep in memory)
    for (const p of visible) {
      const url = p?.images?.[0]?.url ? prefixImageUrl(p.images[0].url) : null;
      if (url) warmImage(url);
    }
  }, [visible]);

  const topSpacer = prefix[start];
  const bottomSpacer = Math.max(0, totalH - prefix[end]);

  return (
    <div className="treehole-column" style={{ paddingTop: padTop }}>
      {topSpacer > padTop ? <div style={{ height: topSpacer - padTop }} /> : null}
      {visible.length === 0 && arr.length > 0 ? (
        <>
          <TreeHoleGlassSkeleton />
          <TreeHoleGlassSkeleton />
          <TreeHoleGlassSkeleton />
        </>
      ) : (
        visible.map((post) => <TreeHoleGlassCard key={post.id} post={post} />)
      )}
      {fetchingTail && end >= arr.length ? (
        <>
          <TreeHoleGlassSkeleton />
          <TreeHoleGlassSkeleton />
        </>
      ) : null}
      {bottomSpacer > 0 ? <div style={{ height: bottomSpacer }} /> : null}
    </div>
  );
}

function TreeHoleGlassSkeleton() {
  return (
    <div className="treehole-skel-card" aria-hidden>
      <div className="treehole-skel-media">
        <div className="treehole-skel-shimmer" />
        <div className="treehole-skel-pill">
          <div className="treehole-skel-avatar" />
          <div className="treehole-skel-name" />
        </div>
        <div className="treehole-skel-bottom">
          <div className="treehole-skel-line" />
          <div className="treehole-skel-actions">
            <div className="treehole-skel-chip" />
            <div className="treehole-skel-chip" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeHoleGlassCard({ post }) {
  const author = getAuthor(post);
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;
  const cover = post.images?.[0]?.url ? prefixImageUrl(post.images[0].url) : null;
  const title = (post.title || '').trim();
  const text = (post.content || '').trim();
  const display = title || (text.length > 64 ? `${text.slice(0, 64)}…` : text) || ' ';
  const [loaded, setLoaded] = useState(() => {
    if (!cover) return false;
    if (IMG_LOADED.has(cover)) return true;
    const img = IMG_CACHE.get(cover);
    return !!img && img.complete;
  });

  useEffect(() => {
    if (!cover) return;
    if (IMG_LOADED.has(cover)) {
      setLoaded(true);
      return;
    }
    const img = IMG_CACHE.get(cover);
    if (img && img.complete) {
      IMG_LOADED.add(cover);
      setLoaded(true);
      return;
    }
    // ensure it's warmed even if card remounts
    warmImage(cover);
    setLoaded(false);
  }, [cover]);

  if (!cover) {
    return (
      <motion.div variants={cardIn} initial="hidden" animate="show">
        <Link to={`/post/${post.id}`} className="treehole-glass-card treehole-glass-card--noimg" aria-label={display}>
          <div className="treehole-noimg-head">
            <span className="treehole-noimg-avatar">
              {author.avatar ? (
                <img src={author.avatar} alt="" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="is-default" />
              )}
            </span>
            <span className="treehole-noimg-author">{author.name}</span>
          </div>

          <div className="treehole-noimg-text">{display}</div>

          <div className="treehole-noimg-actions">
            <motion.span
              className="treehole-noimg-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <Heart size={16} aria-hidden />
              <span>{likeNum}</span>
            </motion.span>
            <motion.span
              className="treehole-noimg-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <MessageCircle size={16} aria-hidden />
              <span>{commentNum}</span>
            </motion.span>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardIn} initial="hidden" animate="show">
      <Link to={`/post/${post.id}`} className="treehole-glass-card" aria-label={display}>
        <div className="treehole-glass-media" aria-hidden>
          {cover ? (
            <>
              <img
                src={cover}
                alt=""
                className={`treehole-glass-img ${loaded ? 'is-loaded' : ''}`}
                loading="lazy"
                decoding="async"
                onLoad={() => {
                  if (cover) IMG_LOADED.add(cover);
                  setLoaded(true);
                }}
              />
              <div className={`treehole-glass-blur ${loaded ? 'is-hidden' : ''}`} />
            </>
          ) : (
            <div className="treehole-glass-fallback" />
          )}
          <div className="treehole-glass-bottom-gradient" />
        </div>

        <div className="treehole-glass-header-pill">
          <span className="treehole-glass-avatar">
            {author.avatar ? (
              <img src={author.avatar} alt="" />
            ) : (
              <img src="/default-avatar.svg" alt="" className="is-default" />
            )}
          </span>
          <span className="treehole-glass-author">{author.name}</span>
        </div>

        <div className="treehole-glass-content">
          <div className="treehole-glass-text">{display}</div>
          <div className="treehole-glass-actions">
            <motion.span
              className="treehole-glass-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <Heart size={16} aria-hidden />
              <span>{likeNum}</span>
            </motion.span>
            <motion.span
              className="treehole-glass-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <MessageCircle size={16} aria-hidden />
              <span>{commentNum}</span>
            </motion.span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default TreeHole;
