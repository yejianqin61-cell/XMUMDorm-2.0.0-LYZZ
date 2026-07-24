import { Link } from 'react-router-dom';
import Card from './ui/Card';
import { useLanguage } from '../context/LanguageContext';
import './MerchantCard.css';
import { DEFAULT_PRODUCT_IMAGE_PATH, DEFAULT_SHOP_LOGO_PATH } from '@shared/api/config';

/**
 * 商家卡片：展示 logo、名称、简介、评分、营业状态，点击进入该商家菜品列表
 * @param {Object} merchant
 * @param {string|number} merchant.id
 * @param {string} merchant.name
 * @param {string} [merchant.logo]
 * @param {string} [merchant.description]
 * @param {number} [merchant.rating] 1-5 评分
 * @param {string} [merchant.status] 'open' | 'closed'
 * @param {string} [merchant.address]
 * @param {string} [merchant.openingHours]
 */
function MerchantCard({ merchant }) {
  const { isZh } = useLanguage();
  const { id, name, logo, description, rating, status, address, openingHours } = merchant;
  const isOpen = status === 'open';

  return (
    <Link
      to={`/eat/merchant/${id}`}
      className="merchant-card-wrap"
      aria-label={isZh ? `进入商家 ${name}` : `Open merchant ${name}`}
    >
      <Card as="div" className="merchant-card">
        <div className="merchant-card-logo-wrap">
          <img
            src={logo || DEFAULT_SHOP_LOGO_PATH}
            alt=""
            className="merchant-card-logo"
            onError={(e) => {
              // 如果你尚未把默认商家 logo 放到 frontend/public，那么回退到商品默认图，避免坏图
              // eslint-disable-next-line no-param-reassign
              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE_PATH;
            }}
          />
        </div>
        <div className="merchant-card-body">
          <div className="merchant-card-row">
            <span className="merchant-card-name">{name}</span>
            <span className={`merchant-card-status merchant-card-status-${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? (isZh ? '营业中' : 'Open') : (isZh ? '已打烊' : 'Closed')}
            </span>
          </div>
          {rating != null && (
            <span className="merchant-card-rating">★ {Number(rating).toFixed(1)}</span>
          )}
          {description && (
            <p className="merchant-card-desc">{description}</p>
          )}
          {(address || openingHours) && (
            <p className="merchant-card-meta">
              {address && <span>{address}</span>}
              {address && openingHours && ' · '}
              {openingHours && <span>{openingHours}</span>}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default MerchantCard;
