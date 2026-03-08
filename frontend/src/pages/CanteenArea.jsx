import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AreaCard from '../components/AreaCard';
import Card from '../components/Card';
import { getRegions } from '../api/canteen';
import './CanteenArea.css';

/** 食堂分区页：排行榜入口 + 分区入口（来自 API regions） */
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
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="canteen-area-page">
        <p className="canteen-area-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canteen-area-page">
        <p className="canteen-area-error state-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="canteen-area-page">
      <Link to="/eat/rankings" className="canteen-area-rankings-link" aria-label="进入排行榜">
        <Card as="div" className="canteen-area-rankings-card">
          <span className="canteen-area-rankings-label">排行榜 Rankings</span>
          <span className="canteen-area-rankings-hint">最夯单品 · 门庭若市 · 点评达人</span>
        </Card>
      </Link>
      <p className="canteen-area-intro">选择分区 Select area</p>
      <ul className="canteen-area-list" aria-label="食堂分区列表">
        {regions.map((r) => (
          <li key={r.id}>
            <AreaCard area={r.code} label={r.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CanteenArea;
