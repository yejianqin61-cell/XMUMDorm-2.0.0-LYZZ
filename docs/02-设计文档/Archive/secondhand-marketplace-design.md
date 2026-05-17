## Second-hand Marketplace（后端 API / 数据库设计稿）

### 目标与约束
- **目标**：实现 Square 下的二手市场 Marketplace，支持分类 Tabs、筛选、列表/详情、发布、收藏（want）、卖家改状态（reserved/sold）。
- **状态**：`on_sale`（在售）/ `reserved`（已预订）/ `sold`（已售出）
- **隐私**：联系方式仅在**详情页**返回；列表不返回联系方式。
- **鉴权**：发布/收藏/改状态/编辑/删除需要登录（复用 `authenticateToken`）。
- **分页**：列表分页，`page/pageSize`（与 Handbook/Canteen 统一）。

---

## 数据库设计（MySQL）

### 1) 分类（Tabs）
分类是固定枚举（你给的 6 个），为了可扩展/可运营，建议落表：

表：`marketplace_categories`
- `id` INT PK AI
- `slug` VARCHAR(40) UNIQUE NOT NULL  
  - `all` / `electronics` / `transport` / `dailyuse` / `books` / `others`
- `name_zh` VARCHAR(60) NOT NULL
- `name_en` VARCHAR(60) NOT NULL
- `sort_order` TINYINT DEFAULT 0
- `is_enabled` TINYINT(1) DEFAULT 1
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

索引：
- `UNIQUE(slug)`
- `INDEX(is_enabled, sort_order, id)`

Seed：
- All / Electronics / Transport / DailyUse / Books / Others

---

