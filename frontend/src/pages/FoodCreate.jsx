import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FoodForm from '../components/FoodForm';
import NeoCard from '../components/retroui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getShopMe, getCategories, createCategory, createProduct } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { invalidateCanteenContent } from '../features/canteen/invalidateCanteen';
import './FoodCreate.css';

/**
 * 上传菜品（共建）：任意登录用户都可以为任意商铺添加菜品。
 *
 * - `?shopId=<id>`：商铺上下文（从商铺维护页或菜品详情页进入），分类取自目标商铺
 * - 无 `shopId`：保留旧商家路径语义（getShopMe），兼容既有商家用户
 * - `?from=<path>`：提交成功后回到的来源页
 * - 商铺还没有分类时，可在本页直接创建第一个分类，避免出现无路可走的空状态
 */
function FoodCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const shopId = useMemo(() => {
    const n = parseInt(searchParams.get('shopId') || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [searchParams]);
  const from = searchParams.get('from') || '';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // 未登录：按 US-003 引导登录，登录后回到本页
  useEffect(() => {
    if (isLoggedIn) return;
    navigate('/login', {
      replace: true,
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [isLoggedIn, navigate, location.pathname, location.search]);

  const loadCategories = useCallback(async () => {
    if (shopId > 0) {
      const list = await getCategories(shopId);
      return Array.isArray(list) ? list : [];
    }
    const me = await getShopMe();
    const list = me?.categories ?? [];
    return Array.isArray(list) ? list : [];
  }, [shopId]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    setLoading(true);
    loadCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, loadCategories]);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Toast.error(isEn ? 'Please enter a category name' : '请输入分类名称');
      return;
    }
    if (shopId <= 0) {
      Toast.error(isEn ? 'Open this page from a shop to add categories' : '请从商铺页面进入后再新增分类');
      return;
    }
    setCategoryLoading(true);
    try {
      await createCategory(shopId, { name, sort_order: categories.length });
      const list = await loadCategories();
      setCategories(list);
      setNewCategoryName('');
      invalidateCanteenContent(queryClient);
      Toast.success(isEn ? 'Category created' : '分类已创建');
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSubmit = (values) => {
    const categoryId = values.categoryId != null ? values.categoryId : categories[0]?.id;
    if (!categoryId) {
      Toast.error(isEn ? 'Create a category first' : '请先创建分类');
      return;
    }
    setError(null);
    setSubmitLoading(true);
    const images = values.imageFile ? [values.imageFile] : [];
    createProduct({
      category_id: categoryId,
      name: values.name,
      description: values.description,
      price: values.price,
      images,
    })
      .then(() => {
        invalidateCanteenContent(queryClient);
        Toast.success(isEn ? 'Dish published' : '菜品已发布');
        if (from) navigate(from, { replace: true });
        else if (shopId > 0) navigate(`/eat/merchant/${shopId}`, { replace: true });
        else navigate('/merchant/manage', { replace: true });
      })
      .catch((err) => {
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="food-create-page">
        <p className="state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="food-create-page">
        <p className="state-error">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {isEn ? 'Back' : '返回'}
        </Button>
      </div>
    );
  }

  return (
    <div className="food-create-page">
      <header className="food-create-head">
        <h1 className="food-create-title">{isEn ? 'Add dish' : '上传菜品'}</h1>
        <p className="food-create-sub">
          {isEn
            ? 'Anyone signed in can publish a dish for this shop.'
            : '登录后任何人都可以为这家商铺补充菜品。'}
        </p>
      </header>

      {error ? <p className="food-create-error" role="alert">{error}</p> : null}

      {categories.length === 0 ? (
        <NeoCard className="food-create-category block w-full hover:shadow-[4px_4px_0_0_#122E8A]">
          <h2 className="food-create-category-title">
            {isEn ? 'Step 1 · Create a category' : '第一步 · 先建一个分类'}
          </h2>
          <p className="food-create-category-hint">
            {isEn
              ? 'Dishes must belong to a category. This shop has none yet.'
              : '菜品必须归属分类，这家商铺还没有分类。'}
          </p>
          <div className="food-create-category-row">
            <Input
              id="food-create-category-name"
              label={isEn ? 'Category name' : '分类名称'}
              placeholder={isEn ? 'e.g. Noodles, Drinks' : '如：主食、饮品'}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleCreateCategory}
              loading={categoryLoading}
              disabled={categoryLoading}
            >
              {isEn ? 'Create' : '创建'}
            </Button>
          </div>
        </NeoCard>
      ) : null}

      {categories.length > 0 ? (
        <FoodForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitLoading}
        />
      ) : null}
    </div>
  );
}

export default FoodCreate;
