# 前端 API 接入进度

## 一、MySQL 错误修复说明

**报错**：`Incorrect arguments to mysqld_stmt_execute`

**原因**：部分 MySQL 驱动/版本对 prepared statement 中 `LIMIT ? OFFSET ?` 占位符支持有问题。

**已修改**：`routes/posts.js` 中帖子列表接口改为用**已校验的整数**直接拼进 SQL（`LIMIT ${limitCount} OFFSET ${offset}`），不再用占位符。`page`、`pageSize`、`offset` 均经 `parseInt`/`Math.max` 处理，安全可用。

重启后端后，帖子列表应可正常返回。

---

## 二、已接后端 API 的模块

| 模块 | 页面/入口 | 使用的 API | 说明 |
|------|-----------|------------|------|
| **认证** | Login / Register | `api/auth`（login / register） | 登录、注册走真实接口 |
| **用户基础** | AuthContext | `getMe()` | 有 token 时拉当前用户 |
| **用户基础** | MyZone | 来自 AuthContext 的 `user`（即 getMe） | 头像、昵称、邮箱、本周点评数 |
| **用户基础** | ProfileEdit | `updateAvatar()`、`getMe`（通过 refreshUser） | 头像上传、个人信息展示 |
| **用户基础** | MyPosts | `getProfile(user.id)` | 我的帖子列表（用个人页的 posts） |
| **帖子** | TreeHole | `getPostList({ page, pageSize, token })` | 首页帖子列表、加载更多 |
| **帖子** | PostDetail | `getPostDetail`、`getPostComments`、`toggleLike`、`createComment` | 详情、评论、点赞、发评/回复 |
| **帖子** | PostNew | `createPost({ content, images })` | 发帖（含图片） |
| **食堂浏览** | CanteenArea | `getRegions()` | 分区列表 |
| **食堂浏览** | MerchantList | `getRegions()` + `getShopsByRegion(regionId)` | 某分区下的商家列表 |
| **食堂浏览** | FoodList | `getShop`、`getCategories`、`getProducts` | 某商家下的分类与商品列表 |
| **食堂浏览** | FoodDetail | `getProduct`、`getProductComments`、`postProductComment` | 商品详情、点评列表、回复点评 |
| **食堂点评** | FoodReviewPublish | `getProduct`、`postProductComment` | 发布商品点评（含评级、图片） |
| **我的点评** | MyReviews | `getMyProductReviews()` | 我的点评列表（api/canteen） |

以上均为**已接真实后端 API**，不再依赖 mock 数据（仅 FoodDetail 的 `RATING_LABELS` 仍从 mock 常量里取文案，属静态配置）。

---

## 三、仍使用 Mock 的模块

| 模块 | 页面/入口 | Mock 来源 | 建议接的 API |
|------|-----------|-----------|----------------|
| **商家端-创建店铺** | StoreCreate | 无请求，仅 `console.log` 后跳转 | `api/canteen`：`getRegions()` 做区域下拉、`createShop(body)` 提交 |
| **商家端-店铺/菜品管理** | FoodManage | `mockCanteen`：`getMerchantById`、`getFoodsByMerchantId`、`MOCK_CURRENT_MERCHANT_ID` | `getShopMe()` 取当前商家，再用 `getProducts(shopId)` 等 |
| **商家端-新建菜品** | FoodCreate | `mockCanteen`：`getCategoriesByMerchantId`、`MOCK_CURRENT_MERCHANT_ID` | `getShopMe()` → `getCategories(shopId)`、`createProduct(body)` |
| **商家端-商品详情** | MerchantFoodDetail | `mockCanteen`：`getFoodById`、`getCategoriesByMerchantId` | `getProduct(productId)`、`getCategories(shopId)`，编辑用 `updateProduct`/`deleteProduct` |
| **区域选择** | StoreForm（在 StoreCreate 里） | `mockCanteen`：`AREAS` | 用 `getRegions()` 替代 AREAS |
| **信箱** | Mailbox | `mockNotifications`：`MOCK_NOTIFICATIONS`、`getPostPreview` | `api/notifications`：`getNotifications()`、`markNotificationRead` 等 |
| **排行榜** | Rankings | `mockRankings`：`MOCK_RANKINGS` 各榜单 | `api/rankings`：五个榜单接口（如 hot-products、busy-shops 等） |

---

## 四、仅用 Mock 做静态配置（可保留）

- **FoodDetail / 点评相关**：`RATING_LABELS`（1–5 对应文案）来自 `data/mockCanteen.js`，仅作展示映射，可保留或迁到常量文件。

---

## 五、进度小结

- **已接 API**：认证、用户信息与我的帖子、帖子列表/详情/发帖/评论/点赞、食堂分区与商家与商品浏览、商品点评与我的点评。
- **未接 API**：商家端（StoreCreate、FoodManage、FoodCreate、MerchantFoodDetail）、信箱（Mailbox）、排行榜（Rankings）。

按当前 Step 规划，对应关系约为：

- Step 6：商家端（StoreCreate、FoodManage、FoodCreate、MerchantFoodDetail）接 canteen 的 shops/products/categories 与 getShopMe。
- Step 7：信箱 Mailbox 接 notifications API。
- Step 8：排行榜 Rankings 接 rankings API。
