import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import ImagePreview from '../../components/ImagePreview';
import { useLanguage } from '../../context/LanguageContextState';
import CampusNewsModal from './CampusNewsModal';
import { CAMPUS_NEWS_IMAGE_LIMIT } from './campusNewsModel';

function NewsImage({ image, onOpen, index, total, track }) {
  const [failed, setFailed] = useState(false);
  const [nearby, setNearby] = useState(false);
  const ref = useRef(null);
  const { lang } = useLanguage();
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect(); }
    }, { root: track.current, rootMargin: '0px 100% 0px 100%' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [track]);
  return (
    <div ref={ref} className="campus-news-media__slide">
      {failed ? <div className="campus-news-media__failed" role="img" aria-label={image.alt}>
        <ImageOff size={24} /><span>{lang === 'en' ? 'Image unavailable' : '图片暂时无法加载'}</span>
      </div> : <button type="button" className="campus-news-media__image" onClick={onOpen}
        aria-label={lang === 'en' ? `View image ${index + 1} of ${total}: ${image.alt}` : `查看第 ${index + 1} 张图片，共 ${total} 张：${image.alt}`}>
        <img src={nearby || !('IntersectionObserver' in window) ? image.src : undefined} alt={image.alt}
          loading="lazy" decoding="async" draggable="false" onError={() => setFailed(true)} />
      </button>}
    </div>
  );
}

export default function CampusNewsMedia({ images = [] }) {
  const [preview, setPreview] = useState(null);
  const [position, setPosition] = useState({ index: 0, atEnd: false });
  const track = useRef(null);
  const gesture = useRef(null);
  const { lang } = useLanguage();
  const shown = images.slice(0, CAMPUS_NEWS_IMAGE_LIMIT);
  const updatePosition = () => {
    const el = track.current;
    if (!el) return;
    const slides = [...el.children];
    const index = slides.reduce((best, slide, i) => Math.abs(slide.offsetLeft - el.scrollLeft) < Math.abs(slides[best].offsetLeft - el.scrollLeft) ? i : best, 0);
    setPosition({ index, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  const move = (delta) => {
    const el = track.current;
    const index = Math.max(0, Math.min(shown.length - 1, position.index + delta));
    el.scrollTo({ left: el.children[index].offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  if (!shown.length) return null;
  return (
    <div className="campus-news-media-wrap" onClick={(event) => event.stopPropagation()}>
      <div ref={track} className={`campus-news-media${shown.length === 1 ? ' campus-news-media--single' : ''}`}
        role="region" aria-label={lang === 'en' ? 'Post images' : '帖子图片'} tabIndex={shown.length > 1 ? 0 : undefined}
        onScroll={updatePosition}
        onKeyDown={(event) => {
          if (shown.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault(); event.stopPropagation(); move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
        onPointerDown={(event) => { gesture.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, moved: false, active: true }; }}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g?.active) return;
          const dx = event.clientX - g.x;
          if (Math.abs(dx) > 6 || Math.abs(event.clientY - g.y) > 6) g.moved = true;
          if (event.pointerType === 'mouse' && g.moved && event.buttons === 1) {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.style.scrollSnapType = 'none';
            event.currentTarget.scrollLeft = g.left - dx;
          }
        }}
        onPointerUp={(event) => { if (gesture.current) gesture.current.active = false; event.currentTarget.style.scrollSnapType = ''; }}
        onPointerCancel={(event) => { event.currentTarget.style.scrollSnapType = ''; if (gesture.current) { gesture.current.active = false; gesture.current.moved = true; } }}
        onClickCapture={(event) => { if (gesture.current?.moved) { event.preventDefault(); event.stopPropagation(); } }}>
        {shown.map((image, index) => <NewsImage key={`${image.src}-${index}`} image={image} index={index} total={shown.length} track={track} onOpen={() => setPreview(index)} />)}
      </div>
      {shown.length > 1 && <>
        <button type="button" className="campus-news-media__previous" disabled={position.index === 0} onClick={() => move(-1)} aria-label={lang === 'en' ? 'Previous image' : '上一张图片'}><ChevronLeft size={19} /></button>
        <button type="button" className="campus-news-media__next" disabled={position.atEnd} onClick={() => move(1)} aria-label={lang === 'en' ? 'Next image' : '下一张图片'}><ChevronRight size={19} /></button>
        <span className="campus-news-media__counter" aria-live="polite">{position.index + 1} / {shown.length}</span>
      </>}
      {preview !== null && <CampusNewsModal className="campus-news-lightbox" label="图片预览 / Image preview" onClose={() => setPreview(null)}>
        <ImagePreview urls={shown.map((image) => image.src)} initialIndex={preview} onClose={() => setPreview(null)} />
      </CampusNewsModal>}
    </div>
  );
}
