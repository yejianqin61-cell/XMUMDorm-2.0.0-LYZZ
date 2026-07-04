import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import TreeHoleToolbar from '../components/TreeHoleToolbar';
import PageSkeleton from '../components/ui/PageSkeleton';
import InterestRecommendationBlock from '../components/square/InterestRecommendationBlock';
import RelatedCampusTopicsBlock from '../components/square/RelatedCampusTopicsBlock';
import ErrorState from '../components/ui/ErrorState';
import RouteTransition from '../components/ui/RouteTransition';
import { getPostList } from '@shared/api/posts';
import { getSquareRecommendations } from '@shared/api/square';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { API_BASE_URL } from '@shared/api/config';
import { saveScroll, takeScroll } from '@shared/utils/scrollCache';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import './TreeHole.css';

const SCROLL_CACHE_KEY = 'treehole';
// 首屏更快：先拉 10 条；首屏出来后后台再预取更多页
const PAGE_SIZE = 10;
const PREFETCH_PAGES_AFTER_FIRST = 3; // 额外预取 3 页 => 约 30 条
const MotionDiv = motion.div;
const MotionSpan = motion.span;

function logTreeHoleBackgroundError(scope, err) {
  console.warn(`[TreeHole] ${scope} failed:`, err);
}

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

function isImageLoaded(url) {
  if (!url) return false;
  if (IMG_LOADED.has(url)) return true;
  const img = IMG_CACHE.get(url);
  return !!img && img.complete;
}

