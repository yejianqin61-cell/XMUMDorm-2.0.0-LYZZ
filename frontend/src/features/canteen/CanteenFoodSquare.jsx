import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getFoodArticles } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '@shared/constants/canteen';
import { getUploadUrl } from '@shared/api/config';
import { formatPostTime } from '@shared/utils/formatTime';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { NeoLoader } from '../../components/retroui/Loader';
import { NeoSkeleton } from '../../components/retroui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

export default function CanteenFoodSquare({ title, limit = 10, showHint = true }) {
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
    queryKey: QK.canteenFoodArticles(1, limit),
    queryFn: ({ pageParam = 1 }) => getFoodArticles({ page: pageParam, pageSize: limit }),
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
      <h3 className="canteen-section-title">{title || t.foodSquareTitle}</h3>
      <Button variant="secondary" size="sm" onClick={goWrite}>
        {t.foodSquareCompose}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="canteen-section">
        {header}
        <div className="flex flex-col gap-3 pt-4">
          {[1, 2, 3].map((i) => (
            <NeoSkeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && allItems.length === 0) {
    return (
      <div className="canteen-section">
        {header}
        <ErrorState message={t.loadFailedShort} />
      </div>
    );
  }

  return (
    <div className="canteen-section">
      {header}
      {showHint && <p className="text-sm text-muted-foreground mb-3 mt-1">{t.foodSquareHint}</p>}
      {allItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <EmptyState message={t.foodSquareEmpty} />
          <Button variant="default" onClick={goWrite}>
            {t.foodSquareWrite}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {allItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-muted transition-colors p-0 overflow-hidden"
                onClick={() => navigate(`/post/${item.id}`)}
              >
                {item.cover_url && (
                  <img src={getUploadUrl(item.cover_url)} alt="" className="w-full h-36 object-cover" loading="lazy" />
                )}
                <div className="p-4 flex flex-col gap-2">
                  <p className="text-sm font-semibold line-clamp-2">{item.title_or_excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {item.author?.avatar && (
                        <img src={getUploadUrl(item.author.avatar)} alt="" className="w-5 h-5 rounded-full border-2 border-black" />
                      )}
                      {item.author?.name || t.anonymous}
                    </span>
                    <span className="flex items-center gap-2">
                      {item.like_count > 0 && <span>👍 {item.like_count}</span>}
                      {item.comment_count > 0 && <span>💬 {item.comment_count}</span>}
                      <span>{formatPostTime(item.created_at)}</span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {limit === 10 && hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-2">
                    <NeoLoader size="sm" count={3} />
                    {t.loading}
                  </span>
                ) : (
                  t.loadMore
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}