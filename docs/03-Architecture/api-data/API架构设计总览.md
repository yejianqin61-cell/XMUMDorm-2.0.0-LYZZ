# 全站 API 设计与接入评估

> 进入 API 接入环节前的整体评估：后端已有接口、前端封装与页面使用情况、尚未开发/未接入项。

---

## 一、后端 API 总览（均已实现）

### 1. 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /login | 登录（email 或 student_id + password），返回 token、data（含 id, username, email, role） |
| POST | /register | 注册（role=student/merchant；学生 email，商家 invite_code） |
| POST | /send-verification-code | 发送邮箱验证码（预留） |

### 2. 帖子 `/api/posts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 列表分页（page, pageSize），可选 Authorization |
| GET | /:id | 帖子详情 |
| POST | / | 发布（content, type, 可选 images），需登录 |
| DELETE | /:id | 逻辑删除，本人或 admin |
| PATCH | /:id/hide | 管理员隐藏 |
| POST | /:id/like | 点赞/取消点赞，需登录 |
| GET | /:id/comments | 评论列表（树形） |
| POST | /:id/comments | 发表评论（content, 可选 parent_id），需登录 |
| DELETE | /:id/comments/:commentId | 删除评论 |

### 3. 食堂 `/api/canteen`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /regions | 区域列表 |
| POST | /shops | 创建店铺，商家 |
| GET | /regions/:regionId/shops | 某区域店铺列表 |
| GET | /shops/me | 当前用户店铺（含 categories、product_count） |
| GET | /shops/:shopId | 店铺详情（含 categories） |
| PATCH | /shops/:shopId | 修改店铺 |
| DELETE | /shops/:shopId | 逻辑删除店铺 |
| POST | /shops/:shopId/categories | 创建分类 |
| GET | /shops/:shopId/categories | 店铺分类列表 |
| PATCH | /categories/:categoryId | 修改分类 |
| DELETE | /categories/:categoryId | 删除分类 |
| POST | /products | 创建商品（category_id, name, description, 可选图片） |
| GET | /shops/:shopId/products | 店铺商品列表（可选 category_id） |
| GET | /products/:productId | 商品详情（含评论分页） |
| PATCH | /products/:productId | 修改商品 |
| DELETE | /products/:productId | 逻辑删除商品 |
| POST | /products/:productId/comments | 发表点评（rating, content, 可选 parent_id, 图片） |
| GET | /products/:productId/comments | 点评列表分页（扁平含 parent_id） |
| DELETE | /products/:productId/comments/:commentId | 删除点评 |
| GET | /my-reviews | 当前用户一级点评列表（分页），需登录 |
| GET | /rankings/hot-products | 最夯单品 Top 5 |
| GET | /rankings/busy-shops | 门庭若市 Top 5 |
| GET | /rankings/top-shops | 最夯商家 Top 5 |
| GET | /rankings/new-hit-products | 爆款新品 Top 3 |
| GET | /rankings/active-users | 点评达人 Top 5 |

### 4. 通知 `/api/notifications`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 通知列表（分页，type / is_read 筛选），需登录 |
| GET | /unread-announcements | 未读公告 |
| PATCH | /:id/read | 单条已读 |
| PATCH | /read-batch | 批量已读（body: { ids }） |

### 5. 用户 `/api/users`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /me | 当前用户资料，需登录 |
| GET | /:id/profile | 某用户个人空间（资料+帖子+统计） |
| PATCH | /me/avatar | 上传头像，需登录 |

---

## 二、前端 API 层与页面使用情况

