import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdvertisementPublic } from '@shared/api/advertisements';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../context/LanguageContext';
import AdvertisementDetailView from '@shared/components/AdvertisementDetailView';

export default function AdvertisementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const postId = Number.parseInt(id, 10);
  const detailQuery = useQuery({
    queryKey: QK.advertisementDetail(postId),
    queryFn: () => getAdvertisementPublic(postId),
    enabled: Number.isInteger(postId) && postId > 0,
  });

  return (
    <AdvertisementDetailView
      advertisement={detailQuery.data || null}
      loading={detailQuery.isPending}
      error={detailQuery.error}
      isEn={lang === 'en'}
      onBack={() => navigate(-1)}
      onNavigate={(path) => navigate(path)}
    />
  );
}
