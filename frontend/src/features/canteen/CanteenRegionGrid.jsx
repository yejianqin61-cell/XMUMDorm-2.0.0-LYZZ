import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import Card from '../../components/ui/Card';
import NeoSkeleton from '../../components/retroui/Skeleton';
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
              className="no-underline"
            >
              <Card className="flex flex-col items-center justify-center py-4 gap-2 hover:bg-muted cursor-pointer transition-colors">
                <div className="w-14 h-14 flex items-center justify-center">
                  <img
                    src={REGION_ICONS[r.code] || '/OTHERS.png'}
                    alt={regionLabel(r, t)}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <span className="text-sm font-semibold">{regionLabel(r, t)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}