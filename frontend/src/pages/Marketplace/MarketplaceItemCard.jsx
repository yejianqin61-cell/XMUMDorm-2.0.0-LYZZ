import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './Marketplace.css';

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

  const locationText = it.dorm_area ? (isZh ? `宿舍 ${it.dorm_area}` : `Dorm ${it.dorm_area}`) : (isZh ? '宿舍未知' : 'Dorm N/A');
  const timeText = formatRelativeTime(it.created_at, isZh);
  const viewsText = String(Number(it.views_count || 0));
  const viewsLabel = isZh ? `${viewsText} 看过` : `${viewsText} views`;

  const tags = useMemo(() => {
    const raw = Array.isArray(it.tags) ? it.tags : [];
    const picked = raw.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 2);
    const del = deliveryLabel(it.delivery_method, isZh);
    return [...picked, del].slice(0, 3);
  }, [it.tags, it.delivery_method, isZh]);

  const desc = String(it.description || '').trim();
  const hasDesc = !!desc;

  return (
    <Link to={`/about/second-hand/item/${it.id}`} className="mp-feed-card">
      <div className="mp-feed-media mp-feed-media--flush">
        <div className="mp-views-pill mp-views-pill--float" aria-label={isZh ? '浏览量' : 'Views'}>
          <Sparkles size={14} aria-hidden />
          <span>{viewsLabel}</span>
        </div>
        <motion.img
          layoutId={`mp-cover-${it.id}`}
          src={it.cover || ''}
          alt={it.title || ''}
          className="mp-feed-img"
          style={{ opacity: it.cover ? 1 : 0 }}
        />
        {!it.cover ? <div className="mp-feed-img-fallback">{isZh ? '暂无图片' : 'No image'}</div> : null}
      </div>

      <div className="mp-feed-body">
        <div className="mp-seller-row">
          <span className="mp-seller-avatar mp-seller-avatar--sm" aria-hidden="true">
            <img src={it.sellerAvatar || '/default-avatar.svg'} alt="" />
          </span>
          <div className="mp-seller-row-text">
            <span className="mp-seller-name mp-seller-name--sm">{it.sellerName || (isZh ? '匿名卖家' : 'Seller')}</span>
            <span className="mp-seller-sub mp-seller-sub--sm">
              <span className="mp-time">
                <Clock3 size={13} aria-hidden />
                {timeText}
              </span>
              <span className="mp-dot" aria-hidden="true">·</span>
              <span>{locationText}</span>
            </span>
          </div>
        </div>

        <div className="mp-feed-title mp-feed-title--clean">{it.title || (isZh ? '（无标题）' : '(Untitled)')}</div>
        <div className="mp-feed-price mp-feed-price--clean">{isZh ? `RM ${it.price}` : `$${it.price}`}</div>

        {hasDesc ? (
          <div className="mp-feed-desc">
            <span className="mp-feed-desc-text">{desc}</span>
            <span className="mp-see-more">{isZh ? '查看更多' : 'See more'}</span>
          </div>
        ) : null}
        <div className="mp-feed-tags" aria-label={isZh ? '标签' : 'Tags'}>
          {tags.map((t) => (
            <span key={t} className="mp-tag-pill">{t}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default memo(MarketplaceItemCard);

