import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import '../../pages/Marketplace/Marketplace.css';

function formatRelativeTime(createdAt, isZh) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;
  if (!Number.isFinite(diffMs)) return '';
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return isZh ? '刚刚' : 'Just now';
  if (diffMin < 60) return isZh ? `${diffMin} 分钟前` : `${diffMin} min ago`;
  if (diffHour < 24) return isZh ? `${diffHour} 小时前` : `${diffHour} h ago`;
  if (diffDay === 1) return isZh ? '昨天' : 'Yesterday';
  if (diffDay < 7) return isZh ? `${diffDay} 天前` : `${diffDay} days ago`;
  return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: '2-digit', day: '2-digit' });
}

function deliveryLabel(v, isZh) {
  if (v === 'delivery') return isZh ? '配送' : 'Delivery';
  return isZh ? '自提' : 'Self-pickup';
}

function MarketplaceItemCard({ item }) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const it = item || {};

  const timeText = formatRelativeTime(it.created_at, isZh);
  const locationCode = it.dorm_area ? String(it.dorm_area) : '';
  const delivery = deliveryLabel(it.delivery_method, isZh);
  const viewsLabel = isZh ? `${Number(it.views_count || 0)}查看` : `${Number(it.views_count || 0)} views`;

  const tags = useMemo(() => {
    const raw = Array.isArray(it.tags) ? it.tags : [];
    const picked = raw.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 2);
    return picked;
  }, [it.tags, it.delivery_method, isZh]);

  const title = String(it.title || '').trim();
  const sellerName = String(it.sellerName || (isZh ? '匿名卖家' : 'Seller'));
  const userBadge = isZh ? '校园用户' : 'Campus';

  return (
    <Link to={`/about/second-hand/item/${it.id}`} className="mp-hcard">
      <div className="mp-hcard-img">
        <motion.img
          layoutId={`mp-cover-${it.id}`}
          src={it.cover || ''}
          alt={title}
          style={{ opacity: it.cover ? 1 : 0 }}
        />
        {!it.cover ? <div className="mp-hcard-img-fallback">{isZh ? '暂无图片' : 'No image'}</div> : null}
      </div>

      <div className="mp-hcard-body">
        <div className="mp-hcard-title-row">
          <span className="mp-hcard-highlight">{delivery}</span>
          <div className="mp-hcard-title" title={title}>
            {title || (isZh ? '（无标题）' : '(Untitled)')}
          </div>
        </div>

        <div className="mp-hcard-meta">
          <span className="mp-hcard-time">
            <Clock3 size={14} aria-hidden />
            {timeText}
          </span>
          <span className="mp-dot" aria-hidden="true">·</span>
          <span className="mp-hcard-badge">{userBadge}</span>
        </div>

        <div className="mp-hcard-price-row">
          <span className="mp-hcard-price">{isZh ? `RM ${it.price}` : `$${it.price}`}</span>
          <span className="mp-hcard-views">{viewsLabel}</span>
        </div>

        <div className="mp-hcard-bottom">
          <span className="mp-hcard-seller-avatar" aria-hidden="true">
            <img src={it.sellerAvatar || '/default-avatar.svg'} alt="" />
          </span>
          <span className="mp-hcard-seller">{sellerName}</span>
          {locationCode ? (
            <>
              <span className="mp-dot" aria-hidden="true">·</span>
              <span className="mp-hcard-loc">{locationCode}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default memo(MarketplaceItemCard);

