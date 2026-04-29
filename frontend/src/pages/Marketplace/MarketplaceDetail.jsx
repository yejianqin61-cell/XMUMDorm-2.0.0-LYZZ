import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MoreVertical } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import { deleteMarketplaceItem, getMarketplaceItemDetail, toggleMarketplaceWant, updateMarketplaceItemStatus } from '../../api/marketplace';
import { queryClient } from '../../query/queryClient';
import { Toast } from '../../context/ToastContext';
import './Marketplace.css';

function statusLabel(s, isZh) {
  if (s === 'sold') return isZh ? '已售出' : 'Sold';
  return isZh ? '在售' : 'On sale';
}

function MarketplaceDetail() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  const tokenKey = token ? token.slice(0, 16) : '_guest';

  const q = useQuery({
    queryKey: QK.marketplaceItemDetail(id, tokenKey),
    queryFn: () => getMarketplaceItemDetail(id),
    staleTime: 6 * 1000,
  });

  const item = q.data;
  const images = useMemo(() => item?.images || [], [item]);

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
            {images.map((img) => (
              <img key={img.url} src={img.url} alt={item.title} />
            ))}
          </div>
        ) : null}

        <div className="mp-detail-title">{item.title}</div>
        <div className="mp-detail-row">
          <div className="mp-price">{isZh ? `RM ${item.price}` : `RM ${item.price}`}</div>
          <div className={`mp-badge ${item.status === 'sold' ? 'sold' : ''}`}>
            {statusLabel(item.status, isZh)}
          </div>
          <div className="mp-badge">{isZh ? `想要 ${item.wants_count || 0}` : `Wants ${item.wants_count || 0}`}</div>
          {item?.sellerInfo?.name ? <div className="mp-badge">{item.sellerInfo.name}</div> : null}
        </div>

        <div className="mp-detail-desc">{item.description}</div>

        <div className="mp-detail-row">
          <button
            type="button"
            className="mp-btn mp-btn-primary"
            disabled={!isLoggedIn || wantMut.isPending}
            onClick={() => {
              if (!isLoggedIn) return nav('/login');
              wantMut.mutate();
            }}
          >
            {item?.viewer?.want ? (isZh ? '已收藏' : 'Saved') : (isZh ? '收藏' : 'Save')}
          </button>
        </div>

        <div className="mp-contact">
          <div className="mp-contact-title">{isZh ? '联系方式' : 'Contact'}</div>
          <div className="mp-help">{isZh ? '仅在详情页展示，请文明沟通。' : 'Shown on detail only. Be respectful.'}</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <div>{isZh ? `微信：${item?.contactInfo?.wechat || '无'}` : `WeChat: ${item?.contactInfo?.wechat || 'N/A'}`}</div>
            <div>{isZh ? `电话：${item?.contactInfo?.phone || '无'}` : `Phone: ${item?.contactInfo?.phone || 'N/A'}`}</div>
            {item?.contactInfo?.remark ? (
              <div>{isZh ? `备注：${item.contactInfo.remark}` : `Note: ${item.contactInfo.remark}`}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceDetail;

