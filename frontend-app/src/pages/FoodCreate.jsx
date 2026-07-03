import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodForm from '../components/FoodForm';
import { Toast } from '../context/ToastContext';
import { getShopMe, createProduct } from '@shared/api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import './FoodCreate.css';

/** 菜品发布页：商家端，getShopMe 取分类，createProduct 提交，成功后跳转菜品管理 */
function FoodCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    getShopMe()
      .then((data) => {
        const cats = data?.categories ?? [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSubmit = (values) => {
    const categoryId = values.categoryId != null ? values.categoryId : categories[0]?.id;
    if (!categoryId) {
      Toast.error('请先创建分类或选择分类');
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
        Toast.success('商品已创建');
        navigate('/merchant/manage', { replace: true });
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
        <p className="food-create-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="food-create-page">
        <p className="food-create-error state-error">{error}</p>
        <button type="button" className="food-create-back" onClick={() => navigate(-1)}>返回 Back</button>
      </div>
    );
  }

  return (
    <div className="food-create-page">
      {error && <p className="food-create-error" role="alert">{error}</p>}
      <FoodForm
        categories={categories}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={submitLoading}
      />
    </div>
  );
}

export default FoodCreate;
