import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import RouteTransition from '../components/ui/RouteTransition';
import {
  clearNotificationsByCategory,
  getNotifications,
  markNotificationRead,
} from '@shared/api/notifications';
import { NOTIFICATION_CATEGORIES } from '@shared/constants/notifications';
import { QK } from '@shared/query/queryKeys';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './Mailbox.css';

function formatTime(createdAt, isZh) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const diffMs = Date.now() - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return isZh ? '刚刚' : 'Just now';
  if (diffMin < 60) return isZh ? `${diffMin} 分钟前` : `${diffMin}m ago`;
  if (diffHour < 24) return isZh ? `${diffHour} 小时前` : `${diffHour}h ago`;
  if (diffDay === 1) return isZh ? '昨天' : 'Yesterday';
  if (diffDay < 7) return isZh ? `${diffDay} 天前` : `${diffDay}d ago`;
  return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US');
}

function displayName(user) {
  if (!user) return 'Someone';
  return (user.nickname || user.username || 'Someone').trim();
}

function getAnnouncementCopy(group, isZh) {
  const latest = group?.latest || {};
  const title = String(group?.contentTitle || latest.extra?.title || '').trim()
    || (isZh ? '公告' : 'Announcement');
  const body = String(latest.extra?.content || '').trim()
    || (isZh ? '暂无公告正文。' : 'No announcement body.');
  return { title, body };
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
  const firstName = names[0] || (isZh ? '有人' : 'Someone');
  const secondName = names[1] || '';
  const namesText = secondName ? (isZh ? `${firstName}、${secondName}` : `${firstName}, ${secondName}`) : firstName;
  const prefix = othersCount > 0
    ? (isZh ? `${namesText} 和另外 ${othersCount} 人` : `${namesText} and ${othersCount} others`)
    : namesText;
  const title = (contentTitle || '').trim();
  const titlePart = title ? (isZh ? `《${title}》` : `"${title}"`) : (isZh ? '该商品' : 'the item');
  return isZh ? `${prefix} 在二手市场就 ${titlePart} 发来新消息。` : `${prefix} sent a new message about ${titlePart}.`;
}

function buildAggregateText({ isZh, names, othersCount, likeCount, commentCount, isPost, contentTitle }) {
  const firstName = names[0] || (isZh ? '有人' : 'Someone');
  const secondName = names[1] || '';
  const namesText = secondName ? (isZh ? `${firstName}、${secondName}` : `${firstName}, ${secondName}`) : firstName;
  const prefix = othersCount > 0
    ? (isZh ? `${namesText} 和另外 ${othersCount} 人` : `${namesText} and ${othersCount} others`)
    : namesText;

  if (!isPost) {
    return isZh ? `${prefix} 更新了一条系统消息。` : `${prefix} triggered a system update.`;
  }

  const title = (contentTitle || '').trim();
  const titlePart = title ? (isZh ? `《${title}》` : `"${title}"`) : (isZh ? '你的帖子' : 'your post');
  if (likeCount > 0 && commentCount > 0) {
    return isZh ? `${prefix} 赞了或评论了${titlePart}。` : `${prefix} liked or commented on ${titlePart}.`;
  }
  if (commentCount > 0) {
    return isZh ? `${prefix} 评论了${titlePart}。` : `${prefix} commented on ${titlePart}.`;
  }
  return isZh ? `${prefix} 赞了${titlePart}。` : `${prefix} liked ${titlePart}.`;
}

const CATEGORY_LABELS = {
  interaction: { zh: '互动', en: 'Interaction' },
  transaction: { zh: '事务', en: 'Transaction' },
  system: { zh: '系统', en: 'System' },
};
const CATEGORY_TABS = NOTIFICATION_CATEGORIES.map((key) => ({ key, ...CATEGORY_LABELS[key] }));
const PAGE_SIZE = 20;
const MAILBOX_STALE_MS = 30 * 1000;

