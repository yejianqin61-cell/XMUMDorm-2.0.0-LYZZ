import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import NeoCard from '../../components/retroui/Card';
import { NeoSkeleton } from '../../components/retroui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

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

  return (
    <div className="canteen-section">
      <h3 className="canteen-section-title">{t.regionSectionTitle}</h3>

      {isLoading ? (
        <div className="canteen-region-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <NeoSkeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={t.loadFailedShort} />
      ) : regions.length === 0 ? (
        <EmptyState message={t.noData} />
      ) : (
        <div className="canteen-region-grid">
          {regions.map((r) => (
            <Link
              key={r.id || r.code}
              to={`/eat/${r.code}`}
              className="canteen-region-link"
            >
              <NeoCard className="canteen-region-card flex flex-col items-center justify-center gap-1.5 hover:bg-muted cursor-pointer transition-colors">
                <img
                  src={REGION_ICONS[r.code] || '/OTHERS.png'}
                  alt={regionLabel(r, t)}
                  className="canteen-region-icon h-10 w-10 object-contain md:h-12 md:w-12"
                />
                <span className="canteen-region-name">{regionLabel(r, t)}</span>
              </NeoCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}