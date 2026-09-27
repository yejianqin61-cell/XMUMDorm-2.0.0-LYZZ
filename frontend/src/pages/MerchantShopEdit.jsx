import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getShop, getShopMe, updateShop } from '@shared/api/canteen';
import { getUploadUrl } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { invalidateCanteenContent } from '../features/canteen/invalidateCanteen';
import './MerchantShopEdit.css';

/**
 * 店铺资料编辑（共建）：任意登录用户都可编辑任意未删除商铺。
 * - 带 :shopId 路由参数时编辑该商铺（从分区列表 / 商铺维护页进入）
 * - 不带参数时保留旧商家路径语义（getShopMe），兼容既有商家用户
 * 删除入口不在本页提供：商铺删除仅管理员可执行。
 */
function MerchantShopEdit() {
  const { shopId: shopIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const shopId = useMemo(() => {
    const n = shopIdParam ? parseInt(shopIdParam, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [shopIdParam]);

  const from = searchParams.get('from') || '';

  const [shop, setShop] = useState(null);
  const [name, setName] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 未登录：按 US-003 引导登录，并回到本页
  useEffect(() => {
    if (isLoggedIn) return;
    navigate('/login', {
      replace: true,
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [isLoggedIn, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    setLoading(true);
    const request = shopId > 0 ? getShop(shopId) : getShopMe();
    request
      .then((data) => {
        if (cancelled) return;
        setShop(data);
        setName(data?.name ?? '');
        setOpeningHours(data?.opening_hours ?? '');
        setLogoUrl(data?.logo ? getUploadUrl(data.logo) : '');
      })
      .catch((err) => {
        if (cancelled) return;
        if (shopId === 0 && (err?.status === 404 || (err?.message || '').includes('尚未创建'))) {
          navigate('/merchant/create', { replace: true });
          return;
        }
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, shopId, navigate]);

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
      Toast.error(isEn ? 'Please enter the shop name' : '请填写店铺名称');
      return;
    }
    const targetId = shop?.id ?? shopId;
    if (!targetId) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateShop(targetId, {
        name: nameTrim,
        opening_hours: openingHours.trim() || undefined,
        logoFile: logoFile || undefined,
      });
      invalidateCanteenContent(queryClient);
      Toast.success(isEn ? 'Saved' : '已保存');
      if (from) navigate(from, { replace: true });
      else navigate(`/eat/merchant/${targetId}`, { replace: true });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="shop-edit-page">
        <p className="state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error && !shop) {
    return (
      <div className="shop-edit-page">
        <p className="state-error">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {isEn ? 'Back' : '返回'}
        </Button>
      </div>
    );
  }

  return (
    <div className="shop-edit-page">
      <header className="shop-edit-head">
        <h1 className="shop-edit-title">{isEn ? 'Edit shop' : '编辑商家'}</h1>
        <p className="shop-edit-sub">
          {isEn
            ? 'Anyone signed in can fix shop info. Deleting a shop stays admin-only.'
            : '登录后任何人都可以修正商家信息；删除商家仍仅管理员可用。'}
        </p>
      </header>

      {error ? <p className="shop-edit-error" role="alert">{error}</p> : null}

      <form className="shop-edit-form" onSubmit={handleSubmit}>
        <div className="shop-edit-logo-row">
          <label className="shop-edit-logo-wrap">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="shop-edit-file"
            />
            {logoUrl ? (
              <img src={logoUrl} alt="" className="shop-edit-logo" />
            ) : (
              <span className="shop-edit-logo shop-edit-logo-placeholder">
                {isEn ? 'Logo' : '店铺图'}
              </span>
            )}
          </label>
          <span className="shop-edit-hint">
            {isEn ? 'Tap to upload, jpg/png/webp ≤8MB' : '点击上传，jpg/png/webp 单张≤8MB'}
          </span>
        </div>

        <Input
          id="shop-edit-name"
          label={isEn ? 'Shop name' : '店铺名称'}
          required
          placeholder={isEn ? 'Enter shop name' : '请输入店铺名称'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          id="shop-edit-hours"
          label={isEn ? 'Opening hours' : '营业时间'}
          placeholder={isEn ? 'e.g. 07:00-21:00' : '如 07:00-21:00'}
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
        />

        <div className="shop-edit-actions">
          <Button type="submit" size="lg" loading={submitting} disabled={submitting}>
            {submitting ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Save' : '保存')}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate(-1)} disabled={submitting}>
            {isEn ? 'Cancel' : '取消'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default MerchantShopEdit;
