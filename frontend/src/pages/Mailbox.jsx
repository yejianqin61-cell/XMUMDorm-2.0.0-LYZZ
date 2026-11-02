import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
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
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString();
}

function displayName(u) {
  if (!u) return 'Someone';
  return (u.nickname || u.username || 'Someone').trim();
}

function buildAffairsText({ isZh, latest }) {
  const title = latest?.extra?.targetTitle || latest?.target?.title || '';
  const titlePart = title ? (isZh ? `《${title}》` : `"${title}"`) : (isZh ? '该活动' : 'this activity');
  if (latest?.type === 'activity_deadline_reminder') {
    return isZh ? `${titlePart} 的报名即将截止，请及时处理。` : `Registration for ${titlePart} is closing soon.`;
  }
  if (latest?.type === 'activity_start_reminder') {
    return isZh ? `${titlePart} 即将开始，请留意活动安排。` : `${titlePart} is starting soon.`;
  }
  return isZh ? `你已成功报名 ${titlePart}。` : `You have successfully registered for ${titlePart}.`;
}

function buildMarketplaceText({ isZh, names, othersCount, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`)
    : join2;
  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '该商品' : 'the item');
  return isZh ? `${prefix} 在二手市场就 ${titlePart} 发来新消息。` : `${prefix} sent a new message about ${titlePart}.`;
}

function buildAggregateText({ isZh, names, othersCount, likeCount, commentCount, isPost, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`)
    : join2;

  if (!isPost) {
    return isZh ? `${prefix} 更新了一条系统消息。` : `${prefix} triggered a system update.`;
  }

  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '你的帖子' : 'your post');
  if (likeCount > 0 && commentCount > 0) {
    return isZh ? `${prefix} 赞了或评论了 ${titlePart}。` : `${prefix} liked or commented on ${titlePart}.`;
  }
  if (commentCount > 0) {
    return isZh ? `${prefix} 评论了 ${titlePart}。` : `${prefix} commented on ${titlePart}.`;
  }
  return isZh ? `${prefix} 赞了 ${titlePart}。` : `${prefix} liked ${titlePart}.`;
}

