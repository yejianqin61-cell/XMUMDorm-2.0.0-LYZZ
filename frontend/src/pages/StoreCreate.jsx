import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import StoreForm from '../components/StoreForm';
import { Toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createShop } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { invalidateCanteenContent } from '../features/canteen/invalidateCanteen';
import './StoreCreate.css';

/**
 * 新增商铺（共建）：任意登录用户可在当前分区创建商铺。
 * 支持 ?region=<regionId> 预设分区，?from=<path> 指定成功后回到的页面（分区列表）。
 */
function StoreCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [loading, setLoading] = useState(false);

  // 未登录：按 US-003 引导登录，并回到本页
  useEffect(() => {
    if (isLoggedIn) return;
    navigate('/login', {
      replace: true,
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [isLoggedIn, navigate, location.pathname, location.search]);

  const regionId = useMemo(() => {
    const raw = searchParams.get('region');
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const from = searchParams.get('from') || '';

  const handleSubmit = (values) => {
    setLoading(true);
    createShop({ name: values.name, region_id: values.region_id })
      .then(() => {
        invalidateCanteenContent(queryClient);
        Toast.success(isEn ? 'Shop created' : '商铺已创建');
        if (from) navigate(from, { replace: true });
        else navigate('/eat', { replace: true });
      })
      .catch((err) => {
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="store-create-page">
      <header className="store-create-head">
        <h1 className="store-create-title">{isEn ? 'Add shop' : '新增商家'}</h1>
        <p className="store-create-sub">
          {isEn
            ? 'Anyone signed in can add a shop to a canteen zone.'
            : '登录后任何人都可以为食堂分区补充商家。'}
        </p>
      </header>
      <StoreForm
        defaultRegionId={regionId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}

export default StoreCreate;
