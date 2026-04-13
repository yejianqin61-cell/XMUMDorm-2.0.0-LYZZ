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
 * 卡片内卡通：底部对齐，与下方第一个输入框无缝衔接
 */
export default function MascotHero() {
  const [index, setIndex] = useState(0);
  const src = MASCOT_CANDIDATES[index] ?? MASCOT_CANDIDATES[MASCOT_CANDIDATES.length - 1];

  const handleError = () => {
    setIndex((prev) => (prev + 1 < MASCOT_CANDIDATES.length ? prev + 1 : prev));
  };

  return (
    <div className="flex w-full justify-center leading-[0]">
      <img
        src={src}
        alt=""
        width={360}
        height={280}
        className="block max-h-[min(58vw,18.5rem)] w-auto max-w-full object-contain object-bottom drop-shadow-[0_14px_32px_rgba(15,23,42,0.25)] sm:max-h-[min(50vw,20.5rem)]"
        onError={handleError}
        draggable={false}
      />
    </div>
  );
}
