# 食堂内容共建（Web 端）实现记录

> 2026-09-27 · 需求：「在食堂模块，分区商家列表这边，允许用户新增商家、编辑商家（不允许删除）；
> 某个商家的菜品详情页也允许用户上传菜品、编辑菜品。向用户开放进一步的权限。」
>
> 对应规格 `docs/01-Requirement/module-specs/食堂内容共建权限开放规格.md`，
> 任务 `M03-Task011 / 012 / 013`（Task010 后端契约此前已完成）。

## 一、改之前的实际状况

**后端权限早就开过了，缺的是前端入口。** 仓库里已经有这两个提交：

| 提交 | 作用 |
|---|---|
| `f309b10 feat(canteen): open collaborative write permissions` | 商铺/分类/菜品的创建与编辑对所有登录用户开放 |
| `acb7a19 fix(canteen): restrict category deletion` | 三类删除收回到仅管理员 |

`__tests__/routes/canteenPermissions.test.js` 已经在守这条契约，所以**本次没有放宽任何后端授权**。

真正缺的是 Web 端（`frontend/`）的入口：

| 位置 | 改之前 |
|---|---|
| `pages/MerchantList.jsx`（分区商家列表） | 纯只读列表，没有任何新增/编辑入口 |
| `pages/FoodDetail.jsx`（菜品详情页） | 只有管理员删除，没有编辑菜品 / 上传菜品 |
| `pages/FoodList.jsx`（商铺菜单页） | 空菜单是死路；没有维护入口 |
| `pages/CanteenShopManage.jsx`（商铺维护页） | 不存在 |
| `pages/MerchantShopEdit.jsx` | 只能改「我的店铺」（`getShopMe()` + 商家角色），改不了别人的商铺 |
| `pages/FoodCreate.jsx` | 只能发到「我的店铺」；没有分类时提示「请先在管理店铺页创建分类」，等于无路可走 |
| `frontend-app/`（App 端） | **已有**「添加商铺」入口 → Web 与 App 行为不一致 |

顺手发现并修掉的三个真实缺陷：

1. `components/FoodCard.jsx`：`mode="merchant"` 时**无条件**渲染删除按钮，`pages/FoodManage.jsx` 的删除回调也没有管理员校验。
   后端会返回 403，但按钮对所有登录用户可见本身就是错的。
2. `middleware/sensitiveWordFilter` 在 `POST /products` 里排在上传中间件**之前**：multer 还没来得及解析
   multipart 的文本字段，`req.body` 是空的 → 图片上传路径上的菜名从未被过滤过。
3. `pages/Login.jsx` 回跳只取 `location.state.from.pathname`，丢掉 query，共建入口的
   `?shopId=` / `?from=` / `?region=` 会在登录后失效。

## 二、设计

### 1. 入口贴着信息走，不引入新后台

- **分区商家列表** → `新增商家`（带上当前分区）+ 每个商家一行 `编辑`（圆形铅笔按钮）
- **商铺菜单页** → 一个圆形铅笔 `共建维护` 按钮（与树洞发布入口同款），进入 `/eat/merchant/:id/manage`
- **菜品详情页** → `编辑菜品` + `上传菜品`（上传自动带上这家商铺与当前分类上下文）

### 2. 新增「商铺共建维护页」`/eat/merchant/:id/manage`

按规格第 9 条，商铺页面必须同时覆盖：编辑店铺资料、管理分类、添加菜品、管理已有菜品。
独立页面比在菜单页塞一堆控件更不打扰浏览，空商铺也天然有路可走。

### 3. 分类是硬依赖，所以给了两条自助路径

`POST /products` 要求 `category_id`，商铺没有分类时「上传菜品」必然失败。因此：

- 维护页可以新增 / 重命名 / 上下移分类；
- `FoodCreate` 在目标商铺没有分类时，直接在页面上提供「第一步 · 先建一个分类」，不再把人推去别的页面。

### 4. 删除一律仅管理员：前端隐藏 + 服务端二次校验

`FoodCard` 新增 `canDelete`（默认 `false`），由调用方传 `isAdmin`；维护页/菜品编辑页的删除按钮包在
`isAdmin` 分支里；服务端三类删除接口的 `isAdmin(req)` 与此前一致，未改动。

### 5. 复用既有 CRUD，不新增平行接口、不新增角色

只新增两条前端路由，接口全部沿用现成的 `/api/canteen/*`。

### 6. 写入后的缓存刷新收敛成一个 helper

`frontend/src/features/canteen/invalidateCanteen.js`：按前缀失效整个 `['canteen']` 域 + `['rankings']` 域。
商铺名、分类、菜品、价格的变更会同时影响商铺详情、菜单、分区列表、排行榜、搜索结果与菜品详情，
逐个枚举 key 容易漏刷；TanStack 只会重取当前挂载中的查询，不会造成请求风暴。

## 三、改动清单

### 新增

| 文件 | 说明 |
|---|---|
| `frontend/src/pages/CanteenShopManage.jsx` / `.css` | 商铺共建维护页（资料 / 分类 / 菜品） |
| `frontend/src/features/canteen/invalidateCanteen.js` | 共建写入后的统一缓存失效 |
| `__tests__/routes/canteenWriteGuards.test.js` | 封禁/禁言、敏感词命中、中间件注册顺序 |
| `__tests__/frontend/canteenCoBuildEntries.test.js` | 入口可达性 + 删除入口仅管理员 + 写入后刷新 |

### 修改

