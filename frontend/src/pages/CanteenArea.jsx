import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './CanteenArea.css';

/** 食堂地图页：背景图 + 建筑贴图；编辑模式支持拖拽并复制配置 */
function CanteenArea() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editMode = params.get('edit') === '1';
  const mapRef = useRef(null);

  // 单位：百分比（相对于背景容器宽高），以适配不同屏幕
  const defaultStickers = useMemo(
    () => [
      { id: 'rank', label: 'Rank', to: '/eat/rankings', src: '/Rank.png', rect: { left: 8.140001628680384, top: 30.123268191489785, width: 18 } },
      { id: 'd6', label: 'D6', to: '/eat/D6', src: '/D6.png', rect: { left: 3.331484819120908, top: 38.29536109731487, width: 34 } },
      { id: 'ly3', label: 'LY3', to: '/eat/LY3', src: '/LY3.png', rect: { left: 60, top: 35.71002153100399, width: 40 } },
      { id: 'b1', label: 'B1', to: '/eat/B1', src: '/B1.png', rect: { left: 0, top: 49.85425101310081, width: 32 } },
      { id: 'others', label: 'OTHERS', to: '/eat/other', src: '/OTHERS.png', rect: { left: 75.1942358422924, top: 53.79469505003947, width: 22 } },
      { id: 'bell', label: 'BELL', to: '/eat/BELL', src: '/bell.png', rect: { left: 21.844895322255077, top: 70.20250632927979, width: 12.7 } },

      // 装饰 GIF（无跳转）：你可在 /eat?edit=1 拖动与缩放
      { id: 'gif-b4', label: 'GIF', src: '/gif/b4.gif', rect: { left: 70.50969418641802, top: 47.06534411985688, width: 6 } },
      { id: 'gif-cat', label: 'GIF', src: '/gif/耄耋猫动态gif表情包 (6)_爱给网_aigei_com.gif', rect: { left: 24.73878496253954, top: 53.394674236300915, width: 22 } },
      { id: 'gif-doge', label: 'GIF', src: '/gif/vsgif_com_dogecoin-meme_.3422573.gif', rect: { left: 87.69515611787595, top: 30.064024398691302, width: 10 } },
      { id: 'gif-catwalk-1', label: 'GIF', src: '/gif/迪莫走猫步_爱给网_aigei_com.gif', rect: { left: 33.89576353519476, top: 80.96152737183942, width: 12 } },
      { id: 'gif-crosswalk', label: 'GIF', src: '/gif/斑马线人行道过马路走路走gif图素材_爱给网_aigei_com.gif', rect: { left: 45.0057718351608, top: 41.231050566625264, width: 16 } },
    ],
    []
  );

  // bump 版本：移除“静态云贴图”，避免继续读到旧配置
  const storageKey = 'eat_map_stickers_v10';
  const [stickers, setStickers] = useState(defaultStickers);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!editMode) return;
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
  }, [editMode, defaultStickers, storageKey]);

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
        // height 随图片比例自适应，这里只约束 top 的范围（最多到 95%，避免完全拖出）
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
        next.width = clamp((next.width ?? 20) + delta, 6, 90);
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
    <div className="canteen-area-page canteen-map-page">
      <div
        className={`canteen-map ${editMode ? 'canteen-map--edit' : ''}`}
        aria-label="Canteen map"
        ref={mapRef}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="canteen-map-bg" aria-hidden />
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
          const style = { left: `${s.rect.left}%`, top: `${s.rect.top}%`, width: `${s.rect.width}%` };
          const cls = `canteen-sticker ${editMode ? 'canteen-sticker--editable' : 'canteen-sticker--link'} ${
            editMode && selectedId === s.id ? 'canteen-sticker--selected' : ''
          }`;
          const showLabel = !!s.label && !String(s.id || '').startsWith('gif-');
          const labelText = (() => {
            const id = String(s.id || '');
            if (!showLabel) return '';
            if (['b1', 'd6', 'ly3', 'others'].includes(id)) return `Canteen ${s.label}`;
            return s.label;
          })();
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
                  <span className="canteen-sticker-label-dot" />
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
                  <span className="canteen-sticker-label-dot" />
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
                  <span className="canteen-sticker-label-dot" />
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
