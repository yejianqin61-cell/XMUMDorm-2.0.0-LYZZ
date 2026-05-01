import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Eye, Heart, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import { queryClient } from '../../query/queryClient';
import { getActivityDetail, toggleClubLike, trackClubView } from '../../api/clubs';
import './Clubs.css';

function ActivityDetail() {
  const { id } = useParams();
  const activityId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['clubs', 'activity', activityId],
    queryFn: async () => await getActivityDetail(activityId),
    enabled: Number.isFinite(activityId) && activityId > 0,
  });

  const a = q.data;
  const liked = !!a?.viewer?.liked;

  useEffect(() => {
    if (!activityId) return;
    trackClubView('activity', activityId).catch(() => {});
  }, [activityId]);

  const likeMut = useMutation({
    mutationFn: async () => await toggleClubLike('activity', activityId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'activity', activityId] });
    },
  });

  const timeText = useMemo(() => {
    if (!a?.time) return '';
    try {
      return new Date(a.time).toLocaleString();
    } catch {
      return String(a.time);
    }
  }, [a?.time]);

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !a) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '活动' : 'Activity'}</div>
        <Link className="club-profile-link" to={`/about/club/${a.clubId}`}>{isZh ? '社团' : 'Club'}</Link>
      </div>

      {a.cover ? <img src={a.cover} alt="" className="club-detail-hero" /> : null}

      <div className="club-profile-card">
        <div className="club-feed-title">{a.title}</div>
        <div className="club-feed-sub">{a.clubName}</div>
        {a.summary ? <div className="club-detail-desc">{a.summary}</div> : null}

        <div className="club-detail-meta">
          {timeText ? <div>{timeText}</div> : null}
          {a.location ? (
            <div className="club-detail-loc">
              <MapPin size={16} aria-hidden /> <span className="club-wrap">{a.location}</span>
            </div>
          ) : null}
        </div>

        <div className="club-detail-actions">
          <button
            type="button"
            className={`club-like-btn pressable ${liked ? 'is-on' : ''}`}
            disabled={!token || likeMut.isPending}
            onClick={() => likeMut.mutate()}
            title={!token ? (isZh ? '登录后可点赞' : 'Login to like') : (isZh ? '点赞' : 'Like')}
          >
            <Heart size={18} aria-hidden />
            <span>{a.stats?.likes ?? 0}</span>
          </button>
          <div className="club-like-meta">
            <Eye size={18} aria-hidden /> <span>{a.stats?.views ?? 0}</span>
          </div>
          {a.signupLink ? (
            <a className="club-join-link pressable" href={a.signupLink} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> {isZh ? '外链报名' : 'Signup'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ActivityDetail;

