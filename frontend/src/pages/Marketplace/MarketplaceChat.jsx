import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { getMarketplaceThreadMessages, markMarketplaceThreadRead, sendMarketplaceThreadMessage } from '@shared/api/marketplace';
import {
  MARKETPLACE_CHAT_MAX_LEN,
  chatDayKey,
  chatDayLabel,
  isReadByPeer,
  itemStatusLabel,
  mergeChatPages,
  olderCursor,
} from '@shared/utils/marketplaceChat';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { queryClient } from '@shared/query/queryClient';
import './Marketplace.css';

function formatHm(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

let tempSeq = 0;

function MarketplaceChat() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, user } = useAuth();
  const nav = useNavigate();
  const { threadId } = useParams();
  const [text, setText] = useState('');
  const [olderPages, setOlderPages] = useState([]);
  const [olderState, setOlderState] = useState({ loading: false, error: null });
  // 发出去还没确认的消息：先显示在列表底部（发送中 / 发送失败可重试）
  const [pending, setPending] = useState([]);
  const listRef = useRef(null);
  const prependRef = useRef(null);
  const lastIdRef = useRef(null);
  const readIdRef = useRef(null);

  // 换了对话就清掉本地状态
  const [prevThreadId, setPrevThreadId] = useState(threadId);
  if (prevThreadId !== threadId) {
    setPrevThreadId(threadId);
    setOlderPages([]);
    setOlderState({ loading: false, error: null });
    setPending([]);
    setText('');
  }

  const q = useQuery({
    enabled: !!isLoggedIn && !!threadId,
    queryKey: ['marketplace', 'chat', 'thread', threadId],
    queryFn: () => getMarketplaceThreadMessages(threadId),
    staleTime: 2 * 1000,
    refetchInterval: 4 * 1000,
  });

  const thread = q.data?.thread;
  const peer = thread?.peer;
  const item = thread?.item;
  const messages = useMemo(() => mergeChatPages(olderPages, q.data?.list || []), [olderPages, q.data]);
  const nextOlder = olderCursor(olderPages, q.data);
  const myId = user?.id != null ? Number(user.id) : null;
  const isMine = useCallback((m) => myId != null && Number(m.sender_user_id) === myId, [myId]);
  const lastMine = useMemo(() => [...messages].reverse().find(isMine) || null, [messages, isMine]);
  const lastPeerId = useMemo(() => {
    const m = [...messages].reverse().find((x) => !isMine(x));
    return m ? m.id : null;
  }, [messages, isMine]);

  // 对方来了新消息（含首次打开）就标已读；后端会顺带把信箱里这条对话的通知标已读
  useEffect(() => {
    if (!isLoggedIn || !threadId || !q.isSuccess) return;
    const key = `${threadId}:${lastPeerId ?? 'none'}`;
    if (readIdRef.current === key) return;
    readIdRef.current = key;
    markMarketplaceThreadRead(threadId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['marketplace', 'chat', 'myThreads'] }))
      .catch(() => {});
  }, [isLoggedIn, threadId, q.isSuccess, lastPeerId]);

  // 只有最新一条变了（新消息 / 自己刚发）才滚到底；加载更早消息时保持当前位置
  const newestKey = pending.length ? `p:${pending[pending.length - 1].tempId}` : (messages.length ? `m:${messages[messages.length - 1].id}` : null);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prependRef.current != null) {
      el.scrollTop += el.scrollHeight - prependRef.current;
      prependRef.current = null;
      return;
    }
    if (newestKey && newestKey !== lastIdRef.current) {
      lastIdRef.current = newestKey;
      el.scrollTop = el.scrollHeight;
    }
  }, [newestKey, olderPages]);

  const loadOlder = async () => {
    if (!nextOlder || olderState.loading) return;
    setOlderState({ loading: true, error: null });
    try {
      const page = await getMarketplaceThreadMessages(threadId, { cursor: nextOlder });
      prependRef.current = listRef.current ? listRef.current.scrollHeight : null;
      setOlderPages((prev) => [...prev, { list: page?.list || [], hasMore: !!page?.hasMore, nextCursor: page?.nextCursor || null }]);
      setOlderState({ loading: false, error: null });
    } catch (e) {
      setOlderState({ loading: false, error: getApiErrorMessage(e) });
    }
  };

  const deliver = async (entry) => {
    setPending((prev) => prev.map((p) => (p.tempId === entry.tempId ? { ...p, status: 'sending' } : p)));
    try {
      await sendMarketplaceThreadMessage(threadId, entry.content);
      await q.refetch();
      setPending((prev) => prev.filter((p) => p.tempId !== entry.tempId));
    } catch (e) {
      setPending((prev) => prev.map((p) => (p.tempId === entry.tempId ? { ...p, status: 'failed', error: getApiErrorMessage(e) } : p)));
    }
  };

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    tempSeq += 1;
    const entry = { tempId: `${Date.now()}-${tempSeq}`, content, status: 'sending' };
    setPending((prev) => [...prev, entry]);
    setText('');
    deliver(entry);
  };

  const onKeyDown = (e) => {
    // Enter 发送，Shift+Enter 换行；输入法选词时的 Enter 不算
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const back = () => {
    if (window.history.length > 1) nav(-1);
    else nav('/mailbox?tab=chats');
  };

  if (!isLoggedIn) {
    return (
      <div className="mp-page">
        <div className="mp-topbar">
          <Link to="/about/second-hand" className="mp-btn">
            {isZh ? '← 返回' : '← Back'}
          </Link>
          <div className="mp-title">{isZh ? '私聊' : 'Chat'}</div>
          <div />
        </div>
        <div className="mp-empty">{isZh ? '请先登录后查看对话。' : 'Please login to view chat.'}</div>
      </div>
    );
  }

  const roleText = thread?.role === 'seller'
    ? (isZh ? '买家' : 'Buyer')
    : thread?.role === 'buyer'
      ? (isZh ? '卖家' : 'Seller')
      : '';
  const remaining = MARKETPLACE_CHAT_MAX_LEN - text.length;
  const itemLink = item?.available ? `/about/second-hand/item/${item.id}` : null;

  const itemCard = item ? (
    <>
      <span className="mp-chat-item-cover" aria-hidden>
        {item.cover ? <img src={item.cover} alt="" /> : <span className="mp-chat-item-cover-empty">🛍</span>}
      </span>
      <span className="mp-chat-item-main">
        <span className="mp-chat-item-title">{item.title || (isZh ? '（无标题）' : '(Untitled)')}</span>
        <span className="mp-chat-item-meta">
          {item.price != null ? <span className="mp-chat-item-price">RM {Number(item.price).toFixed(2)}</span> : null}
          {item.available
            ? <span className={`mp-chat-item-status is-${item.status || 'on_sale'}`}>{itemStatusLabel(item.status, isZh)}</span>
            : <span className="mp-chat-item-status is-gone">{isZh ? '商品已删除' : 'Item removed'}</span>}
        </span>
      </span>
    </>
  ) : null;

  return (
    <div className="mp-page mp-chat-page">
      <div className="mp-topbar">
        <button type="button" className="mp-btn" onClick={back}>
          {isZh ? '← 返回' : '← Back'}
        </button>
        <div className="mp-chat-peer">
          <span className="mp-chat-avatar" aria-hidden>
            <img src={peer?.avatar || '/default-avatar.svg'} alt="" />
          </span>
          <span className="mp-chat-peer-text">
            <span className="mp-title mp-chat-peer-name">{peer?.name || (isZh ? '私聊' : 'Chat')}</span>
            {roleText ? <span className="mp-chat-peer-role">{roleText}</span> : null}
          </span>
        </div>
        <Link to="/mailbox?tab=chats" className="mp-btn mp-chat-all">
          {isZh ? '全部私信' : 'All chats'}
        </Link>
      </div>

      <div className="mp-chat-card">
        {item ? (
          itemLink
            ? <Link to={itemLink} className="mp-chat-item">{itemCard}</Link>
            : <div className="mp-chat-item is-gone">{itemCard}</div>
        ) : null}

        <div className="mp-chat-list mp-chat-list-full" role="log" aria-label={isZh ? '消息记录' : 'Messages'} ref={listRef}>
          {nextOlder ? (
            <div className="mp-chat-older">
              <button type="button" className="mp-chat-older-btn" onClick={loadOlder} disabled={olderState.loading}>
                {olderState.loading
                  ? (isZh ? '加载中…' : 'Loading…')
                  : olderState.error
                    ? (isZh ? '加载失败，点此重试' : 'Failed, tap to retry')
                    : (isZh ? '查看更早的消息' : 'Load earlier messages')}
              </button>
            </div>
          ) : null}

          {q.isLoading ? <div className="mp-chat-hint">{isZh ? '加载中…' : 'Loading…'}</div> : null}
          {q.isError && !q.data ? (
            <div className="mp-chat-hint" role="alert">
              {getApiErrorMessage(q.error) || (isZh ? '对话加载失败' : 'Failed to load chat')}
            </div>
          ) : null}
          {q.isSuccess && messages.length === 0 && pending.length === 0 ? (
            <div className="mp-chat-hint">{isZh ? '还没有消息，打个招呼吧。' : 'No messages yet. Say hi!'}</div>
          ) : null}

          {messages.map((m, idx) => {
            const mine = isMine(m);
            const day = chatDayKey(m.created_at);
            const showDay = idx === 0 || day !== chatDayKey(messages[idx - 1].created_at);
            const showRead = mine && lastMine && m.id === lastMine.id && pending.length === 0;
            return (
              <Fragment key={m.id}>
                {showDay && day ? <div className="mp-chat-day">{chatDayLabel(m.created_at, isZh)}</div> : null}
                <div className={`mp-chat-row ${mine ? 'is-mine' : ''}`}>
                  <div className="mp-chat-bubble">
                    <div className="mp-chat-text">{m.content}</div>
                    <div className="mp-chat-time">
                      {formatHm(m.created_at)}
                      {showRead ? (
                        <span className="mp-chat-read">
                          {isReadByPeer(m, thread?.peer_last_read_at) ? (isZh ? ' · 已读' : ' · Read') : (isZh ? ' · 已送达' : ' · Sent')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}

          {pending.map((p) => (
            <div key={p.tempId} className="mp-chat-row is-mine">
              <div className={`mp-chat-bubble ${p.status === 'failed' ? 'is-failed' : 'is-sending'}`}>
                <div className="mp-chat-text">{p.content}</div>
                <div className="mp-chat-time">
                  {p.status === 'failed' ? (
                    <span className="mp-chat-failed" role="alert">
                      {isZh ? '发送失败' : 'Not sent'}
                      <button type="button" className="mp-chat-linkbtn" onClick={() => deliver(p)}>{isZh ? '重发' : 'Retry'}</button>
                      <button type="button" className="mp-chat-linkbtn" onClick={() => setPending((prev) => prev.filter((x) => x.tempId !== p.tempId))}>{isZh ? '删除' : 'Discard'}</button>
                    </span>
                  ) : (isZh ? '发送中…' : 'Sending…')}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form
          className="mp-chat-inputbar"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="mp-chat-inputwrap">
            <textarea
              className="mp-input mp-chat-textarea"
              rows={1}
              value={text}
              maxLength={MARKETPLACE_CHAT_MAX_LEN}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isZh ? '输入消息，Enter 发送，Shift+Enter 换行' : 'Message (Enter to send)'}
              aria-label={isZh ? '输入消息' : 'Message'}
            />
            {remaining <= 200 ? <span className="mp-chat-counter">{remaining}</span> : null}
          </div>
          <button type="submit" className="mp-btn mp-btn-primary" disabled={!text.trim()}>
            {isZh ? '发送' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MarketplaceChat;
