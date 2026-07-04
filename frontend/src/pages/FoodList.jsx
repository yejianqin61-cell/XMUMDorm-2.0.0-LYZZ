import { useRef, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import MerchantHeader from '../components/MerchantHeader';
import CategorySidebar from '../components/CategorySidebar';
import CategorySection from '../components/CategorySection';
import SkeletonFood from '../components/SkeletonFood';
import EmptyState from '../components/ui/EmptyState';
import { getShop, getCategories, getProducts } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { getUploadUrl, productImageUrl } from '@shared/api/config';
import { QK } from '@shared/query/queryKeys';
import './FoodList.css';

const STALE_MS = 3 * 60 * 1000;

/** 商家菜品列表页：MerchantHeader + 双栏（左侧分类导航 + 右侧按分类分组的 FoodCard），数据来自 API */
function FoodList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [switchAnim, setSwitchAnim] = useState(0);
  const sectionRefs = useRef({});
  const mainScrollRef = useRef(null);
  const scrollTargetRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  const shopId = useMemo(() => {
    const n = id ? parseInt(id, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);

  const [shopQ, catsQ, prodsQ] = useQueries({
    queries: [
      {
        queryKey: QK.canteenShop(shopId),
        queryFn: () => getShop(shopId),
        enabled: shopId > 0,
        staleTime: STALE_MS,
      },
      {
        queryKey: QK.canteenShopCategories(shopId),
        queryFn: () => getCategories(shopId),
        enabled: shopId > 0,
        staleTime: STALE_MS,
      },
      {
        queryKey: QK.canteenShopProducts(shopId),
        queryFn: () => getProducts(shopId),
        enabled: shopId > 0,
        staleTime: STALE_MS,
      },
    ],
  });

  const loading = shopId > 0 && (shopQ.isPending || catsQ.isPending || prodsQ.isPending);
  const error =
    shopId > 0 && (shopQ.error || catsQ.error || prodsQ.error)
      ? getApiErrorMessage(shopQ.error || catsQ.error || prodsQ.error)
      : null;

  const { merchant, categories, groups, allFoods } = useMemo(() => {
    if (shopId === 0) {
      return { merchant: null, categories: [], groups: [], allFoods: [] };
    }
    if (shopQ.isPending || catsQ.isPending || prodsQ.isPending) {
      return { merchant: null, categories: [], groups: [], allFoods: [] };
    }
    const shop = shopQ.data;
    const catsData = catsQ.data;
    const productsData = prodsQ.data;
    if (!shop) {
      return { merchant: null, categories: [], groups: [], allFoods: [] };
    }
    const cats = Array.isArray(catsData) ? catsData : (shop?.categories ?? []);
    const products = Array.isArray(productsData) ? productsData : [];
    const merchantObj = {
      id: shop.id,
      name: shop.name,
      logo: shop.logo ? getUploadUrl(shop.logo) : undefined,
      description: shop.region_name ? `${shop.region_name}` : undefined,
      status: 'open',
      openingHours: shop.opening_hours ?? undefined,
    };
    const firstImage = (p) => {
      const imgs = p.images || [];
      const url = imgs.length ? imgs[0].url : null;
      return productImageUrl(url);
    };
    const foodList = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      price: p.price,
      image: firstImage(p),
      categoryId: p.category_id,
      comprehensiveScore: p.comprehensive_score != null ? Number(p.comprehensive_score) : null,
    }));
    const groupsNext = cats.map((c) => ({
      category: { id: c.id, name: c.name },
      foods: foodList.filter((f) => f.categoryId === c.id),
    }));
    return {
      merchant: merchantObj,
      categories: cats,
      groups: groupsNext,
      allFoods: foodList,
    };
  }, [
    shopId,
    shopQ.data,
    shopQ.isPending,
    catsQ.data,
    catsQ.isPending,
    prodsQ.data,
    prodsQ.isPending,
  ]);

  useEffect(() => {
    setActiveId(null);
  }, [shopId]);

  useEffect(() => {
    if (categories.length === 0) return;
    setActiveId((prev) => {
      if (prev != null && categories.some((c) => String(c.id) === String(prev))) return prev;
      return categories[0].id;
    });
  }, [categories]);

  const handleCategorySelect = (catId) => {
    scrollTargetRef.current = catId;
    setActiveId(catId);
    setSwitchAnim((n) => n + 1);
    const el = sectionRefs.current[catId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 滚动时根据可见区块自动高亮左侧分类（IntersectionObserver）
  useEffect(() => {
    if (groups.length === 0 || !mainScrollRef.current) return;
    const root = mainScrollRef.current;

    const getCatIdFromEl = (el) => {
      const sid = el?.id;
      if (!sid || !sid.startsWith('category-')) return null;
      return sid.replace('category-', '');
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;

        if (scrollTargetRef.current != null) {
          const targetEntry = intersecting.find(
            (e) => String(getCatIdFromEl(e.target)) === String(scrollTargetRef.current)
          );
          if (targetEntry) {
            const g = groups.find((gr) => String(gr.category.id) === String(getCatIdFromEl(targetEntry.target)));
            if (g) setActiveId(g.category.id);
            scrollTargetRef.current = null;
          }
          return;
        }

        const byTop = [...intersecting].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        const topEntry = byTop[0];
        const idStr = getCatIdFromEl(topEntry.target);
        if (idStr == null) return;
        const g = groups.find((gr) => String(gr.category.id) === String(idStr));
        if (g) setActiveId(g.category.id);
      },
      {
        root,
        rootMargin: '-20% 0px -55% 0px',
        threshold: 0,
      }
    );

    groups.forEach((g) => {
      const el = sectionRefs.current[g.category.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [groups]);

  const handleGoHot = () => {
    if (!shopId) return;
    navigate(`/eat/merchant/${shopId}/hot`);
  };

  const filteredGroups = search.trim()
    ? (() => {
        const q = search.trim().toLowerCase();
        const matchedIds = new Set(
          allFoods
            .filter((f) => {
              const name = (f.name || '').toLowerCase();
              const desc = (f.description || '').toLowerCase();
              return name.includes(q) || desc.includes(q);
            })
            .map((f) => f.id)
        );
        if (matchedIds.size === 0) return [];
        return groups
          .map((g) => ({
            category: g.category,
            foods: g.foods.filter((f) => matchedIds.has(f.id)),
          }))
          .filter((g) => g.foods.length > 0);
      })()
    : groups;

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus?.(), 0);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [searchOpen]);

  if (shopId === 0 && !loading) {
    return (
      <div className="food-list-page">
        <EmptyState title="商家不存在" description="该商家可能已下架或不存在。" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="food-list-page">
        <div className="food-list-layout">
          <div className="food-list-sidebar-skeleton" aria-hidden />
          <div className="food-list-main">
            <ul className="category-section-list" aria-hidden>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i}>
                  <SkeletonFood />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="food-list-page">
        <p className="food-list-error state-error">{error}</p>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="food-list-page">
        <EmptyState title="商家不存在" description="该商家可能已下架或不存在。" />
      </div>
    );
  }

  if (categories.length === 0 || groups.every((g) => g.foods.length === 0)) {
    return (
      <div className="food-list-page">
        <MerchantHeader merchant={merchant} />
        <div className="food-shop-hot-entry">
          <div className="food-shop-hot-controls">
            <button
              type="button"
              className="food-shop-hot-entry-btn pressable"
              onClick={handleGoHot}
            >
              本店热门 · Top dishes
            </button>
            <div className="food-shop-search-wrap">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="food-shop-search-input"
                placeholder="搜索本店菜品… Search dishes"
              />
            </div>
          </div>
        </div>
        <EmptyState
          title="暂无商品"
          description="商家还没发布商品。No dishes yet."
        />
      </div>
    );
  }

  return (
    <div className="food-list-page">
      <MerchantHeader merchant={merchant} />
      <div className="food-shop-hot-entry">
        <div className="food-shop-hot-controls">
          <button
            type="button"
            className="food-shop-hot-entry-btn pressable"
            onClick={handleGoHot}
          >
            本店热门 · Top dishes
          </button>
          <div className="food-shop-search-wrap">
            <div className="relative" ref={searchWrapRef}>
              <AnimatePresence initial={false} mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="top-search-open"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSearchOpen(false);
                    }}
                    initial={{ width: 44, opacity: 0.98 }}
                    animate={{ width: 176, opacity: 1 }}
                    exit={{ width: 44, opacity: 0.98 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    style={{ maxWidth: 'min(190px, 44vw)' }}
                    className="h-11"
                  >
                    <div className="flex h-11 items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 shadow-sm backdrop-blur-xl">
                      <Search size={18} className="text-blue-600" aria-hidden />
                      <input
                        ref={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setSearchOpen(false);
                        }}
                        placeholder="搜索…"
                        className="min-w-0 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
                        type="search"
                      />
                    </div>
                  </motion.form>
                ) : (
                  <motion.button
                    key="top-search-closed"
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/70 bg-white/70 text-blue-700 shadow-sm backdrop-blur-md"
                    style={{ borderWidth: '0.5px' }}
                    aria-label="搜索"
                  >
                    <Search size={18} aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="food-list-layout">
        <CategorySidebar
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          activeId={activeId}
          onSelect={handleCategorySelect}
        />
        <div ref={mainScrollRef} className="food-list-main">
          <div key={switchAnim} className="food-list-main-inner">
            {filteredGroups.length === 0 ? (
              <EmptyState
                title="未找到相关菜品"
                description="换个关键词试试，或清空搜索查看全部。"
              />
            ) : (
              filteredGroups.map((g) => (
                <CategorySection
                  key={g.category.id}
                  ref={(el) => { sectionRefs.current[g.category.id] = el; }}
                  category={g.category}
                  foods={g.foods}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodList;
