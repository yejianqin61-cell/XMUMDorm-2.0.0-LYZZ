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

const CATEGORY_TABS = [
  { key: 'all', label: '全部', labelEn: 'All' },
  { key: 'interaction', label: '互动', labelEn: 'Interaction' },
  { key: 'transaction', label: '事务', labelEn: 'Transaction' },
  { key: 'system', label: '系统', labelEn: 'System' },
];

function Mailbox() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [data, setData] = useState({ list: [], hasMore: false });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    if (!isLoggedIn) {
      const timeoutId = window.setTimeout(() => {
        setData({ list: [], hasMore: false });
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    let cancelled = false;
    const options = { page: 1, pageSize: 50 };
    if (tab !== 'all') options.category = tab;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setLoading(true);
        setError(null);
        return Promise.all([getNotifications(options), getUnreadSummary()]);
      })
      .then(([result, summary]) => {
        if (cancelled) return;
        setData({ list: result?.list ?? [], hasMore: !!result?.hasMore });
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
    const map = new Map();
    for (const notification of Array.isArray(data?.list) ? data.list : []) {
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
  }, [data]);

  const handleGroupClick = (group) => {
    const unread = group.sorted.filter((item) => !item.is_read);
    if (unread.length) Promise.allSettled(unread.map((item) => markNotificationRead(item.id))).catch(() => {});
  };

  if (!isLoggedIn) {
    return <RouteTransition className="mailbox-page"><EmptyState title={isZh ? '请先登录' : 'Please log in'} description={isZh ? '登录后查看信箱。' : 'Please log in to view mailbox.'} actionLabel={isZh ? '去登录' : 'Log in'} actionTo="/login" icon="✉" /></RouteTransition>;
  }
  if (loading) return <RouteTransition className="mailbox-page"><PageSkeleton items={4} /></RouteTransition>;
  if (error) return <RouteTransition className="mailbox-page"><ErrorState title={isZh ? '信箱加载失败' : 'Mailbox failed to load'} description={error} onActionClick={() => window.location.reload()} /></RouteTransition>;

  return (
    <RouteTransition className="mailbox-page">
      <div className="mailbox-topbar">
        <div className="mailbox-tabs" role="tablist" aria-label={isZh ? '通知分类' : 'Notification categories'}>
          {CATEGORY_TABS.map((item) => {
            const count = item.key === 'all' ? Object.values(unreadCounts).reduce((sum, value) => sum + value, 0) : (unreadCounts[item.key] || 0);
            return <button key={item.key} type="button" className={`mailbox-tab ${tab === item.key ? 'is-on' : ''}`} onClick={() => setTab(item.key)} role="tab" aria-selected={tab === item.key}>
              {isZh ? item.label : item.labelEn}{count > 0 && <span className="mailbox-tab-count">{count}</span>}
            </button>;
          })}
        </div>
        <button type="button" className="mailbox-clear-btn" onClick={async () => {
          const tabLabel = isZh ? CATEGORY_TABS.find((item) => item.key === tab)?.label || tab : tab;
          if (!window.confirm(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel} notifications?`)) return;
          try {
            if (tab === 'all') await clearNotifications();
            else await clearNotificationsByCategory(tab);
            const options = { page: 1, pageSize: 50 };
            if (tab !== 'all') options.category = tab;
            const [result, summary] = await Promise.all([getNotifications(options), getUnreadSummary()]);
            setData({ list: result?.list ?? [], hasMore: !!result?.hasMore });
            setUnreadCounts(summary?.byCategory || {});
          } catch (err) {
            setError(getApiErrorMessage(err));
          }
        }}>{isZh ? '清空' : 'Clear'}</button>
      </div>

      {groups.length === 0 ? <EmptyState title={isZh ? '暂无通知' : 'No notifications'} description={isZh ? '新的消息会出现在这里。' : 'New notifications will appear here.'} icon="✉" /> : (
        <ul className="social-stream">
          {groups.map((group, index) => {
            const isAnnouncement = group.target?.type === 'announcement' || group.latest?.type === 'announcement' || group.latest?.type === 'system_announcement';
            const aggregateText = group.isAffair ? buildAffairsText({ isZh, latest: group.latest }) : group.category === 'transaction'
              ? buildMarketplaceText({ isZh, names: group.names, othersCount: group.othersCount, contentTitle: group.contentTitle })
              : buildAggregateText({ isZh, names: group.names, othersCount: group.othersCount, likeCount: group.likeCount, commentCount: group.commentCount, isPost: group.isPost, contentTitle: group.contentTitle });
            return <li key={group.key} className={`social-card ${group.unreadCount > 0 ? 'is-unread' : ''}`} style={{ animationDelay: `${index * 70}ms` }}>
              <Link to={group.contentPath} className="social-card-link" onClick={() => handleGroupClick(group)}>
                {isAnnouncement ? <div className="mailbox-ann-only" aria-label={isZh ? '公告内容' : 'Announcement content'}>{String(group.contentTitle || group.latest?.extra?.content || '').trim() || (isZh ? '（公告内容为空）' : '(Empty announcement)')}</div> : <>
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
    </RouteTransition>
  );
}

export default Mailbox;
