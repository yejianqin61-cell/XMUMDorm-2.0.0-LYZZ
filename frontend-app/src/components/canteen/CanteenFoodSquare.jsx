import { useInfiniteQuery } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getFoodArticles } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '@shared/constants/canteen';
import { getUploadUrl } from '@shared/api/config';
import { formatPostTime } from '@shared/utils/formatTime';

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

  const allItems = (data?.pages || []).flatMap((page) => (
    Array.isArray(page?.list) ? page.list : []
  ));

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
      <section className="canteen-section canteen-food-section">
        {header}
        <div className="state-loading" style={{ paddingTop: 60 }} />
      </section>
    );
  }

  if (isError && allItems.length === 0) {
    return (
      <section className="canteen-section canteen-food-section">
        {header}
        <div className="state-error">{t.loadFailedShort}</div>
      </section>
    );
  }

  return (
    <section className="canteen-section canteen-food-section">
      {header}
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
              <button
                key={item.id}
                type="button"
                className="canteen-food-item pressable"
                onClick={() => navigate(`/post/${item.id}`)}
                aria-label={`${item.author?.name || t.anonymous}: ${item.title_or_excerpt}`}
              >
                <span className="canteen-food-author-row">
                  {item.author?.avatar && (
                    <img src={getUploadUrl(item.author.avatar)} alt="" className="canteen-food-avatar" />
                  )}
                  <span className="canteen-food-author">{item.author?.name || t.anonymous}</span>
                  <span className="canteen-food-time">{formatPostTime(item.created_at)}</span>
                </span>
                <span className="canteen-food-body">
                  <span className="canteen-food-excerpt">{item.title_or_excerpt}</span>
                  {item.cover_url && (
                    <img
                      src={getUploadUrl(item.cover_url)}
                      alt={t.foodSquareImage}
                      className="canteen-food-cover"
                      loading="lazy"
                    />
                  )}
                  {(item.like_count > 0 || item.comment_count > 0) && (
                    <span className="canteen-food-stats">
                      {item.like_count > 0 && <span><Heart size={15} strokeWidth={1.8} aria-hidden="true" /> {item.like_count}</span>}
                      {item.comment_count > 0 && <span><MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" /> {item.comment_count}</span>}
                    </span>
                  )}
                </span>
              </button>
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
    </section>
  );
}
