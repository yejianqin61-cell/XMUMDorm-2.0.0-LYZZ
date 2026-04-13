import { useState } from 'react';

/** public 下常见文件名依次尝试，便于你直接丢图不改代码 */
const MASCOT_CANDIDATES = [
  '/mascot.png',
  '/mascot.webp',
  '/mascot.jpg',
  '/xmum-mascot.png',
  '/cartoon.png',
  '/icon-512-removebg-preview.png',
];

/**
 * 卡片外卡通：默认底部对齐；compact 用于注册/重置密码页——放大且顶部对齐，头部贴近视口上沿
 */
export default function MascotHero({ compact = false }) {
  const [index, setIndex] = useState(0);
  const src = MASCOT_CANDIDATES[index] ?? MASCOT_CANDIDATES[MASCOT_CANDIDATES.length - 1];

  const handleError = () => {
    setIndex((prev) => (prev + 1 < MASCOT_CANDIDATES.length ? prev + 1 : prev));
  };

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
            ? 'block max-h-[min(52vh,24rem)] w-auto max-w-[min(100%,26rem)] object-contain object-top drop-shadow-[0_14px_32px_rgba(15,23,42,0.22)] sm:max-h-[min(48vh,26rem)] sm:max-w-md'
            : 'block max-h-[min(58vw,18.5rem)] w-auto max-w-full object-contain object-bottom drop-shadow-[0_14px_32px_rgba(15,23,42,0.25)] sm:max-h-[min(50vw,20.5rem)]'
        }
        onError={handleError}
        draggable={false}
      />
    </div>
  );
}
