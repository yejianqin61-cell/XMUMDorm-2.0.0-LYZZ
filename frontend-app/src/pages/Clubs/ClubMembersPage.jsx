import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QK } from '../../query/queryKeys';
import { getClubProfile } from '@shared/api/clubs';
import './Clubs.css';

function ClubMembersPage() {
  const { id } = useParams();
  const clubId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const q = useQuery({
    queryKey: QK.clubProfile(clubId),
    queryFn: async () => await getClubProfile(clubId),
    enabled: Number.isFinite(clubId) && clubId > 0,
  });

  const basic = q.data?.basicInfo;
  const members = q.data?.members || [];

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !basic) {
    return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;
  }

  return (
    <div className="club-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '全部成员' : 'All members'}</div>
        <Link className="club-profile-link" to={`/about/club/${clubId}`}>
          {isZh ? '社团' : 'Club'}
        </Link>
      </div>

      <div className="club-profile-card">
        <div className="club-members-page-head">
          {basic.avatar ? <img src={basic.avatar} alt="" className="club-members-page-avatar" /> : <div className="club-members-page-avatar club-avatar--ph" />}
          <div>
            <div className="club-members-page-name">{basic.name}</div>
            <div className="club-members-page-meta">
              {isZh ? `共 ${members.length} 人` : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
            </div>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="club-mini-empty">{isZh ? '暂无成员' : 'No members'}</div>
        ) : (
          <div className="club-mini-list club-mini-list--members-page">
            {members.map((m) => (
              <div key={m.id} className="club-mini-card">
                <div className="club-card-row">
                  {m.avatar ? <img src={m.avatar} alt="" className="club-avatar" /> : <div className="club-avatar club-avatar--ph" />}
                  <div className="club-card-main">
                    <div className="club-card-name">{m.nickname || m.username || (isZh ? '成员' : 'Member')}</div>
                    <div className="club-card-desc">{[m.email, m.role].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClubMembersPage;
