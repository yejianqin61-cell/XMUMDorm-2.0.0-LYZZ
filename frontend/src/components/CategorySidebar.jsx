import { useEffect, useMemo, useRef, useState } from 'react';
import './CategorySidebar.css';

/**
 * 商品分类导航栏（FoodList 左侧）
 * @param {Array<{ id: string|number, name: string }>} categories - 按展示顺序
 * @param {string|number|null} activeId - 当前高亮分类 id
 * @param {Function} onSelect - (id) => void 点击回调
 */
function CategorySidebar({ categories = [], activeId, onSelect }) {
  const wrapRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [isScrolling, setIsScrolling] = useState(false);
  const [hl, setHl] = useState({ top: 8, h: 40 });

  const activeIndex = useMemo(() => {
    const idx = categories.findIndex((c) => String(c.id) === String(activeId));
    return idx >= 0 ? idx : 0;
  }, [activeId, categories]);

  // 精准定位高亮：跟随 active item 的真实 offsetTop/height
  useEffect(() => {
    const nav = wrapRef.current;
    if (!nav) return;
    const btn = itemRefs.current.get(String(activeId ?? categories[activeIndex]?.id ?? ''));
    if (!btn) return;
    const top = btn.offsetTop;
    const h = btn.offsetHeight;
    setHl({ top, h });
  }, [activeId, activeIndex, categories]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let t = null;
    const onScroll = () => {
      setIsScrolling(true);
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => setIsScrolling(false), 700);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (t) window.clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav
      ref={wrapRef}
      className={`category-sidebar ${isScrolling ? 'category-sidebar--scrolling' : ''}`}
      aria-label="商品分类"
      style={{
        '--active-index': activeIndex,
        '--item-count': categories.length,
        '--hl-top': `${hl.top}px`,
        '--hl-h': `${hl.h}px`,
      }}
    >
      <span className="category-sidebar-highlighter" aria-hidden />
      <ul className="category-sidebar-list">
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              className={`category-sidebar-item ${activeId === cat.id ? 'active' : ''}`}
              onClick={() => onSelect(cat.id)}
              aria-current={activeId === cat.id ? 'true' : undefined}
              ref={(el) => {
                if (!el) return;
                itemRefs.current.set(String(cat.id), el);
              }}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default CategorySidebar;
