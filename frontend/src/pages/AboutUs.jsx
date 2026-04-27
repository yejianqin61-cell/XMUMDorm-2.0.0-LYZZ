import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './AboutUs.css';

/** 广场 Square：背景图铺满 + 贴图入口（默认开启编辑模式，说明文字为英文） */
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

function AboutUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  // 默认关闭编辑模式；仅在 ?edit=1 时开启
  const editMode = params.get('edit') === '1';
  const mapRef = useRef(null);
  const bgImgRef = useRef(null);
  const [cover, setCover] = useState({ scale: 1, offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [clubBubble, setClubBubble] = useState(null);
  const [glintBoost, setGlintBoost] = useState(false);
  const [secondhandTreasures, setSecondhandTreasures] = useState([]);

  const stickersSeed = useMemo(
    () => [
      {
        id: 'club',
        label: 'Club',
        to: '/about/club',
        fileName: '社团.png',
        rect: { x: 0, y: 51.422900632427684, w: 40.00000000000001, space: 'img' },
      },
      {
        id: 'secondhand',
        label: 'Second-hand Market',
        to: '/about/second-hand',
        fileName: '二手.png',
        rect: { x: 72.59010117023567, y: 68.34938615706777, w: 30.000000000000004, space: 'img' },
      },
      {
        id: 'trending',
        label: 'Trending Searches',
        to: '/about/trending',
        fileName: '热搜.png',
        rect: { x: 63.14783657527098, y: 47.87079955413614, w: 36.00000000000001, space: 'img' },
      },
      {
        id: 'freshman',
        label: 'Freshman Starter Guide',
        to: '/about/freshman-guide',
        fileName: '新生手册.png',
        rect: { x: 32.76322398754528, y: 59.31130597464311, w: 38, space: 'img' },
      },
      {
        id: 'errands',
        label: 'Errands Service',
        to: '/about/errands',
        fileName: '跑腿.png',
        rect: { x: 0, y: 70.60312972839067, w: 26.000000000000007, space: 'img' },
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

  const storageKey = 'square_map_stickers_v2_imgspace';
  const legacyStorageKey = 'square_map_stickers_v1';
  const [stickers, setStickers] = useState(defaultStickers);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // 非编辑模式也要读取：否则你关掉 edit 后会回到默认，体验割裂
    try {
      const raw = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setStickers(parsed.filter((x) => x && x.src));
        // 如果用户只有旧 key 数据，则自动提升到新 key
        if (!localStorage.getItem(storageKey)) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch {}
        }
      }
    } catch {}
  }, [legacyStorageKey, storageKey]);

  useEffect(() => {
    if (!editMode) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(stickers));
    } catch {}
  }, [editMode, stickers]);

  // Second-hand：Treasure pop-up emitter（随机 1.5~3s 冒泡一次）
  useEffect(() => {
    let alive = true;
    let timer = null;
    const emojis = ['📚', '📷', '🎧', '💻', '💡'];

    const spawn = () => {
      if (!alive) return;
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const rise = Math.round(60 + Math.random() * 40); // 60~100px
      const drift = Math.round((Math.random() * 2 - 1) * 22); // -22~22px
      const duration = 1.6 + Math.random() * 0.8; // 1.6~2.4s
      const size = 16 + Math.round(Math.random() * 14); // 16~30px（更显眼）
      const alpha = 0.62 + Math.random() * 0.26; // 0.62~0.88（更清晰）
      const depth = Math.random() < 0.35 ? 4 : 8; // 前后层次
      const left = 36 + Math.random() * 28; // 36%~64%（贴图中部偏后）

      setSecondhandTreasures((prev) => [
        ...prev,
        {
          id,
          emoji,
          style: {
            left: `${left}%`,
            '--rise': `${rise}px`,
            '--drift': `${drift}px`,
            '--dur': `${duration}s`,
            '--size': `${size}px`,
            '--alpha': alpha,
            '--z': depth,
          },
        },
      ]);

      // 清理：略长于动画时长
      window.setTimeout(() => {
        if (!alive) return;
        setSecondhandTreasures((prev) => prev.filter((x) => x.id !== id));
      }, Math.ceil((duration + 0.2) * 1000));

      const nextIn = 1500 + Math.random() * 1500;
      timer = window.setTimeout(spawn, nextIn);
    };

    // 启动时给一个短随机抖动，避免“整齐开始”
    timer = window.setTimeout(spawn, 900 + Math.random() * 800);

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // 滚动/滑动时：扫光短暂加速（不依赖页面真实滚动）
  useEffect(() => {
    let t = null;
    const boost = () => {
      setGlintBoost(true);
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => setGlintBoost(false), 900);
    };
    const onWheel = () => boost();
    const onTouchMove = () => boost();
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

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
        next.w = clamp((next.w ?? 24) + delta, 2, 100);
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
        style={{ '--glint-speed': glintBoost ? '5.2s' : '8s' }}
      >
        <div className="circular-flare" aria-hidden />
        <div className="sun-glint" aria-hidden />
        {/* SVG filters（用于高端液态光晕） */}
        <svg className="square-svg-filters" width="0" height="0" aria-hidden focusable="false">
          <defs>
            <filter id="freshmanAura" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="0" stdDeviation="15" floodColor="rgba(255,255,255,0.65)" floodOpacity="1" />
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(255, 223, 137, 0.4)" floodOpacity="1" />
            </filter>
          </defs>
        </svg>

        <div className="square-map-bg" aria-hidden>
          <img
            ref={bgImgRef}
            src="/square/background.png"
            alt=""
            className="square-map-bgimg"
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
          <div className="square-map-bg-overlay" aria-hidden />
          <div className="square-map-sunshine" aria-hidden />
        </div>
        <div className="square-sky-container" aria-hidden>
          {/* Row 1 */}
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-distant square-cloud-r1-a" />
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-slow square-cloud-r1-b" />
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-fast square-cloud-r1-c" />
          {/* Row 2 */}
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-distant square-cloud-r2-a" />
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-slow square-cloud-r2-b" />
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-fast square-cloud-r2-c" />
          {/* Row 3 */}
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-distant square-cloud-r3-a" />
          <img src="/cloud.png" alt="" className="square-cloud square-cloud-slow square-cloud-r3-b" />
        </div>

        {stickers.map((s) => {
          const style =
            s?.rect?.space === 'img'
              ? imgPctRectToStyle(s.rect, cover, imgSize.w, imgSize.h)
              : { left: `${s.rect.left}%`, top: `${s.rect.top}%`, width: `${s.rect.width}%` };
          const styleWithSprite = { ...style, '--sprite-url': `url("${s.src}")` };
          const cls = `square-sticker ${editMode ? 'square-sticker--editable' : 'square-sticker--link'} ${
            editMode && selectedId === s.id ? 'square-sticker--selected' : ''
          }`;
          const isClub = s.id === 'club';
          const isSecondhand = s.id === 'secondhand';
          const onClubEnter = () => {
            if (!isClub) return;
            const slogans = [
              'Join us! 🎨',
              'Level up! 🎮',
              'New friends! 🤝',
              'Try something new ✨',
              'Be brave. Be you.',
              'Let’s make memories!',
            ];
            setClubBubble(slogans[Math.floor(Math.random() * slogans.length)]);
          };
          const onClubLeave = () => {
            if (!isClub) return;
            setClubBubble(null);
          };
          return editMode ? (
            <button
              key={s.id}
              type="button"
              className={cls}
              data-id={s.id}
              style={styleWithSprite}
              aria-label={s.label}
              onPointerDown={(ev) => startDrag(s.id, ev)}
              onClick={() => setSelectedId(s.id)}
              onMouseEnter={onClubEnter}
              onMouseLeave={onClubLeave}
              onFocus={onClubEnter}
              onBlur={onClubLeave}
            >
              <img src={s.src} alt={s.label} className="square-sticker-img" draggable={false} />
              {isClub && <span className="square-club-soundwaves" aria-hidden />}
              {isClub && <span className="square-club-confetti" aria-hidden />}
              {isClub && clubBubble && <span className="square-club-bubble">{clubBubble}</span>}
              {isSecondhand && (
                <span className="square-secondhand-treasures" aria-hidden>
                  {secondhandTreasures.map((t) => (
                    <span key={t.id} className="square-treasure" style={t.style}>
                      {t.emoji}
                    </span>
                  ))}
                </span>
              )}
              {s.id === 'trending' && (
                <>
                  <span className="square-trending-whisper" aria-hidden />
                  <span className="square-trending-danmaku" aria-hidden>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--a">New Club! 🎨</span>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--b">Freshman Guide 📚</span>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--c">Campus Rank 🏆</span>
                  </span>
                </>
              )}
              {s.id === 'freshman' && <span className="square-freshman-particles" aria-hidden />}
              {s.label && (
                <span className="square-sticker-label" aria-hidden>
                  <span className="square-sticker-label-text">{s.label}</span>
                </span>
              )}
            </button>
          ) : (
            <Link
              key={s.id}
              to={s.to}
              className={cls}
              data-id={s.id}
              style={styleWithSprite}
              aria-label={s.label}
              onMouseEnter={onClubEnter}
              onMouseLeave={onClubLeave}
              onFocus={onClubEnter}
              onBlur={onClubLeave}
            >
              <img src={s.src} alt={s.label} className="square-sticker-img" draggable={false} />
              {isClub && <span className="square-club-soundwaves" aria-hidden />}
              {isClub && <span className="square-club-confetti" aria-hidden />}
              {isClub && clubBubble && <span className="square-club-bubble">{clubBubble}</span>}
              {isSecondhand && (
                <span className="square-secondhand-treasures" aria-hidden>
                  {secondhandTreasures.map((t) => (
                    <span key={t.id} className="square-treasure" style={t.style}>
                      {t.emoji}
                    </span>
                  ))}
                </span>
              )}
              {s.id === 'trending' && (
                <>
                  <span className="square-trending-whisper" aria-hidden />
                  <span className="square-trending-danmaku" aria-hidden>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--a">New Club! 🎨</span>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--b">Freshman Guide 📚</span>
                    <span className="square-trending-danmaku-line square-trending-danmaku-line--c">Campus Rank 🏆</span>
                  </span>
                </>
              )}
              {s.id === 'freshman' && <span className="square-freshman-particles" aria-hidden />}
              {s.label && (
                <span className="square-sticker-label" aria-hidden>
                  <span className="square-sticker-label-text">{s.label}</span>
                </span>
              )}
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
