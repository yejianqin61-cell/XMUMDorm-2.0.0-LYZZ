import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContextState';
import { requestRaw } from '@shared/api/request';
import { unwrap } from './apiClient.js';
import { Notice } from './components';
import './adminCampusNews.css';

export default function CampusNewsAccess() {
  const { isAdmin, user } = useAuth();
  // /users/me has a server-side cache. This improves UI gating only, and is NOT
  // a replacement for a current-database admin check on every future admin API.
  const identity = useQuery({
    queryKey: ['campus-news-admin-identity', user?.id],
    queryFn: async () => unwrap(await requestRaw('/api/users/me')),
    enabled: Boolean(isAdmin), retry: false, staleTime: 0,
    refetchOnWindowFocus: 'always', refetchInterval: 30000,
  });
  return <section className="admin-campus-news">
    {!isAdmin ? <Notice>仅系统管理员可以进入校园快讯管理。</Notice>
      : identity.isPending ? <p role="status">正在核对管理员身份…</p>
        : identity.isError ? <Notice error={identity.error} retry={identity.refetch} />
          : identity.data?.role !== 'admin' ? <Notice>当前管理员权限已失效，请返回个人中心或重新登录。</Notice>
            : <Outlet />}
  </section>;
}