function Mailbox() {
  const { isLoggedIn, token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [data, setData] = useState({ list: [], hasMore: false });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readError, setReadError] = useState(null);
  const [moreError, setMoreError] = useState(null);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const activeRequest = useRef(null);
  const [tab, setTab] = useState('all');

  const CATEGORY_TABS = [
    { key: 'all', label: '全部', labelEn: 'All' },
    { key: 'interaction', label: '互动', labelEn: 'Interaction' },
    { key: 'transaction', label: '交易', labelEn: 'Transaction' },
    { key: 'system', label: '系统', labelEn: 'System' },
  ];

  const requestKey = `${token || ''}:${tab}`;
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setLoading(isLoggedIn);
    setError(null);
    setPage(1);
    setLoadingMore(false);
    setMoreError(null);
    setReadError(null);
    setData({ list: [], hasMore: false });
  }

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    let cancelled = false;
    activeRequest.current = requestKey;

    const opts = { page, pageSize: 50 };
    if (tab !== 'all') opts.category = tab;

    Promise.all([getNotifications(opts), getUnreadSummary()])
      .then(([res, summary]) => {
        if (cancelled) return;
        setData(previous => ({
          list: page === 1 ? (res?.list ?? []) : [...new Map([...previous.list, ...(res?.list ?? [])].map(item => [item.id, item])).values()],
          hasMore: !!res?.hasMore,
        }));
        setMoreError(null);
        setUnreadCounts(summary?.byCategory || {});
      })
      .catch((err) => {
        if (!cancelled) (page === 1 ? setError : setMoreError)(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        if (!cancelled) setLoadingMore(false);
      });

    return () => { cancelled = true; activeRequest.current = null; };
  }, [isLoggedIn, token, tab, page, retry, requestKey]);

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
  }, [data]);

  const handleGroupClick = (g) => {
    const unread = (g?.sorted || []).filter((x) => !x.is_read);
    if (unread.length === 0) return;
    if (g.latest?.type !== 'campus_news_publication') { Promise.allSettled(unread.map(x => markNotificationRead(x.id))).catch(() => {}); return; }
    Promise.allSettled(unread.map(x => markNotificationRead(x.id))).then(async results => {
      if (activeRequest.current !== requestKey) return;
      const saved = new Set(unread.filter((_,i) => results[i].status === 'fulfilled').map(x => x.id));
      setData(previous => ({ ...previous, list: previous.list.map(x => saved.has(x.id) ? { ...x, is_read: true } : x) }));
      if (saved.size !== unread.length) setReadError(isZh ? '已读状态未全部保存，请重试。' : 'Read state was not fully saved. Please retry.');
      else setReadError(null);
      const summary = await getUnreadSummary();
      if (activeRequest.current === requestKey) setUnreadCounts(summary.byCategory || {});
    }).catch(() => { if (activeRequest.current === requestKey) setReadError(isZh ? '未读数量更新失败，请刷新重试。' : 'Unable to refresh unread count.'); });

  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (!isLoggedIn) {
    return (
      <RouteTransition className="mailbox-page">
        <EmptyState
          title="请先登录"
          description="登录后查看消息。Please log in to view mailbox."
          actionLabel="去登录"
          actionTo="/login"
          icon="✉"
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
        <ErrorState title="消息加载失败" description={error} onActionClick={() => window.location.reload()} />
      </RouteTransition>
    );
  }

  return (
    <RouteTransition className="mailbox-page">
      <section className="mailbox-hero">
        <div className="mailbox-hero__copy">
          <p className="mailbox-hero__eyebrow">{isZh ? '我的工作台消息' : 'Workbench Mailbox'}</p>
          {readError && <p role="alert">{readError}</p>}
          <h1 className="mailbox-hero__title">
            {isZh ? '消息' : 'Mailbox'}
          </h1>
        </div>
        <div className="mailbox-hero__stats" aria-label={isZh ? '未读概览' : 'Unread summary'}>
          <div className="mailbox-hero__stat">
            <span className="mailbox-hero__stat-value">{totalUnread}</span>
            <span className="mailbox-hero__stat-label">{isZh ? '总未读' : 'Unread total'}</span>
          </div>
          <div className="mailbox-hero__stat">
            <span className="mailbox-hero__stat-value">{unreadCounts.interaction || 0}</span>
            <span className="mailbox-hero__stat-label">{isZh ? '互动' : 'Interaction'}</span>
          </div>
          <div className="mailbox-hero__stat">
            <span className="mailbox-hero__stat-value">{unreadCounts.transaction || 0}</span>
            <span className="mailbox-hero__stat-label">{isZh ? '交易' : 'Transaction'}</span>
          </div>
        </div>
      </section>

      <div className="mailbox-panel">
        <div className="mailbox-topbar">
          <div className="mailbox-tabs" role="tablist" aria-label="notification tabs">
            {CATEGORY_TABS.map((mt) => {
              const count = mt.key === 'all' ? totalUnread : (unreadCounts[mt.key] || 0);
              return (
                <button
                  key={mt.key}
                  type="button"
                  className={`mailbox-tab ${tab === mt.key ? 'is-on' : ''}`}
                  onClick={() => setTab(mt.key)}
                  role="tab"
                  aria-selected={tab === mt.key}
                >
                  {isZh ? mt.label : mt.labelEn}
                  {count > 0 ? <span className="mailbox-tab__badge">{count}</span> : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mailbox-clear-btn"
            onClick={async () => {
              const tabLabel = isZh ? CATEGORY_TABS.find((t) => t.key === tab)?.label || tab : tab;
              const ok = window.confirm(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel} notifications?`);
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
            {isZh ? '清空' : 'Clear'}
          </button>
        </div>

        {groups.length === 0 ? (
          <EmptyState title="暂无通知" description="No notifications yet." icon="✉" />
        ) : (
          <ul className="social-stream">
            {groups.map((g, idx) => {
              const isUnread = g.unreadCount > 0;
              const title = g.content_title || '';
              const linkTo = g.content_path || '#';
              const isAnnouncement = (g.target && g.target.type === 'announcement') || g.latest?.type === 'announcement' || g.latest?.type === 'system_announcement';
              const isCampus = g.latest?.type === 'campus_news_publication';
              const aggregateText = isCampus ? (g.target?.available ? (isZh ? '校园快讯 · 学院通知' : 'Campus news · College update') : (isZh ? '该校园快讯暂不可查看' : 'This campus news is unavailable')) : g.isAffair
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
                  <Link to={linkTo} className="social-card-link" onClick={e => { if (isCampus && !g.target?.available) e.preventDefault(); handleGroupClick(g); }}>
                    {isAnnouncement ? (
                      <div className="mailbox-ann-only" aria-label={isZh ? '公告内容' : 'Announcement content'}>
                        {String(title || g.latest?.extra?.content || '').trim() || (isZh ? '（公告内容为空）' : '(Empty announcement)')}
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
                          {title || (isCampus ? (isZh ? '校园快讯暂不可查看' : 'Campus news unavailable') : (isZh ? '（无标题）' : '(Untitled)'))}
                        </div>

                        <div className="social-text" aria-label="text">
                          {aggregateText}
                        </div>

                        {g.latest?.extra?.content ? (
                          <div className="social-whisper" aria-label="latest comment">
                            “{String(g.latest.extra.content).trim()}”
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
        {moreError && <p role="alert">{moreError}</p>}
        {data.hasMore && <button type="button" className="mailbox-clear" disabled={loadingMore} onClick={() => {
          setLoadingMore(true);
          if (moreError) setRetry(value => value + 1);
          else setPage(value => value + 1);
        }}>{loadingMore ? (isZh ? '加载中…' : 'Loading…') : moreError ? (isZh ? '重试加载' : 'Retry') : (isZh ? '加载更多' : 'Load more')}</button>}
      </div>
    </RouteTransition>
  );
}

export default Mailbox;