function Mailbox() {
  const queryClient = useQueryClient();
  const { isLoggedIn, token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('interaction');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const tokenKey = token ?? '';
  const mailboxQueryKey = QK.mailboxNotifications(tokenKey, tab);
  const mailboxQuery = useInfiniteQuery({
    queryKey: mailboxQueryKey,
    queryFn: ({ pageParam = 1 }) => getNotifications({
      category: tab,
      page: pageParam,
      pageSize: PAGE_SIZE,
    }),
    enabled: isLoggedIn && !!token,
    initialPageParam: 1,
    staleTime: MAILBOX_STALE_MS,
    getNextPageParam: (lastPage) => (
      lastPage?.hasMore ? (Number(lastPage.page) || 1) + 1 : undefined
    ),
  });

  const notifications = useMemo(() => {
    const seen = new Set();
    return (mailboxQuery.data?.pages || []).flatMap((page) => page?.list || []).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [mailboxQuery.data]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const notification of notifications) {
      const target = notification?.target || null;
      const isAffair = ['activity_register_success', 'activity_start_reminder', 'activity_deadline_reminder'].includes(notification.type);
      const baseKey = target?.key || `unknown:${notification.id}`;
      const key = isAffair ? `affair:${baseKey}` : baseKey;
      if (!map.has(key)) {
        map.set(key, { key, isPost: target?.type === 'post' || target?.type === 'announcement', isAffair, target, items: [] });
      }
      map.get(key).items.push(notification);
    }

    return Array.from(map.values())
      .map((group) => {
        const sorted = [...group.items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const seen = new Set();
        const users = sorted.filter((item) => {
          const id = item.from_user?.id != null ? String(item.from_user.id) : null;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        }).map((item) => item.from_user);
        const latest = sorted[0] || null;
        return {
          ...group,
          sorted,
          latest,
          unreadCount: sorted.filter((item) => !item.is_read).length,
          likeCount: sorted.filter((item) => item.type === 'like' || item.type?.endsWith('_like')).length,
          commentCount: sorted.filter((item) => ['comment', 'handbook_comment', 'course_review_comment'].includes(item.type) || item.type?.endsWith('_comment')).length,
          topUsers: users.slice(0, 3),
          othersCount: Math.max(0, users.length - 3),
          names: users.slice(0, 3).map(displayName),
          contentTitle: group.target?.title || latest?.post_title || latest?.extra?.targetTitle || null,
          contentPath: group.target?.path || (latest?.post_id ? `/post/${latest.post_id}` : '#'),
          createdAt: latest?.created_at,
          category: latest?.category || 'interaction',
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [notifications]);

  const handleGroupClick = (group) => {
    const unread = group.sorted.filter((item) => !item.is_read);
    if (unread.length) Promise.allSettled(unread.map((item) => markNotificationRead(item.id))).catch(() => {});
  };

  const handleClear = async () => {
    const tabLabel = CATEGORY_LABELS[tab]?.[isZh ? 'zh' : 'en'] || tab;
    if (!window.confirm(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel} notifications?`)) return;
    setClearing(true);
    setClearError('');
    try {
      await clearNotificationsByCategory(tab);
      const firstPage = await getNotifications({ category: tab, page: 1, pageSize: PAGE_SIZE });
      queryClient.setQueryData(mailboxQueryKey, { pages: [firstPage], pageParams: [1] });
      queryClient.setQueryData(['notifications', 'unreadSummary', tokenKey], firstPage?.unreadSummary || {});
      await queryClient.invalidateQueries({ queryKey: QK.unreadAnnouncements(tokenKey) });
    } catch (err) {
      setClearError(getApiErrorMessage(err));
    } finally {
      setClearing(false);
    }
  };

  if (!isLoggedIn) {
    return <RouteTransition className="mailbox-page"><EmptyState title={isZh ? '请先登录' : 'Please log in'} description={isZh ? '登录后查看信箱。' : 'Please log in to view mailbox.'} actionLabel={isZh ? '去登录' : 'Log in'} actionTo="/login" icon="✉" /></RouteTransition>;
  }
  if (mailboxQuery.isLoading) return <RouteTransition className="mailbox-page"><PageSkeleton items={4} /></RouteTransition>;
  if (mailboxQuery.isError && notifications.length === 0) {
    return <RouteTransition className="mailbox-page"><ErrorState title={isZh ? '信箱加载失败' : 'Mailbox failed to load'} description={getApiErrorMessage(mailboxQuery.error)} onActionClick={() => mailboxQuery.refetch()} /></RouteTransition>;
  }

  return (
    <RouteTransition className="mailbox-page">
      <div className="mailbox-topbar">
        <div className="mailbox-tabs" role="tablist" aria-label={isZh ? '通知分类' : 'Notification categories'}>
          {CATEGORY_TABS.map((item) => {
            return <button key={item.key} type="button" className={`mailbox-tab ${tab === item.key ? 'is-on' : ''}`} onClick={() => { setClearError(''); setTab(item.key); }} role="tab" aria-selected={tab === item.key}>
              {isZh ? item.zh : item.en}
            </button>;
          })}
        </div>
        <button type="button" className="mailbox-clear-btn" disabled={clearing} onClick={handleClear}>
          {clearing ? (isZh ? '清理中…' : 'Clearing…') : (isZh ? '清空' : 'Clear')}
        </button>
      </div>

      {clearError ? <div className="mailbox-inline-error" role="alert">{clearError}</div> : null}
      {mailboxQuery.isError && notifications.length > 0 ? (
        <div className="mailbox-inline-error" role="alert">
          <span>{isZh ? '刷新失败，已保留现有通知。' : 'Refresh failed. Existing notifications are still available.'}</span>
          <button type="button" onClick={() => mailboxQuery.refetch()}>{isZh ? '重试' : 'Retry'}</button>
        </div>
      ) : null}

      {groups.length === 0 ? <EmptyState title={isZh ? '暂无通知' : 'No notifications'} description={isZh ? '新的消息会出现在这里。' : 'New notifications will appear here.'} icon="✉" /> : (
        <ul className="social-stream">
          {groups.map((group, index) => {
            const isAnnouncement = group.target?.type === 'announcement' || group.latest?.type === 'announcement' || group.latest?.type === 'system_announcement';
            const announcementCopy = isAnnouncement ? getAnnouncementCopy(group, isZh) : null;
            const aggregateText = group.isAffair ? buildAffairsText({ isZh, latest: group.latest }) : group.category === 'transaction'
              ? buildMarketplaceText({ isZh, names: group.names, othersCount: group.othersCount, contentTitle: group.contentTitle })
              : buildAggregateText({ isZh, names: group.names, othersCount: group.othersCount, likeCount: group.likeCount, commentCount: group.commentCount, isPost: group.isPost, contentTitle: group.contentTitle });
            return <li key={group.key} className={`social-card ${group.unreadCount > 0 ? 'is-unread' : ''}`} style={{ animationDelay: `${index * 70}ms` }}>
              <Link to={group.contentPath} className="social-card-link" onClick={() => handleGroupClick(group)}>
                {isAnnouncement ? <div className="mailbox-announcement" aria-label={isZh ? '公告内容' : 'Announcement content'}>
                  <div className="mailbox-announcement-head">
                    <span className="mailbox-announcement-label">{isZh ? '公告' : 'Announcement'}</span>
                    <span className="social-time">{formatTime(group.createdAt, isZh)}</span>
                  </div>
                  <div className="mailbox-announcement-title">{announcementCopy.title}</div>
                  <div className="mailbox-announcement-body">{announcementCopy.body}</div>
                  <div className="mailbox-announcement-meta">{displayName(group.latest?.from_user)}</div>
                </div> : <>
                  <div className="social-head"><div className="social-avatars" aria-label={isZh ? '发送者' : 'Senders'}>{group.topUsers.map((user, userIndex) => <span key={`${user?.id || userIndex}`} className="social-avatar" style={{ zIndex: 10 - userIndex }}><img src={user?.avatar || '/default-avatar.svg'} alt="" /></span>)}{group.othersCount > 0 && <span className="social-others">+{group.othersCount}</span>}</div><span className="social-time">{formatTime(group.createdAt, isZh)}</span></div>
                  <div className="social-title">{group.contentTitle || (isZh ? '（无标题）' : '(Untitled)')}</div>
                  <div className="social-text">{aggregateText}</div>
                  {group.latest?.extra?.content && <div className="social-whisper">“{String(group.latest.extra.content).trim()}”</div>}
                </>}
              </Link>
            </li>;
          })}
        </ul>
      )}

      {mailboxQuery.hasNextPage ? (
        <button
          type="button"
          className="mailbox-load-more"
          disabled={mailboxQuery.isFetchingNextPage}
          onClick={() => mailboxQuery.fetchNextPage()}
        >
          {mailboxQuery.isFetchingNextPage
            ? (isZh ? '加载中…' : 'Loading…')
            : mailboxQuery.isFetchNextPageError
              ? (isZh ? '重试加载' : 'Retry')
              : (isZh ? '加载更多' : 'Load more')}
        </button>
      ) : null}
    </RouteTransition>
  );
}

export default Mailbox;