### 2) 商品（Item）
表：`marketplace_items`
- `id` INT PK AI
- `category_id` INT NOT NULL FK -> `marketplace_categories.id`
- `seller_user_id` INT NOT NULL FK -> `users.id`
- `title` VARCHAR(120) NOT NULL
- `description` TEXT NOT NULL
- `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00
- `status` ENUM('on_sale','reserved','sold') NOT NULL DEFAULT 'on_sale'
- `tags_json` JSON NULL  
  - 可选：用于存 `tags[]`（如“9成新/自提/可刀”等），不强制
- `contact_wechat` VARCHAR(80) NULL
- `contact_phone` VARCHAR(40) NULL
- `contact_remark` VARCHAR(200) NULL
- `views_count` INT DEFAULT 0
- `wants_count` INT DEFAULT 0
- `deleted_at` TIMESTAMP NULL DEFAULT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

索引建议：
- `INDEX idx_cat_status_time (category_id, status, created_at, id)`
- `INDEX idx_status_time (status, created_at, id)`
- `INDEX idx_seller (seller_user_id, created_at, id)`
- `INDEX idx_deleted (deleted_at)`
- （可选）`FULLTEXT(title, description)`：若后续要关键词搜索

说明：
- `priceMin/priceMax` 直接用 `price` 范围过滤。
- `deleted_at` 逻辑删除，便于审计/恢复。

---

### 3) 图片
表：`marketplace_item_images`
- `id` INT PK AI
- `item_id` INT NOT NULL FK -> `marketplace_items.id`
- `file_path` VARCHAR(500) NOT NULL（对象存储 key 或 uploads 路径）
- `sort_order` INT DEFAULT 0
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

索引：
- `INDEX(item_id, sort_order, id)`

约束：
- 每个 item 最多 **4** 张图片（后端做硬限制）。

---

### 4) Want（收藏）
表：`marketplace_item_wants`
- `user_id` INT NOT NULL FK -> `users.id`
- `item_id` INT NOT NULL FK -> `marketplace_items.id`
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- PK：`PRIMARY KEY(user_id, item_id)`
- `INDEX(item_id)`

并发策略：
- toggle：存在则删，不存在则插；同时更新 `marketplace_items.wants_count`（类似 handbook likes/saves）。

---

## API 设计（/api/marketplace/*）

### A. 分类 Tabs（公开读）
#### GET `/api/marketplace/categories`
返回：
```json
{ "status":0, "message":"ok", "data":[
  { "id":1, "slug":"all", "name_zh":"全部", "name_en":"All", "sort_order":0 }
] }
```

---

### B. 列表（公开读 + 可选登录态）
#### GET `/api/marketplace/items`
Query：
- `category=all|electronics|transport|dailyuse|books|others`
- `priceMin` / `priceMax`
- `status=on_sale|reserved|sold`（可选，默认 all）
- `page` / `pageSize`

返回：
```json
{
  "status": 0,
  "message": "ok",
  "data": {
    "list": [{
      "id": 123,
      "title": "AirPods Pro",
      "price": 399,
      "cover": "https://.../uploads/...",
      "tags": ["9成新","可刀"],
      "sellerName": "Alice",
      "status": "on_sale",
      "category": "electronics",
      "created_at": "2026-04-29T..."
    }],
    "hasMore": true,
    "page": 1,
    "pageSize": 20
  }
}
```

规则：
- 列表不返回联系方式。
- `sellerName`：建议返回 `nickname || username`；头像可按需加（你 ASCII 没要求头像）。
- `cover`：取第一张图（`sort_order` 最小），无图则返回 null。

---

### C. 详情（公开读 + 可选登录态）
#### GET `/api/marketplace/items/:id`
返回：
```json
{
  "status":0,
  "message":"ok",
  "data":{
    "id":123,
    "images":["https://...","https://..."],
    "description":"支持换行...\n第二行",
    "price":399,
    "status":"reserved",
    "tags":["9成新"],
    "sellerInfo": { "name":"Alice", "rating": null },
    "contactInfo": { "wechat":"alicewx", "phone":null, "remark":"晚10点后勿扰" },
    "actions": {
      "want": true,
      "markReserved": true,
      "markSold": true
    },
    "category":"electronics",
    "created_at":"...",
    "updated_at":"..."
  }
}
```

规则：
- `actions.markReserved/markSold`：仅卖家本人或 admin 为 true。
- `actions.want`：登录态才返回真实值；游客返回 false。
- `views_count` 可在详情打开时自增（异步 UPDATE）。

---

### D. 发布（登录）
#### POST `/api/marketplace/items`
Body（建议 multipart/form-data，含 images[]）：
- `title`
- `description`
- `price`
- `category`（slug 或 category_id，建议 slug）
- `tags`（可选：逗号分隔或 JSON）
- `wechat/phone/remark`（可选）

返回：`{ id }`

校验建议：
- `title` 必填，<=120
- `description` 必填，<=3000
- `price` >=0
- `status` 默认 `on_sale`（不允许前端创建时直接 sold）

---

### E. 编辑（登录，卖家或 admin）
#### PATCH `/api/marketplace/items/:id`
可更新：
- `title/description/price/category/tags/contactInfo`
- （可选）更新图片：提供 `images[]` 追加或替换策略（推荐一期做“替换全部”更简单）

---

### F. 状态流转（登录，卖家或 admin）
#### POST `/api/marketplace/items/:id/status`
Body：`{ "status":"reserved" | "sold" | "on_sale" }`

规则：
- `on_sale -> reserved -> sold`
- 允许 `reserved -> on_sale`（反悔/取消预订）
- **不允许** `sold -> on_sale`（除非 admin 强制，二期再做）

---

### G. Want（收藏）（登录）
#### POST `/api/marketplace/items/:id/want`（toggle）
返回：`{ want: true/false, wants_count }`

---

## 权限与安全
- **写操作**：必须登录（`authenticateToken`）
- **编辑/改状态/删除**：仅卖家本人或 admin
- **XSS**：`title/description/contact_remark` 做纯文本清洗（类似 canteen 的 `cleanText`）
- **频率限制**：对发布/收藏 toggle 建议加限流（后续接入全局 rate-limit）

---

## 迁移与上线策略（建议）
- 新增 migration：`0xx_marketplace.sql`
  - 创建 categories/items/images/wants 表
  - seed categories
- 新增路由：`routes/marketplace.js` 并在主 app 挂载 `/api/marketplace`
- 前端路由：复用现有 `/about/second-hand`，替换 `SquareSecondHand.jsx` 占位页为真实页面

