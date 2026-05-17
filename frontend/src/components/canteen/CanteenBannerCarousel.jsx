import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCanteenBanners } from '../../api/canteen';
import { QK } from '../../query/queryKeys';
import { productImageUrl } from '../../api/config';

const LINK_NAV = {
  product: (target) => `/eat/food/${target}`,
  shop: (target) => `/eat/merchant/${target}`,
  post: (target) => `/post/${target}`,
  region: (target) => `/eat/${target}`,
};

export default function CanteenBannerCarousel() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.canteenBanners(),
    queryFn: getCanteenBanners,
    staleTime: 5 * 60 * 1000,
  });
  const banners = Array.isArray(data) ? data : data?.data || [];
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef(null);

  const len = banners.length;
  const next = useCallback(() => { if (len > 0) setIdx((p) => (p + 1) % len); }, [len]);
  const prev = useCallback(() => { if (len > 0) setIdx((p) => (p - 1 + len) % len); }, [len]);

  useEffect(() => {
    if (len <= 1) return;
    intervalRef.current = setInterval(next, 4000);
    return () => clearInterval(intervalRef.current);
  }, [len, next]);

  const handleClick = (b) => {
    if (b.link_type === 'url' && b.link_target) {
      window.open(b.link_target, '_blank', 'noopener');
      return;
    }
    const path = LINK_NAV[b.link_type];
    if (path && b.link_target) {
      navigate(path(b.link_target));
    }
  };

  if (isLoading) {
    return (
      <div className="canteen-banner-wrap">
        <div className="canteen-banner-skeleton" />
      </div>
    );
  }

  if (isError || len === 0) return null;

  const b = banners[idx];

  return (
    <div className="canteen-banner-wrap">
      <div className="canteen-banner-card" onClick={() => handleClick(b)}>
        <img
          src={productImageUrl(b.image_url)}
          alt={b.title}
          className="canteen-banner-img"
          loading="lazy"
        />
        <div className="canteen-banner-info">
          <div className="canteen-banner-title-row">
            <span className="canteen-banner-title">{b.title}</span>
            {b.type === 'ad' && <span className="canteen-banner-ad-tag">广告</span>}
          </div>
          {b.subtitle && <span className="canteen-banner-subtitle">{b.subtitle}</span>}
        </div>
      </div>
      {len > 1 && (
        <div className="canteen-banner-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`canteen-banner-dot${i === idx ? ' canteen-banner-dot--active' : ''}`}
              aria-label={`第 ${i + 1} 张`}
              onClick={() => { setIdx(i); clearInterval(intervalRef.current); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
