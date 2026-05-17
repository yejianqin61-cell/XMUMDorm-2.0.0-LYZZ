import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getRegions } from '../../api/canteen';
import { QK } from '../../query/queryKeys';

const REGION_ICONS = {
  D6: '/D6.png',
  LY3: '/LY3.png',
  B1: '/B1.png',
  BELL: '/bell.png',
  other: '/OTHERS.png',
};

function regionLabel(r, t) {
  if (r.code === 'other') return t.regionOthers;
  return r.name || r.code;
}

export default function CanteenRegionGrid() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
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
      <h3 className="canteen-section-title">{t.regionSectionTitle}</h3>
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
                alt={regionLabel(r, t)}
                className="canteen-region-icon"
              />
            </div>
            <span className="canteen-region-name">{regionLabel(r, t)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
