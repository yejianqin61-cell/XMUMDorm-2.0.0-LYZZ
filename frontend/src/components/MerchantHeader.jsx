import './MerchantHeader.css';

/**
 * 商家信息头部：在菜品列表页顶部展示当前商家（logo、名称、简介、评分、营业状态、地址、营业时间）
 * @param {Object} merchant
 * @param {string} merchant.name
 * @param {string} [merchant.logo]
 * @param {string} [merchant.description]
 * @param {number} [merchant.rating]
 * @param {string} [merchant.status] 'open' | 'closed'
 * @param {string} [merchant.address]
 * @param {string} [merchant.openingHours]
 */
function MerchantHeader({ merchant }) {
  if (!merchant) return null;

  const { name, logo, description, rating, status, address, openingHours } = merchant;
  const isOpen = status === 'open';

  return (
    <header className="merchant-header" aria-label={`商家 ${name}`}>
      <div className="merchant-header-logo-wrap">
        {logo ? (
          <img src={logo} alt="" className="merchant-header-logo" />
        ) : (
          <div className="merchant-header-logo merchant-header-logo-default" aria-hidden>
            Store
          </div>
        )}
      </div>
      <div className="merchant-header-body">
        <div className="merchant-header-row">
          <h1 className="merchant-header-name">{name}</h1>
          <span className={`merchant-header-status merchant-header-status-${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? '营业中' : '已打烊'}
          </span>
        </div>
        {rating != null && (
          <p className="merchant-header-rating">★ {Number(rating).toFixed(1)} 评分</p>
        )}
        {description && (
          <p className="merchant-header-desc">{description}</p>
        )}
        {address && (
          <p className="merchant-header-address">📍 {address}</p>
        )}
        {openingHours && (
          <p className="merchant-header-hours">🕐 {openingHours}</p>
        )}
      </div>
    </header>
  );
}

export default MerchantHeader;
