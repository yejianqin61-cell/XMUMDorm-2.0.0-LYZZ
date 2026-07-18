import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './StackedCardCarousel.css';

function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * 多图叠卡轮播（与帖子详情一致）：左右箭头、点阵、拖拽切图。
 * @param {string[]} urls
 */
export function StackedCardCarousel({ urls, index, onChangeIndex, onOpenPreview, dir, flat = false }) {
  const n = Array.isArray(urls) ? urls.length : 0;
  if (!n) return null;

  const stack = [
    { scale: 1, x: 0, y: 0, opacity: 1, blur: 0, rotate: 0 },
    { scale: 0.94, x: 15, y: -15, opacity: 0.6, blur: 4, rotate: -2 },
    { scale: 0.88, x: 30, y: -30, opacity: 0.3, blur: 8, rotate: -4 },
  ];

  const count = flat ? 1 : Math.min(3, n);
  const ids = Array.from({ length: count }, (_, i) => mod(index + i, n));

  const go = (delta) => {
    if (n <= 1) return;
    const next = mod(index + delta, n);
    onChangeIndex(next, delta > 0 ? 1 : -1);
  };

  const frontId = ids[0];

  return (
    <div className={`post-detail-carousel ${flat ? 'post-detail-carousel--flat' : ''}`} aria-label="Image carousel">
      <div className="post-detail-carousel-stack">
        {ids.slice(1).reverse().map((id, revIdx) => {
          const pos = ids.length - (revIdx + 1);
          const s = stack[pos];
          return (
            <motion.button
              key={`stack-${id}`}
              type="button"
              className="post-detail-carousel-card"
              onClick={() => onOpenPreview(id)}
              style={{ zIndex: 10 + (3 - pos) }}
              animate={{
                scale: s.scale,
                x: s.x,
                y: s.y,
                opacity: s.opacity,
                rotate: s.rotate,
                filter: `blur(${s.blur}px)`,
              }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <img src={urls[id]} alt="" className="post-detail-carousel-img" draggable={false} />
            </motion.button>
          );
        })}

        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.button
            key={`front-${frontId}`}
            type="button"
            className="post-detail-carousel-card post-detail-carousel-card--front"
            onClick={() => onOpenPreview(frontId)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              const swipe = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 700;
              if (!swipe) return;
              if (info.offset.x < 0) go(1);
              else go(-1);
            }}
            custom={dir}
            initial={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
            animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
            exit={(d) => ({
              x: d > 0 ? 140 : -140,
              y: -40,
              rotate: d > 0 ? 14 : -14,
              opacity: 0,
              transition: { type: 'spring', stiffness: 520, damping: 40 },
            })}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            style={{ zIndex: 30 }}
          >
            <img src={urls[frontId]} alt="" className="post-detail-carousel-img" draggable={false} />
          </motion.button>
        </AnimatePresence>

        <button type="button" className="post-detail-carousel-arrow post-detail-carousel-arrow--left" onClick={() => go(-1)} aria-label="Previous">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" className="post-detail-carousel-arrow post-detail-carousel-arrow--right" onClick={() => go(1)} aria-label="Next">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="post-detail-carousel-dots" aria-label="Pagination">
        {flat ? (
          <span className="post-detail-carousel-count">{index + 1} / {n}</span>
        ) : urls.map((_, i) => (
          <button
            key={`dot-${i}`}
            type="button"
            className={`post-detail-carousel-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => onChangeIndex(i, i > index ? 1 : -1)}
            aria-label={`Go to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
