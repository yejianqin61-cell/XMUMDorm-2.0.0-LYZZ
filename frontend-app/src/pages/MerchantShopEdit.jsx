import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toast } from '../context/ToastContext';
import { getShopMe, getShop, updateShop } from '@shared/api/canteen';
import { getUploadUrl } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { useLanguage } from '../context/LanguageContext';
import './MerchantShopEdit.css';

/** 店铺编辑：logo、名称、营业时间 */
function MerchantShopEdit() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedShopId = Number.parseInt(searchParams.get('shop') || '', 10);
  const [shop, setShop] = useState(null);
  const [name, setName] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (Number.isFinite(requestedShopId) && requestedShopId > 0 ? getShop(requestedShopId) : getShopMe())
      .then((data) => {
        setShop(data);
        setName(data?.name ?? '');
        setOpeningHours(data?.opening_hours ?? '');
        setLogoUrl(data?.logo ? getUploadUrl(data.logo) : '');
      })
      .catch((err) => {
        const isNoShop = err.status === 404 || (err.message && err.message.includes('尚未创建'));
        if (isNoShop) {
          navigate('/eat', { replace: true });
          return;
        }
        setError(getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [navigate, requestedShopId]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameTrim = name.trim();
    if (!nameTrim) {
      Toast.error(isEn ? 'Please enter a shop name' : '请填写店铺名称');
      return;
    }
    if (!shop?.id) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateShop(shop.id, {
        name: nameTrim,
        opening_hours: openingHours.trim() || undefined,
        logoFile: logoFile || undefined,
      });
      Toast.success(isEn ? 'Saved' : '已保存');
      navigate(`/merchant/manage?shop=${shop.id}`, { replace: true });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="merchant-shop-edit-page">
        <p className="merchant-shop-edit-loading state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error && !shop) {
    return (
      <div className="merchant-shop-edit-page">
        <p className="merchant-shop-edit-error state-error">{error}</p>
        <button type="button" className="merchant-shop-edit-back" onClick={() => navigate(-1)}>{isEn ? 'Back' : '返回'}</button>
      </div>
    );
  }

  return (
    <div className="merchant-shop-edit-page">
      <h1 className="merchant-shop-edit-title">{isEn ? 'Edit shop' : '编辑店铺'}</h1>
      {error && <p className="merchant-shop-edit-error" role="alert">{error}</p>}
      <form className="merchant-shop-edit-form" onSubmit={handleSubmit}>
        <div className="merchant-shop-edit-field">
          <label>{isEn ? 'Shop logo' : '店铺 Logo'}</label>
          <div className="merchant-shop-edit-logo-row">
            <label className="merchant-shop-edit-logo-wrap">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} className="merchant-shop-edit-file" />
              {logoUrl ? (
                <img src={logoUrl} alt="" className="merchant-shop-edit-logo" />
              ) : (
                <div className="merchant-shop-edit-logo merchant-shop-edit-logo-placeholder">Logo</div>
              )}
            </label>
            <span className="merchant-shop-edit-hint">{isEn ? 'Tap to upload · jpg/png/webp · max 8MB' : '点击上传，支持 jpg/png/webp，单张不超过 8MB'}</span>
          </div>
        </div>
        <div className="merchant-shop-edit-field">
          <label htmlFor="shop-edit-name">{isEn ? 'Shop name *' : '店铺名称 *'}</label>
          <input
            id="shop-edit-name"
            type="text"
            placeholder={isEn ? 'Enter shop name' : '请输入店铺名称'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="merchant-shop-edit-input"
          />
        </div>
        <div className="merchant-shop-edit-field">
          <label htmlFor="shop-edit-hours">{isEn ? 'Opening hours' : '营业时间'}</label>
          <input
            id="shop-edit-hours"
            type="text"
            placeholder={isEn ? 'e.g. 07:00–21:00' : '如 07:00–21:00'}
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            className="merchant-shop-edit-input"
          />
        </div>
        <div className="merchant-shop-edit-actions">
          <button type="submit" className="merchant-shop-edit-btn merchant-shop-edit-btn-primary" disabled={submitting}>
            {submitting ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Save' : '保存')}
          </button>
          <button type="button" className="merchant-shop-edit-btn merchant-shop-edit-btn-secondary" onClick={() => navigate(-1)}>
            {isEn ? 'Cancel' : '取消'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MerchantShopEdit;
