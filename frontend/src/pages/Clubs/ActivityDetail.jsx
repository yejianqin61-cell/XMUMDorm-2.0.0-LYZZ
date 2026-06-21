import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Eye, Heart, MapPin, MessageCircle, Trash2 } from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ActivityRegisterBar from '../../components/clubs/ActivityRegisterBar';
import { QK } from '../../query/queryKeys';
import { queryClient } from '../../query/queryClient';
import { Toast } from '../../context/ToastContext';
import {
  cancelClubActivityRegistration,
  deleteClubActivity,
  getActivityDetail,
  registerClubActivity,
  toggleClubLike,
  trackClubView,
} from '../../api/clubs';
import { getApiErrorMessage } from '../../utils/apiError';
import { API_BASE_URL } from '../../api/config';
import ImagePreview from '../../components/ImagePreview';
import { StackedCardCarousel } from '../../components/StackedCardCarousel';
import ClubCommentsSection from './ClubCommentsSection';
import '../PostDetail.css';
import './Clubs.css';

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function ActivityDetail() {
  const { id } = useParams();
  const activityId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token, user } = useAuth();

  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);

  const q = useQuery({
    queryKey: ['clubs', 'activity', activityId],
    queryFn: async () => await getActivityDetail(activityId),
    enabled: Number.isFinite(activityId) && activityId > 0,
  });

  const a = q.data;
  const liked = !!a?.viewer?.liked;
  const canManage = !!a?.viewer?.canManage || user?.role === 'admin';

  const imageUrls = useMemo(() => {
    const imgs = Array.isArray(a?.images) ? a.images : [];
    const fromObjs = imgs.map((x) => (typeof x === 'string' ? x : x?.url)).filter(Boolean);
    if (fromObjs.length) return fromObjs.map((u) => prefixImageUrl(u));
    if (a?.cover) return [prefixImageUrl(a.cover)];
    return [];
  }, [a?.images, a?.cover]);

  useEffect(() => {
    setCarouselIndex(0);
    setCarouselDir(1);
  }, [activityId]);

  useEffect(() => {
    if (!activityId) return;
    trackClubView('activity', activityId).catch(() => {});
  }, [activityId]);

  const activityQK = ['clubs', 'activity', activityId];

  const syncRegistrationState = (payload) => {
    queryClient.setQueryData(activityQK, (old) => {
      if (!old) return old;
      return {
        ...old,
        registration: {
          ...(old.registration || {}),
          count: Number(payload?.count) || 0,
          registered: !!payload?.registered,
          deadline: payload?.deadline || old.registration?.deadline || old.endTime || null,
        },
      };
    });
  };

  const likeMut = useMutation({
    mutationFn: async () => await toggleClubLike('activity', activityId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: activityQK });
      const prev = queryClient.getQueryData(activityQK);
      queryClient.setQueryData(activityQK, (old) => {
        if (!old) return old;
        const nextLiked = !old.viewer?.liked;
        const base = Number(old.stats?.likes ?? 0);
        const likes = Math.max(0, base + (nextLiked ? 1 : -1));
        return {
          ...old,
          viewer: { ...old.viewer, liked: nextLiked },
          stats: { ...old.stats, likes },
        };
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(activityQK, ctx.prev);
      Toast.error(getApiErrorMessage(err));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: activityQK });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => await deleteClubActivity(activityId),
    onSuccess: async () => {
      Toast.success(isZh ? '已删除' : 'Deleted');
      const snap = queryClient.getQueryData(activityQK);
      const cid = snap?.clubId;
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      if (cid) nav(`/about/club/${cid}`, { replace: true });
      else nav(-1);
    },
    onError: (err) => Toast.error(getApiErrorMessage(err)),
  });

  const registerMut = useMutation({
    mutationFn: async () => await registerClubActivity(activityId),
    onSuccess: async (payload) => {
      syncRegistrationState(payload);
      Toast.success(isZh ? '报名成功' : 'Registered');
      await queryClient.invalidateQueries({ queryKey: activityQK });
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(a?.clubId) });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
    },
  });

  const cancelRegisterMut = useMutation({
    mutationFn: async () => await cancelClubActivityRegistration(activityId),
    onSuccess: async (payload) => {
      syncRegistrationState(payload);
      Toast.success(isZh ? '已取消报名' : 'Registration cancelled');
      await queryClient.invalidateQueries({ queryKey: activityQK });
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(a?.clubId) });
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
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
    <div className="club-page club-page--floating-comments">
      <div className="club-activity-detail-main">
        <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '活动' : 'Activity'}</div>
        <Link className="club-profile-link" to={`/about/club/${a.clubId}`}>{isZh ? '社团' : 'Club'}</Link>
        </div>

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

        <ActivityRegisterBar
          isZh={isZh}
          registered={!!a.registration?.registered}
          count={a.registration?.count ?? 0}
          deadline={a.registration?.deadline || a.endTime || null}
          disabled={canManage}
          loading={registerMut.isPending || cancelRegisterMut.isPending}
          onRegister={() => {
            if (!token) {
              nav('/login', { state: { from: { pathname: `/about/club/activity/${activityId}` } } });
              return;
            }
            registerMut.mutate();
          }}
          onCancel={() => cancelRegisterMut.mutate()}
        />

        {imageUrls.length > 0 ? (
          <div className="post-detail-media" aria-label={isZh ? '活动配图' : 'Activity images'}>
            {imageUrls.length === 1 ? (
              <button
                type="button"
                className="post-detail-image-wrap"
                onClick={() => setImagePreview({ open: true, index: 0 })}
              >
                <img src={imageUrls[0]} alt="" className="post-detail-image" />
              </button>
            ) : (
              <StackedCardCarousel
                urls={imageUrls}
                index={carouselIndex}
                onChangeIndex={(next, dir) => {
                  setCarouselDir(dir);
                  setCarouselIndex(next);
                }}
                onOpenPreview={(i) => setImagePreview({ open: true, index: i })}
                dir={carouselDir}
              />
            )}
          </div>
        ) : null}

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
            <MessageCircle size={18} aria-hidden /> <span>{a.stats?.comments ?? 0}</span>
          </div>
          <div className="club-like-meta">
            <Eye size={18} aria-hidden /> <span>{a.stats?.views ?? 0}</span>
          </div>
          {a.registration ? (
            <div className="club-like-meta">
              <span>{isZh ? '已报名' : 'Registered'}</span>
              <span>{a.registration.count ?? 0}</span>
            </div>
          ) : null}
          {a.signupLink ? (
            <a className="club-join-link pressable" href={a.signupLink} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> {isZh ? '外链报名' : 'Signup'}
            </a>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="club-delete-btn pressable"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (window.confirm(isZh ? '确定删除该活动？删除后不可恢复。' : 'Delete this activity? This cannot be undone.')) {
                  deleteMut.mutate();
                }
              }}
            >
              <Trash2 size={16} aria-hidden />
              <span>{isZh ? '删除' : 'Delete'}</span>
            </button>
          ) : null}
          <ReportButton target_type="club_activity" target_id={activityId} className="text-slate-400 hover:text-red-500" />
        </div>
        </div>
      </div>

      <ClubCommentsSection targetType="activity" targetId={activityId} isZh={isZh} floatingComposer fillVertical />

      {imagePreview.open && imageUrls.length > 0 ? (
        <ImagePreview urls={imageUrls} initialIndex={imagePreview.index} onClose={() => setImagePreview({ open: false, index: 0 })} />
      ) : null}
    </div>
  );
}

export default ActivityDetail;
