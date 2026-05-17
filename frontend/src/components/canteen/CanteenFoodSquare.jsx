import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getFoodArticles } from '../../api/canteen';
import { QK } from '../../query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '../../constants/canteen';
import { getUploadUrl } from '../../api/config';
import { formatPostTime } from '../../utils/formatTime';

export default function CanteenFoodSquare() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);

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
      if (lastPage?.hasMore && lastPage?.page) return lastPage.page + 1;
      return undefined;
    },
    staleTime: 60 * 1000,
    initialPageParam: 1,
  });

  const pages = data?.pages || [];
  const allItems = pages.flatMap((p) => {
    const list = p?.list;
    return Array.isArray(list) ? list : [];
  });

  const goWrite = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/post/new', search: `?tag=${FOOD_SQUARE_TAG_SLUG}` } } });
      return;
    }
    navigate(`/post/new?tag=${encodeURIComponent(FOOD_SQUARE_TAG_SLUG)}`);
  };

  const header = (
    <div className="canteen-section-head">
      <h3 className="canteen-section-title">{t.foodSquareTitle}</h3>
      <button type="button" className="canteen-food-compose-btn pressable" onClick={goWrite}>
        {t.foodSquareCompose}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="canteen-section">
        {header}
        <div className="state-loading" style={{ paddingTop: 60 }} />
      </div>
    );
  }

  if (isError && allItems.length === 0) {
    return (
      <div className="canteen-section">
        {header}
        <div className="state-error">{t.loadFailedShort}</div>
      </div>
    );
  }

  return (
    <div className="canteen-section">
      {header}
      <p className="canteen-food-hint">{t.foodSquareHint}</p>
      {allItems.length === 0 ? (
        <div className="canteen-food-empty">
          <p>{t.foodSquareEmpty}</p>
          <button type="button" className="canteen-food-write-btn pressable" onClick={goWrite}>
            {t.foodSquareWrite}
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
                  <img src={getUploadUrl(item.cover_url)} alt="" className="canteen-food-cover" loading="lazy" />
                )}
                <div className="canteen-food-body">
                  <p className="canteen-food-excerpt">{item.title_or_excerpt}</p>
                  <div className="canteen-food-meta">
                    <span className="canteen-food-author">
                      {item.author?.avatar && (
                        <img src={getUploadUrl(item.author.avatar)} alt="" className="canteen-food-avatar" />
                      )}
                      {item.author?.name || t.anonymous}
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
              {isFetchingNextPage ? t.loading : t.loadMore}
            </button>
          )}
        </>
      )}
    </div>
  );
}
