import { useMemo } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@shared/api/config';
import './AdvertisementDetailView.css';

function absoluteAsset(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function internalTarget(type, target) {
  const value = String(target || '').trim();
  if (!value) return '';
  if (type === 'shop' && /^\d+$/.test(value)) return `/eat/merchant/${value}`;
  if (type === 'product' && /^\d+$/.test(value)) return `/eat/food/${value}`;
  if (type === 'region' && /^[A-Za-z0-9_-]+$/.test(value)) return `/eat/${value}`;
  if (type === 'internal' && value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

export default function AdvertisementDetailView({
  advertisement,
  loading = false,
  error = null,
  isEn = false,
  onBack,
  onNavigate,
}) {
  const ArrowLeft = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>;
  const ExternalLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>;
  const unavailable = error?.status === 410;
  const imageUrls = useMemo(
    () => (advertisement?.images || []).map((image) => absoluteAsset(image.url)).filter(Boolean),
    [advertisement]
  );

  const handleCta = async () => {
    const type = advertisement?.cta_type || 'none';
    const target = String(advertisement?.cta_target || '').trim();
    if (type === 'https' && /^https:\/\//i.test(target)) {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: target });
      } else {
        window.open(target, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    const path = internalTarget(type, target);
    if (path) onNavigate?.(path);
  };

  if (loading) {
    return <div className="advertisement-detail-page"><p>{isEn ? 'Loading…' : '加载中…'}</p></div>;
  }

  if (unavailable || error || !advertisement) {
    return (
      <div className="advertisement-detail-page advertisement-detail-page--state">
        <p>{unavailable ? (isEn ? 'This advertisement has ended or is unavailable.' : '广告已结束或暂不可用') : (isEn ? 'Advertisement unavailable.' : '广告暂不可用')}</p>
        <button type="button" onClick={() => onBack?.()}>
          {isEn ? 'Back' : '返回'}
        </button>
      </div>
    );
  }

  const ctaLabel = advertisement.cta_label || (isEn ? 'Learn more' : '了解更多');
  const sponsor = advertisement.sponsor_name || (isEn ? 'Sponsored' : '投放方');

  return (
    <main className="advertisement-detail-page">
      <header className="advertisement-detail-header">
        <button
          type="button"
          className="advertisement-detail-back"
          onClick={() => onBack?.()}
          aria-label={isEn ? 'Back' : '返回'}
        >
          <ArrowLeft />
        </button>
        <span>{isEn ? 'Advertisement' : '广告'}</span>
      </header>

      <article className="advertisement-detail-card">
        <div className="advertisement-detail-sponsor">
          {advertisement.sponsor_logo ? (
            <img src={absoluteAsset(advertisement.sponsor_logo)} alt="" />
          ) : null}
          <span>{isEn ? `Sponsored · ${sponsor}` : `广告 · ${sponsor}`}</span>
        </div>
        {advertisement.title ? <h1>{advertisement.title}</h1> : null}
        <p className="advertisement-detail-content">{advertisement.content}</p>
        {imageUrls.length > 0 ? (
          <div className="advertisement-detail-images">
            {imageUrls.map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
          </div>
        ) : null}
        {advertisement.cta_type !== 'none' && advertisement.cta_target ? (
          <button type="button" className="advertisement-detail-cta" onClick={handleCta}>
            {ctaLabel}
            {advertisement.cta_type === 'https' ? <ExternalLink /> : null}
          </button>
        ) : null}
      </article>
    </main>
  );
}
