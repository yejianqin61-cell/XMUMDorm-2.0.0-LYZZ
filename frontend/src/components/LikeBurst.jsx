import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import './LikeBurst.css';

/** 预定义 8 个方向（角度），心形向四周飞散 */
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DIST = 48;

function getOffset(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * DIST,
    y: -Math.sin(rad) * DIST,
  };
}

/**
 * 点赞飞心动画：通过 ref.trigger(event) 在点击位置触发多心飞散
 * 使用：<LikeBurst ref={likeBurstRef} />，点击时 likeBurstRef.current?.trigger(e)
 */
const LikeBurst = forwardRef(function LikeBurst(_, ref) {
  const [burst, setBurst] = useState(null);
  const timerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    trigger(ev) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const x = ev?.clientX ?? 0;
      const y = ev?.clientY ?? 0;
      setBurst({ x, y, key: Date.now() });
      timerRef.current = setTimeout(() => {
        setBurst(null);
        timerRef.current = null;
      }, 700);
    },
  }), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!burst) return null;

  return (
    <div
      className="like-burst-wrap"
      style={{ left: burst.x, top: burst.y }}
      aria-hidden
    >
      {ANGLES.map((angle, i) => {
        const { x, y } = getOffset(angle);
        return (
          <span
            key={`${burst.key}-${i}`}
            className="like-burst-heart"
            style={{ '--tx': `${x}px`, '--ty': `${y}px`, '--i': i }}
          >
            ♥
          </span>
        );
      })}
    </div>
  );
});

export default LikeBurst;
