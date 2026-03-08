import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import { getShopMe, getProducts, deleteProduct, createCategory } from '../api/canteen';
import { getUploadUrl } from '../api/config';
import './FoodManage.css';

/** 商家端菜品管理：getShopMe + getProducts，支持删除，入口发布新菜品 */
function FoodManage() {
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getShopMe()
      .then((data) => {
        setShop(data);
        if (!data?.id) {
          setFoods([]);
          return;
        }
        return getProducts(data.id);
      })
      .then((list) => {
        if (list === undefined) return;
        const arr = Array.isArray(list) ? list : [];
        setFoods(
          arr.map((p) => {
            const imgs = p.images || [];
            const firstImg = imgs.length ? getUploadUrl(imgs[0].url) : null;
            return {
              id: p.id,
              name: p.name,
              description: p.description ?? undefined,
              price: p.price,
              image: firstImg,
              categoryId: p.category_id,
            };
          })
        );
      })
      .catch((err) => {
        const isNoShop = err.status === 404 || (err.message && err.message.includes('尚未创建'));
        if (isNoShop) {
          setError(null);
          setShop(null);
          setFoods([]);
        } else {
          setError(err.message || '加载失败');
          setShop(null);
          setFoods([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (food) => {
    if (!window.confirm(`确定删除 "${food.name}" 吗？ Delete this dish?`)) return;
    deleteProduct(food.id)
      .then(() => load())
      .catch((err) => {
        setError(err.message || '删除失败');
      });
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCategorySubmitting(true);
    createCategory(shop.id, { name })
      .then(() => {
        setNewCategoryName('');
        setShowNewCategory(false);
      })
      .catch((err) => setError(err.message || '创建分类失败'))
      .finally(() => setCategorySubmitting(false));
  };

  if (loading && !shop) {
    return (
      <div className="food-manage-page">
        <p className="food-manage-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error && !shop) {
    return (
      <div className="food-manage-page">
        <p className="food-manage-error state-error">{error}</p>
        <button type="button" className="food-manage-back" onClick={() => navigate(-1)}>返回 Back</button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="food-manage-page">
        <p className="food-manage-empty state-empty">您尚未创建店铺，请先创建店铺。No shop yet. Create one first.</p>
        <button type="button" className="food-manage-back" onClick={() => navigate('/merchant/create')}>
          去创建 Go Create
        </button>
      </div>
    );
  }

  return (
    <div className="food-manage-page">
      <p className="food-manage-merchant">{shop.name}</p>
      {error && <p className="food-manage-error" role="alert">{error}</p>}
      <div className="food-manage-actions">
        <Link to="/merchant/food/new" className="food-manage-add">
          发布菜品 Publish Food
        </Link>
        <Link to="/merchant/shop/edit" className="food-manage-edit-shop">
          店铺编辑 Edit Shop
        </Link>
        <button
          type="button"
          className="food-manage-add-category"
          onClick={() => setShowNewCategory((v) => !v)}
        >
          新建分类 New Category
        </button>
      </div>
      {showNewCategory && (
        <form className="food-manage-category-form" onSubmit={handleCreateCategory}>
          <input
            type="text"
            className="food-manage-category-input"
            placeholder="分类名称，如：主食、饮料 Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={categorySubmitting}
            autoFocus
          />
          <button type="submit" className="food-manage-category-btn" disabled={!newCategoryName.trim() || categorySubmitting}>
            {categorySubmitting ? '创建中…' : '创建 Create'}
          </button>
          <button type="button" className="food-manage-category-cancel" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>
            取消 Cancel
          </button>
        </form>
      )}

      {foods.length === 0 ? (
        <p className="food-manage-empty state-empty">
          暂无菜品，点击上方发布 No dishes yet. Publish one above.
        </p>
      ) : (
        <ul className="food-manage-list" aria-label="菜品列表">
          {foods.map((food) => (
            <li key={food.id}>
              <FoodCard food={food} mode="merchant" onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FoodManage;
