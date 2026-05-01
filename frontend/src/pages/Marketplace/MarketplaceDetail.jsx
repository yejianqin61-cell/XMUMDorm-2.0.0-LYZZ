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
import ImagePreview from '../../components/ImagePreview';
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
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);

  const tokenKey = token ? token.slice(0, 16) : '_guest';

  const q = useQuery({
    queryKey: QK.marketplaceItemDetail(id, tokenKey),
    queryFn: () => getMarketplaceItemDetail(id),
    staleTime: 6 * 1000,
  });

  const item = q.data;
  const images = useMemo(() => item?.images || [], [item]);
  const imageUrls = useMemo(() => (images || []).map((x) => x.url).filter(Boolean), [images]);
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

        {imageUrls.length ? (
          <div className="mp-detail-media">
            {imageUrls.length === 1 ? (
              <button
                type="button"
                className="mp-detail-hero"
                onClick={() => setImagePreview({ open: true, index: 0 })}
                aria-label={isZh ? '预览图片' : 'Preview image'}
              >
                <motion.img
                  layoutId={`mp-cover-${item.id}`}
                  src={imageUrls[0]}
                  alt={item.title}
                />
              </button>
            ) : (
              <StackedCardCarousel
                urls={imageUrls}
                index={carouselIndex}
                dir={carouselDir}
                onChangeIndex={(next, dir) => {
                  setCarouselDir(dir);
                  setCarouselIndex(next);
                }}
                onOpenPreview={(i) => setImagePreview({ open: true, index: i })}
                sharedLayoutId={`mp-cover-${item.id}`}
              />
            )}
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

        {imagePreview.open && imageUrls.length > 0 ? (
          <ImagePreview
            urls={imageUrls}
            initialIndex={imagePreview.index}
            onClose={() => setImagePreview({ open: false, index: 0 })}
          />
        ) : null}

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

function mod(n, m) {
  return ((n % m) + m) % m;
}

function StackedCardCarousel({ urls, index, onChangeIndex, onOpenPreview, dir, sharedLayoutId }) {
  const n = Array.isArray(urls) ? urls.length : 0;
  if (!n) return null;

  const stack = [
    { scale: 1, x: 0, y: 0, opacity: 1, blur: 0, rotate: 0 },
    { scale: 0.94, x: 15, y: -15, opacity: 0.6, blur: 4, rotate: -2 },
    { scale: 0.88, x: 30, y: -30, opacity: 0.3, blur: 8, rotate: -4 },
  ];

  const count = Math.min(3, n);
  const ids = Array.from({ length: count }, (_, i) => mod(index + i, n));

  const go = (delta) => {
    if (n <= 1) return;
    const next = mod(index + delta, n);
    onChangeIndex(next, delta > 0 ? 1 : -1);
  };

  const frontId = ids[0];

  return (
    <div className="mp-detail-carousel" aria-label="Image carousel">
      <div className="mp-detail-carousel-stack">
        {ids.slice(1).reverse().map((id, revIdx) => {
          const pos = ids.length - (revIdx + 1);
          const s = stack[pos];
          return (
            <motion.button
              key={`stack-${id}`}
              type="button"
              className="mp-detail-carousel-card"
              onClick={() => onOpenPreview(id)}
              style={{ zIndex: 10 + (3 - pos) }}
              animate={{
                scale: s.scale,
                x: s.x,
                y: s.y,
                opacity: s.opacity,
                rotate: s.rotate,
                filter: `blur(${s.blur}px)`,
              }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <img src={urls[id]} alt="" className="mp-detail-carousel-img" draggable={false} />
            </motion.button>
          );
        })}

        <motion.button
          key={`front-${frontId}`}
          type="button"
          className="mp-detail-carousel-card mp-detail-carousel-card--front"
          onClick={() => onOpenPreview(frontId)}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            const swipe = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 700;
            if (!swipe) return;
            if (info.offset.x < 0) go(1);
            else go(-1);
          }}
          initial={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
          animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          style={{ zIndex: 30 }}
        >
          <motion.img
            layoutId={sharedLayoutId || undefined}
            src={urls[frontId]}
            alt=""
            className="mp-detail-carousel-img"
            draggable={false}
          />
        </motion.button>

        <button type="button" className="mp-detail-carousel-arrow mp-detail-carousel-arrow--left" onClick={() => go(-1)} aria-label="Previous">
          ‹
        </button>
        <button type="button" className="mp-detail-carousel-arrow mp-detail-carousel-arrow--right" onClick={() => go(1)} aria-label="Next">
          ›
        </button>
      </div>

      <div className="mp-detail-carousel-dots" aria-label="Pagination">
        {urls.map((_, i) => (
          <button
            key={`dot-${i}`}
            type="button"
            className={`mp-detail-carousel-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => onChangeIndex(i, i > index ? 1 : -1)}
            aria-label={`Go to ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

