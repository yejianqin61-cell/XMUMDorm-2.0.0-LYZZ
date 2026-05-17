import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pickRandomMeal } from '../../api/canteen';
import { QK } from '../../query/queryKeys';
import { productImageUrl } from '../../api/config';

export default function CanteenPickMeal() {
  const navigate = useNavigate();
  const [excludeId, setExcludeId] = useState(0);
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.canteenPickRandom(excludeId),
    queryFn: () => pickRandomMeal(excludeId),
    enabled,
    staleTime: 0,
  });

  const meal = data?.data || data;

  const handlePick = useCallback(() => {
    setEnabled(true);
    refetch();
  }, [refetch]);

  const handleReroll = useCallback(() => {
    if (meal?.id) setExcludeId(meal.id);
    refetch();
  }, [meal, refetch]);

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">今天吃什么</h3>
      {!enabled ? (
        <div className="canteen-pick-init">
          <p className="canteen-pick-text">不知道吃什么？</p>
          <button type="button" className="canteen-pick-btn pressable" onClick={handlePick}>
            🎲 帮我决定
          </button>
        </div>
      ) : isLoading ? (
        <div className="canteen-pick-loading">
          <div className="canteen-pick-dice">🎲</div>
          <span>正在帮你挑选...</span>
        </div>
      ) : isError || !meal ? (
        <div className="state-error">加载失败，请再试一次</div>
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
              <span className="canteen-pick-shop">{meal.shop_name} · {meal.region_code}</span>
              {meal.comprehensive_score > 0 && (
                <span className="canteen-pick-score">综合评分 {Number(meal.comprehensive_score).toFixed(1)}</span>
              )}
            </div>
          </div>
          <button type="button" className="canteen-pick-reroll pressable" onClick={handleReroll}>
            🔄 再摇一次
          </button>
        </div>
      )}
    </div>
  );
}
