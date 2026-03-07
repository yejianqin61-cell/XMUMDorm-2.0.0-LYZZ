import { Link } from 'react-router-dom';
import Card from './Card';
import './Card.css';
import './MerchantCard.css';

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
  const { id, name, logo, description, rating, status, address, openingHours } = merchant;
  const isOpen = status === 'open';

  return (
    <Link
      to={`/eat/merchant/${id}`}
      className="merchant-card-wrap"
      aria-label={`进入商家 ${name}`}
    >
      <Card as="div" className="merchant-card">
        <div className="merchant-card-logo-wrap">
          {logo ? (
            <img src={logo} alt="" className="merchant-card-logo" />
          ) : (
            <div className="merchant-card-logo merchant-card-logo-default" aria-hidden>
              Store
            </div>
          )}
        </div>
        <div className="merchant-card-body">
          <div className="merchant-card-row">
            <span className="merchant-card-name">{name}</span>
            <span className={`merchant-card-status merchant-card-status-${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? '营业中' : '已打烊'}
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
