import { useEffect, useMemo, useState } from 'react';

/** public 下常见文件名依次尝试，便于你直接丢图不改代码 */
const MASCOT_CANDIDATES = [
  '/mascot.png',
  '/mascot.webp',
  '/mascot.jpg',
  '/xmum-mascot.png',
  '/cartoon.png',
  '/icon-512-removebg-preview.png',
];

const MASCOT_CACHE_NAME = 'xmumdorm-static-v1';

let resolvedMascotSrc = '';
let resolvingPromise = null;

function preloadImage(src, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error('timeout'));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(t);
      resolve(true);
    };
    img.onerror = () => {
      window.clearTimeout(t);
      reject(new Error('error'));
    };
    img.src = src;
  });
}

async function cacheToStorage(src) {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(MASCOT_CACHE_NAME);
    const hit = await cache.match(src);
    if (hit) return;
    await cache.add(src);
  } catch {
    // ignore cache errors (e.g., private mode / storage quota)
  }
}

async function resolveMascotSrc() {
  if (resolvedMascotSrc) return resolvedMascotSrc;
  if (resolvingPromise) return resolvingPromise;

  resolvingPromise = (async () => {
    for (const candidate of MASCOT_CANDIDATES) {
      try {
        await preloadImage(candidate);
        resolvedMascotSrc = candidate;
        cacheToStorage(candidate);
        return candidate;
      } catch {
        // try next candidate
      }
    }
    resolvedMascotSrc = MASCOT_CANDIDATES[MASCOT_CANDIDATES.length - 1];
    return resolvedMascotSrc;
  })();

  return resolvingPromise;
}

/**
 * 卡片外卡通：默认底部对齐；compact 用于注册/重置密码页——放大且顶部对齐，头部贴近视口上沿
 */
export default function MascotHero({ compact = false }) {
  const initialSrc = useMemo(() => resolvedMascotSrc || MASCOT_CANDIDATES[0], []);
  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    let alive = true;
    resolveMascotSrc().then((finalSrc) => {
      if (!alive) return;
      setSrc(finalSrc);
    });
    return () => {
      alive = false;
    };
  }, []);

  const wrap = compact
    ? 'flex w-full shrink-0 justify-center self-stretch leading-[0]'
    : 'flex w-full justify-center leading-[0]';

  return (
    <div className={wrap}>
      <img
        src={src}
        alt=""
        width={360}
        height={280}
        className={
          compact
            ? 'block max-h-[min(28vh,10.5rem)] w-auto max-w-[min(100%,14rem)] object-contain object-top drop-shadow-[0_10px_22px_rgba(15,23,42,0.10)]'
            : 'block max-h-[min(32vh,12rem)] w-auto max-w-[min(100%,16rem)] object-contain object-bottom drop-shadow-[0_12px_26px_rgba(15,23,42,0.12)]'
        }
        draggable={false}
      />
    </div>
  );
}
