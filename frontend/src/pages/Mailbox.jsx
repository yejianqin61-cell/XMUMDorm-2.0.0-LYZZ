import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import RouteTransition from '../components/ui/RouteTransition';
import {
  clearNotifications,
  clearNotificationsByCategory,
  getNotifications,
  getUnreadSummary,
  markNotificationRead,
} from '@shared/api/notifications';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './Mailbox.css';

function formatTime(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'åˆšåˆš';
  if (diffMin < 60) return `${diffMin} åˆ†é’Ÿå‰`;
  if (diffHour < 24) return `${diffHour} å°æ—¶å‰`;
  if (diffDay === 1) return 'æ˜¨å¤©';
  if (diffDay < 7) return `${diffDay} å¤©å‰`;
  return date.toLocaleDateString();
}

function displayName(u) {
  if (!u) return 'Someone';
  return (u.nickname || u.username || 'Someone').trim();
}

function buildAffairsText({ isZh, latest }) {
  const title = latest?.extra?.targetTitle || latest?.target?.title || '';
  const titlePart = title ? (isZh ? `ã€Š${title}ã€‹` : `"${title}"`) : (isZh ? 'è¯¥æ´»åŠ¨' : 'this activity');
  if (latest?.type === 'activity_deadline_reminder') {
    return isZh ? `${titlePart} çš„æŠ¥åå³å°†æˆªæ­¢ï¼Œè¯·åŠæ—¶å¤„ç†ã€‚` : `Registration for ${titlePart} is closing soon.`;
  }
  if (latest?.type === 'activity_start_reminder') {
    return isZh ? `${titlePart} å³å°†å¼€å§‹ï¼Œè¯·ç•™æ„æ´»åŠ¨å®‰æŽ’ã€‚` : `${titlePart} is starting soon.`;
  }
  return isZh ? `ä½ å·²æˆåŠŸæŠ¥å ${titlePart}ã€‚` : `You have successfully registered for ${titlePart}.`;
}

function buildMarketplaceText({ isZh, names, othersCount, contentTitle }) {
  const a = names[0] || (isZh ? 'æœ‰äºº' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}ã€${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} å’Œå¦å¤– ${others} äºº` : `${join2} and ${others} others`)
    : join2;
  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `ã€Š${t}ã€‹` : `"${t}"`) : (isZh ? 'è¯¥å•†å“' : 'the item');
  return isZh ? `${prefix} åœ¨äºŒæ‰‹å¸‚åœºå°± ${titlePart} å‘æ¥æ–°æ¶ˆæ¯ã€‚` : `${prefix} sent a new message about ${titlePart}.`;
}

function buildAggregateText({ isZh, names, othersCount, likeCount, commentCount, isPost, contentTitle }) {
  const a = names[0] || (isZh ? 'æœ‰äºº' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}ã€${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} å’Œå¦å¤– ${others} äºº` : `${join2} and ${others} others`)
    : join2;

  if (!isPost) {
    return isZh ? `${prefix} æ›´æ–°äº†ä¸€æ¡ç³»ç»Ÿæ¶ˆæ¯ã€‚` : `${prefix} triggered a system update.`;
  }

  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `ã€Š${t}ã€‹` : `"${t}"`) : (isZh ? 'ä½ çš„å¸–å­' : 'your post');
  if (likeCount > 0 && commentCount > 0) {
    return isZh ? `${prefix} èµžäº†æˆ–è¯„è®ºäº†${titlePart}ã€‚` : `${prefix} liked or commented on ${titlePart}.`;
  }
  if (commentCount > 0) {
    return isZh ? `${prefix} è¯„è®ºäº†${titlePart}ã€‚` : `${prefix} commented on ${titlePart}.`;
  }
  return isZh ? `${prefix} èµžäº†${titlePart}ã€‚` : `${prefix} liked ${titlePart}.`;
}

