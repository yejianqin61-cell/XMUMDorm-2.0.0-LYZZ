import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { listMyClubs } from '@shared/api/clubs';
import './Clubs.css';

function MyClubs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['clubs', 'me', 'following'],
    queryFn: async () => await listMyClubs(),
    enabled: !!token,
  });

  const list = q.data?.list || [];
  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '我的社团' : 'My Clubs'}</div>
      </div>

      {!token ? (
        <div className="state-empty">{isZh ? '登录后可查看你参加/关注的社团。' : 'Login to view your clubs.'}</div>
      ) : null}
      {token && q.isLoading ? <div className="state-loading">加载中</div> : null}
      {token && q.isError ? <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div> : null}
      {token && !q.isLoading && !q.isError && list.length === 0 ? (
        <div className="state-empty">{isZh ? '你还没有参加任何社团' : 'No clubs yet'}</div>
      ) : null}

      <div className="club-my-row club-my-row--full" aria-label={isZh ? '我的社团列表' : 'My clubs'}>
        {list.map((c) => (
          <Link key={c.id} to={`/about/club/${c.id}`} className="club-my-card pressable">
            <div className="club-my-avatar">
              {c.avatar ? <img src={c.avatar} alt="" /> : <div className="club-battle-logo-ph" aria-hidden />}
            </div>
            <div className="club-my-main">
              <div className="club-my-name" title={c.name}>{c.name}</div>
              <div className="club-my-meta">{Number(c.followers || 0)} {isZh ? '关注' : 'followers'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default MyClubs;

