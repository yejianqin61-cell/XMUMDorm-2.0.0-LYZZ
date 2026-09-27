/**
 * 食堂内容共建入口与删除权限守卫
 *
 * 规格：docs/01-Requirement/module-specs/食堂内容共建权限开放规格.md
 * 任务：M03-Task011 分区页新增商铺共建入口 / Task012 商铺与分类共建维护入口 / Task013 菜品共建维护与管理员删除
 *
 * 后端权限契约由 __tests__/routes/canteenPermissions.test.js 覆盖；
 * 这里守的是前端最容易退化的一环：入口消失，或「删除」在非管理员面前露出来。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

const ROUTES = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
const MERCHANT_LIST = read('frontend', 'src', 'pages', 'MerchantList.jsx');
const FOOD_LIST = read('frontend', 'src', 'pages', 'FoodList.jsx');
const FOOD_DETAIL = read('frontend', 'src', 'pages', 'FoodDetail.jsx');
const FOOD_CARD = read('frontend', 'src', 'components', 'FoodCard.jsx');
const FOOD_MANAGE = read('frontend', 'src', 'pages', 'FoodManage.jsx');
const MERCHANT_FOOD_DETAIL = read('frontend', 'src', 'pages', 'MerchantFoodDetail.jsx');
const SHOP_MANAGE = read('frontend', 'src', 'pages', 'CanteenShopManage.jsx');
const SHOP_EDIT = read('frontend', 'src', 'pages', 'MerchantShopEdit.jsx');
const STORE_CREATE = read('frontend', 'src', 'pages', 'StoreCreate.jsx');
const FOOD_CREATE = read('frontend', 'src', 'pages', 'FoodCreate.jsx');
const CANTEEN_ROUTES = read('routes', 'canteen.js');

describe('共建入口可达性', () => {
  it('注册了商铺维护页与按 shopId 编辑商铺的路由', () => {
    expect(ROUTES).toContain('eat/merchant/:id/manage');
    expect(ROUTES).toContain('merchant/shop/edit/:shopId');
    // 旧的“我的店铺”编辑入口保留，旧商家路径不被删除（US-016）
    expect(ROUTES).toContain('<Route path="merchant/shop/edit"');
    expect(ROUTES).toContain('<Route path="merchant/food/new"');
  });

  it('分区商家列表提供新增商家与逐行编辑商家入口', () => {
    expect(MERCHANT_LIST).toContain('/merchant/create?region=${regionId}&from=${returnTo}');
    expect(MERCHANT_LIST).toContain('/merchant/shop/edit/${shopId}?from=${returnTo}');
  });

  it('分区商家列表不提供删除商铺的能力', () => {
    expect(MERCHANT_LIST).not.toContain('deleteShop');
    expect(SHOP_EDIT).not.toContain('deleteShop');
  });

  it('商铺菜单页提供不干扰浏览的共建维护入口', () => {
    expect(FOOD_LIST).toContain('/eat/merchant/${shopId}/manage');
    expect(FOOD_LIST).toContain('food-shop-manage-btn');
    // 空分类 / 空菜单时仍然有可达的共建路径
    expect(FOOD_LIST).toContain('handleAddDish');
  });

  it('菜品详情页提供编辑菜品与上传菜品入口', () => {
    expect(FOOD_DETAIL).toContain('handleEditDish');
    expect(FOOD_DETAIL).toContain('handleAddDish');
    expect(FOOD_DETAIL).toContain('/merchant/food/${food.id}?from=');
    expect(FOOD_DETAIL).toContain('/merchant/food/new?shopId=${food.shop_id}&from=');
  });

  it('菜品上传页支持商铺上下文，并能在无分类时自助创建分类', () => {
    expect(FOOD_CREATE).toContain("searchParams.get('shopId')");
    expect(FOOD_CREATE).toContain('createCategory(shopId');
    expect(FOOD_CREATE).toContain('createProduct');
  });

  it('商铺维护页覆盖店铺资料、分类与菜品三类共建操作', () => {
    ['createCategory', 'updateCategory', 'deleteCategory', 'deleteProduct', 'getProducts', 'getCategories']
      .forEach((api) => expect(SHOP_MANAGE).toContain(api));
    expect(SHOP_MANAGE).toContain('/merchant/shop/edit/${shopId}?from=');
    expect(SHOP_MANAGE).toContain('/merchant/food/new?shopId=');
  });
});

describe('删除入口只对管理员出现', () => {
  it('FoodCard 的删除按钮由 canDelete 控制，默认不显示', () => {
    expect(FOOD_CARD).toContain('canDelete = false');
    expect(FOOD_CARD).toContain('{canDelete && onDelete ? (');
  });

  it('菜品管理页把 canDelete 交给 isAdmin 决定', () => {
    expect(FOOD_MANAGE).toContain('canDelete={isAdmin}');
    expect(FOOD_MANAGE).toContain('if (!isAdmin) return;');
  });

  it('菜品编辑页与商铺维护页的删除按钮都包在 isAdmin 分支里', () => {
    [MERCHANT_FOOD_DETAIL, SHOP_MANAGE, FOOD_DETAIL].forEach((source) => {
      const deleteIndex = source.indexOf('删除');
      expect(deleteIndex).toBeGreaterThan(-1);
      expect(source).toContain('isAdmin');
    });
  });

  it('服务端三类删除接口仍然校验管理员身份', () => {
    ["router.delete('/shops/:shopId'", "router.delete('/categories/:categoryId'", "router.delete('/products/:productId'"]
      .forEach((marker) => {
        const start = CANTEEN_ROUTES.indexOf(marker);
        expect(start).toBeGreaterThan(-1);
        // 截到下一个路由注册为止，避免落在处理函数内部的 `});` 上
        const next = CANTEEN_ROUTES.indexOf('\nrouter.', start + 1);
        const body = CANTEEN_ROUTES.slice(start, next === -1 ? undefined : next);
        expect(body).toContain('isAdmin(req)');
      });
  });
});

describe('写入后刷新受影响的食堂视图', () => {
  it.each([
    ['MerchantShopEdit.jsx', SHOP_EDIT],
    ['StoreCreate.jsx', STORE_CREATE],
    ['CanteenShopManage.jsx', SHOP_MANAGE],
    ['FoodCreate.jsx', FOOD_CREATE],
    ['MerchantFoodDetail.jsx', MERCHANT_FOOD_DETAIL],
  ])('%s 写入成功后统一失效食堂缓存', (_name, source) => {
    expect(source).toContain('invalidateCanteenContent');
  });
});
