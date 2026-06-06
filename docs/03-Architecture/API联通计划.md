# API 评估与联通计划

> 评估当前后端 API 与前端调用情况，并列出下一步行动计划（设计 + 联通）。

---

## 一、后端 API 总览（已存在）

### 1. 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /register | 注册（role=student/merchant；学生需 email，商家需 invite_code） |
| POST | /login | 登录（email 或 student_id + password），返回 token、data（含 id, username, email, role） |
| POST | /send-verification-code | 发送邮箱验证码（预留，@xmu.edu.my） |

### 2. 帖子 `/api/posts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 列表分页（page, pageSize），可选 Authorization |
| GET | /:id | 帖子详情 |
| POST | / | 发布（content, type, 可选 images），需登录 |
| DELETE | /:id | 逻辑删除，本人或 admin |
| PATCH | /:id/hide | 管理员隐藏 |
| POST | /:id/like | 点赞/取消点赞，需登录 |
| GET | /:id/comments | 评论列表（树形，含 replies） |
| POST | /:id/comments | 发表评论（content, 可选 parent_id），需登录 |
| DELETE | /:id/comments/:commentId | 删除评论，本人或 admin |

### 3. 食堂 `/api/canteen`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /regions | 区域列表（id, code, name, sort_order） |
| POST | /shops | 创建店铺（name, region_id），商家 |
| GET | /regions/:regionId/shops | 某区域下店铺列表 |
| GET | /shops/me | 当前用户店铺（含 categories、product_count） |
| GET | /shops/:shopId | 店铺详情（含 categories） |
| PATCH | /shops/:shopId | 修改店铺（name） |
| DELETE | /shops/:shopId | 逻辑删除店铺 |
| POST | /shops/:shopId/categories | 创建分类（name, sort_order） |
| GET | /shops/:shopId/categories | 店铺分类列表 |
| PATCH | /categories/:categoryId | 修改分类 |
| DELETE | /categories/:categoryId | 删除分类 |
| POST | /products | 创建商品（category_id, name, description, 可选图片），需登录 |
| GET | /shops/:shopId/products | 店铺商品列表（可选 category_id） |
| GET | /products/:productId | 商品详情（含评论分页 list） |
| PATCH | /products/:productId | 修改商品（name, description, category_id） |
| DELETE | /products/:productId | 逻辑删除商品 |
| POST | /products/:productId/comments | 发表点评（rating, content, 可选 parent_id, 图片），需登录 |
| GET | /products/:productId/comments | 点评列表分页（扁平含 parent_id） |
| DELETE | /products/:productId/comments/:commentId | 删除点评 |
| GET | /rankings/* | 最夯单品、门庭若市、最夯商家、爆款新品、点评达人 |

### 4. 通知 `/api/notifications`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 当前用户通知列表（分页，type / is_read 筛选） |
| GET | /unread-announcements | 未读公告 |
| PATCH | /:id/read | 单条已读 |
| PATCH | /read-batch | 批量已读（body: { ids }） |

### 5. 用户 `/api/users`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /me | 当前用户资料（需登录） |
| GET | /:id/profile | 某用户个人空间（资料+帖子+统计） |
| PATCH | /me/avatar | 上传头像，需登录 |

---

## 二、前端 API 层现状

| 模块 | 文件 | 已封装 | 页面是否在用 |
|------|------|--------|--------------|
| 配置 | api/config.js | API_BASE_URL | 全项目 |
| 认证 | AuthContext 内联 | login 用 /api/auth/login | Login 已用 |
| 注册 | Register.jsx 内联 | /api/auth/register | Register 已用 |
| 帖子 | api/posts.js | getPostList, getPostDetail, createPost, deletePost, toggleLike, getPostComments, createComment, deleteComment | **未用**：TreeHole/PostDetail/PostNew/MyPosts 仍用 Mock |
| 食堂 | api/canteen.js | getProductComments, postProductComment | **未用**：FoodDetail/FoodReviewPublish 用 Mock；且缺 regions/shops/products 等 |
| 通知 | 无 | — | Mailbox 用 Mock |
| 用户 | 无 | — | ProfileEdit/MyZone 未接 /me、/me/avatar、profile |

---

## 三、前后端差异与缺口

| 项 | 说明 |
|----|------|
| **登录入参** | 后端为 email 或 student_id；前端传的即此，已对齐。返回 data 含 role，可做 isMerchant。 |
| **区域 vs 分区** | 后端 regions 为 id/code/name；前端 Mock 为 B1/LY3/D6/BELL/others。联通时需约定 code 与前端 area 一致，或前端用 region_id。 |
| **商品价格** | 后端 products 无 price 字段；前端有。需后端加 price 或前端暂不展示/用其它字段。 |
| **点评评级** | 后端 RATING_ENUM 为 `['夯爆了','顶级','人上人','NPC','拉完了']`，前端为「顶尖」非「顶级」。需统一文案或做映射。 |
| **点评点赞** | 后端商品点评无「点赞」接口；前端一级点评有点赞。可选：后端加点评点赞表与接口，或前端去掉一级点赞。 |
| **商品详情评论结构** | 后端 GET /products/:id/comments 返回扁平 list（含 parent_id）；前端需自行组树，或后端改为直接返回树形。 |

---

## 四、API 完备性结论

- **后端**：认证、帖子、食堂（区域/店铺/分类/商品/点评）、通知、用户 等接口已齐全，足以支撑当前前端功能。
- **前端**：仅登录/注册真正调 API；帖子、食堂、信箱、个人资料 仍用 Mock，且食堂侧缺大量封装（regions、shops、products、categories）。
- **差异**：需统一或补齐 区域↔分区、商品 price、评级文案、点评点赞（可选）、评论树形 等。

---

## 五、下一步行动计划（建议顺序）

### 阶段 1：统一约定与补齐（不写前端代码，只约定）

1. **约定区域/分区**：确认 regions.code 与前端 area（B1/LY3/D6/BELL/others）一一对应；若后端暂无，在 regions 表或配置中补齐。
2. **约定商品价格**：确认 products 表是否增加 price（及单位），或暂用 description/扩展字段；前端展示统一规则。
3. **约定点评评级**：统一为后端五档文案（或后端改为支持「顶尖」），前端提交与展示与后端一致。
4. **约定点评点赞**：决定一级点评是否有点赞；若要，后端加「商品点评点赞」表与 POST/GET 接口；若不要，前端去掉一级点赞 UI。

### 阶段 2：前端 API 封装补齐

1. **auth**：保留现有 login/register 调用；如需，抽成 api/auth.js（login, register, sendVerificationCode）。
2. **帖子**：已有 api/posts.js；确认与后端响应格式一致（如 status、data、list、hasMore），必要时微调入参/出参映射。
3. **食堂**：在 api/canteen.js 中新增：
   - getRegions()
   - getShopsByRegion(regionId)
   - getShopMe(token)
   - getShop(shopId)
   - createShop(token, body)
   - updateShop(token, shopId, body)
   - getCategories(shopId)
   - createCategory(token, shopId, body)
   - getProducts(shopId, options)
   - getProduct(productId)
   - createProduct(token, body)
   - updateProduct(token, productId, body)
   - deleteProduct(token, productId)
   - 已有 getProductComments、postProductComment；对齐 rating 枚举与树形结构（若后端改树形则直接用，否则前端组树）。
4. **通知**：新增 api/notifications.js（getList, getUnreadAnnouncements, markRead, markReadBatch）。
5. **用户**：新增 api/users.js（getMe, getProfile(userId), updateAvatar(token, file)）。

### 阶段 3：页面接 API 与状态处理

1. **帖子**：TreeHole 用 getPostList，PostDetail 用 getPostDetail + getPostComments + toggleLike + createComment，PostNew 用 createPost，MyPosts 用 getPostList 或用户 profile 的 posts；**统一加 loading、错误提示、重试**。
2. **食堂**：CanteenArea 用 getRegions（或区域→分区映射）；MerchantList 用 getShopsByRegion；FoodList 用 getShop + getCategories + getProducts（按分类分组）；FoodDetail 用 getProduct + getProductComments；FoodReviewPublish 用 postProductComment；FoodDetail 回复用 postProductComment(parent_id)。商家端：StoreCreate 用 createShop/getShopMe；FoodManage 用 getShopMe + getProducts；FoodCreate 用 getCategories + createProduct；MerchantFoodDetail 用 getProduct + updateProduct + deleteProduct。
3. **信箱**：Mailbox 用 getNotifications，点击用 markRead。
4. **个人**：MyZone 用 getMe 或 getProfile；ProfileEdit 用 getMe、updateAvatar、及现有或后续的「更新昵称」接口（若有）。

### 阶段 4：请求与异常

1. 所有请求前可设 loading 状态；请求结束（成功或失败）关闭 loading。
2. 请求失败：统一提示（如「网络错误，请稍后重试」或后端 message）；可带重试按钮或自动重试一次。
3. 登录态：401 时清 token、跳转登录；可选全局 axios/fetch 拦截器统一处理。

---

## 六、简要对照表（后端有、前端要接的）

| 前端页面/功能 | 需调用的后端 API | 前端 API 层状态 |
|---------------|------------------|-----------------|
| 登录 | POST /api/auth/login | 已用 |
| 注册 | POST /api/auth/register | 已用 |
| 帖子列表 | GET /api/posts | 已封装，未接页面 |
| 帖子详情 | GET /api/posts/:id, comments, like | 已封装，未接页面 |
| 发帖 | POST /api/posts | 已封装，未接页面 |
| 评论/回复 | GET/POST /api/posts/:id/comments | 已封装，未接页面 |
| 食堂分区 | GET /api/canteen/regions | 未封装 |
| 商家列表 | GET /api/canteen/regions/:id/shops | 未封装 |
| 店铺详情/我的店铺 | GET /api/canteen/shops/me, GET /shops/:id | 未封装 |
| 分类列表 | GET /api/canteen/shops/:id/categories | 未封装 |
| 商品列表 | GET /api/canteen/shops/:id/products | 未封装 |
| 商品详情 | GET /api/canteen/products/:id | 未封装 |
| 商品点评列表 | GET /api/canteen/products/:id/comments | 已封装，未接页面 |
| 发布点评/回复 | POST /api/canteen/products/:id/comments | 已封装，未接页面 |
| 创建店铺 | POST /api/canteen/shops | 未封装 |
| 创建/编辑/删除商品 | POST/PATCH/DELETE products | 未封装 |
| 信箱 | GET /api/notifications, PATCH read | 未封装 |
| 个人资料/头像 | GET/PATCH /api/users/me, /me/avatar | 未封装 |

---

## 七、总结

- **API 完备性**：后端接口已覆盖当前业务，需补的主要是**前端封装 + 页面接 API + 统一约定（区域、价格、评级、点评点赞）**。
- **建议执行顺序**：先做「约定与差异」（阶段 1），再补「前端 API 封装」（阶段 2），然后「页面接 API + loading/错误」（阶段 3、4）。若你愿意，可从「阶段 1 约定」或「阶段 2 食堂 api/canteen.js 补齐」开始具体改代码。
