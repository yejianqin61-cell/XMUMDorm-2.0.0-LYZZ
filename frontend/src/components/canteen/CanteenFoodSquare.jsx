import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getFoodArticles } from '../../api/canteen';
import { QK } from '../../query/queryKeys';
import { getUploadUrl } from '../../api/config';
import { formatPostTime } from '../../utils/formatTime';

export default function CanteenFoodSquare() {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QK.canteenFoodArticles(1, 10),
    queryFn: ({ pageParam = 1 }) => getFoodArticles({ page: pageParam, pageSize: 10 }),
    getNextPageParam: (lastPage) => {
      const d = lastPage?.data || lastPage;
      return d?.hasMore && d?.page ? d.page + 1 : undefined;
    },
    staleTime: 60 * 1000,
    initialPageParam: 1,
  });

  const pages = data?.pages || [];
  const allItems = pages.flatMap((p) => {
    const d = (p?.data || p);
    const list = d?.list || d?.data || [];
    return Array.isArray(list) ? list : [];
  });

  if (isLoading) {
    return (
      <div className="canteen-section">
        <h3 className="canteen-section-title">吃货广场</h3>
        <div className="state-loading" style={{ paddingTop: 60 }} />
      </div>
    );
  }
  if (isError && allItems.length === 0) {
    return (
      <div className="canteen-section">
        <h3 className="canteen-section-title">吃货广场</h3>
        <div className="state-error">加载失败</div>
      </div>
    );
  }

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">吃货广场</h3>
      {allItems.length === 0 ? (
        <div className="canteen-food-empty">
          <p>还没有美食文章</p>
          <button type="button" className="canteen-food-write-btn pressable" onClick={() => navigate('/post/new')}>
            写一篇美食测评 →
          </button>
        </div>
      ) : (
        <>
          <div className="canteen-food-list">
            {allItems.map((item) => (
              <div
                key={item.id}
                className="canteen-food-item pressable"
                onClick={() => navigate(`/post/${item.id}`)}
              >
                {item.cover_url && (
                  <img src={item.cover_url} alt="" className="canteen-food-cover" loading="lazy" />
                )}
                <div className="canteen-food-body">
                  <p className="canteen-food-excerpt">{item.title_or_excerpt}</p>
                  <div className="canteen-food-meta">
                    <span className="canteen-food-author">
                      {item.author?.avatar && (
                        <img src={getUploadUrl(item.author.avatar)} alt="" className="canteen-food-avatar" />
                      )}
                      {item.author?.name || '匿名'}
                    </span>
                    <span className="canteen-food-stats">
                      {item.like_count > 0 && <span>👍 {item.like_count}</span>}
                      {item.comment_count > 0 && <span>💬 {item.comment_count}</span>}
                      <span>{formatPostTime(item.created_at)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasNextPage && (
            <button
              type="button"
              className="canteen-food-more pressable"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? '加载中...' : '加载更多'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
