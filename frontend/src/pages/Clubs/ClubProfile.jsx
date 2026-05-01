import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, ArrowLeft, UserPlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import { getClubProfile, toggleClubFollow } from '../../api/clubs';
import { queryClient } from '../../query/queryClient';
import './Clubs.css';

function ClubProfile() {
  const { id } = useParams();
  const clubId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();

  const q = useQuery({
    queryKey: QK.clubProfile(clubId),
    queryFn: async () => await getClubProfile(clubId),
    enabled: Number.isFinite(clubId) && clubId > 0,
  });

  const followMut = useMutation({
    mutationFn: async () => await toggleClubFollow(clubId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
    },
  });

  const data = q.data;
  const basic = data?.basicInfo;
  const join = data?.joinInfo;
  const activities = useMemo(() => data?.activities || [], [data]);
  const posts = useMemo(() => data?.posts || [], [data]);

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !basic) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  const following = !!basic?.viewer?.following;

  return (
    <div className="club-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{basic.name}</div>
        <Link className="club-profile-link" to="/about/club">{isZh ? '列表' : 'List'}</Link>
      </div>

      <div className="club-profile-card">
        <div className="club-profile-head">
          {basic.avatar ? <img src={basic.avatar} alt="" className="club-profile-avatar" /> : <div className="club-profile-avatar club-avatar--ph" />}
          <div className="club-profile-head-main">
            <div className="club-profile-name">{basic.name}</div>
            <div className="club-profile-followers">{Number(basic.followers || 0)} {isZh ? '关注' : 'followers'}</div>
          </div>
          <button
            type="button"
            className={`club-follow-btn pressable ${following ? 'is-on' : ''}`}
            disabled={!token || followMut.isPending}
            title={!token ? (isZh ? '登录后可关注' : 'Login to follow') : (following ? (isZh ? '已关注' : 'Following') : (isZh ? '关注' : 'Follow'))}
            onClick={() => {
              if (!token) return;
              followMut.mutate();
            }}
          >
            <UserPlus size={16} aria-hidden />
            <span>{following ? (isZh ? '已关注' : 'Following') : (isZh ? '关注' : 'Follow')}</span>
          </button>
        </div>
        <div className="club-profile-desc">{basic.description || (isZh ? '（暂无介绍）' : '(No description)')}</div>

        <div className="club-join">
          <div className="club-join-title">{isZh ? '加入方式' : 'Join'}</div>
          {join?.contactText ? <div className="club-join-row">{join.contactText}</div> : null}
          {join?.signupLink ? (
            <a className="club-join-link pressable" href={join.signupLink} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> {isZh ? '外链报名' : 'Signup link'}
            </a>
          ) : null}
        </div>
      </div>

      <section className="club-section">
        <div className="club-section-h">{isZh ? '活动' : 'Activities'}</div>
        {activities.length === 0 ? <div className="club-mini-empty">{isZh ? '暂无活动' : 'No activities'}</div> : null}
        <div className="club-mini-list">
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="club-mini-card">
              <div className="club-mini-title">{a.title}</div>
              <div className="club-mini-sub">
                {[a.time ? new Date(a.time).toLocaleString() : '', a.location].filter(Boolean).join(' · ')}
              </div>
              {a.signupLink ? (
                <a className="club-mini-link" href={a.signupLink} target="_blank" rel="noreferrer">
                  <MapPin size={14} aria-hidden /> {isZh ? '报名' : 'Sign up'}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="club-section">
        <div className="club-section-h">{isZh ? '日常' : 'Posts'}</div>
        {posts.length === 0 ? <div className="club-mini-empty">{isZh ? '暂无内容' : 'No posts'}</div> : null}
        <div className="club-mini-list">
          {posts.slice(0, 6).map((p) => (
            <div key={p.id} className="club-mini-card">
              <div className="club-mini-title">{p.content ? String(p.content).slice(0, 40) : (isZh ? '社团日常' : 'Club post')}</div>
              <div className="club-mini-sub">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ClubProfile;

