# 全站 API 与功能自评及下一步开发建议

> 更新日期：基于当前代码与近期接入情况整理。

---

## 一、当前状态自评

### 1. API 接入情况（整体：已接入）

| 模块 | 后端路由 | 前端对接 | 说明 |
|------|----------|----------|------|
| **认证** | POST login/register, 验证码 | Login / Register | 正常 |
| **用户** | GET /me, GET /:id/profile, PATCH /me/avatar | AuthContext, MyZone, ProfileEdit, MyPosts | 正常 |
| **帖子** | 列表/详情/发帖/删/隐藏/点赞/评论 | TreeHole, PostDetail, PostNew | 正常 |
| **通知** | GET 列表、未读公告、PATCH 已读 | Mailbox | 已接 API |
| **食堂-区域/店铺** | regions, regions/:id/shops, shops/me, shops/:id, PATCH shops | CanteenArea, MerchantList, StoreCreate, FoodManage, MerchantShopEdit | 正常（含 logo、营业时间） |
| **食堂-分类** | categories CRUD | FoodManage 新建分类, FoodForm 选择分类 | 正常 |
| **食堂-商品** | products CRUD, 列表/详情 | FoodList, FoodDetail, FoodManage, FoodCreate, MerchantFoodDetail | 正常（含价格、多图） |
| **食堂-点评** | comments 发表/列表/删除 | FoodDetail, FoodReviewPublish, MyReviews | 正常 |
| **排行榜** | rankings/hot-products, busy-shops, top-shops, new-hit-products, active-users | Rankings | 已接 API |

结论：**主要业务 API 已全部接入**，包括商家端（店铺/分类/商品/店铺编辑）、用户端食堂浏览与点评、帖子、用户、通知、排行榜。图片与 logo 的上传、存储与展示（含 getUploadUrl）已打通。

### 2. 数据与迁移

- **004_product_price**：商品价格字段，已支持；需执行 `node run-migration-004.js`（若未执行）。
- **005_shops_logo_opening_hours**：店铺 logo、营业时间，已支持；需执行 `node run-migration-005.js`（若未执行）。

### 3. 已知稳定点

- 商家 logo、菜品图片、价格在列表/详情/编辑中展示与保存一致。
- 店铺编辑（logo/名称/营业时间）、商品编辑（含价格）、分类新建与选择均走真实 API。
- 未执行迁移时，后端对缺列做了兼容，避免 500。

### 4. 可优化点（非阻塞）

- 商品编辑暂不支持「更换/增删图片」，仅支持文字与价格；若需图片编辑可后续加 PATCH + multipart 或单独图片接口。
- 部分列表（如帖子、商品）可考虑虚拟滚动或分页优化，数据量增大时更稳。
- 错误提示可统一为 Toast/组件，替代部分 `alert`/内联文案。

---

## 二、下一步开发建议（按优先级）

### 高优先级（体验与完整性）

1. **商品编辑支持图片**
   - 在商家端「编辑菜品」页支持：上传新图、删除某张图（或设首图）。
   - 后端：PATCH `/products/:id` 支持 multipart，或新增「追加/删除图片」接口；前端：MerchantFoodDetail 的表单里增加图片区与对应调用。

2. **统一错误与成功反馈**
   - 使用统一 Toast/Message 组件显示接口错误、成功提示，避免到处 `setError`/`alert`，并区分网络错误与业务错误。

3. **基础加载与空状态**
   - 列表/详情骨架屏或统一 loading 样式；无数据时统一「空状态」文案与引导（如「暂无菜品，去发布」）。

### 中优先级（功能与运营）

4. **搜索与筛选**
   - 食堂：按店铺名/菜品名搜索；帖子：按关键词或类型筛选。
   - 后端可加简单 LIKE 或全文索引；前端加搜索框与结果页。

5. **收藏/喜欢店铺或菜品**
   - 若产品需要「收藏店铺/菜品」，可新增表与接口（如 POST/GET/DELETE 收藏），前端在商家页/菜品卡增加收藏入口。

6. **数据统计与简单运营**
   - 商家端：本店浏览量/点评数/热门菜品；可基于现有点评与排行接口做简单统计接口与仪表盘。

### 低优先级（性能与工程化）

7. **前端性能**
   - 大列表虚拟滚动；图片懒加载或 CDN；接口数据按需分页。

8. **测试与部署**
   - 关键接口与关键路径的单元/集成测试；CI 跑测试；部署文档（环境变量、迁移执行顺序、Nginx/Node 部署方式）。

9. **安全与合规**
   - 上传文件类型/大小校验（后端已有），可补充敏感词过滤、举报入口；若上线需 HTTPS、隐私政策等。

---

## 三、小结

- **API 接入**：当前主要业务（认证、用户、帖子、食堂、通知、排行榜）已全部接入并可用；商家 logo 与菜品图片已正常显示。
- **建议优先**：商品编辑支持图片、统一错误/成功提示、加载与空状态；再视需求做搜索、收藏与简单运营统计。

如需我按「某一条建议」输出具体接口设计与前端改动点，可以直接指定条目（例如「商品编辑支持图片」）。