| 模块 | 前端已封装（api/*.js） | 页面是否接 API |
|------|------------------------|----------------|
| 认证 | AuthContext 内联 login；Register 内联 register | ✅ Login、Register 已用 |
| 帖子 | api/posts.js：getPostList, getPostDetail, createPost, deletePost, toggleLike, getPostComments, createComment, deleteComment | ❌ TreeHole、PostDetail、PostNew、MyPosts 仍用 Mock |
| 食堂 | api/canteen.js：getProductComments, postProductComment, getMyProductReviews | ✅ MyReviews 已用 getMyProductReviews；❌ CanteenArea、MerchantList、FoodList、FoodDetail、FoodReviewPublish、商家端 均用 Mock；缺 regions/shops/categories/products/rankings 封装 |
| 通知 | 无 api/notifications.js | ❌ Mailbox 用 Mock |
| 用户 | 无 api/users.js | ❌ MyZone、ProfileEdit 未接 /me、/me/avatar、profile |
| 排行榜 | 无 rankings 封装 | ❌ Rankings 用 Mock，后端 5 个 rankings 接口未接 |

---

## 三、尚未开发 / 未接入清单

### 3.1 前端未封装的 API（需在 api 层新增）

| 接口 | 用途 | 建议封装名 |
|------|------|------------|
| GET /api/canteen/regions | 食堂分区列表 | getRegions |
| GET /api/canteen/regions/:regionId/shops | 某区商家列表 | getShopsByRegion |
| GET /api/canteen/shops/me | 我的店铺 | getShopMe |
| GET /api/canteen/shops/:shopId | 店铺详情 | getShop |
| POST /api/canteen/shops | 创建店铺 | createShop |
| PATCH /api/canteen/shops/:shopId | 更新店铺 | updateShop |
| GET /api/canteen/shops/:shopId/categories | 店铺分类 | getCategories |
| POST /api/canteen/shops/:shopId/categories | 创建分类 | createCategory |
| GET /api/canteen/shops/:shopId/products | 店铺商品 | getProducts |
| GET /api/canteen/products/:productId | 商品详情 | getProduct |
| POST /api/canteen/products | 创建商品 | createProduct |
| PATCH /api/canteen/products/:productId | 更新商品 | updateProduct |
| DELETE /api/canteen/products/:productId | 删除商品 | deleteProduct |
| GET /api/canteen/rankings/hot-products 等 5 个 | 排行榜 | getRankingsHotProducts, getRankingsBusyShops, … 或统一 getRankings(type) |
| GET /api/notifications | 通知列表 | getNotifications |
| PATCH /api/notifications/:id/read | 单条已读 | markNotificationRead |
| PATCH /api/notifications/read-batch | 批量已读 | markNotificationsReadBatch |
| GET /api/users/me | 当前用户 | getMe |
| GET /api/users/:id/profile | 用户个人空间 | getProfile |
| PATCH /api/users/me/avatar | 上传头像 | updateAvatar |

### 3.2 已封装但页面未接 API（需改页面从 Mock 切到接口）

| 页面/功能 | 已有封装 | 说明 |
|-----------|----------|------|
| TreeHole | getPostList | 列表改为调 API，加分页/loading/错误 |
| PostDetail | getPostDetail, getPostComments, toggleLike | 详情、评论、点赞改为 API |
| PostNew | createPost | 发布改为 API |
| MyPosts | getPostList 或 getProfile 的 posts | 我的帖子改为 API |
| PostDetail 评论/回复 | createComment, deleteComment | 发表/删除评论改为 API |
| FoodDetail 点评区 | getProductComments, postProductComment | 点评列表与发布/回复改为 API（当前 Mock） |
| FoodReviewPublish | postProductComment | 发布点评改为 API（当前 Mock） |

### 3.3 后端需约定或可选补齐项

| 项 | 说明 |
|----|------|
| 区域与分区 | 后端 regions 为 id/code/name；前端 Mock 用 area（B1/LY3 等）。接入时需 regions.code 与前端 area 对应，或前端改用 region_id。 |
| 商品价格 | 后端 products 表若无 price 字段，需加或前端用 description 等替代展示。 |
| 点评评级文案 | 后端枚举含「顶级」，前端曾用「顶尖」，需统一或做映射。 |
| 点评点赞 | 后端无商品点评点赞接口；前端一级点评有点赞。可选：后端加接口或前端去掉点赞。 |
| 用户昵称更新 | 若个人资料页需改昵称，后端需提供 PATCH /api/users/me（如 nickname）或已包含在现有接口中。 |

---

## 四、汇总表：按模块的接入状态

| 模块 | 后端 API | 前端封装 | 页面接 API | 未开发/未接入说明 |
|------|----------|----------|------------|------------------|
| 认证 | ✅ | ✅ 内联 | ✅ | 无 |
| 帖子 | ✅ | ✅ posts.js | ❌ | 帖子列表/详情/发布/评论/点赞 全未接，仍 Mock |
| 用户 | ✅ | ❌ | ❌ | 缺 getMe、getProfile、updateAvatar 封装及 MyZone/ProfileEdit 接入 |
| 通知 | ✅ | ❌ | ❌ | 缺 notifications 封装及 Mailbox 接入 |
| 食堂-区域/商家 | ✅ | ❌ | ❌ | 缺 regions、shops 封装；CanteenArea、MerchantList 用 Mock |
| 食堂-分类/商品 | ✅ | ❌ | ❌ | 缺 categories、products CRUD 封装；FoodList、FoodDetail、商家端用 Mock |
| 食堂-点评 | ✅ | ✅ | 部分 | getProductComments/postProductComment 已封装，MyReviews 已用；FoodDetail/FoodReviewPublish 未接 |
| 食堂-排行榜 | ✅ | ❌ | ❌ | 缺 5 个 rankings 封装，Rankings 页用 Mock |
| 食堂-我的点评 | ✅ | ✅ getMyProductReviews | ✅ | 已接入 |

---

## 五、结论与建议顺序

- **后端**：认证、帖子、食堂（含区域/店铺/分类/商品/点评/我的点评/排行榜）、通知、用户 接口均已存在，无缺接口。
- **前端**：已接入的只有**登录、注册、我的点评**；其余均为「未封装」或「已封装未接页面」。
- **建议接入顺序**（可并行一部分）：  
  1. **约定**：区域↔分区、商品 price、评级文案、点评点赞/昵称 等（必要时后端小改）。  
  2. **前端封装**：补全 api/canteen.js（regions/shops/categories/products/rankings）、api/notifications.js、api/users.js。  
  3. **页面接 API**：先帖子链（TreeHole/PostDetail/PostNew/MyPosts + 评论点赞）→ 再食堂链（CanteenArea→MerchantList→FoodList→FoodDetail/FoodReviewPublish + 商家端）→ 信箱 → 个人资料与头像；排行榜可最后或与食堂一起接。

以上为全站 API 设计情况与尚未开发/未接入项的评估，可作为正式进入 API 接入环节的清单使用。
