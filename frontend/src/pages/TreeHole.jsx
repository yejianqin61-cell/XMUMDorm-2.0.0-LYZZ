import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import SkeletonPost from '../components/SkeletonPost';
import { getPostList } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { API_BASE_URL } from '../api/config';
import { saveScroll, takeScroll } from '../utils/scrollCache';
import './TreeHole.css';

const SCROLL_CACHE_KEY = 'treehole';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function TreeHole() {
  const { token, isAdmin } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const pageRef = useRef(1);
  pageRef.current = page;

  const loadPage = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (pageNum === 1) setLoading(true);
        setError(null);
        const data = await getPostList({ page: pageNum, pageSize, token });
        const posts = (data?.list || []).map((p) => ({
          ...p,
          author: p.author ? { ...p.author, avatar: prefixAvatar(p.author.avatar) } : p.author,
        }));
        setList((prev) => (append ? [...prev, ...posts] : posts));
        setHasMore(!!data?.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // 离开列表时保存滚动位置与页码（scroll position cache）
  useEffect(() => {
    return () => {
      const main = document.querySelector('.app-main');
      if (main && typeof main.scrollTop === 'number') {
        saveScroll(SCROLL_CACHE_KEY, main.scrollTop, pageRef.current);
      }
    };
  }, []);

  // 首次进入：有缓存则恢复到离开时的页码并恢复滚动，否则正常加载第一页
  useEffect(() => {
    const cached = takeScroll(SCROLL_CACHE_KEY);
    if (!cached || cached.page <= 0) {
      loadPage(1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const allPosts = [];
      let lastHasMore = false;
      for (let p = 1; p <= cached.page && !cancelled; p++) {
        try {
          const data = await getPostList({ page: p, pageSize, token });
          const posts = (data?.list || []).map((item) => ({
            ...item,
            author: item.author ? { ...item.author, avatar: prefixAvatar(item.author.avatar) } : item.author,
          }));
          allPosts.push(...posts);
          lastHasMore = !!data?.hasMore;
        } catch (err) {
          if (!cancelled) setError(getApiErrorMessage(err));
          break;
        }
      }
      if (cancelled) return;
      setList(allPosts);
      setPage(cached.page);
      setHasMore(lastHasMore);
      setLoading(false);
      const main = document.querySelector('.app-main');
      if (main && cached.scrollTop > 0) {
        requestAnimationFrame(() => {
          main.scrollTop = cached.scrollTop;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token, loadPage]);

  const loadMore = () => {
    if (!loading && hasMore) loadPage(page + 1, true);
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);

  return (
    <div className="treehole-page">
      {error && (
        <p className="treehole-error state-error" role="alert">
          {error}
        </p>
      )}
      {loading && list.length === 0 ? (
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
          {hasMore && (
            <button type="button" className="treehole-load-more" onClick={loadMore} disabled={loading}>
              {loading ? '加载中…' : '加载更多'}
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
