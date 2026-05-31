import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/EmptyState';
import { clearNotifications, clearNotificationsByModule, getNotifications, getUnreadSummary, markNotificationRead } from '../api/notifications';
import { getApiErrorMessage } from '../utils/apiError';
import './Mailbox.css';

/** 相对时间展示 */
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

function typeLabel(t, isZh) {
  if (t === 'like') return isZh ? '赞了' : 'liked';
  if (t === 'comment') return isZh ? '评论了' : 'commented';
  return isZh ? '发布了公告' : 'posted an announcement';
}

function buildMarketplaceText({ isZh, names, othersCount, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = (() => {
    if (others > 0) return isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`;
    return join2;
  })();
  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '该商品' : 'the item');
  return isZh ? `${prefix} 在二手市场就 ${titlePart} 发来新消息。` : `${prefix} sent a new message about ${titlePart}.`;
}

function buildAggregateText({ isZh, names, othersCount, likeCount, commentCount, isPost, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = (() => {
    if (others > 0) return isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`;
    return join2;
  })();

  if (!isPost) {
    return isZh ? `${prefix} ${typeLabel('announcement', true)}` : `${prefix} ${typeLabel('announcement', false)}`;
  }

  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '你的帖子' : 'your post');

  if (likeCount > 0 && commentCount > 0) {
    return isZh ? `${prefix} 赞了或评论了${titlePart}。` : `${prefix} liked or commented on ${titlePart}.`;
  }
  if (commentCount > 0) {
    return isZh ? `${prefix} 评论了${titlePart}。` : `${prefix} commented on ${titlePart}.`;
  }
  return isZh ? `${prefix} 赞了${titlePart}。` : `${prefix} liked ${titlePart}.`;
}

/**
 * 信箱：来自 API 的通知列表（点赞/评论/公告），点击跳转帖子并标记已读。
 */
function Mailbox() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [data, setData] = useState({ list: [], hasMore: false });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all'); // all | treehole | trending | canteen | marketplace | club | system

  const MODULE_TABS = [
    { key: 'all', label: '全部', labelEn: 'All' },
    { key: 'treehole', label: '树洞', labelEn: 'Treehole' },
    { key: 'trending', label: '热搜', labelEn: 'Trending' },
    { key: 'canteen', label: '食堂', labelEn: 'Canteen' },
    { key: 'marketplace', label: '二手', labelEn: 'Market' },
    { key: 'club', label: '社团', labelEn: 'Club' },
    { key: 'system', label: '系统', labelEn: 'System' },
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
    if (tab !== 'all') opts.module = tab;
    getNotifications(opts)
      .then((res) => {
        if (cancelled) return;
        setData({ list: res?.list ?? [], hasMore: !!res?.hasMore });
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // 拉取未读计数
    getUnreadSummary().then((s) => {
      if (!cancelled) setUnreadCounts(s?.byModule || {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn, tab]);

  const groups = useMemo(() => {
    const raw = Array.isArray(data?.list) ? data.list : [];
    const list = raw; // filtering is now done server-side via module param
    const map = new Map();
    for (const n of list) {
      const t = n && n.target ? n.target : null;
      const key = t && t.key ? t.key : `unknown:${n.id}`;
      const isPost = t && (t.type === 'post' || t.type === 'announcement');
      if (!map.has(key)) {
        map.set(key, {
          key,
          isPost,
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
        const likeCount = sorted.filter((x) => x.type === 'like').length;
        const commentCount = sorted.filter((x) => ['comment', 'handbook_comment', 'course_review_comment'].includes(x.type)).length;
        const latest = sorted[0] || null;
        const latestComment = sorted.find((x) => ['comment', 'handbook_comment', 'course_review_comment'].includes(x.type) && x.extra?.content) || null;

        // unique users in order
        const seen = new Set();
        const users = [];
        for (const it of sorted) {
          const u = it.from_user;
          const id = u?.id != null ? String(u.id) : null;
          if (!id) continue;
          if (seen.has(id)) continue;
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
          latestComment,
          unreadCount,
          likeCount,
          commentCount,
          topUsers,
          othersCount,
          names,
          content_title: (g.target && g.target.title) || latest?.post_title || (latest?.extra && latest.extra.targetTitle) || null,
          content_path: (g.target && g.target.path) || (latest?.post_id ? `/post/${latest.post_id}` : '#'),
          created_at: latest?.created_at,
        };
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [data?.list, tab]);

  const handleGroupClick = (g) => {
    const unread = (g?.sorted || []).filter((x) => !x.is_read);
    if (unread.length === 0) return;
    // fire & forget
    Promise.allSettled(unread.map((x) => markNotificationRead(x.id))).catch(() => {});
  };

  if (!isLoggedIn) {
    return (
      <div className="mailbox-page">
        <EmptyState
          title="请先登录"
          description="登录后查看信箱。Please log in to view mailbox."
          actionLabel="去登录"
          actionTo="/login"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mailbox-page">
        <p className="mailbox-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mailbox-page">
        <p className="mailbox-error state-error">{error}</p>
      </div>
    );
  }

  const list = groups || [];

  return (
    <div className="mailbox-page">
      <div className="mailbox-topbar">
        <div className="mailbox-tabs" role="tablist" aria-label="notification tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {MODULE_TABS.map((mt) => {
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
                {count > 0 && (
                  <span style={{ marginLeft: 4, background: tab === mt.key ? '#fff' : '#ef4444', color: tab === mt.key ? '#ef4444' : '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 600 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="mailbox-clear-btn"
          onClick={async () => {
            const tabLabel = isZh ? MODULE_TABS.find((t) => t.key === tab)?.label || tab : tab;
            const ok = window.confirm(isZh ? `清空${tabLabel}通知？` : `Clear ${tabLabel} notifications?`);
            if (!ok) return;
            try {
              if (tab === 'all') await clearNotifications('social');
              else await clearNotificationsByModule(tab);
              const res = await getNotifications({ page: 1, pageSize: 50, module: tab !== 'all' ? tab : undefined });
              setData({ list: res?.list ?? [], hasMore: !!res?.hasMore });
            } catch (e) {
              setError(getApiErrorMessage(e));
            }
          }}
        >
          {isZh ? '清空' : 'Clear'}
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="暂无通知" description="No notifications yet." />
      ) : (
        <ul className="social-stream">
          {list.map((g, idx) => {
            const isUnread = g.unreadCount > 0;
            const title = g.content_title || '';
            const linkTo = g.content_path || '#';
            const isAnnouncement = (g.target && g.target.type === 'announcement') || g.latest?.type === 'announcement';
            const aggregateText =
              tab === 'marketplace'
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
                  {isAnnouncement && tab !== 'marketplace' ? (
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
                        {title || (isZh ? '（无标题）' : '(Untitled)')}
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
    </div>
  );
}

export default Mailbox;
