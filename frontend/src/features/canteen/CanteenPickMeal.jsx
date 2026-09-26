import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { pickRandomMeal } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { productImageUrl } from '@shared/api/config';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { NeoLoader } from '../../components/retroui/Loader';
import ErrorState from '../../components/ui/ErrorState';

export default function CanteenPickMeal({ compact = false }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const [excludeId, setExcludeId] = useState(0);
  const [active, setActive] = useState(false);

  const { data: meal, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: QK.canteenPickRandom(excludeId),
    queryFn: () => pickRandomMeal(excludeId),
    enabled: active,
    staleTime: 0,
  });

  const handlePick = useCallback(() => {
    setActive(true);
  }, []);

  const handleReroll = useCallback(() => {
    if (meal?.id) setExcludeId(meal.id);
    else refetch();
  }, [meal, refetch]);

  const loading = active && (isLoading || isFetching) && !meal;

  const content = (
    <>
      {!active ? (
        <div className={compact ? '' : 'canteen-pick-init'}>
          {!compact && <p className="text-muted-foreground text-sm mb-4">{t.pickPrompt}</p>}
          <Button variant={compact ? 'secondary' : 'default'} size={compact ? 'sm' : 'md'} onClick={handlePick}>
            {compact ? '换一个' : t.pickBtn}
          </Button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="text-4xl animate-bounce">🎲</span>
          <span className="text-sm text-muted-foreground">{t.pickLoading}</span>
          <NeoLoader size="sm" />
        </div>
      ) : isError ? (
        <ErrorState message={t.pickError} />
      ) : !meal ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">{t.pickEmpty}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t.pickRetry}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Card className="w-full cursor-pointer" onClick={() => navigate(`/eat/food/${meal.id}`)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-base truncate">{meal.name}</span>
                <span className="text-sm text-muted-foreground">
                  {meal.shop_name}
                  {meal.region_code ? ` · ${meal.region_code}` : ''}
                </span>
                {meal.comprehensive_score != null && Number(meal.comprehensive_score) > 0 && (
                  <span className="text-sm font-bold text-primary mt-1">
                    {t.pickOverallScore} {Number(meal.comprehensive_score).toFixed(1)}
                  </span>
                )}
              </div>
              <img
                src={productImageUrl(meal.cover_url)}
                alt={meal.name}
                className="w-22 h-22 object-cover border-2 border-black shrink-0"
              />
            </div>
          </Card>
          <Button variant="outline" size="sm" onClick={handleReroll}>
            {t.pickReroll}
          </Button>
        </div>
      )}
    </>
  );

  if (compact) {
    return <div>{content}</div>;
  }

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">{t.pickTitle}</h3>
      {content}
    </div>
  );
}