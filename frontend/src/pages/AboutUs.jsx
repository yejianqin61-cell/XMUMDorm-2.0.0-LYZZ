import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './AboutUs.css';

/** 广场 Square：背景图铺满 + 贴图入口（默认开启编辑模式，说明文字为英文） */
function AboutUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  // 默认关闭编辑模式；仅在 ?edit=1 时开启
  const editMode = params.get('edit') === '1';
  const mapRef = useRef(null);

  const stickersSeed = useMemo(
    () => [
      {
        id: 'club',
        label: 'Club',
        to: '/about/club',
        fileName: '社团.png',
        rect: { left: 7.274627759385212, top: 50.520321687934654, width: 36 },
      },
      {
        id: 'secondhand',
        label: 'Second-hand Market',
        to: '/about/second-hand',
        fileName: '二手.png',
        rect: { left: 70, top: 68.54200334126122, width: 30 },
      },
      {
        id: 'trending',
        label: 'Trending Searches',
        to: '/about/trending',
        fileName: '热搜.png',
        rect: { left: 61.571260052876035, top: 48.352301086336844, width: 36 },
      },
      {
        id: 'freshman',
        label: 'Freshman Starter Guide',
        to: '/about/freshman-guide',
        fileName: '新生手册.png',
        rect: { left: 31.749714375109917, top: 65.00813808269267, width: 38 },
      },
      {
        id: 'errands',
        label: 'Errands Service',
        to: '/about/errands',
        fileName: '跑腿.png',
        rect: { left: 0, top: 72.63144264879836, width: 26 },
      },
    ],
    []
  );

  const defaultStickers = useMemo(
    () =>
      stickersSeed.map((s) => ({
        ...s,
        src: `/square/${encodeURIComponent(s.fileName)}`,
      })),
    [stickersSeed]
  );

  const storageKey = 'square_map_stickers_v1';
  const [stickers, setStickers] = useState(defaultStickers);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!editMode) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setStickers(parsed.filter((x) => x && x.src));
    } catch {}
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(stickers));
    } catch {}
  }, [editMode, stickers]);

  const dragRef = useRef(null); // { id, startX, startY, startRect, box }

  const startDrag = (id, ev) => {
    if (!editMode) return;
    setSelectedId(id);
    ev.preventDefault();
    ev.stopPropagation();
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return;
    const s = stickers.find((x) => x.id === id);
    if (!s) return;
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
    const leftDelta = (dx / d.box.width) * 100;
    const topDelta = (dy / d.box.height) * 100;
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== d.id) return s;
        const next = { ...s.rect };
        next.left = Math.min(100 - next.width, Math.max(0, d.startRect.left + leftDelta));
        next.top = Math.min(95, Math.max(0, d.startRect.top + topDelta));
        return { ...s, rect: next };
      })
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const adjustSelectedWidth = (delta) => {
    if (!editMode || !selectedId) return;
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== selectedId) return s;
        const next = { ...s.rect };
        next.width = clamp((next.width ?? 24) + delta, 6, 90);
        next.left = clamp(next.left ?? 0, 0, 100 - next.width);
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
    <div className="square-page square-map-page">
      <div
        className={`square-map ${editMode ? 'square-map--edit' : ''}`}
        aria-label={isZh ? '广场' : 'Square'}
        ref={mapRef}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="square-map-bg" aria-hidden />

        {stickers.map((s) => {
          const style = { left: `${s.rect.left}%`, top: `${s.rect.top}%`, width: `${s.rect.width}%` };
          const cls = `square-sticker ${editMode ? 'square-sticker--editable' : 'square-sticker--link'} ${
            editMode && selectedId === s.id ? 'square-sticker--selected' : ''
          }`;
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
              <img src={s.src} alt={s.label} className="square-sticker-img" draggable={false} />
              {s.label && <span className="square-sticker-label">{s.label}</span>}
            </button>
          ) : (
            <Link key={s.id} to={s.to} className={cls} data-id={s.id} style={style} aria-label={s.label}>
              <img src={s.src} alt={s.label} className="square-sticker-img" draggable={false} />
              {s.label && <span className="square-sticker-label">{s.label}</span>}
            </Link>
          );
        })}

        {editMode && (
          <div className="square-map-editor">
            <div className="square-map-editor-title">Sticker layout editor</div>
            <div className="square-map-editor-sub">
              Drag stickers to adjust position. Select one sticker, then use the buttons below to resize it. When you are
              done, click “Copy config” and send me the JSON.
            </div>
            <div className="square-map-editor-actions">
              <button
                type="button"
                className="square-map-editor-btn square-map-editor-btn-ghost"
                onClick={() => adjustSelectedWidth(-2)}
                disabled={!selectedId}
                title="Shrink selected sticker"
              >
                Shrink
              </button>
              <button
                type="button"
                className="square-map-editor-btn square-map-editor-btn-ghost"
                onClick={() => adjustSelectedWidth(2)}
                disabled={!selectedId}
                title="Enlarge selected sticker"
              >
                Enlarge
              </button>
              <button type="button" className="square-map-editor-btn" onClick={copyConfig}>
                Copy config
              </button>
              <button type="button" className="square-map-editor-btn square-map-editor-btn-ghost" onClick={reset}>
                Reset
              </button>
            </div>
            <div className="square-map-editor-sub" style={{ marginTop: 8 }}>
              Tip: remove <b>?edit=1</b> to preview click navigation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AboutUs;
