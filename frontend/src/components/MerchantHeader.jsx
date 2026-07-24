import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import './MerchantHeader.css';
import { DEFAULT_PRODUCT_IMAGE_PATH, DEFAULT_SHOP_LOGO_PATH } from '@shared/api/config';

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
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { name, logo, description, rating, status, address, openingHours } = merchant || {};
  const isOpen = status === 'open';
  const [helpOpen, setHelpOpen] = useState(false);
  const helpWrapRef = useRef(null);
  const [helpPos, setHelpPos] = useState({ top: 0, right: 0, width: 320 });

  const syncHelpPos = () => {
    const el = helpWrapRef.current;
    if (!el) return;
    const btn = el.querySelector('button');
    const rect = (btn || el).getBoundingClientRect();
    const vw = Math.max(320, window.innerWidth || 0);
    const maxW = Math.min(360, Math.floor(vw * 0.76));
    const right = Math.max(12, Math.floor(vw - rect.right));
    const top = Math.floor(rect.bottom + 10);
    setHelpPos({ top, right, width: maxW });
  };

  useEffect(() => {
    if (!helpOpen) return;
    const rafId = window.requestAnimationFrame(syncHelpPos);
    const onDocClick = (e) => {
      const el = helpWrapRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setHelpOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick, { passive: true });
    window.addEventListener('resize', syncHelpPos);
    // 捕获滚动（包括滚动容器），用于重算浮层位置
    window.addEventListener('scroll', syncHelpPos, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      window.removeEventListener('resize', syncHelpPos);
      window.removeEventListener('scroll', syncHelpPos, true);
    };
  }, [helpOpen]);

  if (!merchant) return null;

  return (
    <header className="merchant-header" aria-label={`商家 ${name}`}>
      <div className="merchant-header-logo-wrap">
        <img
          src={logo || DEFAULT_SHOP_LOGO_PATH}
          alt=""
          className="merchant-header-logo"
          onError={(e) => {
            // 如果你尚未把默认商家 logo 放到 frontend/public，那么回退到商品默认图
            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE_PATH;
          }}
        />
      </div>
      <div className="merchant-header-body">
        <div className="merchant-header-row">
          <h1 className="merchant-header-name">{name}</h1>
          <span className={`merchant-header-status merchant-header-status-${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? (isZh ? '营业中' : 'Open') : (isZh ? '已打烊' : 'Closed')}
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
            {helpOpen && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    className="merchant-header-help-overlay"
                    role="presentation"
                    onClick={() => setHelpOpen(false)}
                    onPointerDown={() => setHelpOpen(false)}
                  >
                    <div
                      className="merchant-header-help-card merchant-header-help-card--portal"
                      role="dialog"
                      aria-label={isZh ? '平台说明' : 'Platform info'}
                      style={{ top: helpPos.top, right: helpPos.right, width: helpPos.width }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
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
                  </div>,
                  document.body
                )
              : null}
          </span>
        </div>
        {rating != null && (
          <p className="merchant-header-rating">★ {Number(rating).toFixed(1)} {isZh ? '评分' : 'rating'}</p>
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
