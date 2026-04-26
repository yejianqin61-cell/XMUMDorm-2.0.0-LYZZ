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
      { id: 'rank', label: 'Rank', to: '/eat/rankings', src: '/Rank.png', rect: { left: 31.109843916265945, top: 19.927739715405195, width: 18 } },
      { id: 'd6', label: 'D6', to: '/eat/D6', src: '/D6.png', rect: { left: 2.751440643511616, top: 26.773009071916402, width: 34 } },
      { id: 'ly3', label: 'LY3', to: '/eat/LY3', src: '/LY3.png', rect: { left: 53.06359205902664, top: 23.97817870564246, width: 40 } },
      { id: 'b1', label: 'B1', to: '/eat/B1', src: '/B1.png', rect: { left: 0, top: 38.820729501544804, width: 32 } },
      { id: 'others', label: 'OTHERS', to: '/eat/other', src: '/OTHERS.png', rect: { left: 77.51443113142108, top: 40.45671133819904, width: 22 } },
      { id: 'bell', label: 'BELL', to: '/eat/BELL', src: '/bell.png', rect: { left: 0.7312122088652958, top: 74.1131206044003, width: 16.7 } },

      // 装饰 GIF（无跳转）：你可在 /eat?edit=1 拖动与缩放
      { id: 'gif-b4', label: 'GIF', src: '/gif/b4.gif', rect: { left: 63.549145492415, top: 33.098858172508095, width: 6 } },
      { id: 'gif-cat', label: 'GIF', src: '/gif/耄耋猫动态gif表情包 (6)_爱给网_aigei_com.gif', rect: { left: 21.722549053807384, top: 40.824834646015574, width: 22 } },
      { id: 'gif-doge', label: 'GIF', src: '/gif/vsgif_com_dogecoin-meme_.3422573.gif', rect: { left: 58.924847291942115, top: 13.094751207800172, width: 10 } },
      { id: 'gif-catwalk-1', label: 'GIF', src: '/gif/迪莫走猫步_爱给网_aigei_com.gif', rect: { left: 77.28322895542964, top: 54.77437927364383, width: 12 } },
      { id: 'gif-crosswalk', label: 'GIF', src: '/gif/斑马线人行道过马路走路走gif图素材_爱给网_aigei_com.gif', rect: { left: 45.0057718351608, top: 41.231050566625264, width: 16 } },
    ],
    []
  );

  const storageKey = 'eat_map_stickers_v8';
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
        setStickers(parsed.filter((x) => x && x.src));
      }
    } catch {}
  }, [editMode, defaultStickers]);

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

        {stickers.map((s) => {
          const style = { left: `${s.rect.left}%`, top: `${s.rect.top}%`, width: `${s.rect.width}%` };
          const cls = `canteen-sticker ${editMode ? 'canteen-sticker--editable' : 'canteen-sticker--link'} ${
            editMode && selectedId === s.id ? 'canteen-sticker--selected' : ''
          }`;
          const showLabel = !!s.label && !String(s.id || '').startsWith('gif-');
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
              {showLabel && <span className="canteen-sticker-label">{s.label}</span>}
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
              {showLabel && <span className="canteen-sticker-label">{s.label}</span>}
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
              {showLabel && <span className="canteen-sticker-label">{s.label}</span>}
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
