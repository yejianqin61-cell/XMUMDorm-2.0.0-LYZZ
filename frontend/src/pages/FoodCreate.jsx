import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodForm from '../components/FoodForm';
import { getShopMe, createProduct } from '../api/canteen';
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
        setError(err.message || '加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSubmit = (values) => {
    const categoryId = values.categoryId != null ? values.categoryId : categories[0]?.id;
    if (!categoryId) {
      setError('请先创建分类或选择分类');
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
        navigate('/merchant/manage', { replace: true });
      })
      .catch((err) => {
        setError(err.message || '发布失败');
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
      />
      {submitLoading && <p className="food-create-loading">提交中…</p>}
    </div>
  );
}

export default FoodCreate;
