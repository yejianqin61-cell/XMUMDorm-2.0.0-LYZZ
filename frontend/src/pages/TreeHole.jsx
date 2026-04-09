import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
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
const PAGE_SIZE = 20;

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function mapPostItem(p) {
  return {
    ...p,
    author: p.author ? { ...p.author, avatar: prefixAvatar(p.author.avatar) } : p.author,
  };
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
  const queryClient = useQueryClient();
  const { token, isAdmin } = useAuth();
  const tokenKey = token ?? 'guest';
  const prefetchRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const pageRef = useRef(1);

  const initialSessionData = useMemo(() => readSessionInfinitePages(PAGE_SIZE), [tokenKey]);

  const infinite = useInfiniteQuery({
    queryKey: QK.postsInfinite(tokenKey, PAGE_SIZE),
    queryFn: async ({ pageParam }) => {
      const data = await getPostList({ page: pageParam, pageSize: PAGE_SIZE, token });
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
    staleTime: 60 * 1000,
  });

  const list = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.list) ?? [],
    [infinite.data]
  );

  pageRef.current = infinite.data?.pages.length ?? 1;

  useEffect(() => {
    return () => {
      const main = document.querySelector('.app-main');
      if (main && typeof main.scrollTop === 'number') {
        saveScroll(SCROLL_CACHE_KEY, main.scrollTop, pageRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRestoredRef.current || list.length === 0 || infinite.isFetching) return;
    const cached = takeScroll(SCROLL_CACHE_KEY);
    if (cached?.scrollTop > 0) {
      const main = document.querySelector('.app-main');
      if (main) {
        requestAnimationFrame(() => {
          main.scrollTop = cached.scrollTop;
        });
      }
    }
    scrollRestoredRef.current = true;
  }, [list.length, infinite.isFetching]);

  useEffect(() => {
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
  }, [list, infinite.data]);

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

  const loadMore = () => {
    if (!infinite.isFetching && infinite.hasNextPage) {
      infinite.fetchNextPage();
    }
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);
  const showInitialSkeleton = infinite.isPending && list.length === 0;
  const errorMsg = infinite.error ? getApiErrorMessage(infinite.error) : null;

  return (
    <div className="treehole-page">
      <TreeHoleToolbar />
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
          <div className="treehole-grid">
            <div className="treehole-column">
              {leftColumn.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <div className="treehole-column treehole-column-right">
              {rightColumn.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
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
      <Link
        to="/post/new"
        className="treehole-fab pressable"
        aria-label={isAdmin ? '发布公告 Announcement' : '发布帖子 Post'}
      >
        <PlusIcon />
        {isAdmin && <span className="treehole-fab-tag">公告</span>}
      </Link>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default TreeHole;
