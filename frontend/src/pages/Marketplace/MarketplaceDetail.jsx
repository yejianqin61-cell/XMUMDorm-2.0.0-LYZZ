import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, MoreVertical } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import {
  buyerSendMarketplaceMessage,
  deleteMarketplaceItem,
  getMarketplaceItemDetail,
  getMarketplaceMyThreadByItem,
  getMarketplaceThreadMessages,
  markMarketplaceThreadRead,
  sellerListItemChatThreads,
  toggleMarketplaceWant,
  updateMarketplaceItemStatus,
} from '../../api/marketplace';
import { queryClient } from '../../query/queryClient';
import { Toast } from '../../context/ToastContext';
import './Marketplace.css';

function statusLabel(s, isZh) {
  if (s === 'sold') return isZh ? '已售出' : 'Sold';
  return isZh ? '在售' : 'On sale';
}

function deliveryLabel(v, isZh) {
  if (v === 'delivery') return isZh ? '配送' : 'Delivery';
  return isZh ? '自提' : 'Pickup';
}

function MarketplaceDetail() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token, user } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef(null);

  const tokenKey = token ? token.slice(0, 16) : '_guest';

  const q = useQuery({
    queryKey: QK.marketplaceItemDetail(id, tokenKey),
    queryFn: () => getMarketplaceItemDetail(id),
    staleTime: 6 * 1000,
  });

  const item = q.data;
  const images = useMemo(() => item?.images || [], [item]);
  const isSeller = !!item?.viewer?.canEdit;

  const threadsQuery = useQuery({
    enabled: !!isLoggedIn && !!isSeller && !!id,
    queryKey: ['marketplace', 'chat', 'threadsByItem', id],
    queryFn: () => sellerListItemChatThreads(id),
    staleTime: 3 * 1000,
    refetchInterval: 6 * 1000,
    select: (d) => d || { list: [] },
  });

  const [activeThreadId, setActiveThreadId] = useState(null);
  const effectiveThreadId = activeThreadId;

  const buyerThreadQuery = useQuery({
    enabled: !!isLoggedIn && !isSeller && !!id,
    queryKey: ['marketplace', 'chat', 'myThreadByItem', id],
    queryFn: () => getMarketplaceMyThreadByItem(id),
    staleTime: 2 * 1000,
    refetchInterval: 5 * 1000,
  });

  useEffect(() => {
    if (isSeller) return;
    const tid = buyerThreadQuery.data?.id || buyerThreadQuery.data?.thread_id || null;
    if (tid && !activeThreadId) setActiveThreadId(tid);
  }, [isSeller, buyerThreadQuery.data, activeThreadId]);

  const msgsQuery = useQuery({
    enabled: !!isLoggedIn && !!effectiveThreadId,
    queryKey: ['marketplace', 'chat', 'messages', effectiveThreadId],
    queryFn: () => getMarketplaceThreadMessages(effectiveThreadId),
    staleTime: 2 * 1000,
    refetchInterval: 4 * 1000,
  });

  const msgList = useMemo(() => msgsQuery.data?.list || [], [msgsQuery.data]);

  useEffect(() => {
    if (!isLoggedIn || !effectiveThreadId) return;
    markMarketplaceThreadRead(effectiveThreadId).catch(() => {});
  }, [isLoggedIn, effectiveThreadId, msgList.length]);

  useEffect(() => {
    try {
      chatEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    } catch {}
  }, [msgList.length]);

  const wantMut = useMutation({
    mutationFn: () => toggleMarketplaceWant(id),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: QK.marketplaceItemDetail(id, tokenKey) });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      if (d?.want != null) Toast.success(d.want ? (isZh ? '已收藏' : 'Saved') : (isZh ? '已取消收藏' : 'Unsaved'));
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '操作失败' : 'Failed')),
  });

  const statusMut = useMutation({
    mutationFn: (nextStatus) => updateMarketplaceItemStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.marketplaceItemDetail(id, tokenKey) });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      Toast.success(isZh ? '状态已更新' : 'Updated');
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '操作失败' : 'Failed')),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteMarketplaceItem(id),
    onSuccess: () => {
      Toast.success(isZh ? '已删除' : 'Deleted');
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      queryClient.removeQueries({ queryKey: QK.marketplaceItemDetail(id, tokenKey) });
      nav('/about/second-hand', { replace: true });
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '删除失败' : 'Failed')),
  });

  const buyerSendMut = useMutation({
    mutationFn: async () => {
      const content = chatText.trim();
      if (!content) return null;
      const res = await buyerSendMarketplaceMessage(id, content);
      const threadId = res?.thread_id || res?.threadId || res?.thread || null;
      if (threadId) setActiveThreadId(threadId);
      setChatText('');
      if (threadId) await markMarketplaceThreadRead(threadId);
      return true;
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '发送失败' : 'Failed')),
  });

  if (q.isLoading) {
    return (
      <div className="mp-page">
        <div className="mp-detail">{isZh ? '加载中…' : 'Loading…'}</div>
      </div>
    );
  }

  if (q.isError || !item) {
    return (
      <div className="mp-page">
        <div className="mp-detail">
          <div style={{ marginBottom: 10 }}>{isZh ? '加载失败' : 'Failed to load'}</div>
          <Link to="/about/second-hand" className="mp-btn">
            {isZh ? '返回' : 'Back'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <div className="mp-detail">
        <div className="mp-topbar">
          <Link to="/about/second-hand" className="mp-btn">
            {isZh ? '← 返回' : '← Back'}
          </Link>
          <div className="mp-top-actions">
            <button
              type="button"
              className="mp-icon-btn"
              aria-label={item?.viewer?.want ? (isZh ? '已收藏' : 'Saved') : (isZh ? '收藏' : 'Save')}
              title={item?.viewer?.want ? (isZh ? '已收藏' : 'Saved') : (isZh ? '收藏' : 'Save')}
              disabled={wantMut.isPending}
              onClick={() => {
                if (!isLoggedIn) return nav('/login');
                wantMut.mutate();
              }}
              style={{
                color: item?.viewer?.want ? 'rgba(220, 38, 38, 0.95)' : undefined,
              }}
            >
              <Heart size={18} aria-hidden />
            </button>

            {item?.viewer?.canEdit ? (
              <>
                <button type="button" className="mp-btn" onClick={() => nav(`/about/second-hand/item/${id}/edit`)}>
                  {isZh ? '编辑' : 'Edit'}
                </button>
                <button
                  type="button"
                  className="mp-btn"
                  aria-label={isZh ? '更多' : 'More'}
                  title={isZh ? '更多' : 'More'}
                  onClick={() => setOwnerMenuOpen((v) => !v)}
                >
                  <MoreVertical size={18} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {ownerMenuOpen && item?.viewer?.canEdit ? (
          <div className="mp-owner-menu" role="dialog" aria-label={isZh ? '商品操作' : 'Item actions'}>
            <button
              type="button"
              className="mp-btn"
              disabled={statusMut.isPending}
              onClick={() => {
                setOwnerMenuOpen(false);
                statusMut.mutate('on_sale');
              }}
            >
              {isZh ? '标记待售' : 'On sale'}
            </button>
            <button
              type="button"
              className="mp-btn"
              disabled={statusMut.isPending}
              onClick={() => {
                setOwnerMenuOpen(false);
                statusMut.mutate('sold');
              }}
            >
              {isZh ? '标记已售出' : 'Sold'}
            </button>
            <button
              type="button"
              className="mp-btn"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!window.confirm(isZh ? '确定删除这个商品吗？此操作不可撤销。' : 'Delete this item? This cannot be undone.')) return;
                setOwnerMenuOpen(false);
                deleteMut.mutate();
              }}
            >
              {isZh ? '删除' : 'Delete'}
            </button>
          </div>
        ) : null}

        {images.length ? (
          <div className="mp-detail-images">
            {images.map((img, idx) => {
              const isFirst = idx === 0;
              if (isFirst) {
                return (
                  <motion.img
                    key={img.url}
                    layoutId={`mp-cover-${item.id}`}
                    src={img.url}
                    alt={item.title}
                  />
                );
              }
              return <img key={img.url} src={img.url} alt={item.title} />;
            })}
          </div>
        ) : null}

        <div className="mp-detail-title">{item.title}</div>
        <div className="mp-detail-row">
          <div className="mp-price">{isZh ? `RM ${item.price}` : `RM ${item.price}`}</div>
          <div className={`mp-badge ${item.status === 'sold' ? 'sold' : ''}`}>
            {statusLabel(item.status, isZh)}
          </div>
          <div className="mp-badge">{item?.dorm_area ? (isZh ? `宿舍 ${item.dorm_area}` : `Dorm ${item.dorm_area}`) : (isZh ? '宿舍未知' : 'Dorm N/A')}</div>
          <div className="mp-badge">{deliveryLabel(item?.delivery_method, isZh)}</div>
          <div className="mp-badge">{isZh ? `想要 ${item.wants_count || 0}` : `Wants ${item.wants_count || 0}`}</div>
          {item?.sellerInfo?.name ? <div className="mp-badge">{item.sellerInfo.name}</div> : null}
        </div>

        <div className="mp-detail-desc">{item.description}</div>

        {/* Private chat area */}
        <div className="mp-chat-card" aria-label={isZh ? '私密对话' : 'Private chat'}>
          <div className="mp-chat-head">
            <div className="mp-contact-title">{isZh ? '私密对话' : 'Private chat'}</div>
            <div className="mp-help">
              {isZh ? '仅买家与卖家可见。' : 'Visible to buyer & seller only.'}
            </div>
          </div>

          {!isLoggedIn ? (
            <div style={{ padding: 12 }}>
              <button type="button" className="mp-btn mp-btn-primary" onClick={() => nav('/login')}>
                {isZh ? '登录后发消息' : 'Login to chat'}
              </button>
            </div>
          ) : isSeller ? (
            <div style={{ padding: 12 }}>
              <div className="mp-help" style={{ marginBottom: 10 }}>
                {isZh ? '所有询问的买家' : 'Buyers who asked'}
              </div>
              <div className="mp-chat-threads">
                {(threadsQuery.data?.list || []).map((t) => {
                  const unreadCount = Number(t.unread_count || 0);
                  const unread = unreadCount > 0;
                  return (
                    <Link
                      key={t.thread_id}
                      to={`/about/second-hand/chat/${t.thread_id}`}
                      className={`mp-chat-thread ${unread ? 'is-unread' : ''}`}
                      onClick={() => setActiveThreadId(t.thread_id)}
                    >
                      <div className="mp-chat-thread-left">
                        <span className="mp-chat-avatar" aria-hidden>
                          <img src={t.buyer?.avatar || '/default-avatar.svg'} alt="" />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="mp-chat-thread-title">
                            {t.buyer?.name || (isZh ? '买家' : 'Buyer')}
                          </div>
                          <div className="mp-chat-thread-preview">{t.last_content || (isZh ? '点击进入对话' : 'Open chat')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                        {unread ? <span className="mp-chat-unread-badge">{unreadCount > 99 ? '99+' : String(unreadCount)}</span> : null}
                        <div className="mp-help">{t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ''}</div>
                      </div>
                    </Link>
                  );
                })}
                {!threadsQuery.isFetching && (threadsQuery.data?.list || []).length === 0 ? (
                  <div className="mp-empty" style={{ marginTop: 0 }}>
                    {isZh ? '暂无买家询问。' : 'No inquiries yet.'}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="mp-chat-list" role="log" aria-label="messages">
                {msgList.map((m) => {
                  const mine = user?.id != null && Number(m.sender_user_id) === Number(user.id);
                  return (
                    <div key={m.id} className={`mp-chat-row ${mine ? 'is-mine' : ''}`}>
                      <div className="mp-chat-bubble">
                        <div className="mp-chat-text">{m.content}</div>
                        <div className="mp-chat-time">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form
                className="mp-chat-inputbar"
                onSubmit={(e) => {
                  e.preventDefault();
                  buyerSendMut.mutate();
                }}
              >
                <input
                  className="mp-input"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={isZh ? '给卖家发消息询问…' : 'Message the seller…'}
                />
                <button type="submit" className="mp-btn mp-btn-primary" disabled={buyerSendMut.isPending || !chatText.trim()}>
                  {isZh ? '发送' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplaceDetail;