| 文件 | 说明 |
|---|---|
| `routes/canteen.js` | 商铺/菜品的创建与编辑补 `checkSanction`；敏感词过滤移到上传中间件之后 |
| `frontend/src/routes/layoutRoutes.jsx` | 新增 `eat/merchant/:id/manage`、`merchant/shop/edit/:shopId` |
| `pages/MerchantList.jsx` / `.css` | 新增商家入口、逐行编辑按钮；空分区文案改为共建引导 |
| `pages/FoodList.jsx` / `.css` | 圆形铅笔共建维护入口；空菜单给出「添加菜品」；抽出共用的顶部操作条 |
| `pages/FoodDetail.jsx` | 编辑菜品 / 上传菜品入口；删除仍仅管理员；改用统一缓存失效 |
| `pages/MerchantShopEdit.jsx` / `.css` | 支持 `/merchant/shop/edit/:shopId` 编辑任意商铺（不带参数时保留旧「我的店铺」语义）；RetroUI 表单重写 |
| `pages/StoreCreate.jsx` / `.css` | 支持 `?region=` 预设分区与 `?from=` 回跳；未登录跳登录 |
| `components/StoreForm.jsx` / `.css` | 收敛为「名称 + 分区」；移除提交前就弹的**虚假成功提示**；去掉后端不接收的 logo/简介字段 |
| `pages/FoodCreate.jsx` / `.css` | 支持 `?shopId=` 商铺上下文；无分类时可自助建分类 |
| `pages/MerchantFoodDetail.jsx` / `.css` | 删除仅管理员；保存后按 `from` 回跳并刷新缓存 |
| `pages/FoodManage.jsx` | 删除加管理员校验，`canDelete={isAdmin}` |
| `components/FoodCard.jsx` | 删除按钮由 `canDelete` 控制，默认不显示 |
| `components/FoodForm.jsx` | 无分类提示改为指向页内自助创建 |
| `pages/Login.jsx` | 回跳保留 query |

## 四、验证

### 自动化

| 检查 | 结果 |
|---|---|
| `npx jest` | **39 suites / 574 tests 全绿**（原 37 / 548，新增 2 suites / 26 tests） |
| `npx vite build` | ✓ built，无报错 |
| `node scripts/check-frontend-no-undef.js` | `[no-undef] OK — frontend/src 下 249 个文件没有未定义标识符` |

### 浏览器实测（Chromium，本地 vite + 本地后端）

`document.scrollWidth - clientWidth` 与页面容器自身的溢出同时测量：

| 视口 | 页面 | 结果 |
|---|---|---|
| 430×932 | `/eat/D6` | doc 0 / page 0；`新增商家` + 每行 `编辑商家 X` 就位 |
| 360×780 | `/eat/D6` | doc 0 / page 0 |
| 1440×900 | `/eat/D6` | doc 0 / page 0 |
| 430×932 | `/eat/merchant/3` | doc 0 / page 0；`共建维护这家商铺` 就位 |
| 430×932 | `/eat/food/1` | doc 0 / page 0；`编辑菜品 Edit`、`上传菜品 Add dish` 就位 |
| 430×932 | `/eat/merchant/3/manage` | doc 0 / page 0；学生身份**没有**任何删除按钮 |
| 430×932 | 同上，管理员身份 | 删除按钮 31 个（4 分类 + 27 菜品）；`新增分类` 弹窗宽 384px、右边界 407 < 430 |
| 430×932 | `/merchant/food/new?shopId=3` | 分类下拉 4 项，不再出现「没有分类」提示 |
| 430×932 | `/merchant/shop/edit/3`、`/merchant/food/1` | 表单正常，无溢出 |
| 430×932 | 英文模式（D6 / 维护页 / 菜品详情 / 商铺编辑） | 全部入口英文化，无溢出 |

登录门（US-003）逐个点过，均跳到 `/login`：未登录点 `新增商家`、未登录点商家 `编辑`、
未登录点 `上传菜品`、未登录直接访问 `/eat/merchant/3/manage`。

### 未验证的部分（重要）

**没有执行真实的写入操作。** `.env` 里 `MYSQL_URL` 指向 Railway 生产库
（`metro.proxy.rlwy.net:20487/railway`），本机 MySQL 又无法用 `.env` 的 root 口令登录，
所以「创建商铺 / 上传菜品成功后列表刷新」这条链路只做了代码级与接口级验证，
没有在生产库上真的建商铺或发菜品。写入路径的回归建议在本地库或预发环境补一次。

### 附带说明

- 上一轮验证时 `modlens_read_image` 不可用（`unrecognized_model`），所以本次同样没有做截图目视比对，
  结论全部来自 DOM 实测数据。
- 敏感词/封禁校验是**新加**在商铺与菜品写接口上的，会让命中敏感词的店名/菜名从「能存」变成「400」，
  这是开放权限后有意保留的内容底线；已有测试都 mock 了这两个中间件，未受影响。

## 五、已知边界 / 未做

- Web 与 App（`frontend-app/`）仍有实现差异：App 的「添加商铺」早已存在，
  但 App 端没有商铺维护页与菜品逐项编辑，本次未同步。
- 分类排序用「相邻两项交换 `sort_order`」，没有批量重排接口；分类很多时要点很多次。
- 没有版本历史、冲突合并、审批流与重复商铺合并（规格里明确 Out of Scope）。
- 非管理员对自己的编辑没有审计留痕（`audit_logs` 只记了删除）；如果要追责需要另开一轮。
