import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextState';
import SquareCampusPostDetail from '../../pages/SquareCampusPostDetail';
import CampusNewsDetail from './CampusNewsDetail';
import { campusNewsApi as api } from './campusNewsApi';
import { NewsFailure } from './CampusNewsRemote';

// Keep anonymous legacy access and original legacy UI/interactions. The old
// endpoint enforces visibility and requires authentication for source=news.
export default function CampusNewsRoute() {
  const { id } = useParams(); const { user, isLoggedIn } = useAuth();
  const valid = /^[1-9]\d*$/.test(id || '');
  const query = useQuery({ queryKey: ['campus-news-route',user?.id,isLoggedIn,id], queryFn: () => api.legacy(id), enabled: valid, staleTime: 0, retry: false });
  if (!valid) return <NewsFailure error={{status:404}} />;
  if (query.isError) return <section className="campus-news"><Link to="/about">返回校园快讯</Link><NewsFailure error={query.error} retry={query.refetch} /></section>;
  if (query.isPending) return <p role="status">正在加载快讯详情…</p>;
  return query.data.source_kind === 'legacy' ? <SquareCampusPostDetail /> : <CampusNewsDetail realId={id} />;
}
