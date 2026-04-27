import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './CanteenArea.css';

/** 食堂地图页：背景图 + 建筑贴图；编辑模式支持拖拽并复制配置 */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function getCoverTransform(containerW, containerH, imgW, imgH) {
  if (!containerW || !containerH || !imgW || !imgH) {
    return { scale: 1, offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 };
  }
  const scale = Math.max(containerW / imgW, containerH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const offsetX = (containerW - drawW) / 2;
  const offsetY = (containerH - drawH) / 2;
  return { scale, offsetX, offsetY, drawW, drawH };
}

function containerPctRectToImgPctRect(rect, cover, containerW, containerH, imgW, imgH) {
  const leftPct = Number(rect?.left ?? 0);
  const topPct = Number(rect?.top ?? 0);
  const widthPct = Number(rect?.width ?? 20);
  const xPx = (leftPct / 100) * containerW;
  const yPx = (topPct / 100) * containerH;
  const wPx = (widthPct / 100) * containerW;

  const denomW = imgW * cover.scale;
  const denomH = imgH * cover.scale;
  const x = ((xPx - cover.offsetX) / denomW) * 100;
  const y = ((yPx - cover.offsetY) / denomH) * 100;
  const w = (wPx / denomW) * 100;

  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    w: clamp(w, 2, 100),
    space: 'img',
  };
}