function toPostThumbUrl(fullUrl) {
  if (!fullUrl) return fullUrl;
  try {
    const u = new URL(fullUrl, window.location.origin);
    const p = u.pathname || '';
    // 约定：原图 key 为 /uploads/posts/post_<id>_<i>.<ext> 或 <ASSET_BASE>/posts/post_<id>_<i>.<ext>
    // 缩略图 key 为 posts/thumbs/post_<id>_<i>.webp（同目录结构）
    const replaced = p.replace(
      /(\/uploads)?\/posts\/post_(\d+)_([0-9]+)\.(jpg|jpeg|png|webp|gif)$/i,
      (_m, uploadsPrefix, id, idx) => `${uploadsPrefix || ''}/posts/thumbs/post_${id}_${idx}.webp`
    );
    if (replaced === p) return fullUrl;
    u.pathname = replaced;
    // 缩略图不需要沿用原图的 t= 版本参数；保留其它 query
    return u.toString();
  } catch {
    return fullUrl;
  }
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

function buildRhythmEntries(posts, blocks) {
  const postEntries = (posts || []).map((post) => ({ type: 'post', key: `post-${post.id}`, post }));
  if (!blocks || blocks.length === 0) return postEntries;

  const result = [];
  const interval = Math.max(3, Math.ceil(postEntries.length / (blocks.length + 1)));
  let nextInsertAt = interval;
  let blockIndex = 0;

  for (let i = 0; i < postEntries.length; i += 1) {
    result.push(postEntries[i]);
    if (blockIndex < blocks.length && i + 1 >= nextInsertAt && i + 1 < postEntries.length) {
      result.push(blocks[blockIndex]);
      blockIndex += 1;
      nextInsertAt += interval;
    }
  }

  while (blockIndex < blocks.length) {
    result.push(blocks[blockIndex]);
    blockIndex += 1;
  }

  return result;
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

  // Mobile stability mode: coarse pointer devices (phones/tablets)
  const isCoarse = useMemo(() => {
    try {
      return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)')?.matches;
    } catch {
      return false;
    }
  }, []);

  const queryClient = useQueryClient();
  const { token } = useAuth();
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
    // 避免“切换筛选/重新拉取时清空列表导致白块闪烁”
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const recommendationQuery = useQuery({
    queryKey: QK.squareRecommendations(),
    queryFn: getSquareRecommendations,
    staleTime: 60 * 1000,
  });

  const list = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.list) ?? [],
    [infinite.data]
  );
  const pages = useMemo(() => infinite.data?.pages ?? [], [infinite.data]);
  const hasNextPage = !!infinite.hasNextPage;
  const isFetching = !!infinite.isFetching;
  const isFetchingNextPage = !!infinite.isFetchingNextPage;
  const isPending = !!infinite.isPending;
  const fetchNextPage = infinite.fetchNextPage;
  const infiniteError = infinite.error;

  // Mobile: pre-warm a window of images ahead to reduce blank blocks
  useEffect(() => {
    if (!isCoarse) return;
    let n = 0;
    for (const p of list) {
      const url = p?.images?.[0]?.url ? prefixImageUrl(p.images[0].url) : null;
      if (url) {
        warmImage(url);
        n += 1;
      }
      if (n >= 28) break;
    }
  }, [isCoarse, list]);

  useEffect(() => {
    pageRef.current = pages.length || 1;
  }, [pages.length]);

  useEffect(() => {
    return () => {
      const main = getTreeHoleScrollEl();
      if (main && typeof main.scrollTop === 'number') {
        saveScroll(SCROLL_CACHE_KEY, main.scrollTop, pageRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRestoredRef.current || list.length === 0 || isFetching) return;
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
  }, [isFetching, list.length, selectedTagSlug]);

  useEffect(() => {
    if (selectedTagSlug) return;
    try {
      const last = pages[pages.length - 1];
      const data = {
        list,
        hasMore: last?.hasMore ?? false,
        page: pages.length || 1,
      };
      sessionStorage.setItem('treehole_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [list, pages, selectedTagSlug]);

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
      .catch((err) => {
        logTreeHoleBackgroundError('prefetch regions', err);
      });
  }, [queryClient]);

  // 首屏出来后，后台“偷偷”多拉几页，减少继续下滑时的灰色空段与等待
  useEffect(() => {
    if (selectedTagSlug) return;
    if (pages.length === 0 || isFetching || isFetchingNextPage) return;
    if (!hasNextPage) return;

    const already = pages.length;
    const target = 1 + PREFETCH_PAGES_AFTER_FIRST;
    if (already >= target) return;

    let cancelled = false;
    const run = async () => {
      for (let i = already; i < target; i += 1) {
        if (cancelled) return;
        // 如果中途没有更多页了就停
        if (!hasNextPage) return;
        // 这里用 await，确保顺序分页，不会并发炸后端/浪费流量
        await fetchNextPage();
      }
    };
    run().catch((err) => {
      if (!cancelled) {
        logTreeHoleBackgroundError('prefetch posts', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    pages.length,
    selectedTagSlug,
  ]);

  const loadMore = () => {
    if (!isFetching && hasNextPage) {
      fetchNextPage().catch((err) => {
        logTreeHoleBackgroundError('load more posts', err);
      });
    }
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);
  const showInitialSkeleton = isPending && list.length === 0;
  const showRefreshing = !showInitialSkeleton && isFetching && list.length > 0;
  const errorMsg = infiniteError ? getApiErrorMessage(infiniteError) : null;
  const recommendationData = recommendationQuery.data || {
    interest_posts: [],
    campus_topics: [],
    fallback_topics: [],
  };
  const leftColumnEntries = useMemo(
    () => buildRhythmEntries(leftColumn, recommendationData.interest_posts?.length ? [{
      type: 'interest',
      key: 'interest-rhythm',
      items: recommendationData.interest_posts.slice(0, 3),
    }] : []),
    [leftColumn, recommendationData.interest_posts]
  );
  const rightColumnEntries = useMemo(
    () => buildRhythmEntries(
      rightColumn,
      (recommendationData.campus_topics?.length || recommendationData.fallback_topics?.length)
        ? [{
            type: 'campus',
            key: 'campus-rhythm',
            items: (recommendationData.campus_topics?.length
              ? recommendationData.campus_topics
              : recommendationData.fallback_topics
            ).slice(0, 3),
          }]
        : []
    ),
    [rightColumn, recommendationData.campus_topics, recommendationData.fallback_topics]
  );

  const gridRef = useRef(null);
  const [gridW, setGridW] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [vpH, setVpH] = useState(0);
  const [gridTop, setGridTop] = useState(0); // grid offsetTop within scroll container
  const scrollRafRef = useRef(0);

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
      // 1) 直接在滚动回调里判断是否该拉取下一页，避免“滚动->setState->effect”多一拍
      if (hasNextPage && !isFetchingNextPage) {
        const remain = sc.scrollHeight - (sc.scrollTop + sc.clientHeight);
        // 手机上快速滑动时，提前一点触发，骨架尾巴更跟手
        if (remain < 2400) {
          fetchNextPage().catch((err) => {
            logTreeHoleBackgroundError('scroll prefetch next page', err);
          });
        }
      }

      // 2) 用 rAF 节流状态更新，降低滚动期间的重渲染抖动/卡顿
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0;
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
      });
    };
    onScroll();
    sc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // auto load next page when near bottom (avoid white gaps)
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const sc = getTreeHoleScrollEl();
    if (!sc) return;
    const remain = sc.scrollHeight - (sc.scrollTop + sc.clientHeight);
    if (remain < 2400) {
      fetchNextPage().catch((err) => {
        logTreeHoleBackgroundError('near-bottom auto load', err);
      });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, scrollTop, vpH]);

  const gridScrollTop = Math.max(0, scrollTop - (gridTop || 0));

  return (
    <RouteTransition className={`treehole-page treehole-page--light ${isCoarse ? 'treehole-page--mobile' : ''}`}>
      <TreeHoleToolbar selectedSlug={selectedTagSlug} onSelectTagSlug={handleSelectTag} />
      {debug ? (
        <div className="treehole-debug" role="status" aria-live="polite">
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">posts</span>
            <span className="treehole-debug-v">{list.length}</span>
            <span className="treehole-debug-k">pages</span>
            <span className="treehole-debug-v">{pages.length}</span>
          </div>
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">fetch</span>
            <span className="treehole-debug-v">{String(isFetching)}</span>
            <span className="treehole-debug-k">next</span>
            <span className="treehole-debug-v">{String(isFetchingNextPage)}</span>
          </div>
          <div className="treehole-debug-row">
            <span className="treehole-debug-k">hasMore</span>
            <span className="treehole-debug-v">{String(hasNextPage)}</span>
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
        <ErrorState className="treehole-error" title="树洞加载失败" description={errorMsg} />
      )}
      {showInitialSkeleton ? (
        <div className="treehole-content">
          <div className="treehole-grid">
            <div className="treehole-column">
              {[1, 2, 3].map((i) => (
                <PageSkeleton variant="list" key={i} />
              ))}
            </div>
            <div className="treehole-column treehole-column-right">
              {[1, 2, 3].map((i) => (
                <PageSkeleton variant="list" key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="treehole-content">
          {showRefreshing ? <div className="treehole-refreshing" aria-hidden /> : null}
          {USE_VIRTUAL_MASONRY ? (
            <div className="treehole-grid treehole-grid--perf" ref={gridRef}>
              <VirtualColumn
                items={leftColumn}
                columnWidth={gridW > 0 ? (gridW - COL_GAP_PX) / 2 : 0}
                scrollTop={gridScrollTop}
                viewportH={vpH}
                overscanPx={OVERSCAN_PX}
                topPad={0}
                fetchingTail={isFetchingNextPage}
              />
              <VirtualColumn
                items={rightColumn}
                columnWidth={gridW > 0 ? (gridW - COL_GAP_PX) / 2 : 0}
                scrollTop={gridScrollTop}
                viewportH={vpH}
                overscanPx={OVERSCAN_PX}
                topPad={RIGHT_COL_OFFSET_PX}
                fetchingTail={isFetchingNextPage}
              />
            </div>
          ) : (
            <>
              <div className="treehole-grid">
                <div className="treehole-column">
                  {leftColumnEntries.map((entry) => (
                    entry.type === 'post' ? (
                      <TreeHoleGlassCard
                        key={entry.key}
                        post={entry.post}
                        eager={isCoarse}
                        mobileStable={isCoarse}
                      />
                    ) : (
                      <InterestRecommendationBlock key={entry.key} items={entry.items} />
                    )
                  ))}
                  {isFetchingNextPage ? (
                    <>
                      <TreeHoleGlassSkeleton />
                      <TreeHoleGlassSkeleton />
                    </>
                  ) : null}
                </div>
                <div className="treehole-column treehole-column-right">
                  {rightColumnEntries.map((entry) => (
                    entry.type === 'post' ? (
                      <TreeHoleGlassCard
                        key={entry.key}
                        post={entry.post}
                        eager={isCoarse}
                        mobileStable={isCoarse}
                      />
                    ) : (
                      <RelatedCampusTopicsBlock key={entry.key} items={entry.items} />
                    )
                  ))}
                  {isFetchingNextPage ? (
                    <>
                      <TreeHoleGlassSkeleton />
                      <TreeHoleGlassSkeleton />
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
          {hasNextPage && (
            <button
              type="button"
              className="treehole-load-more"
              onClick={loadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </RouteTransition>
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
  const arr = useMemo(() => items || [], [items]);
  const padTop = Number(topPad) || 0;
  const gap = COL_GAP_PX;
  const hList = useMemo(() => {
    const hs = new Array(arr.length);
    for (let i = 0; i < arr.length; i += 1) hs[i] = estItemH(arr[i], columnWidth) + (i === 0 ? 0 : gap);
    return hs;
  }, [arr, columnWidth, gap]);

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

function TreeHoleGlassCard({ post, eager = false, mobileStable = false }) {
  const author = getAuthor(post);
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;
  const cover = post.images?.[0]?.url ? prefixImageUrl(post.images[0].url) : null;
  const coverThumb = cover ? toPostThumbUrl(cover) : null;
  const title = (post.title || '').trim();
  const text = (post.content || '').trim();
  const [imgSrc, setImgSrc] = useState(() => coverThumb || cover);
  const [loaded, setLoaded] = useState(() => isImageLoaded(coverThumb || cover));
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (coverThumb) {
      warmImage(coverThumb);
      return;
    }
    if (cover) {
      warmImage(cover);
    }
  }, [cover, coverThumb]);
  const display = title || (text.length > 64 ? `${text.slice(0, 64)}…` : text) || ' ';

  if (!cover) {
    return (
      <MotionDiv variants={cardIn} initial="hidden" animate="show">
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
            <MotionSpan
              className="treehole-noimg-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <Heart size={16} aria-hidden />
              <span>{likeNum}</span>
            </MotionSpan>
            <MotionSpan
              className="treehole-noimg-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <MessageCircle size={16} aria-hidden />
              <span>{commentNum}</span>
            </MotionSpan>
          </div>
        </Link>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv variants={cardIn} initial="hidden" animate="show">
      <Link to={`/post/${post.id}`} className="treehole-glass-card" aria-label={display}>
        <div className="treehole-glass-media" aria-hidden>
          {cover && !errored ? (
            <>
              <img
                src={imgSrc || cover}
                alt=""
                className={`treehole-glass-img ${loaded ? 'is-loaded' : ''}`}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => {
                  const u = imgSrc || coverThumb || cover;
                  if (u) IMG_LOADED.add(u);
                  setLoaded(true);
                }}
                onError={() => {
                  // 缩略图不存在/404 时自动回退到原图，避免黑底
                  if (coverThumb && imgSrc === coverThumb && coverThumb !== cover) {
                    setImgSrc(cover);
                    setLoaded(false);
                    setErrored(false);
                    return;
                  }
                  setErrored(true);
                  setLoaded(true);
                }}
              />
              {!mobileStable ? (
                <div className={`treehole-glass-blur ${loaded ? 'is-hidden' : ''}`} />
              ) : null}
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
            <MotionSpan
              className="treehole-glass-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <Heart size={16} aria-hidden />
              <span>{likeNum}</span>
            </MotionSpan>
            <MotionSpan
              className="treehole-glass-action"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 700, damping: 28 }}
            >
              <MessageCircle size={16} aria-hidden />
              <span>{commentNum}</span>
            </MotionSpan>
          </div>
        </div>
      </Link>
    </MotionDiv>
  );
}

export default TreeHole;
