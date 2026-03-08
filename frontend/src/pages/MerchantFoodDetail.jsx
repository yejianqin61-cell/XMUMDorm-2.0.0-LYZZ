import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FoodDetailView from '../components/FoodDetailView';
import FoodForm from '../components/FoodForm';
import EmptyState from '../components/EmptyState';
import { Toast } from '../context/ToastContext';
import { getProduct, getCategories, updateProduct, deleteProduct } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { getUploadUrl } from '../api/config';
import './MerchantFoodDetail.css';

/** 商家端菜品详情：getProduct + getCategories，编辑 updateProduct，删除 deleteProduct */
function MerchantFoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [food, setFood] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) {
      setFood(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(productId)
      .then((data) => {
        if (cancelled) return;
        const d = data;
        const imgs = d?.images ?? [];
        const firstImg = imgs.length ? getUploadUrl(imgs[0].url) : null;
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
  }, [id]);

  const handleSave = (values) => {
    if (!food) return;
    setError(null);
    setSubmitLoading(true);
    updateProduct(food.id, {
      name: values.name,
      description: values.description,
      category_id: values.categoryId != null ? values.categoryId : food.category_id,
      price: values.price !== undefined ? values.price : food.price,
    })
      .then((updated) => {
        setFood((prev) => ({
          ...prev,
          name: updated?.name ?? prev.name,
          description: updated?.description ?? prev.description,
          category_id: updated?.category_id ?? prev.category_id,
          categoryId: updated?.category_id ?? prev.categoryId,
          price: updated?.price !== undefined ? updated.price : prev.price,
        }));
        Toast.success('已保存');
        setIsEditing(false);
      })
      .catch((err) => {
        Toast.error(err.message || '保存失败');
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleDelete = () => {
    if (!food || !window.confirm(`确定删除 "${food.name}" 吗？ Delete this dish?`)) return;
    deleteProduct(food.id)
      .then(() => {
        Toast.success('已删除');
        navigate('/merchant/manage', { replace: true });
      })
      .catch((err) => Toast.error(getApiErrorMessage(err)));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="merchant-food-detail-page">
        <p className="merchant-food-detail-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error && !food) {
    return (
      <div className="merchant-food-detail-page">
        <p className="merchant-food-detail-error state-error">{error}</p>
        <button type="button" className="merchant-food-detail-back" onClick={() => navigate(-1)}>
          返回 Back
        </button>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="merchant-food-detail-page">
        <EmptyState
          title="菜品不存在"
          description="Food not found"
          actionLabel="返回"
          onActionClick={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="merchant-food-detail-page">
      {error && <p className="merchant-food-detail-error" role="alert">{error}</p>}
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
          onCancel={handleCancelEdit}
          loading={submitLoading}
        />
      ) : (
        <>
          <FoodDetailView
            food={food}
            onImageClick={food?.image ? () => setImagePreviewOpen(true) : undefined}
          />
          {imagePreviewOpen && food?.image && (
            <ImagePreview
              urls={[food.image]}
              initialIndex={0}
              onClose={() => setImagePreviewOpen(false)}
            />
          )}
          <div className="merchant-food-detail-actions">
            <button
              type="button"
              className="merchant-food-detail-btn merchant-food-detail-btn-edit"
              onClick={() => setIsEditing(true)}
              disabled={submitLoading}
            >
              编辑 Edit
            </button>
            <button
              type="button"
              className="merchant-food-detail-btn merchant-food-detail-btn-delete"
              onClick={handleDelete}
              disabled={submitLoading}
            >
              删除 Delete
            </button>
            <button
              type="button"
              className="merchant-food-detail-btn merchant-food-detail-btn-back"
              onClick={() => navigate(-1)}
            >
              返回管理 Back to Manage
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MerchantFoodDetail;
