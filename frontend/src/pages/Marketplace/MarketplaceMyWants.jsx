import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { listMarketplaceMyWants } from '../../api/marketplace';
import { Toast } from '../../context/ToastContext';
import './Marketplace.css';

function statusLabel(s, isZh) {
  if (s === 'sold') return isZh ? '已售' : 'Sold';
  return isZh ? '待售' : 'On sale';
}

function deliveryLabel(v, isZh) {
  if (v === 'delivery') return isZh ? '配送' : 'Delivery';
  return isZh ? '自提' : 'Pickup';
}

function MarketplaceMyWants() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const nav = useNavigate();
  const { isLoggedIn } = useAuth();

  const q = useQuery({
    enabled: !!isLoggedIn,
    queryKey: ['marketplace', 'me', 'wants', { page: 1, pageSize: 60 }],
    queryFn: () => listMarketplaceMyWants({ page: 1, pageSize: 60 }),
    staleTime: 8 * 1000,
    onError: (e) => Toast.error(e?.message || (isZh ? '加载失败' : 'Failed')),
  });

  const list = useMemo(() => q.data?.list || [], [q.data]);

  if (!isLoggedIn) {
    return (
      <div className="mp-page">
        <div className="mp-topbar">
          <Link to="/about/second-hand" className="mp-btn">
            {isZh ? '← 返回' : '← Back'}
          </Link>
          <div className="mp-title">{isZh ? '我的收藏' : 'My saved'}</div>
          <div />
        </div>
        <div className="mp-empty">{isZh ? '请先登录后查看收藏。' : 'Please login to view saved items.'}</div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <button type="button" className="mp-btn" onClick={() => nav(-1)}>
          {isZh ? '← 返回' : '← Back'}
        </button>
        <div className="mp-title">{isZh ? '我的收藏' : 'My saved'}</div>
        <div />
      </div>

      <div className="mp-grid">
        {list.map((it) => (
          <Link key={it.id} to={`/about/second-hand/item/${it.id}`} className="mp-card">
            <div className="mp-card-cover">
              {it.cover ? <img src={it.cover} alt={it.title} /> : <div>{isZh ? '暂无图片' : 'No image'}</div>}
            </div>
            <div className="mp-card-body">
              <div className="mp-card-title">{it.title}</div>
              <div className="mp-card-sub">
                <div className="mp-price">{isZh ? `RM ${it.price}` : `RM ${it.price}`}</div>
                <div className={`mp-badge ${it.status === 'sold' ? 'sold' : ''}`}>{statusLabel(it.status, isZh)}</div>
              </div>
              <div className="mp-card-sub" style={{ marginTop: 8 }}>
                <div>{it.dorm_area ? (isZh ? `宿舍 ${it.dorm_area}` : `Dorm ${it.dorm_area}`) : (isZh ? '宿舍未知' : 'Dorm N/A')}</div>
                <div>{deliveryLabel(it.delivery_method, isZh)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!q.isFetching && list.length === 0 ? (
        <div className="mp-empty">{isZh ? '你还没有收藏任何商品。' : "You haven't saved any items."}</div>
      ) : null}
    </div>
  );
}

export default MarketplaceMyWants;