function Mailbox() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [data, setData] = useState({ list: [], hasMore: false });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');

  const CATEGORY_TABS = [
    { key: 'all', label: 'å…¨éƒ¨', labelEn: 'All' },
    { key: 'interaction', label: 'äº’åŠ¨', labelEn: 'Interaction' },
    { key: 'transaction', label: 'äº‹åŠ¡', labelEn: 'Transaction' },
    { key: 'system', label: 'ç³»ç»Ÿ', labelEn: 'System' },
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      setData({ list: [], hasMore: false });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const opts = { page: 1, pageSize: 50 };
    if (tab !== 'all') opts.category = tab;

    Promise.all([getNotifications(opts), getUnreadSummary()])
      .then(([res, summary]) => {
        if (cancelled) return;
        setData({ list: res?.list ?? [], hasMore: !!res?.hasMore });
        setUnreadCounts(summary?.byCategory || {});
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, tab]);

  const groups = useMemo(() => {
    const list = Array.isArray(data?.list) ? data.list : [];
    const map = new Map();

    for (const n of list) {
      const t = n?.target || null;
      const isAffair = ['activity_register_success', 'activity_start_reminder', 'activity_deadline_reminder'].includes(n.type);
      const baseKey = t?.key || `unknown:${n.id}`;
      const key = isAffair ? `affair:${baseKey}` : baseKey;
      const isPost = t && (t.type === 'post' || t.type === 'announcement');
      if (!map.has(key)) {
        map.set(key, {
          key,
          isPost,
          isAffair,
          target: t,
          items: [],
        });
      }
      map.get(key).items.push(n);
    }

    return Array.from(map.values())
      .map((g) => {
        const sorted = [...g.items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const unreadCount = sorted.filter((x) => !x.is_read).length;
        const likeCount = sorted.filter((x) => x.type === 'like' || x.type?.endsWith('_like')).length;
        const commentCount = sorted.filter((x) => ['comment', 'handbook_comment', 'course_review_comment'].includes(x.type) || x.type?.endsWith('_comment')).length;
        const latest = sorted[0] || null;
        const seen = new Set();
        const users = [];
        for (const it of sorted) {
          const u = it.from_user;
          const id = u?.id != null ? String(u.id) : null;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          users.push(u);
        }
        const topUsers = users.slice(0, 3);
        const othersCount = Math.max(0, users.length - topUsers.length);
        const names = topUsers.map(displayName);

        return {
          ...g,
          sorted,
          latest,
          unreadCount,
          likeCount,
          commentCount,
          topUsers,
          othersCount,
          names,
          content_title: g.target?.title || latest?.post_title || latest?.extra?.targetTitle || null,
          content_path: g.target?.path || (latest?.post_id ? `/post/${latest.post_id}` : '#'),
          created_at: latest?.created_at,
          category: latest?.category || 'interaction',
        };
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [data?.list]);

  const handleGroupClick = (g) => {
    const unread = (g?.sorted || []).filter((x) => !x.is_read);
    if (unread.length === 0) return;
    Promise.allSettled(unread.map((x) => markNotificationRead(x.id))).catch(() => {});
  };

  if (!isLoggedIn) {
    return (
      <RouteTransition className="mailbox-page">
        <EmptyState
          title="è¯·å…ˆç™»å½•"
          description="ç™»å½•åŽæŸ¥çœ‹ä¿¡ç®±ã€‚Please log in to view mailbox."
          actionLabel="åŽ»ç™»å½•"
          actionTo="/login"
          icon="âœ‰"
        />
      </RouteTransition>
    );
  }

  if (loading) {
    return (
      <RouteTransition className="mailbox-page">
        <PageSkeleton variant="list" items={4} />
      </RouteTransition>
    );
  }

  if (error) {
    return (
      <RouteTransition className="mailbox-page">
        <ErrorState title="ä¿¡ç®±åŠ è½½å¤±è´¥" description={error} onActionClick={() => window.location.reload()} />
      </RouteTransition>
    );
  }

  return (
    <RouteTransition className="mailbox-page">
      <div className="mailbox-topbar">
        <div className="mailbox-tabs" role="tablist" aria-label="notification tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {CATEGORY_TABS.map((mt) => {
            const count = mt.key === 'all'
              ? Object.values(unreadCounts).reduce((a, b) => a + b, 0)
              : (unreadCounts[mt.key] || 0);
            return (
              <button
                key={mt.key}
                type="button"
                className={`mailbox-tab ${tab === mt.key ? 'is-on' : ''}`}
                onClick={() => setTab(mt.key)}
                role="tab"
                aria-selected={tab === mt.key}
                style={{ position: 'relative', padding: '6px 12px', fontSize: 13 }}
              >
                {isZh ? mt.label : mt.labelEn}
                {count > 0 ? (
                  <span style={{ marginLeft: 4, background: tab === mt.key ? '#fff' : '#ef4444', color: tab === mt.key ? '#ef4444' : '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 600 }}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="mailbox-clear-btn"
          onClick={async () => {
            const tabLabel = isZh ? CATEGORY_TABS.find((t) => t.key === tab)?.label || tab : tab;
            const ok = window.confirm(isZh ? `æ¸…ç©º${tabLabel}é€šçŸ¥ï¼Ÿ` : `Clear ${tabLabel} notifications?`);
            if (!ok) return;
            try {
              if (tab === 'all') {
                await clearNotifications('social');
              } else {
                await clearNotificationsByCategory(tab);
              }
              const [res, summary] = await Promise.all([
                getNotifications({ page: 1, pageSize: 50, category: tab !== 'all' ? tab : undefined }),
                getUnreadSummary(),
              ]);
              setData({ list: res?.list ?? [], hasMore: !!res?.hasMore });
              setUnreadCounts(summary?.byCategory || {});
            } catch (e) {
              setError(getApiErrorMessage(e));
            }
          }}
        >
          {isZh ? 'æ¸…ç©º' : 'Clear'}
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="æš‚æ— é€šçŸ¥" description="No notifications yet." icon="âœ‰" />
      ) : (
        <ul className="social-stream">
          {groups.map((g, idx) => {
            const isUnread = g.unreadCount > 0;
            const title = g.content_title || '';
            const linkTo = g.content_path || '#';
            const isAnnouncement = (g.target && g.target.type === 'announcement') || g.latest?.type === 'announcement' || g.latest?.type === 'system_announcement';
            const aggregateText = g.isAffair
              ? buildAffairsText({ isZh, latest: g.latest })
              : g.category === 'transaction'
              ? buildMarketplaceText({ isZh, names: g.names, othersCount: g.othersCount, contentTitle: title })
              : buildAggregateText({
                  isZh,
                  names: g.names,
                  othersCount: g.othersCount,
                  likeCount: g.likeCount,
                  commentCount: g.commentCount,
                  isPost: g.isPost,
                  contentTitle: title,
                });

            return (
              <li
                key={g.key}
                className={`social-card ${isUnread ? 'is-unread' : ''}`}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <Link to={linkTo} className="social-card-link" onClick={() => handleGroupClick(g)}>
                  {isAnnouncement ? (
                    <div className="mailbox-ann-only" aria-label={isZh ? 'å…¬å‘Šå†…å®¹' : 'Announcement content'}>
                      {String(title || g.latest?.extra?.content || '').trim() || (isZh ? 'ï¼ˆå…¬å‘Šå†…å®¹ä¸ºç©ºï¼‰' : '(Empty announcement)')}
                    </div>
                  ) : (
                    <>
                      <div className="social-head">
                        <div className="social-avatars" aria-label="actors">
                          {g.topUsers.map((u, i) => (
                            <span key={`${u?.id || i}`} className="social-avatar" style={{ zIndex: 10 - i }}>
                              <img src={u?.avatar || '/default-avatar.svg'} alt="" />
                            </span>
                          ))}
                          {g.othersCount > 0 ? <span className="social-others">+{g.othersCount}</span> : null}
                        </div>
                        <span className="social-time">{formatTime(g.created_at)}</span>
                      </div>

                      <div className="social-title" aria-label="title">
                        {title || (isZh ? 'ï¼ˆæ— æ ‡é¢˜ï¼‰' : '(Untitled)')}
                      </div>

                      <div className="social-text" aria-label="text">
                        {aggregateText}
                      </div>

                      {g.latest?.extra?.content ? (
                        <div className="social-whisper" aria-label="latest comment">
                          â€œ{String(g.latest.extra.content).trim()}â€
                        </div>
                      ) : null}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </RouteTransition>
  );
}

export default Mailbox;
