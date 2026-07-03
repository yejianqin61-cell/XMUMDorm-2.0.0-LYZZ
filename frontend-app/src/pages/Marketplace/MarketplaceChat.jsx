import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMarketplaceThreadMessages, markMarketplaceThreadRead, sendMarketplaceThreadMessage } from '@shared/api/marketplace';
import { Toast } from '../../context/ToastContext';
import './Marketplace.css';

function formatHm(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function MarketplaceChat() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, user } = useAuth();
  const nav = useNavigate();
  const { threadId } = useParams();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const q = useQuery({
    enabled: !!isLoggedIn && !!threadId,
    queryKey: ['marketplace', 'chat', 'thread', threadId],
    queryFn: () => getMarketplaceThreadMessages(threadId),
    staleTime: 2 * 1000,
    refetchInterval: 4 * 1000,
  });

  const thread = q.data?.thread;
  const list = useMemo(() => q.data?.list || [], [q.data]);

  useEffect(() => {
    if (!isLoggedIn || !threadId) return;
    markMarketplaceThreadRead(threadId).catch(() => {});
  }, [isLoggedIn, threadId]);

  useEffect(() => {
    try {
      endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    } catch {}
  }, [list.length]);

  const sendMut = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content) return null;
      await sendMarketplaceThreadMessage(threadId, content);
      setText('');
      await markMarketplaceThreadRead(threadId);
      return true;
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '发送失败' : 'Failed')),
  });

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

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <button type="button" className="mp-btn" onClick={() => nav(-1)}>
          {isZh ? '← 返回' : '← Back'}
        </button>
        <div className="mp-title">{isZh ? '私聊' : 'Chat'}</div>
        <div />
      </div>

      <div className="mp-chat-card">
        <div className="mp-chat-head">
          <div className="mp-help">
            {thread?.item_title ? (isZh ? `关于：${thread.item_title}` : `About: ${thread.item_title}`) : null}
          </div>
        </div>

        <div className="mp-chat-list" role="log" aria-label="messages">
          {list.map((m) => {
            const mine = user?.id != null && Number(m.sender_user_id) === Number(user.id);
            return (
              <div key={m.id} className={`mp-chat-row ${mine ? 'is-mine' : ''}`}>
                <div className="mp-chat-bubble">
                  <div className="mp-chat-text">{m.content}</div>
                  <div className="mp-chat-time">{formatHm(m.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          className="mp-chat-inputbar"
          onSubmit={(e) => {
            e.preventDefault();
            sendMut.mutate();
          }}
        >
          <input
            className="mp-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isZh ? '输入消息…' : 'Message…'}
          />
          <button type="submit" className="mp-btn mp-btn-primary" disabled={sendMut.isPending || !text.trim()}>
            {isZh ? '发送' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MarketplaceChat;

