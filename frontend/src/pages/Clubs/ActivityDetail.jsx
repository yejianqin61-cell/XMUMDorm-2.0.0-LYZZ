import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus2, Clock3, ExternalLink, Eye, Heart, ListTodo, MapPin, MessageCircle, Trash2, UsersRound } from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ActivityRegisterBar from '../../components/clubs/ActivityRegisterBar';
import { QK } from '@shared/query/queryKeys';
import { queryClient } from '@shared/query/queryClient';
import { Toast } from '../../context/ToastContext';
import {
  cancelClubActivityRegistration,
  deleteClubActivity,
  getActivityDetail,
  registerClubActivity,
  toggleClubLike,
  trackClubView,
} from '@shared/api/clubs';
import { createTodo } from '@shared/api/todos';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { API_BASE_URL } from '@shared/api/config';
import ImagePreview from '../../components/ImagePreview';
import { StackedCardCarousel } from '../../components/StackedCardCarousel';
import ClubCommentsSection from '../../components/clubs/ClubCommentsSection';
import NeoButton from '../../components/retroui/Button';
import NeoBadge from '../../components/retroui/Badge';
import NeoCard from '../../components/retroui/Card';
import '../PostDetail.css';
import './Clubs.css';

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function parseDateTime(value) {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDatePart(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimePart(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function toIcsStamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function downloadEventIcs(activity) {
  const start = parseDateTime(activity?.time);
  if (!start) return false;
  const end = parseDateTime(activity?.endTime) || new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//XMUMDorm//Campus Activity//EN',
    'BEGIN:VEVENT',
    `UID:club-activity-${activity.id}@xmumdorm`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText(activity.title)}`,
    `LOCATION:${escapeIcsText(activity.location || '')}`,
    `DESCRIPTION:${escapeIcsText([activity.clubName, activity.summary].filter(Boolean).join(' | '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(activity.title || 'activity').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 48) || 'activity'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
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

  const eventDate = useMemo(() => parseDateTime(a?.time), [a?.time]);
  const eventDay = eventDate ? String(eventDate.getDate()).padStart(2, '0') : '--';
  const eventMonth = eventDate
    ? eventDate.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short' }).toUpperCase()
    : (isZh ? '日期' : 'DATE');
  const statusLabel = String(a.status || '').toLowerCase() === 'ended'
    ? (isZh ? '已结束' : 'ENDED')
    : (isZh ? '进行中' : 'OPEN');

  const todoMut = useMutation({
    mutationFn: async () => {
      const start = parseDateTime(a?.time);
      return createTodo({
        title: `${isZh ? '社团活动' : 'Club activity'}: ${a?.title || ''}`.trim(),
        description: [a?.clubName, a?.location, a?.summary].filter(Boolean).join(' | '),
        priority: 2,
        due_date: formatDatePart(start),
        due_time: formatTimePart(start),
        list_type: 'club',
      });
    },
    onSuccess: async () => {
      Toast.success(isZh ? '已加入待办' : 'Added to to-do');
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
    },
  });

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !a) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page club-page--floating-comments activity-detail-page">
      <div className="club-activity-detail-main">
        <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '活动' : 'Activity'}</div>
        <Link className="club-profile-link" to={`/about/club/${a.clubId}`}>{isZh ? '社团' : 'Club'}</Link>
        </div>

        <NeoCard className="club-profile-card activity-detail-card">
          <div className="activity-detail-hero">
            <div className="activity-detail-date" aria-label={timeText || (isZh ? '活动日期' : 'Activity date')}>
              <span>{eventMonth}</span>
              <strong>{eventDay}</strong>
            </div>
            <div className="activity-detail-heading">
              <div className="activity-detail-kicker">
                <NeoBadge variant="accent" size="sm">{isZh ? '社团活动' : 'CLUB ACTIVITY'}</NeoBadge>
                <span>{a.clubName}</span>
              </div>
              <h1 className="activity-detail-title">{a.title}</h1>
              <NeoBadge variant={statusLabel === 'OPEN' || statusLabel === '进行中' ? 'primary' : 'default'} size="sm">
                {statusLabel}
              </NeoBadge>
            </div>
          </div>

          {a.summary ? <div className="club-detail-desc activity-detail-summary">{a.summary}</div> : null}

          <div className="activity-detail-info-grid">
            {timeText ? (
              <div className="activity-detail-info">
                <Clock3 size={18} aria-hidden />
                <div><span>{isZh ? '时间' : 'WHEN'}</span><strong>{timeText}</strong></div>
              </div>
            ) : null}
            {a.location ? (
              <div className="activity-detail-info">
                <MapPin size={18} aria-hidden />
                <div><span>{isZh ? '地点' : 'WHERE'}</span><strong className="club-wrap">{a.location}</strong></div>
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

        <div className="club-detail-utility-row activity-detail-utilities">
          <NeoButton
            variant="outline"
            size="sm"
            className="activity-detail-utility-btn"
            iconLeft={<CalendarPlus2 size={16} aria-hidden />}
            onClick={() => {
              const ok = downloadEventIcs(a);
              if (!ok) Toast.error(isZh ? '当前活动缺少可导出的时间信息' : 'This activity does not have exportable time info yet');
            }}
          >
            {isZh ? '加入日历' : 'Add to calendar'}
          </NeoButton>
          <NeoButton
            variant="outline"
            size="sm"
            className="activity-detail-utility-btn"
            iconLeft={<ListTodo size={16} aria-hidden />}
            disabled={todoMut.isPending}
            onClick={() => {
              if (!token) {
                nav('/login', { state: { from: { pathname: `/about/club/activity/${activityId}` } } });
                return;
              }
              todoMut.mutate();
            }}
          >
            {todoMut.isPending ? (isZh ? '加入中…' : 'Adding…') : (isZh ? '加入待办' : 'Add to to-do')}
          </NeoButton>
        </div>

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

        <div className="club-detail-actions activity-detail-actions">
          <NeoButton
            variant={liked ? 'default' : 'outline'}
            size="sm"
            className="activity-detail-like"
            disabled={!token || likeMut.isPending}
            onClick={() => likeMut.mutate()}
            title={!token ? (isZh ? '登录后可点赞' : 'Login to like') : (isZh ? '点赞' : 'Like')}
            iconLeft={<Heart size={18} aria-hidden />}
          >
            {a.stats?.likes ?? 0}
          </NeoButton>
          <div className="club-like-meta">
            <MessageCircle size={18} aria-hidden /> <span>{a.stats?.comments ?? 0}</span>
          </div>
          <div className="club-like-meta">
            <Eye size={18} aria-hidden /> <span>{a.stats?.views ?? 0}</span>
          </div>
          {a.registration ? (
            <div className="club-like-meta">
              <UsersRound size={18} aria-hidden />
              <span>{isZh ? '已报名' : 'Registered'}</span>
              <span>{a.registration.count ?? 0}</span>
            </div>
          ) : null}
          {a.signupLink ? (
            <a
              className="activity-detail-signup"
              href={a.signupLink}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} aria-hidden /> {isZh ? '外链报名' : 'Signup'}
            </a>
          ) : null}
          {canManage ? (
            <NeoButton
              variant="destructive"
              size="sm"
              className="activity-detail-delete"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (window.confirm(isZh ? '确定删除该活动？删除后不可恢复。' : 'Delete this activity? This cannot be undone.')) {
                  deleteMut.mutate();
                }
              }}
              iconLeft={<Trash2 size={16} aria-hidden />}
            >
              {isZh ? '删除' : 'Delete'}
            </NeoButton>
          ) : null}
          <ReportButton target_type="club_activity" target_id={activityId} className="text-slate-400 hover:text-red-500" />
        </div>
        </NeoCard>
      </div>

      <ClubCommentsSection targetType="activity" targetId={activityId} isZh={isZh} floatingComposer fillVertical />

      {imagePreview.open && imageUrls.length > 0 ? (
        <ImagePreview urls={imageUrls} initialIndex={imagePreview.index} onClose={() => setImagePreview({ open: false, index: 0 })} />
      ) : null}
    </div>
  );
}

export default ActivityDetail;
