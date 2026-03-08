import { useState, useEffect, useCallback } from 'react';
import './ImagePreview.css';

/**
 * 全屏图片预览：左右切换、点击遮罩关闭
 * @param {string[]} urls 图片 URL 列表
 * @param {number} initialIndex 初始显示下标
 * @param {Function} onClose 关闭回调
 */
function ImagePreview({ urls = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const len = urls.length;

  const go = useCallback(
    (delta) => {
      if (len <= 0) return;
      setIndex((i) => (i + delta + len) % len);
    },
    [len]
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, go]);

  if (urls.length === 0) return null;

  const currentUrl = urls[index];

  return (
    <div
      className="image-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <button
        type="button"
        className="image-preview-close"
        onClick={onClose}
        aria-label="关闭"
      >
        ×
      </button>
      {len > 1 && (
        <>
          <button
            type="button"
            className="image-preview-prev"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            type="button"
            className="image-preview-next"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="下一张"
          >
            ›
          </button>
        </>
      )}
      <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
        <img src={currentUrl} alt="" className="image-preview-img" />
      </div>
      {len > 1 && (
        <span className="image-preview-counter" aria-live="polite">
          {index + 1} / {len}
        </span>
      )}
    </div>
  );
}

export default ImagePreview;
