import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, Building2, MapPin, MoreHorizontal, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';

const REGION_ICONS = {
  D6: MapPin,
  LY3: Building2,
  B1: UtensilsCrossed,
  BELL: Bell,
  other: MoreHorizontal,
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
  const header = <h3 className="canteen-section-title">{t.regionSectionTitle}</h3>;

  if (isLoading) {
    return (
      <section className="canteen-section canteen-region-section" aria-busy="true">
        {header}
        <div className="canteen-region-grid" aria-label={t.regionSectionTitle}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="canteen-region-item canteen-region-skeleton" />
          ))}
        </div>
      </section>
    );
  }
  if (isError || regions.length === 0) {
    return (
      <section className="canteen-section canteen-region-section">
        {header}
        <p className="canteen-region-state" role={isError ? 'alert' : 'status'}>
          {isError ? t.loadFailedShort : t.noData}
        </p>
      </section>
    );
  }

  return (
    <section className="canteen-section canteen-region-section">
      {header}
      <div className="canteen-region-grid">
        {regions.map((r) => (
          <RegionEntry key={r.id || r.code} region={r} label={regionLabel(r, t)} />
        ))}
      </div>
    </section>
  );
}

function RegionEntry({ region, label }) {
  const Icon = REGION_ICONS[region.code] || MoreHorizontal;

  return (
    <Link to={`/eat/${region.code}`} className="canteen-region-item pressable">
      <span className="canteen-region-icon-wrap" aria-hidden="true">
        <Icon className="canteen-region-icon" strokeWidth={1.7} />
      </span>
      <span className="canteen-region-name">{label}</span>
    </Link>
  );
}
