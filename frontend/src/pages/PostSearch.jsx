import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PostCard from '../components/PostCard';
import PageSkeleton from '../components/ui/PageSkeleton';
import ListPageLayout from '../components/templates/ListPageLayout';
import { getPostList } from '@shared/api/posts';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { API_BASE_URL } from '@shared/api/config';
import './TreeHole.css';
import './PostSearch.css';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/** 关键词搜索帖子结果页 Search posts by keyword */
function PostSearch() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const { token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const qRef = useRef(q);
  qRef.current = q;

  const loadPage = useCallback(
    async (pageNum = 1, append = false) => {
      const keyword = qRef.current;
      if (!keyword) {
        setList([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      try {
        if (pageNum === 1) setLoading(true);
        setError(null);
        const data = await getPostList({ page: pageNum, pageSize, token, q: keyword });
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
    [token, pageSize]
  );

  useEffect(() => {
    setPage(1);
    loadPage(1, false);
  }, [q, loadPage]);

  const loadMore = () => {
    if (!loading && hasMore && q) loadPage(page + 1, true);
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);

  return (
    <ListPageLayout
      header={null}
      list={
        <div className="treehole-page post-search-page">
          <header className="post-search-hero">
        <div className="post-search-hero__copy">
          <p className="post-search-hero__eyebrow">{isZh ? '树洞搜索' : 'TreeHole Search'}</p>
          <h1 className="post-search-hero__title">
            {isZh ? '按关键词继续找话题' : 'Search the conversation by keyword'}
          </h1>
          <p className="post-search-hero__subtitle">
            {isZh
              ? '把树洞里的讨论、吐槽和校园碎片收在一个结果流里，方便继续浏览。'
              : 'Keep discussions, campus moments, and updates in one searchable stream.'}
          </p>
        </div>
        <div className="post-search-hero__query">
          <span className="post-search-hero__query-label">{isZh ? '当前关键词' : 'Current query'}</span>
          <strong>{q || (isZh ? '（空）' : '(empty)')}</strong>
        </div>
      </header>
      {!q && (
        <p className="post-search-empty-msg">
          {isZh ? '请输入关键词后再搜索。' : 'Enter a keyword to search.'}
        </p>
      )}
      {error && (
        <p className="treehole-error state-error" role="alert">
          {error}
        </p>
      )}
      {loading && list.length === 0 && q ? (
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
          <div className="post-search-results-head">
            <p className="post-search-hint">
              {isZh ? '搜索：' : 'Search:'}
              <strong>{q || (isZh ? '（空）' : '(empty)')}</strong>
            </p>
          </div>
          {q && list.length === 0 && !loading && (
            <p className="post-search-no-result">
              {isZh ? '没有相关帖子。' : 'No matching posts.'}
            </p>
          )}
          <div className="treehole-grid">
            <div className="treehole-column">
              {leftColumn.map((post) => (
                <PostCard key={post.id} post={post} variant={post.images?.length ? 'waterfall' : undefined} />
              ))}
            </div>
            <div className="treehole-column treehole-column-right">
              {rightColumn.map((post) => (
                <PostCard key={post.id} post={post} variant={post.images?.length ? 'waterfall' : undefined} />
              ))}
            </div>
          </div>
          {hasMore && q && (
            <button type="button" className="treehole-load-more" onClick={loadMore} disabled={loading}>
              {loading ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
            </button>
          )}
        </div>
      )}
      <Link to="/" className="post-search-back-home">
        {isZh ? '返回树洞首页' : 'Back to TreeHole'}
      </Link>
    </div>
      }
    />
  );
}

export default PostSearch;
