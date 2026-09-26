import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getCanteenBanners } from '@shared/api/canteen';
import { recordAdvertisementClick } from '@shared/api/advertisements';
import { QK } from '@shared/query/queryKeys';
import { productImageUrl } from '@shared/api/config';
import Badge from '../../components/ui/Badge';
import { NeoCarousel } from '../../components/retroui/Carousel';
import './CanteenBannerCarousel.css';

const LINK_NAV = {
  product: (target) => `/eat/food/${target}`,
  shop: (target) => `/eat/merchant/${target}`,
  post: (target) => `/post/${target}`,
  region: (target) => `/eat/${target}`,
};

export default function CanteenBannerCarousel({
  fetchFn = getCanteenBanners,
  queryKey = QK.canteenBanners(),
  adminTo = '/eat/banners',
  placementType = 'canteen',
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
  const len = banners.length;

  const [emblaApi, setEmblaApi] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const handleApiReady = useCallback((api) => {
    setEmblaApi(api);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIdx(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || len <= 1) return;
    const id = setInterval(() => { emblaApi.scrollNext(); }, 4000);
    return () => clearInterval(id);
  }, [emblaApi, len]);

  const goToSlide = useCallback((i) => {
    if (emblaApi) emblaApi.scrollTo(i);
  }, [emblaApi]);

  const handleClick = useCallback((b) => {
    if (b.type === 'ad' && b.link_type === 'post' && b.link_target) {
      recordAdvertisementClick(b.link_target, {
        placement_type: placementType,
        placement_id: b.id,
        click_type: 'banner',
      }).catch(() => {});
      navigate(`/advertisement/${b.link_target}`);
      return;
    }
    if (b.link_type === 'url' && b.link_target) {
      window.open(b.link_target, '_blank', 'noopener');
      return;
    }
    const path = LINK_NAV[b.link_type];
    if (path && b.link_target) {
      navigate(path(b.link_target));
    }
  }, [navigate, placementType]);

  if (isLoading || isError || len === 0) return null;

  return (
    <div className="canteen-banner-wrap">
      {isAdmin && (
        <Link to={adminTo} className="canteen-banner-admin-link">
          <Badge tone="info" size="sm">{t.bannerManage}</Badge>
        </Link>
      )}

      <NeoCarousel
        opts={{ loop: len > 1, align: 'start' }}
        setApi={handleApiReady}
        className="relative"
      >
        <NeoCarousel.Content>
          {banners.map((b) => (
            <NeoCarousel.Item key={b.id}>
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
                      {b.type === 'ad' && (
                        <Badge tone="warning" size="sm" className="text-[10px]">{t.bannerAd}</Badge>
                      )}
                    </div>
                    {b.subtitle ? <span className="canteen-banner-subtitle">{b.subtitle}</span> : null}
                  </div>
                </div>
              </div>
            </NeoCarousel.Item>
          ))}
        </NeoCarousel.Content>

        {len > 1 && (
          <>
            <NeoCarousel.Previous
              variant="ghost"
              className="absolute top-1/2 left-2 -translate-y-1/2 z-10 size-8 rounded-full bg-black/35 text-white border-0 hover:bg-black/50"
            />
            <NeoCarousel.Next
              variant="ghost"
              className="absolute top-1/2 right-2 -translate-y-1/2 z-10 size-8 rounded-full bg-black/35 text-white border-0 hover:bg-black/50"
            />
          </>
        )}
      </NeoCarousel>

      {len > 1 && (
        <div className="canteen-banner-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`canteen-banner-dot${i === currentIdx ? ' canteen-banner-dot--active' : ''}`}
              aria-label={t.bannerSlide(i + 1)}
              onClick={() => goToSlide(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}