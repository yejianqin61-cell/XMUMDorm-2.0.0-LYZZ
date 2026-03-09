import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRegions } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import './CanteenArea.css';

/** 五个分区入口：顺序与错落布局固定，图标与 code 对应 */
const SECTIONS = [
  { code: 'D6', icon: '🍚', label: 'D6' },
  { code: 'LY3', icon: '🥤', label: 'LY3' },
  { code: 'B1', icon: '🥘', label: 'B1' },
  { code: 'BELL', icon: '🔔', label: 'BELL' },
  { code: 'other', icon: '📋', label: 'Other' },
];

/** 食堂分区页（Eat region）：大标题、排行榜渐变卡片、错落分区卡片、虚化背景 */
function CanteenArea() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getRegions()
      .then((data) => {
        if (!cancelled) setRegions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const nameByCode = regions.reduce((acc, r) => {
    acc[r.code] = r.name;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="canteen-area-page">
        <div className="canteen-area-bg" aria-hidden />
        <p className="canteen-area-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canteen-area-page">
        <div className="canteen-area-bg" aria-hidden />
        <p className="canteen-area-error state-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="canteen-area-page">
      <div className="canteen-area-bg" aria-hidden />

      <div className="canteen-area-content">
        <h1 className="canteen-area-title">食堂 Eat</h1>

        <Link
          to="/eat/rankings"
          className="canteen-area-rankings-link canteen-area-rankings-card pressable"
          aria-label="进入排行榜"
        >
          <h2 className="canteen-area-rankings-title">排行榜 Rankings</h2>
          <p className="canteen-area-rankings-sub">最夯单品 · 门庭若市 · 点评达人</p>
        </Link>

        <section className="canteen-area-sections" aria-label="分区选择">
          {SECTIONS.map((section, index) => {
            const name = nameByCode[section.code] ?? section.label;
            const offsetRight = index % 2 === 1;
            return (
              <div
                key={section.code}
                className={`canteen-area-section-wrap ${offsetRight ? 'canteen-area-section-offset' : ''}`}
              >
                <Link
                  to={`/eat/${encodeURIComponent(section.code)}`}
                  className="canteen-area-section-card pressable"
                  aria-label={`进入分区 ${name}`}
                >
                  <span className="canteen-area-section-icon" aria-hidden>
                    {section.icon}
                  </span>
                  <div className="canteen-area-section-body">
                    <span className="canteen-area-section-name">{name}</span>
                    <span className="canteen-area-section-hint">Tap to enter</span>
                  </div>
                  <span className="canteen-area-section-arrow" aria-hidden>&gt;</span>
                </Link>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default CanteenArea;
