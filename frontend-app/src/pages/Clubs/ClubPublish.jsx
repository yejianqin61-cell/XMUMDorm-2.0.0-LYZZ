import { Link } from 'react-router-dom';
import { CalendarPlus, MessageSquarePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { listMyClubs } from '@shared/api/clubs';
import './Clubs.css';

export default function ClubPublish() {
  const { lang } = useLanguage();
  const { token } = useAuth();
  const isZh = lang !== 'en';
  const query = useQuery({
    queryKey: ['clubs', 'me', 'following'],
    queryFn: listMyClubs,
    enabled: !!token,
  });
  const clubs = (query.data?.list || []).filter((club) => club.role === 'admin');

  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '社团发布' : 'Club publishing'}</div>
        <Link to="/about/club" className="club-profile-link">{isZh ? '广场' : 'Square'}</Link>
      </div>

      {!token ? <div className="state-empty">{isZh ? '请先登录' : 'Please sign in'}</div> : null}
      {token && query.isLoading ? <div className="state-loading">{isZh ? '加载中' : 'Loading'}</div> : null}
      {token && query.isError ? <div className="state-error">{query.error?.message || (isZh ? '加载失败' : 'Failed to load')}</div> : null}
      {token && !query.isLoading && !query.isError && clubs.length === 0 ? (
        <div className="state-empty">{isZh ? '你还没有可发布内容的社团' : 'You do not manage a club yet'}</div>
      ) : null}

      <div className="club-publish-list">
        {clubs.map((club) => (
          <section key={club.id} className="club-publish-row">
            <div className="club-publish-row__identity">
              <div className="club-my-avatar">
                {club.avatar ? <img src={club.avatar} alt="" /> : <div className="club-battle-logo-ph" aria-hidden />}
              </div>
              <span>{club.name}</span>
            </div>
            <div className="club-publish-row__actions">
              <Link to={`/about/club/activity/new?clubId=${club.id}`} className="club-admin-toolbtn club-admin-toolbtn--link pressable">
                <CalendarPlus size={16} aria-hidden />
                <span>{isZh ? '发布活动' : 'Activity'}</span>
              </Link>
              <Link to={`/about/club/post/new?clubId=${club.id}`} className="club-admin-toolbtn club-admin-toolbtn--link pressable">
                <MessageSquarePlus size={16} aria-hidden />
                <span>{isZh ? '发布日常' : 'Post'}</span>
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
