import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getCanteenBanners } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { productImageUrl } from '@shared/api/config';
import './CanteenBannerCarousel.css';

const LINK_NAV = {
  product: (target) => `/eat/food/${target}`,
  shop: (target) => `/eat/merchant/${target}`,
  post: (target) => `/post/${target}`,
  region: (target) => `/eat/${target}`,
};

const AUTOPLAY_MS = 4000;

export default function CanteenBannerCarousel({
  fetchFn = getCanteenBanners,
  queryKey = QK.canteenBanners(),
  adminTo = '/eat/banners',
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
  });
  const banners = Array.isArray(data) ? data : data?.data || [];
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef(null);

  const len = banners.length;
  const next = useCallback(() => {
    if (len > 0) setIdx((p) => (p + 1) % len);
  }, [len]);
  const prev = useCallback(() => {
    if (len > 0) setIdx((p) => (p - 1 + len) % len);
  }, [len]);

  const resetAutoplay = useCallback(() => {
    clearInterval(intervalRef.current);
    if (len > 1) {
      intervalRef.current = setInterval(next, AUTOPLAY_MS);
    }
  }, [len, next]);

  useEffect(() => {
    if (len <= 1) return undefined;
    intervalRef.current = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(intervalRef.current);
  }, [len, next]);

  useEffect(() => {
    if (idx >= len && len > 0) setIdx(0);
  }, [idx, len]);

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

  const stopNav = (e) => {
    e.stopPropagation();
    resetAutoplay();
  };

  if (isLoading || isError || len === 0) return null;

  const b = banners[idx];

  return (
    <div className="canteen-banner-wrap">
      <div className="canteen-banner-viewport">
        {isAdmin && (
          <Link
            to={adminTo}
            className="canteen-banner-admin-link"
            onClick={stopNav}
          >
            {t.bannerManage}
          </Link>
        )}
        {len > 1 && (
          <>
            <button
              type="button"
              className="canteen-banner-nav canteen-banner-nav--prev"
              aria-label={t.bannerPrev}
              onClick={(e) => {
                stopNav(e);
                prev();
              }}
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              className="canteen-banner-nav canteen-banner-nav--next"
              aria-label={t.bannerNext}
              onClick={(e) => {
                stopNav(e);
                next();
              }}
            >
              <span aria-hidden>›</span>
            </button>
          </>
        )}
        <div
          className="canteen-banner-card"
          role="button"
          tabIndex={0}
          aria-label={b.title}
          onClick={() => handleClick(b)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(b);
            }
          }}
        >
          <div className="canteen-banner-media">
            <img
              src={productImageUrl(b.image_url)}
              alt=""
              className="canteen-banner-img"
              loading="lazy"
            />
            <div className="canteen-banner-vignette-top" aria-hidden />
            <div className="canteen-banner-vignette-bottom" aria-hidden />
            <div className="canteen-banner-content">
              <div className="canteen-banner-title-row">
                <span className="canteen-banner-title">{b.title}</span>
                {b.type === 'ad' && <span className="canteen-banner-ad-tag">{t.bannerAd}</span>}
              </div>
              {b.subtitle ? <span className="canteen-banner-subtitle">{b.subtitle}</span> : null}
            </div>
          </div>
        </div>
      </div>
      {len > 1 && (
        <div className="canteen-banner-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`canteen-banner-dot${i === idx ? ' canteen-banner-dot--active' : ''}`}
              aria-label={t.bannerSlide(i + 1)}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
                resetAutoplay();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
