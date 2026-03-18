import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
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

  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { name, logo, description, rating, status, address, openingHours } = merchant;
  const isOpen = status === 'open';
  const [helpOpen, setHelpOpen] = useState(false);
  const helpWrapRef = useRef(null);

  useEffect(() => {
    if (!helpOpen) return;
    const onDocClick = (e) => {
      const el = helpWrapRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setHelpOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [helpOpen]);

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
          <span ref={helpWrapRef} className="merchant-header-help-wrap">
            <button
              type="button"
              className="merchant-header-help-btn pressable"
              aria-label={isZh ? '平台说明' : 'Platform info'}
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((v) => !v)}
            >
              ?
            </button>
            {helpOpen && (
              <div className="merchant-header-help-card" role="dialog" aria-label={isZh ? '平台说明' : 'Platform info'}>
                {isZh ? (
                  <>
                    <p>Dorm 是由学生自主开发的校园信息与点评平台，旨在为同学提供便利的信息参考。</p>
                    <p>平台内所有商家信息（包括但不限于菜单、价格、图片等）主要来源于用户整理或公开渠道，仅供参考，不代表商家官方信息。</p>
                    <p>平台不隶属于学校或任何官方机构，亦不代表任何商家立场。</p>
                    <p>如相关商家或个人认为平台内容存在错误、侵权或不当之处，请联系我们，我们将及时核实并处理或删除相关内容。</p>
                    <p>Dorm 致力于构建真实、透明的校园信息交流环境。</p>
                  </>
                ) : (
                  <>
                    <p>Dorm is a student-developed campus information and review platform designed to provide convenient reference for students.</p>
                    <p>All merchant information (including but not limited to menus, prices, and images) is collected from user contributions or publicly available sources and is for reference only. It does not represent official information of any merchant.</p>
                    <p>Dorm is not affiliated with the university or any official institution, nor does it represent any merchant.</p>
                    <p>If any merchant or individual believes that content on the platform is inaccurate, infringing, or inappropriate, please contact us. We will promptly verify and update or remove the content.</p>
                    <p>Dorm is committed to building a transparent and authentic campus information-sharing environment.</p>
                  </>
                )}
              </div>
            )}
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
