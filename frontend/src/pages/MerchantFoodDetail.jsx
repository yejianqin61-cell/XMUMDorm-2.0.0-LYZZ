import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FoodDetailView from '../components/FoodDetailView';
import FoodForm from '../components/FoodForm';
import EmptyState from '../components/ui/EmptyState';
import ImagePreview from '../components/ImagePreview';
import Button from '../components/ui/Button';
import { Toast } from '../context/toast';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { getProduct, getCategories, updateProduct, deleteProduct } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { productImageUrl } from '@shared/api/config';
import { invalidateCanteenContent } from '../features/canteen/invalidateCanteen';
import './MerchantFoodDetail.css';

/**
 * 菜品编辑（共建）：任意登录用户都可编辑任意未删除菜品的名称、描述、分类、价格与图片。
 * 删除入口只对管理员展示，且服务端会再次校验管理员身份。
 */
function MerchantFoodDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isLoggedIn, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const productId = useMemo(() => {
    const n = id ? parseInt(id, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);
  const from = searchParams.get('from') || '';

  const [food, setFood] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  // 未登录：按 US-003 引导登录，登录后回到本页
  useEffect(() => {
    if (isLoggedIn) return;
    navigate('/login', {
      replace: true,
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [isLoggedIn, navigate, location.pathname, location.search]);

  const requestKey = `${isLoggedIn}:${productId}`;
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setLoading(!!(isLoggedIn && productId));
    setError(null);
    if (!(isLoggedIn && productId)) { setFood(null); }
  }

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    if (!productId) {
      return undefined;
    }
    let cancelled = false;
    getProduct(productId)
      .then((data) => {
        if (cancelled) return undefined;
        const d = data;
        const imgs = d?.images ?? [];
        const firstImg = productImageUrl(imgs[0]?.url);
        setFood({
          id: d.id,
          shop_id: d.shop_id,
          name: d.name,
          description: d.description ?? undefined,
          price: d.price,
          image: firstImg,
          category_id: d.category_id,
          categoryId: d.category_id,
          comprehensiveScore: d.comprehensive_score != null ? Number(d.comprehensive_score) : null,
        });
        return d.shop_id ? getCategories(d.shop_id) : [];
      })
      .then((cats) => {
        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, productId]);

  const handleSave = (values) => {
    if (!food) return;
    setError(null);
    setSubmitLoading(true);
    const payload = {
      name: values.name,
      description: values.description,
      category_id: values.categoryId != null ? values.categoryId : food.category_id,
      price: values.price !== undefined ? values.price : food.price,
    };
    if (values.imageFile) payload.imageFile = values.imageFile;
    updateProduct(food.id, payload)
      .then((updated) => {
        invalidateCanteenContent(queryClient, { productId: food.id });
        Toast.success(isEn ? 'Saved' : '已保存');
        if (from) {
          navigate(from, { replace: true });
          return;
        }
        const imgs = updated?.images ?? [];
        const firstImgUrl = productImageUrl(imgs[0]?.url);
        setFood((prev) => ({
          ...prev,
          name: updated?.name ?? prev.name,
          description: updated?.description ?? prev.description,
          category_id: updated?.category_id ?? prev.category_id,
          categoryId: updated?.category_id ?? prev.categoryId,
          price: updated?.price !== undefined ? updated.price : prev.price,
          image: firstImgUrl,
        }));
        setIsEditing(false);
      })
      .catch((err) => {
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleDelete = async () => {
    if (!food) return;
    const confirmed = window.confirm(
      isEn
        ? `Delete "${food.name}"? This cannot be undone.`
        : `确定删除“${food.name}”吗？删除后不可恢复。`
    );
    if (!confirmed) return;
    try {
      await deleteProduct(food.id);
      invalidateCanteenContent(queryClient, { productId: food.id });
      Toast.success(isEn ? 'Dish deleted' : '菜品已删除');
      if (from) navigate(from, { replace: true });
      else if (food.shop_id) navigate(`/eat/merchant/${food.shop_id}`, { replace: true });
      else navigate(-1);
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="merchant-food-detail-page">
        <p className="state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (error && !food) {
    return (
      <div className="merchant-food-detail-page">
        <p className="state-error">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {isEn ? 'Back' : '返回'}
        </Button>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="merchant-food-detail-page">
        <EmptyState
          title={isEn ? 'Dish not found' : '菜品不存在'}
          description={isEn ? 'It may have been deleted.' : '它可能已被删除。'}
          actionLabel={isEn ? 'Back' : '返回'}
          onActionClick={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="merchant-food-detail-page">
      <header className="merchant-food-detail-head">
        <h1 className="merchant-food-detail-title">{isEn ? 'Edit dish' : '编辑菜品'}</h1>
        <p className="merchant-food-detail-sub">
          {isEn
            ? 'Anyone signed in can fix this dish. Deleting stays admin-only.'
            : '登录后任何人都可以修正这道菜品；删除仅管理员可用。'}
        </p>
      </header>

      {error ? <p className="merchant-food-detail-error" role="alert">{error}</p> : null}

      {isEditing ? (
        <FoodForm
          categories={categories}
          initialValues={{
            name: food.name,
            categoryId: food.category_id ?? food.categoryId,
            price: food.price,
            image: food.image,
            description: food.description,
          }}
          onSubmit={handleSave}
          onCancel={() => (from ? navigate(from) : setIsEditing(false))}
          loading={submitLoading}
        />
      ) : (
        <div className="merchant-food-detail-shell">
          <section className="merchant-food-detail-hero">
            <div className="merchant-food-detail-hero__copy">
              <p className="merchant-food-detail-hero__eyebrow">Dish detail</p>
              <h1 className="merchant-food-detail-hero__title">{food.name}</h1>
              <p className="merchant-food-detail-hero__subtitle">
                {food.description || (isEn ? 'No description yet.' : '暂无描述。')}
              </p>
            </div>
            <div className="merchant-food-detail-hero__stats">
              <div className="merchant-food-detail-hero__stat">
                <span className="merchant-food-detail-hero__stat-label">Price</span>
                <strong>RM {typeof food.price === 'number' ? food.price.toFixed(2) : String(food.price ?? '-')}</strong>
              </div>
              <div className="merchant-food-detail-hero__stat">
                <span className="merchant-food-detail-hero__stat-label">Score</span>
                <strong>{food.comprehensiveScore != null ? ((Number(food.comprehensiveScore) / 10) * 5).toFixed(1) : 'N/A'}</strong>
              </div>
            </div>
          </section>

          <div className="merchant-food-detail-content">
            <div className="merchant-food-detail-main">
              <FoodDetailView
                food={food}
                onImageClick={food ? () => setImagePreviewOpen(true) : undefined}
              />
              {imagePreviewOpen && food ? (
                <ImagePreview
                  urls={[food.image]}
                  initialIndex={0}
                  onClose={() => setImagePreviewOpen(false)}
                />
              ) : null}
            </div>

            <aside className="merchant-food-detail-side">
              <section className="merchant-food-detail-card">
                <h2 className="merchant-food-detail-card__title">Quick Actions</h2>
                <div className="merchant-food-detail-actions">
                  <button
                    type="button"
                    className="merchant-food-detail-btn merchant-food-detail-btn-edit"
                    onClick={() => setIsEditing(true)}
                    disabled={submitLoading}
                  >
                    {isEn ? 'Edit' : '编辑'}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="merchant-food-detail-btn merchant-food-detail-btn-delete"
                      onClick={handleDelete}
                      disabled={submitLoading}
                    >
                      {isEn ? 'Delete' : '删除'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="merchant-food-detail-btn merchant-food-detail-btn-back"
                    onClick={() => navigate(-1)}
                  >
                    {isEn ? 'Back' : '返回'}
                  </button>
                </div>
              </section>

              <section className="merchant-food-detail-card merchant-food-detail-card--soft">
                <h2 className="merchant-food-detail-card__title">Info</h2>
                <div className="merchant-food-detail-info">
                  <div className="merchant-food-detail-info__row">
                    <span>Dish ID</span>
                    <strong>{food.id}</strong>
                  </div>
                  <div className="merchant-food-detail-info__row">
                    <span>Shop ID</span>
                    <strong>{food.shop_id ?? '-'}</strong>
                  </div>
                  <div className="merchant-food-detail-info__row">
                    <span>Category</span>
                    <strong>
                      {categories.find((c) => String(c.id) === String(food.category_id))?.name
                        || (isEn ? 'Uncategorized' : '未分类')}
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantFoodDetail;
