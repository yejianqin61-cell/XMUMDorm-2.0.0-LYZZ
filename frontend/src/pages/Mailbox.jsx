import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead } from '../api/notifications';
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

/**
 * 信箱：来自 API 的通知列表（点赞/评论/公告），点击跳转帖子并标记已读。
 */
function Mailbox() {
  const { isLoggedIn } = useAuth();
  const [data, setData] = useState({ list: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setData({ list: [], hasMore: false });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getNotifications({ page: 1, pageSize: 50 })
      .then((res) => {
        if (cancelled) return;
        setData({
          list: res?.list ?? [],
          hasMore: !!res?.hasMore,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleItemClick = (n) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="mailbox-page">
        <p className="mailbox-empty state-empty">请先登录后查看信箱。Please log in to view mailbox.</p>
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

  const list = data.list || [];

  return (
    <div className="mailbox-page">
      <p className="mailbox-intro">
        你的帖子收到点赞或评论时，会在这里提醒。Tap to open the post.
      </p>
      {list.length === 0 ? (
        <p className="mailbox-empty state-empty">暂无通知 No notifications yet.</p>
      ) : (
        <ul className="mailbox-list">
          {list.map((n) => (
            <li key={n.id} className={`mailbox-item ${n.is_read ? 'mailbox-item-read' : ''}`}>
              <Link
                to={n.post_id ? `/post/${n.post_id}` : '#'}
                className="mailbox-item-link"
                onClick={() => handleItemClick(n)}
              >
                <span className="mailbox-item-icon" aria-hidden>
                  {n.type === 'like' ? '♥' : n.type === 'announcement' ? '📢' : '💬'}
                </span>
                <div className="mailbox-item-body">
                  <p className="mailbox-item-title">
                    {n.type === 'like' && '有人赞了你的帖子 Someone liked your post'}
                    {n.type === 'comment' && '有人评论了你的帖子 Someone commented on your post'}
                    {n.type === 'announcement' && (n.extra?.title || '公告 Announcement')}
                  </p>
                  {n.post_id && (
                    <p className="mailbox-item-preview">帖子 #{n.post_id}</p>
                  )}
                  {n.type === 'comment' && n.extra?.content && (
                    <p className="mailbox-item-comment">"{n.extra.content}"</p>
                  )}
                  <span className="mailbox-item-time">{formatTime(n.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Mailbox;
