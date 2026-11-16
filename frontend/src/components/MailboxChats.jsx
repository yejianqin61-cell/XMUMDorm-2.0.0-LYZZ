import { Link } from 'react-router-dom';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import PageSkeleton from './ui/PageSkeleton';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './MailboxChats.css';

function shortTime(value, isZh) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return isZh ? '昨天' : 'Yesterday';
  return isZh ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/**
 * 信箱里的「私信」页：二手市场里我作为买家、卖家的全部对话（GET /api/marketplace/chat/threads）。
 * 数据由 Mailbox 用 useInfiniteQuery 取好传进来，这样 Tab 上的未读角标和列表用同一份数据。
 */
function MailboxChats({ query, threads, isZh }) {
  if (query.isLoading) return <PageSkeleton variant="list" items={4} />;
  if (query.isError && threads.length === 0) {
    return (
      <ErrorState
        title={isZh ? '私信加载失败' : 'Failed to load chats'}
        description={getApiErrorMessage(query.error)}
        onActionClick={() => query.refetch()}
      />
    );
  }
  if (threads.length === 0) {
    return (
      <EmptyState
        title={isZh ? '还没有私信' : 'No chats yet'}
        description={isZh ? '在二手市场联系卖家后，对话会出现在这里。' : 'Chats with sellers and buyers in the marketplace show up here.'}
        actionLabel={isZh ? '去二手市场' : 'Open marketplace'}
        actionTo="/about/second-hand"
        icon="💬"
      />
    );
  }

  return (
    <>
      <ul className="mbx-chats" aria-label={isZh ? '私信列表' : 'Chats'}>
        {threads.map((t) => {
          const unread = Number(t.unread_count) || 0;
          const role = t.role === 'seller' ? (isZh ? '我在卖' : 'Selling') : (isZh ? '我想买' : 'Buying');
          return (
            <li key={t.thread_id}>
              <Link to={`/about/second-hand/chat/${t.thread_id}`} className={`mbx-chat ${unread ? 'is-unread' : ''}`}>
                <span className="mbx-chat-avatar" aria-hidden>
                  <img src={t.peer?.avatar || '/default-avatar.svg'} alt="" />
                </span>
                <span className="mbx-chat-main">
                  <span className="mbx-chat-top">
                    <span className="mbx-chat-name">{t.peer?.name || (isZh ? '同学' : 'User')}</span>
                    <span className="mbx-chat-time">{shortTime(t.last_message_at, isZh)}</span>
                  </span>
                  <span className="mbx-chat-item">
                    <span className={`mbx-chat-role is-${t.role === 'seller' ? 'seller' : 'buyer'}`}>{role}</span>
                    <span className="mbx-chat-item-title">
                      {t.item?.available === false ? (isZh ? '（商品已删除）' : '(Item removed)') : (t.item?.title || '')}
                    </span>
                  </span>
                  <span className="mbx-chat-bottom">
                    <span className="mbx-chat-preview">{t.last_content || (isZh ? '点击进入对话' : 'Open chat')}</span>
                    {unread ? <span className="mbx-chat-badge" aria-label={isZh ? `${unread} 条未读` : `${unread} unread`}>{unread > 99 ? '99+' : unread}</span> : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <button
          type="button"
          className="mailbox-clear"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
        </button>
      ) : null}
    </>
  );
}

export default MailboxChats;
