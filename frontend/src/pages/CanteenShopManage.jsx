import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import NeoCard from '../components/retroui/Card';
import NeoBadge from '../components/retroui/Badge';
import NeoDialog from '../components/retroui/Dialog';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { Toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  createCategory,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProducts,
  getShop,
  updateCategory,
} from '@shared/api/canteen';
import { productImageUrl } from '@shared/api/config';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import { invalidateCanteenContent } from '../features/canteen/invalidateCanteen';
import './CanteenShopManage.css';

const STALE_MS = 60 * 1000;

/**
 * 商铺共建维护页（/eat/merchant/:id/manage）
 *
 * 任意登录用户都可以：编辑商家资料、新增/重命名/排序分类、添加与编辑菜品。
 * 删除只提供管理员入口，并且服务端会再次校验管理员身份。
 */
export default function CanteenShopManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isLoggedIn, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const shopId = useMemo(() => {
    const n = id ? parseInt(id, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);

  const [catDialog, setCatDialog] = useState({ open: false, mode: 'create', target: null });
  const [catName, setCatName] = useState('');
  const [busy, setBusy] = useState(false);

  // 未登录：按 US-003 引导登录，登录后回到本页
  useEffect(() => {
    if (isLoggedIn) return;
    navigate('/login', {
      replace: true,
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [isLoggedIn, navigate, location.pathname, location.search]);

  const shopQuery = useQuery({
    queryKey: QK.canteenShop(shopId),
    queryFn: () => getShop(shopId),
    enabled: isLoggedIn && shopId > 0,
    staleTime: STALE_MS,
  });
  const catsQuery = useQuery({
    queryKey: QK.canteenShopCategories(shopId),
    queryFn: () => getCategories(shopId),
    enabled: isLoggedIn && shopId > 0,
    staleTime: STALE_MS,
  });
  const prodsQuery = useQuery({
    queryKey: QK.canteenShopProducts(shopId),
    queryFn: () => getProducts(shopId),
    enabled: isLoggedIn && shopId > 0,
    staleTime: STALE_MS,
  });

  const shop = shopQuery.data ?? null;
  const categories = useMemo(() => {
    const list = Array.isArray(catsQuery.data) ? catsQuery.data : (shop?.categories ?? []);
    return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  }, [catsQuery.data, shop]);
  const products = useMemo(
    () => (Array.isArray(prodsQuery.data) ? prodsQuery.data : []),
    [prodsQuery.data]
  );

  const loading = isLoggedIn && shopId > 0 && (shopQuery.isPending || catsQuery.isPending || prodsQuery.isPending);
  const error = shopQuery.error || catsQuery.error || prodsQuery.error;

  const selfPath = `/eat/merchant/${shopId}/manage`;
  const newDishPath = `/merchant/food/new?shopId=${shopId}&from=${encodeURIComponent(selfPath)}`;
  const editDishPath = (productId) =>
    `/merchant/food/${productId}?from=${encodeURIComponent(selfPath)}`;

  const openCreateCategory = () => {
    setCatName('');
    setCatDialog({ open: true, mode: 'create', target: null });
  };

  const openRenameCategory = (category) => {
    setCatName(category.name ?? '');
    setCatDialog({ open: true, mode: 'rename', target: category });
  };

  const closeCategoryDialog = () => {
    if (busy) return;
    setCatDialog({ open: false, mode: 'create', target: null });
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    const name = catName.trim();
    if (!name) {
      Toast.error(isEn ? 'Please enter a category name' : '请输入分类名称');
      return;
    }
    setBusy(true);
    try {
      if (catDialog.mode === 'rename' && catDialog.target) {
        await updateCategory(catDialog.target.id, {
          name,
          sort_order: catDialog.target.sort_order ?? 0,
        });
        Toast.success(isEn ? 'Category updated' : '分类已更新');
      } else {
        await createCategory(shopId, { name, sort_order: categories.length });
        Toast.success(isEn ? 'Category created' : '分类已创建');
      }
      invalidateCanteenContent(queryClient);
      setCatDialog({ open: false, mode: 'create', target: null });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const moveCategory = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const current = categories[index];
    const neighbour = categories[target];
    setBusy(true);
    try {
      // 用下标作为新的 sort_order：顺手修正历史重复的排序值
      await updateCategory(current.id, { name: current.name, sort_order: target });
      await updateCategory(neighbour.id, { name: neighbour.name, sort_order: index });
      invalidateCanteenContent(queryClient);
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    const confirmed = window.confirm(
      isEn
        ? `Delete category "${category.name}"? Its dishes are kept and become uncategorized.`
        : `确定删除分类“${category.name}”吗？该分类下的菜品会保留并变为未分类。`
    );
    if (!confirmed) return;
    try {
      await deleteCategory(category.id);
      Toast.success(isEn ? 'Category deleted' : '分类已删除');
      invalidateCanteenContent(queryClient);
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      isEn
        ? `Delete dish "${product.name}"? This cannot be undone.`
        : `确定删除菜品“${product.name}”吗？删除后不可恢复。`
    );
    if (!confirmed) return;
    try {
      await deleteProduct(product.id);
      Toast.success(isEn ? 'Dish deleted' : '菜品已删除');
      invalidateCanteenContent(queryClient, { productId: product.id });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  if (shopId === 0) {
    return (
      <div className="shop-manage-page">
        <EmptyState
          title={isEn ? 'Shop not found' : '商家不存在'}
          description={isEn ? 'Check the link and try again.' : '链接可能有误，请重新进入。'}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shop-manage-page">
        <p className="state-loading">{isEn ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="shop-manage-page">
        <p className="state-error">
          {error ? getApiErrorMessage(error) : (isEn ? 'Shop not found' : '商家不存在')}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {isEn ? 'Back' : '返回'}
        </Button>
      </div>
    );
  }

  return (
    <div className="shop-manage-page">
      <header className="shop-manage-head">
        <Link to={`/eat/merchant/${shopId}`} className="shop-manage-back">
          <ArrowLeft size={16} aria-hidden />
          {isEn ? 'Back to menu' : '返回菜单'}
        </Link>
        <h1 className="shop-manage-title">{shop.name}</h1>
        <p className="shop-manage-sub">
          {isEn
            ? 'Co-build: anyone signed in can fix this shop and its dishes. Deleting stays admin-only.'
            : '共建维护：登录后任何人都可以补充与修正这家商铺及其菜品；删除仅管理员可用。'}
        </p>
      </header>

      {/* 1. 商家资料 */}
      <NeoCard className="shop-manage-block block w-full hover:shadow-[4px_4px_0_0_#122E8A]">
        <div className="shop-manage-block-head">
          <h2 className="shop-manage-block-title">{isEn ? 'Shop profile' : '商家资料'}</h2>
          <Button
            as={Link}
            to={`/merchant/shop/edit/${shopId}?from=${encodeURIComponent(selfPath)}`}
            variant="secondary"
            size="sm"
            iconLeft={<Pencil size={15} aria-hidden />}
          >
            {isEn ? 'Edit' : '编辑'}
          </Button>
        </div>
        <dl className="shop-manage-meta">
          <div>
            <dt>{isEn ? 'Zone' : '分区'}</dt>
            <dd>{shop.region_name || shop.region_code || '-'}</dd>
          </div>
          <div>
            <dt>{isEn ? 'Opening hours' : '营业时间'}</dt>
            <dd>{shop.opening_hours || (isEn ? 'Not set' : '未填写')}</dd>
          </div>
        </dl>
      </NeoCard>

      {/* 2. 分类 */}
      <NeoCard className="shop-manage-block block w-full hover:shadow-[4px_4px_0_0_#122E8A]">
        <div className="shop-manage-block-head">
          <h2 className="shop-manage-block-title">
            {isEn ? 'Categories' : '分类'} <NeoBadge variant="outline">{categories.length}</NeoBadge>
          </h2>
          <Button size="sm" iconLeft={<Plus size={15} aria-hidden />} onClick={openCreateCategory}>
            {isEn ? 'Add' : '新增分类'}
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="shop-manage-hint">
            {isEn
              ? 'No category yet. Add one before publishing dishes.'
              : '还没有分类。添加菜品前需要先建一个分类。'}
          </p>
        ) : (
          <ul className="shop-manage-list">
            {categories.map((category, index) => (
              <li key={category.id} className="shop-manage-row">
                <span className="shop-manage-row-main">{category.name}</span>
                <div className="shop-manage-row-actions">
                  <button
                    type="button"
                    className="shop-manage-icon-btn"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0 || busy}
                    aria-label={isEn ? 'Move up' : '上移'}
                  >
                    <ArrowUp size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="shop-manage-icon-btn"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1 || busy}
                    aria-label={isEn ? 'Move down' : '下移'}
                  >
                    <ArrowDown size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="shop-manage-icon-btn"
                    onClick={() => openRenameCategory(category)}
                    aria-label={isEn ? 'Rename' : '重命名'}
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="shop-manage-icon-btn shop-manage-icon-btn--danger"
                      onClick={() => handleDeleteCategory(category)}
                      aria-label={isEn ? 'Delete category' : '删除分类'}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </NeoCard>

      {/* 3. 菜品 */}
      <NeoCard className="shop-manage-block block w-full hover:shadow-[4px_4px_0_0_#122E8A]">
        <div className="shop-manage-block-head">
          <h2 className="shop-manage-block-title">
            {isEn ? 'Dishes' : '菜品'} <NeoBadge variant="outline">{products.length}</NeoBadge>
          </h2>
          <Button
            size="sm"
            iconLeft={<Plus size={15} aria-hidden />}
            onClick={() => navigate(newDishPath)}
          >
            {isEn ? 'Add dish' : '添加菜品'}
          </Button>
        </div>

        {products.length === 0 ? (
          <p className="shop-manage-hint">
            {isEn
              ? 'No dishes yet. Add the first one for this shop.'
              : '这家商铺还没有菜品，可以直接补充第一道。'}
          </p>
        ) : (
          <ul className="shop-manage-list">
            {products.map((product) => (
              <li key={product.id} className="shop-manage-dish">
                <img
                  src={productImageUrl(product.images?.[0]?.url)}
                  alt=""
                  className="shop-manage-dish-img"
                  loading="lazy"
                />
                <div className="shop-manage-dish-info">
                  <span className="shop-manage-dish-name">{product.name}</span>
                  <span className="shop-manage-dish-meta">
                    <span>{product.category_name || (isEn ? 'Uncategorized' : '未分类')}</span>
                    <span>
                      RM {typeof product.price === 'number' ? product.price.toFixed(2) : (product.price ?? '-')}
                    </span>
                  </span>
                </div>
                <div className="shop-manage-row-actions">
                  <Button
                    as={Link}
                    to={editDishPath(product.id)}
                    variant="secondary"
                    size="sm"
                    iconLeft={<Pencil size={15} aria-hidden />}
                  >
                    {isEn ? 'Edit' : '编辑菜品'}
                  </Button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="shop-manage-icon-btn shop-manage-icon-btn--danger"
                      onClick={() => handleDeleteProduct(product)}
                      aria-label={isEn ? 'Delete dish' : '删除菜品'}
                      title={isEn ? 'Delete dish' : '删除菜品'}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </NeoCard>

      <NeoDialog
        open={catDialog.open}
        onOpenChange={(open) => { if (!open) closeCategoryDialog(); }}
        title={
          catDialog.mode === 'rename'
            ? (isEn ? 'Rename category' : '重命名分类')
            : (isEn ? 'New category' : '新增分类')
        }
        size="sm"
      >
        <form className="shop-manage-dialog-form" onSubmit={submitCategory}>
          <Input
            id="shop-manage-category-name"
            label={isEn ? 'Category name' : '分类名称'}
            required
            placeholder={isEn ? 'e.g. Noodles, Drinks' : '如：主食、饮品'}
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <div className="shop-manage-dialog-actions">
            <Button type="submit" loading={busy} disabled={busy}>
              {isEn ? 'Save' : '保存'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeCategoryDialog} disabled={busy}>
              {isEn ? 'Cancel' : '取消'}
            </Button>
          </div>
        </form>
      </NeoDialog>
    </div>
  );
}
