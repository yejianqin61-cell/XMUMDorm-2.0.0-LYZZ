import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRegions } from '../../api/canteen';
import { QK } from '../../query/queryKeys';

const REGION_ICONS = {
  D6: '/D6.png',
  LY3: '/LY3.png',
  B1: '/B1.png',
  BELL: '/bell.png',
  other: '/OTHERS.png',
};

export default function CanteenRegionGrid() {
  const { data, isLoading, isError } = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    staleTime: 10 * 60 * 1000,
  });
  const regions = data?.data || data || [];

  if (isLoading) {
    return (
      <div className="canteen-section">
        <div className="canteen-region-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="canteen-region-item canteen-region-skeleton" />
          ))}
        </div>
      </div>
    );
  }
  if (isError || regions.length === 0) return null;

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">食堂入口</h3>
      <div className="canteen-region-grid">
        {regions.map((r) => (
          <Link
            key={r.id || r.code}
            to={`/eat/${r.code}`}
            className="canteen-region-item pressable"
          >
            <div className="canteen-region-icon-wrap">
              <img
                src={REGION_ICONS[r.code] || '/OTHERS.png'}
                alt={r.name || r.code}
                className="canteen-region-icon"
              />
            </div>
            <span className="canteen-region-name">{r.name || r.code}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
