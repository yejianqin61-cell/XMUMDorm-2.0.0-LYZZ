import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  markNotificationsReadBatch,
} from '@shared/api/notifications';
import { QK } from '@shared/query/queryKeys';
import { getApiErrorMessage } from '@shared/utils/apiError';
import {
  applyNotificationsReadToInfiniteData,
  applyNotificationsReadToSummary,
  buildNotificationGroups,
  displayNotificationName as displayName,
  getAnnouncementCopy,
} from '../utils/notificationGroups';
import { Toast } from '../context/ToastContext';
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
const CATEGORY_TABS = ['interaction', 'transaction', 'system'].map((key) => ({ key, ...CATEGORY_LABELS[key] }));
const PAGE_SIZE = 20;
const MAILBOX_STALE_MS = 30 * 1000;

function InteractionGroupDetails({ expanded, group, isZh, onItemsLoaded, onOpenPost, tokenKey }) {
  const detailsQuery = useInfiniteQuery({
    queryKey: QK.mailboxPostInteractions(tokenKey, group.target.id),
    queryFn: ({ pageParam = 1 }) => getNotifications({
      category: 'interaction',
      postId: group.target.id,
      page: pageParam,
      pageSize: PAGE_SIZE,
    }),
    enabled: expanded,
    initialPageParam: 1,
    staleTime: MAILBOX_STALE_MS,
    getNextPageParam: (lastPage) => (
      lastPage?.hasMore ? (Number(lastPage.page) || 1) + 1 : undefined
    ),
  });
  const items = useMemo(() => {
    const seen = new Set();
    return (detailsQuery.data?.pages || []).flatMap((page) => page?.list || []).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [detailsQuery.data]);

  useEffect(() => {
    if (expanded && items.length > 0) void onItemsLoaded([...group.sorted, ...items]);
  }, [expanded, group.sorted, items, onItemsLoaded]);

  if (!expanded) return null;

  return (
    <div id={`mailbox-details-${group.target.id}`} className="mailbox-interaction-details">
      {detailsQuery.isLoading ? <div className="mailbox-detail-status">{isZh ? '加载互动…' : 'Loading interactions…'}</div> : null}
      {detailsQuery.isError && items.length === 0 ? (
        <div className="mailbox-inline-error" role="alert">
          <span>{isZh ? '互动明细加载失败。' : 'Could not load interactions.'}</span>
          <button type="button" onClick={() => detailsQuery.refetch()}>{isZh ? '重试' : 'Retry'}</button>
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="mailbox-detail-list">
          {items.map((item) => {
            const isComment = item.type === 'comment' || item.type?.endsWith('_comment');
            const name = displayName(item.from_user, isZh ? '有人' : 'Someone');
            const action = isComment ? (isZh ? '评论了' : 'commented') : (isZh ? '赞了' : 'liked');
            const excerpt = isComment ? String(item.extra?.content || '').trim() : '';
            return (
              <li key={item.id} className={item.is_read ? '' : 'is-unread'}>
                <div className="mailbox-detail-meta">
                  <span><strong>{name}</strong> {action}</span>
                  <span>{formatTime(item.created_at, isZh)}</span>
                </div>
                {excerpt ? <div className="mailbox-detail-excerpt">{excerpt}</div> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {detailsQuery.hasNextPage ? (
        <button
          type="button"
          className="mailbox-detail-more"
          disabled={detailsQuery.isFetchingNextPage}
          onClick={() => detailsQuery.fetchNextPage()}
        >
          {detailsQuery.isFetchingNextPage
            ? (isZh ? '加载中…' : 'Loading…')
            : detailsQuery.isFetchNextPageError
              ? (isZh ? '重试加载' : 'Retry')
              : (isZh ? '更多互动' : 'More interactions')}
        </button>
      ) : null}
      <Link to={group.contentPath} className="mailbox-view-post" onClick={onOpenPost}>
        {isZh ? '查看帖子' : 'View post'}
      </Link>
    </div>
  );
}

function Mailbox() {
  const queryClient = useQueryClient();
  const { isLoggedIn, token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('interaction');
  const [expandedKey, setExpandedKey] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const trackedReadIds = useRef(new Set());
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

  const groups = useMemo(() => buildNotificationGroups(notifications), [notifications]);

  const latestUnreadSummary = mailboxQuery.data?.pages?.at(-1)?.unreadSummary;
  useEffect(() => {
    if (latestUnreadSummary) {
      queryClient.setQueryData(QK.unreadSummary(tokenKey), latestUnreadSummary);
    }
  }, [latestUnreadSummary, queryClient, tokenKey]);

  const markItemsRead = useCallback(async (items) => {
    const unread = Array.from(new Map(
      (items || []).filter((item) => !item.is_read).map((item) => [item.id, item])
    ).values()).filter((item) => !trackedReadIds.current.has(item.id)).slice(0, 100);
    if (unread.length === 0) return;

    const ids = unread.map((item) => item.id);
    const mailboxPrefix = ['notifications', 'mailbox', tokenKey];
    const unreadSummaryKey = QK.unreadSummary(tokenKey);
    const unreadAnnouncementsKey = QK.unreadAnnouncements(tokenKey);
    ids.forEach((id) => trackedReadIds.current.add(id));
    let mailboxSnapshots = [];
    let summarySnapshot;
    let announcementsSnapshot;

    try {
      await queryClient.cancelQueries({ queryKey: mailboxPrefix });
      mailboxSnapshots = queryClient.getQueriesData({ queryKey: mailboxPrefix });
      summarySnapshot = queryClient.getQueryData(unreadSummaryKey);
      announcementsSnapshot = queryClient.getQueryData(unreadAnnouncementsKey);
      queryClient.setQueriesData({ queryKey: mailboxPrefix }, (data) => (
        applyNotificationsReadToInfiniteData(data, ids, unread)
      ));
      if (summarySnapshot !== undefined) {
        queryClient.setQueryData(unreadSummaryKey, applyNotificationsReadToSummary(summarySnapshot, unread));
      }
      if (Array.isArray(announcementsSnapshot)) {
        queryClient.setQueryData(unreadAnnouncementsKey, announcementsSnapshot.filter((item) => !ids.includes(item.id)));
      }

      await markNotificationsReadBatch(ids);
      queryClient.setQueriesData({ queryKey: mailboxPrefix }, (data) => (
        applyNotificationsReadToInfiniteData(data, ids, unread)
      ));
      await queryClient.invalidateQueries({ queryKey: unreadSummaryKey, exact: true });
    } catch {
      for (const [key, data] of mailboxSnapshots) queryClient.setQueryData(key, data);
      if (summarySnapshot !== undefined) queryClient.setQueryData(unreadSummaryKey, summarySnapshot);
      if (announcementsSnapshot !== undefined) queryClient.setQueryData(unreadAnnouncementsKey, announcementsSnapshot);
      ids.forEach((id) => trackedReadIds.current.delete(id));
      Toast.error(isZh ? '确认已读失败，请重试' : 'Could not mark notifications as read. Please try again.');
    }
  }, [isZh, queryClient, tokenKey]);

  const handleClear = async () => {
    const tabLabel = CATEGORY_LABELS[tab]?.[isZh ? 'zh' : 'en'] || tab;
    if (!window.confirm(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel} notifications?`)) return;
    setClearing(true);
    setClearError('');
    try {
      await clearNotificationsByCategory(tab);
      const firstPage = await getNotifications({ category: tab, page: 1, pageSize: PAGE_SIZE });
      queryClient.setQueryData(mailboxQueryKey, { pages: [firstPage], pageParams: [1] });
      queryClient.setQueryData(QK.unreadSummary(tokenKey), firstPage?.unreadSummary || {});
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
            return <button key={item.key} type="button" className={`mailbox-tab ${tab === item.key ? 'is-on' : ''}`} onClick={() => { setClearError(''); setExpandedKey(null); setTab(item.key); }} role="tab" aria-selected={tab === item.key}>
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
            const announcementCopy = isAnnouncement
              ? getAnnouncementCopy(group, isZh ? '暂无公告正文。' : 'No announcement body.')
              : null;
            const contentTitle = String(group.contentTitle || '').trim();
            const names = group.topUsers.map((user) => displayName(user, isZh ? '有人' : 'Someone'));
            const aggregateText = group.isAffair ? buildAffairsText({ isZh, latest: group.latest }) : group.category === 'transaction'
              ? buildMarketplaceText({ isZh, names, othersCount: group.othersCount, contentTitle })
              : buildAggregateText({ isZh, names, othersCount: group.othersCount, likeCount: group.likeCount, commentCount: group.commentCount, isPost: group.isPost, contentTitle });
            const isExpanded = expandedKey === group.key;
            const summary = isAnnouncement ? <div className="mailbox-announcement" aria-label={isZh ? '公告内容' : 'Announcement content'}>
                  <div className="mailbox-announcement-head">
                    <span className="social-time">{formatTime(group.createdAt, isZh)}</span>
                  </div>
                  {announcementCopy.title ? <div className="mailbox-announcement-title">{announcementCopy.title}</div> : null}
                  <div className="mailbox-announcement-body">{announcementCopy.body}</div>
                  <div className="mailbox-announcement-meta">{displayName(group.latest?.from_user, isZh ? '系统' : 'System')}</div>
                </div> : <>
                  <div className="social-head"><div className="social-avatars" aria-label={isZh ? '发送者' : 'Senders'}>{group.topUsers.map((user, userIndex) => <span key={`${user?.id || userIndex}`} className="social-avatar" style={{ zIndex: 10 - userIndex }}><img src={user?.avatar || '/default-avatar.svg'} alt="" /></span>)}{group.othersCount > 0 && <span className="social-others">+{group.othersCount}</span>}</div><span className="social-time">{formatTime(group.createdAt, isZh)}</span></div>
                  {contentTitle ? <div className="social-title">{contentTitle}</div> : null}
                  <div className="social-text">{aggregateText}</div>
                  {group.isExpandablePost ? <div className="mailbox-interaction-counts">{[
                    group.likeCount > 0 ? (isZh ? `${group.likeCount} 个赞` : `${group.likeCount} likes`) : null,
                    group.commentCount > 0 ? (isZh ? `${group.commentCount} 条评论` : `${group.commentCount} comments`) : null,
                  ].filter(Boolean).join(' · ')}</div> : null}
                  {group.latest?.extra?.content && <div className="social-whisper">“{String(group.latest.extra.content).trim()}”</div>}
                </>;
            return <li key={group.key} className={`social-card ${group.unreadCount > 0 ? 'is-unread' : ''}`} style={{ animationDelay: `${index * 70}ms` }}>
              {group.isExpandablePost ? (
                <div className="social-card-link">
                  <button
                    type="button"
                    className="mailbox-group-toggle"
                    aria-expanded={isExpanded}
                    aria-controls={`mailbox-details-${group.target.id}`}
                    onClick={() => {
                      const opening = expandedKey !== group.key;
                      setExpandedKey(opening ? group.key : null);
                    }}
                  >
                    {summary}
                  </button>
                  <InteractionGroupDetails
                    expanded={isExpanded}
                    group={group}
                    isZh={isZh}
                    onItemsLoaded={markItemsRead}
                    onOpenPost={() => { void markItemsRead(group.sorted); }}
                    tokenKey={tokenKey}
                  />
                </div>
              ) : group.contentPath !== '#' ? (
                <Link to={group.contentPath} className="social-card-link" onClick={() => { void markItemsRead(group.sorted); }}>{summary}</Link>
              ) : (
                <div className="social-card-link">
                  {summary}
                  <div className="mailbox-unavailable">{isZh ? '内容已不可用' : 'Content unavailable'}</div>
                </div>
              )}
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
