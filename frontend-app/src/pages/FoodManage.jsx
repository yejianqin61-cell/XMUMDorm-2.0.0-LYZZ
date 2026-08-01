import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import SkeletonFood from '../components/SkeletonFood';
import EmptyState from '../components/EmptyState';
import { Toast } from '../context/ToastContext';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { getShopMe, getShop, getProducts, getCategories, deleteProduct, createCategory, updateCategory, deleteCategory } from '@shared/api/canteen';
import { productImageUrl } from '@shared/api/config';
import { useAuth } from '../context/AuthContext';
import './FoodManage.css';

/** 商家端菜品管理：getShopMe + getProducts，支持删除，入口发布新菜品 */
function FoodManage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedShopId = Number.parseInt(searchParams.get('shop') || '', 10);
  const [shop, setShop] = useState(null);
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const shopRequest = Number.isFinite(requestedShopId) && requestedShopId > 0 ? getShop(requestedShopId) : getShopMe();
    shopRequest
      .then((data) => {
        setShop(data);
        if (!data?.id) {
          setFoods([]);
          return;
        }
        return Promise.all([getProducts(data.id), getCategories(data.id)]);
      })
      .then((result) => {
        if (result === undefined) return;
        const [list, categoryList] = result;
        setCategories(Array.isArray(categoryList) ? categoryList : []);
        const arr = Array.isArray(list) ? list : [];
        setFoods(
          arr.map((p) => {
            const imgs = p.images || [];
            const firstImg = productImageUrl(imgs[0]?.url);
            return {
              id: p.id,
              name: p.name,
              description: p.description ?? undefined,
              price: p.price,
              image: firstImg,
              categoryId: p.category_id,
              comprehensiveScore: p.comprehensive_score != null ? Number(p.comprehensive_score) : null,
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
          setError(getApiErrorMessage(err));
          setShop(null);
          setFoods([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [requestedShopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (food) => {
    if (!isAdmin) return;
    if (!window.confirm(`确定删除 "${food.name}" 吗？ Delete this dish?`)) return;
    deleteProduct(food.id)
      .then(() => {
        Toast.success('已删除');
        load();
      })
      .catch((err) => {
        Toast.error(err.message || '删除失败');
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
        load();
      })
      .catch((err) => Toast.error(getApiErrorMessage(err)))
      .finally(() => setCategorySubmitting(false));
  };

  const handleEditCategory = async (category) => {
    const name = window.prompt('分类名称 Category name', category.name);
    if (name == null || !name.trim()) return;
    try {
      await updateCategory(category.id, { name: name.trim(), sort_order: category.sort_order || 0 });
      Toast.success('已保存');
      load();
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`删除分类“${category.name}”后，菜品将变为未分类。确定继续吗？`)) return;
    try {
      await deleteCategory(category.id);
      Toast.success('分类已删除');
      load();
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  if (loading && !shop) {
    return (
      <div className="food-manage-page">
        <ul className="food-manage-list" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i}>
              <SkeletonFood />
            </li>
          ))}
        </ul>
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
        <EmptyState
          title="您尚未创建店铺"
          description="请先创建店铺。No shop yet. Create one first."
          actionLabel="去创建 Go Create"
          actionTo="/merchant/create"
        />
      </div>
    );
  }

  return (
    <div className="food-manage-page">
      <p className="food-manage-merchant">{shop.name}</p>
      {error && <p className="food-manage-error" role="alert">{error}</p>}
      <div className="food-manage-actions">
        <Link to={`/merchant/food/new?shop=${shop.id}`} className="food-manage-add">
          发布菜品 Publish Food
        </Link>
        <Link to={`/merchant/shop/edit?shop=${shop.id}`} className="food-manage-edit-shop">
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

      <ul className="food-manage-categories" aria-label="分类管理">
        {categories.map((category) => (
          <li key={category.id}>
            <span>{category.name}</span>
            <button type="button" onClick={() => handleEditCategory(category)}>编辑</button>
            <button type="button" onClick={() => handleDeleteCategory(category)}>删除</button>
          </li>
        ))}
      </ul>

      {foods.length === 0 ? (
        <EmptyState
          title="暂无菜品"
          description="点击上方「发布菜品」发布第一个商品。No dishes yet. Publish one above."
        />
      ) : (
        <ul className="food-manage-list" aria-label="菜品列表">
          {foods.map((food) => (
            <li key={food.id}>
              <FoodCard food={food} mode="merchant" onDelete={handleDelete} canDelete={isAdmin} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FoodManage;
