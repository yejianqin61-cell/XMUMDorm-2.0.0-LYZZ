import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PostCard from '../components/PostCard';
import SkeletonPost from '../components/SkeletonPost';
import { getPostList, getPostTagsList } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { API_BASE_URL } from '../api/config';
import { QK } from '../query/queryKeys';
import './TreeHole.css';
import './PostTagFeed.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/** 某标签下的帖子列表 Posts under a tag */
function PostTagFeed() {
  const { slug } = useParams();
  const { token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const tagsQuery = useQuery({
    queryKey: QK.postTagsList(),
    queryFn: getPostTagsList,
    staleTime: POST_TAGS_STALE_MS,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const tagLabel = useMemo(() => {
    if (!slug) return '';
    const arr = tagsQuery.data ?? [];
    const t = arr.find((x) => x.slug === slug);
    if (t) return isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
    return slug;
  }, [slug, isZh, tagsQuery.data]);

  const loadPage = useCallback(
    async (pageNum = 1, append = false) => {
      if (!slug) return;
      try {
        if (pageNum === 1) setLoading(true);
        setError(null);
        const data = await getPostList({ page: pageNum, pageSize, token, tagSlug: slug });
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
    [token, pageSize, slug]
  );

  useEffect(() => {
    setPage(1);
    loadPage(1, false);
  }, [slug, loadPage]);

  const loadMore = () => {
    if (!loading && hasMore) loadPage(page + 1, true);
  };

  const leftColumn = list.filter((_, i) => i % 2 === 0);
  const rightColumn = list.filter((_, i) => i % 2 === 1);

  return (
    <div className="treehole-page post-tag-feed-page">
      <p className="post-tag-feed-hint">
        {isZh ? '话题 Topic：' : 'Topic：'}
        <strong>{tagLabel || slug}</strong>
      </p>
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
          {list.length === 0 && !loading && (
            <p className="post-tag-feed-empty">
              {isZh ? '该标签下暂无帖子。No posts under this tag yet.' : 'No posts under this tag yet.'}
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
          {hasMore && (
            <button type="button" className="treehole-load-more" onClick={loadMore} disabled={loading}>
              {loading ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
            </button>
          )}
        </div>
      )}
      <Link to="/" className="post-tag-feed-back">
        {isZh ? '返回树洞首页 Back to Tree Hole' : 'Back to Tree Hole'}
      </Link>
    </div>
  );
}

export default PostTagFeed;
