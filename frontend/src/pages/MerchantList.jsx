import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MerchantCard from '../components/MerchantCard';
import { AREA_LABELS } from '../components/AreaCard';
import { getRegions, getShopsByRegion } from '../api/canteen';
import { getUploadUrl } from '../api/config';
import './MerchantList.css';

/** 区域商家列表页：展示当前分区下的商家（API），点击进入该商家菜品列表 */
function MerchantList() {
  const { area } = useParams();
  const [merchants, setMerchants] = useState([]);
  const [areaLabel, setAreaLabel] = useState(AREA_LABELS[area] ?? area ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = area ?? '';
    if (!code) {
      setMerchants([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRegions()
      .then((regions) => {
        if (cancelled) return;
        const list = Array.isArray(regions) ? regions : [];
        const region = list.find((r) => r.code === code);
        setAreaLabel(region?.name ?? AREA_LABELS[code] ?? code);
        if (!region) {
          setMerchants([]);
          return;
        }
        return getShopsByRegion(region.id);
      })
      .then((shops) => {
        if (cancelled || shops === undefined) return;
        const list = Array.isArray(shops) ? shops : [];
        setMerchants(
          list.map((s) => ({
            id: s.id,
            name: s.name,
            logo: s.logo ? getUploadUrl(s.logo) : undefined,
            description: s.region_name ? `${s.region_name}` : undefined,
            status: 'open',
            openingHours: s.opening_hours ?? undefined,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [area]);

  if (loading) {
    return (
      <div className="merchant-list-page">
        <p className="merchant-list-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="merchant-list-page">
        <p className="merchant-list-error state-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="merchant-list-page">
      <p className="merchant-list-title">{areaLabel}</p>
      {merchants.length === 0 ? (
        <p className="merchant-list-empty state-empty">
          该分区暂无商家 No merchants in this area yet.
        </p>
      ) : (
        <ul className="merchant-list-list" aria-label={`${areaLabel} 商家列表`}>
          {merchants.map((m) => (
            <li key={m.id}>
              <MerchantCard merchant={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MerchantList;
