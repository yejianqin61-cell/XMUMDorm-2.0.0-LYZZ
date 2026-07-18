import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { pickRandomMeal } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { productImageUrl } from '@shared/api/config';

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
        <div className={compact ? 'canteen-pick-compact-init' : 'canteen-pick-init'}>
          {!compact && <p className="canteen-pick-text">{t.pickPrompt}</p>}
          <button type="button" className={compact ? 'canteen-pick-compact-btn pressable' : 'canteen-pick-btn pressable'} onClick={handlePick}>
            {compact ? '换一个' : t.pickBtn}
          </button>
        </div>
      ) : loading ? (
        <div className="canteen-pick-loading">
          <div className="canteen-pick-dice">🎲</div>
          <span>{t.pickLoading}</span>
        </div>
      ) : isError ? (
        <div className="state-error">{t.pickError}</div>
      ) : !meal ? (
        <div className="canteen-pick-empty">
          <p>{t.pickEmpty}</p>
          <button type="button" className="canteen-pick-reroll pressable" onClick={() => refetch()}>
            {t.pickRetry}
          </button>
        </div>
      ) : (
        <div className="canteen-pick-result">
          <div className="canteen-pick-card" onClick={() => navigate(`/eat/food/${meal.id}`)}>
            <img
              src={productImageUrl(meal.cover_url)}
              alt={meal.name}
              className="canteen-pick-img"
            />
            <div className="canteen-pick-info">
              <span className="canteen-pick-name">{meal.name}</span>
              <span className="canteen-pick-shop">
                {meal.shop_name}
                {meal.region_code ? ` · ${meal.region_code}` : ''}
              </span>
              {meal.comprehensive_score != null && Number(meal.comprehensive_score) > 0 && (
                <span className="canteen-pick-score">
                  {t.pickOverallScore} {Number(meal.comprehensive_score).toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="canteen-pick-reroll pressable" onClick={handleReroll}>
            {t.pickReroll}
          </button>
        </div>
      )}
    </>
  );

  if (compact) {
    return <div className="canteen-pick-compact">{content}</div>;
  }

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">{t.pickTitle}</h3>
      {content}
    </div>
  );
}