function imgPctRectToStyle(rect, cover, imgW, imgH) {
  const x = Number(rect?.x ?? 0);
  const y = Number(rect?.y ?? 0);
  const w = Number(rect?.w ?? 20);
  const leftPx = cover.offsetX + (x / 100) * imgW * cover.scale;
  const topPx = cover.offsetY + (y / 100) * imgH * cover.scale;
  const widthPx = (w / 100) * imgW * cover.scale;
  return { left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px` };
}

function CanteenArea() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editMode = params.get('edit') === '1';
  const mapRef = useRef(null);
  const bgImgRef = useRef(null);
  const [cover, setCover] = useState({ scale: 1, offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // 注意：为了解决不同手机宽高比导致的 cover 裁切偏移，本页的贴图坐标最终统一存为“背景原图坐标系百分比”
  // - rect.space === 'img'：x/y/w 是相对背景原图的百分比（推荐，跨设备一致）
  // - rect.space 为空：历史数据（相对容器百分比），会在首次加载时自动迁移为 img 坐标
  const defaultStickers = useMemo(
    () => [
      {
        id: 'rank',
        label: 'Rank',
        to: '/eat/rankings',
        src: '/Rank.png',
        rect: { x: 60.617478591432274, y: 31.51669023851116, w: 18.000000000000004, space: 'img' },
      },
      {
        id: 'd6',
        label: 'D6',
        to: '/eat/D6',
        src: '/D6.png',
        rect: { x: 10.088236618257513, y: 37.475782829492736, w: 36.00000000000001, space: 'img' },
      },
      {
        id: 'ly3',
        label: 'LY3',
        to: '/eat/LY3',
        src: '/LY3.png',
        rect: { x: 60.563063902878504, y: 37.03073602815839, w: 42, space: 'img' },
      },
      {
        id: 'b1',
        label: 'B1',
        to: '/eat/B1',
        src: '/B1.png',
        rect: { x: 0.0000030070810745908005, y: 48.917046114655484, w: 34.00000000000001, space: 'img' },
      },
      {
        id: 'others',
        label: 'OTHERS',
        to: '/eat/other',
        src: '/OTHERS.png',
        rect: { x: 75.86990290308718, y: 54.965063605016745, w: 22.000000000000004, space: 'img' },
      },
      {
        id: 'bell',
        label: 'BELL',
        to: '/eat/BELL',
        src: '/bell.png',
        rect: { x: 23.19624748633104, y: 67.63816731399169, w: 12.7, space: 'img' },
      },

      // 装饰 GIF（无跳转）：你可在 /eat?edit=1 拖动与缩放
      { id: 'gif-b4', label: 'GIF', src: '/gif/b4.gif', rect: { x: 72.7619377696077, y: 47.399947174645945, w: 6.000000000000001, space: 'img' } },
      { id: 'gif-cat', label: 'GIF', src: '/gif/耄耋猫动态gif表情包 (6)_爱给网_aigei_com.gif', rect: { x: 39.60365876737517, y: 60.49618398932494, w: 22.000000000000004, space: 'img' } },
      { id: 'gif-doge', label: 'GIF', src: '/gif/vsgif_com_dogecoin-meme_.3422573.gif', rect: { x: 88.48344437907343, y: 31.46292194294762, w: 10, space: 'img' } },
      {
        id: 'gif-catwalk-1',
        label: 'GIF',
        src: '/gif/迪莫走猫步_爱给网_aigei_com.gif',
        rect: { x: 33.67053917687579, y: 76.57888644661566, w: 12.000000000000002, space: 'img' },
      },
      {
        id: 'gif-crosswalk',
        label: 'GIF',
        src: '/gif/斑马线人行道过马路走路走gif图素材_爱给网_aigei_com.gif',
        rect: { x: 45.0057718351608, y: 42.04150438984765, w: 16.000000000000004, space: 'img' },
      },
    ],
    []
  );

  // bump 版本：移除“静态云贴图”，避免继续读到旧配置
  const storageKey = 'eat_map_stickers_v11_imgspace';
  const [stickers, setStickers] = useState(defaultStickers);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 兼容：用户本地可能还保留已删除素材的旧配置（过滤掉无 src 的项）
        // 同时过滤掉已废弃的静态云贴图（云改为天空层动画，不再作为 sticker）
        const base = parsed.filter((x) => x && x.src && x.id !== 'cloud');
        setStickers(base);
      }
    } catch {}
  }, [defaultStickers, storageKey]);

  useEffect(() => {
    if (!editMode) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(stickers));
    } catch {}
  }, [editMode, stickers]);

  const dragRef = useRef(null); // { id, startX, startY, startRect, box }

  // 计算 cover 变换（container resize / img load）
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return undefined;
    const update = () => {
      const box = el.getBoundingClientRect();
      const img = bgImgRef.current;
      const iw = img?.naturalWidth || 0;
      const ih = img?.naturalHeight || 0;
      if (!iw || !ih) return;
      setImgSize({ w: iw, h: ih });
      setCover(getCoverTransform(box.width, box.height, iw, ih));
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 自动迁移：把历史“容器百分比”坐标转换成“原图坐标系百分比”
  useEffect(() => {
    const el = mapRef.current;
    const iw = imgSize.w;
    const ih = imgSize.h;
    if (!el || !iw || !ih) return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    let changed = false;
    setStickers((prev) =>
      prev.map((s) => {
        if (!s || !s.rect) return s;
        if (s.rect.space === 'img') return s;
        changed = true;
        const imgRect = containerPctRectToImgPctRect(s.rect, cover, box.width, box.height, iw, ih);
        return { ...s, rect: imgRect };
      })
    );
    if (changed) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(stickers));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize.w, imgSize.h, cover.scale, cover.offsetX, cover.offsetY]);

  const startDrag = (id, ev) => {
    if (!editMode) return;
    setSelectedId(id);
    ev.preventDefault();
    ev.stopPropagation();
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return;
    const s = stickers.find((x) => x.id === id);
    if (!s) return;
    if (s.rect && s.rect.space !== 'img') return; // 等迁移完成再拖
    dragRef.current = {
      id,
      startX: ev.clientX,
      startY: ev.clientY,
      startRect: { ...s.rect },
      box,
    };
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {}
  };

  const onDragMove = (ev) => {
    if (!editMode) return;
    const d = dragRef.current;
    if (!d) return;
    const dx = ev.clientX - d.startX;
    const dy = ev.clientY - d.startY;
    const iw = imgSize.w;
    const ih = imgSize.h;
    if (!iw || !ih) return;
    const denomW = iw * cover.scale;
    const denomH = ih * cover.scale;
    const xDelta = (dx / denomW) * 100;
    const yDelta = (dy / denomH) * 100;
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== d.id) return s;
        const next = { ...s.rect };
        next.x = clamp(d.startRect.x + xDelta, 0, 100);
        next.y = clamp(d.startRect.y + yDelta, 0, 100);
        return { ...s, rect: next };
      })
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const adjustSelectedWidth = (delta) => {
    if (!editMode || !selectedId) return;
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== selectedId) return s;
        const next = { ...s.rect };
        next.w = clamp((next.w ?? 20) + delta, 2, 100);
        return { ...s, rect: next };
      })
    );
  };

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(stickers, null, 2));
    } catch {}
  };

  const reset = () => {
    setStickers(defaultStickers);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  return (
    <div className="canteen-area-page canteen-map-page">
      <div
        className={`canteen-map ${editMode ? 'canteen-map--edit' : ''}`}
        aria-label="Canteen map"
        ref={mapRef}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="canteen-map-bg" aria-hidden>
          <img
            ref={bgImgRef}
            src="/eatbackground.png"
            alt=""
            className="canteen-map-bgimg"
            draggable={false}
            onLoad={() => {
              const el = mapRef.current;
              const img = bgImgRef.current;
              if (!el || !img) return;
              const box = el.getBoundingClientRect();
              const iw = img.naturalWidth || 0;
              const ih = img.naturalHeight || 0;
              if (!iw || !ih) return;
              setImgSize({ w: iw, h: ih });
              setCover(getCoverTransform(box.width, box.height, iw, ih));
            }}
          />
          <div className="canteen-map-bg-overlay" aria-hidden />
        </div>
        <div className="sky-container" aria-hidden>
          {/* Row 1 */}
          <img src="/cloud.png" alt="" className="cloud cloud-distant cloud-r1-a" />
          <img src="/cloud.png" alt="" className="cloud cloud-slow cloud-r1-b" />
          <img src="/cloud.png" alt="" className="cloud cloud-fast cloud-r1-c" />
          {/* Row 2 */}
          <img src="/cloud.png" alt="" className="cloud cloud-distant cloud-r2-a" />
          <img src="/cloud.png" alt="" className="cloud cloud-slow cloud-r2-b" />
          <img src="/cloud.png" alt="" className="cloud cloud-fast cloud-r2-c" />
          {/* Row 3 */}
          <img src="/cloud.png" alt="" className="cloud cloud-distant cloud-r3-a" />
          <img src="/cloud.png" alt="" className="cloud cloud-slow cloud-r3-b" />
        </div>

        {stickers.map((s) => {
          const style =
            s?.rect?.space === 'img'
              ? imgPctRectToStyle(s.rect, cover, imgSize.w, imgSize.h)
              : { left: `${s.rect.left}%`, top: `${s.rect.top}%`, width: `${s.rect.width}%` };
          const cls = `canteen-sticker ${editMode ? 'canteen-sticker--editable' : 'canteen-sticker--link'} ${
            editMode && selectedId === s.id ? 'canteen-sticker--selected' : ''
          }`;
          const showLabel = !!s.label && !String(s.id || '').startsWith('gif-') && String(s.id || '') !== 'rank';
          const labelText = showLabel ? s.label : '';
          return editMode ? (
            <button
              key={s.id}
              type="button"
              className={cls}
              data-id={s.id}
              style={style}
              aria-label={s.label}
              onPointerDown={(ev) => startDrag(s.id, ev)}
              onClick={() => setSelectedId(s.id)}
            >
              <img src={s.src} alt={s.label} className="canteen-sticker-img" draggable={false} />
              {showLabel && (
                <span className="canteen-sticker-label" aria-hidden>
                  <span className="canteen-sticker-label-text">{labelText}</span>
                </span>
              )}
            </button>
          ) : s.to ? (
            <Link
              key={s.id}
              to={s.to}
              className={cls}
              data-id={s.id}
              style={style}
              aria-label={s.label}
            >
              <img src={s.src} alt={s.label} className="canteen-sticker-img" draggable={false} />
              {showLabel && (
                <span className="canteen-sticker-label" aria-hidden>
                  <span className="canteen-sticker-label-text">{labelText}</span>
                </span>
              )}
            </Link>
          ) : (
            <div
              key={s.id}
              className="canteen-sticker canteen-sticker--decor"
              data-id={s.id}
              style={style}
              aria-label={s.label || 'decor'}
            >
              <img src={s.src} alt={s.label || ''} className="canteen-sticker-img" draggable={false} />
              {showLabel && (
                <span className="canteen-sticker-label" aria-hidden>
                  <span className="canteen-sticker-label-text">{labelText}</span>
                </span>
              )}
            </div>
          );
        })}

        {editMode && (
          <div className="canteen-map-editor">
            <div className="canteen-map-editor-title">贴图拖拽布局模式</div>
            <div className="canteen-map-editor-sub">拖动贴图到合适位置后，点“复制配置”发给我。</div>
            <div className="canteen-map-editor-actions">
              <button
                type="button"
                className="canteen-map-editor-btn canteen-map-editor-btn-ghost"
                onClick={() => adjustSelectedWidth(-2)}
                disabled={!selectedId}
                title="缩小选中贴图"
              >
                选中缩小
              </button>
              <button
                type="button"
                className="canteen-map-editor-btn canteen-map-editor-btn-ghost"
                onClick={() => adjustSelectedWidth(2)}
                disabled={!selectedId}
                title="放大选中贴图"
              >
                选中放大
              </button>
              <button type="button" className="canteen-map-editor-btn" onClick={copyConfig}>
                复制配置
              </button>
              <button type="button" className="canteen-map-editor-btn canteen-map-editor-btn-ghost" onClick={reset}>
                重置
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CanteenArea;
