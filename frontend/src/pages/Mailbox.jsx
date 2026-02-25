import { Link } from 'react-router-dom';
import { MOCK_NOTIFICATIONS, getPostPreview } from '../data/mockNotifications';
import './Mailbox.css';

/**
 * 信箱：匿名发帖后，别人点赞/评论会在这里收到提醒，点击可跳转到对应帖子。
 */
function Mailbox() {
  return (
    <div className="mailbox-page">
      <p className="mailbox-intro">
        你匿名发布的帖子收到点赞或评论时，会在这里提醒。Tap to open the post.
      </p>
      <ul className="mailbox-list">
        {MOCK_NOTIFICATIONS.map((n) => (
          <li key={n.id} className="mailbox-item">
            <Link to={`/post/${n.postId}`} className="mailbox-item-link">
              <span className="mailbox-item-icon" aria-hidden>
                {n.type === 'like' ? '♥' : '💬'}
              </span>
              <div className="mailbox-item-body">
                <p className="mailbox-item-title">
                  {n.type === 'like'
                    ? `有人赞了你的帖子 Someone liked your post（${n.count} 个赞 likes）`
                    : '有人评论了你的帖子 Someone commented on your post'}
                </p>
                <p className="mailbox-item-preview">{getPostPreview(n.postId)}</p>
                {n.type === 'comment' && n.preview && (
                  <p className="mailbox-item-comment">“{n.preview}”</p>
                )}
                <span className="mailbox-item-time">{n.time}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Mailbox;
