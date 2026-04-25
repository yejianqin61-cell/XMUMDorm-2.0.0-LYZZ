import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import './CanteenArea.css';

/** 食堂地图页：背景图 + 可点击热区 */
function CanteenArea() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editMode = params.get('edit') === '1';
  const mapRef = useRef(null);

  const defaultZones = useMemo(
    () => ([
      { id: 'rank', to: '/eat/rankings', label: 'Rank', rect: { left: 33, top: 2.5, width: 34, height: 16, radius: 22 } },
      { id: 'd6', to: '/eat/D6', label: 'D6', rect: { left: 10.455128978986236, top: 29.61223922221371, width: 28, height: 11, radius: 18 } },
      { id: 'ly3', to: '/eat/LY3', label: 'LY3', rect: { left: 59.41860504728059, top: 29.759671009495243, width: 28, height: 11, radius: 18 } },
      { id: 'b1', to: '/eat/B1', label: 'B1', rect: { left: 3.544828438349635, top: 50.250085768114985, width: 28, height: 11, radius: 18 } },
      { id: 'others', to: '/eat/other', label: 'Others', rect: { left: 65.66447408529066, top: 50.69240672062965, width: 28, height: 11, radius: 18 } },
      { id: 'bell', to: '/eat/BELL', label: 'Bell', rect: { left: 0, top: 63.21139779310786, width: 76, height: 18, radius: 22 } },
    ]),
    []
  );

  const storageKey = 'eat_map_hotzones_v1';
  const [zones, setZones] = useState(defaultZones);

  useEffect(() => {
    if (!editMode) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setZones(parsed);
      }
    } catch {}
  }, [editMode, defaultZones]);

  useEffect(() => {
    if (!editMode) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(zones));
    } catch {}
  }, [editMode, zones]);

  const [pressedId, setPressedId] = useState(null);
  const dragRef = useRef(null); // { id, startX, startY, startRect, box }

  const startDrag = (id, ev) => {
    if (!editMode) return;
    ev.preventDefault();
    ev.stopPropagation();
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return;
    const z = zones.find((x) => x.id === id);
    if (!z) return;
    dragRef.current = {
      id,
      startX: ev.clientX,
      startY: ev.clientY,
      startRect: { ...z.rect },
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
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== d.id) return z;
        const next = { ...z.rect };
        next.left = Math.min(100 - next.width, Math.max(0, d.startRect.left + leftDelta));
        next.top = Math.min(100 - next.height, Math.max(0, d.startRect.top + topDelta));
        return { ...z, rect: next };
      })
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const copyZones = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(zones, null, 2));
    } catch {}
  };

  const resetZones = () => {
    setZones(defaultZones);
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

        {zones.map((z) => {
          const style = {
            left: `${z.rect.left}%`,
            top: `${z.rect.top}%`,
            width: `${z.rect.width}%`,
            height: `${z.rect.height}%`,
            borderRadius: `${z.rect.radius ?? 18}px`,
          };
          const cls = `canteen-map-hotzone ${pressedId === z.id ? 'is-pressed' : ''} ${editMode ? 'is-editable' : ''}`;
          return editMode ? (
            <button
              key={z.id}
              type="button"
              className={cls}
              style={style}
              aria-label={`Edit hotzone ${z.label}`}
              onPointerDown={(ev) => startDrag(z.id, ev)}
            >
              <span className="canteen-map-hotzone-label">{z.label}</span>
            </button>
          ) : (
            <Link
              key={z.id}
              to={z.to}
              className={cls}
              style={style}
              aria-label={z.label}
              onPointerDown={() => setPressedId(z.id)}
              onPointerUp={() => setPressedId(null)}
              onPointerCancel={() => setPressedId(null)}
            />
          );
        })}

        {editMode && (
          <div className="canteen-map-editor">
            <div className="canteen-map-editor-title">热区编辑模式</div>
            <div className="canteen-map-editor-sub">拖动框到对应建筑位置。完成后点“复制配置”。</div>
            <div className="canteen-map-editor-actions">
              <button type="button" className="canteen-map-editor-btn" onClick={copyZones}>
                复制配置
              </button>
              <button type="button" className="canteen-map-editor-btn canteen-map-editor-btn-ghost" onClick={resetZones}>
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
