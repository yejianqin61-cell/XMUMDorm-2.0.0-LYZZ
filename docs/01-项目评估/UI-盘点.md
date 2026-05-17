# 前端 UI 盘点

> 目的：梳理已有 UI、可复用部分，以及食堂/商家系统还需新设计的内容。不修改代码，仅盘点。

---

## 一、全局与公共组件（可复用）

| 模块 | 文件 | 说明 |
|------|------|------|
| **布局** | `Layout.jsx` + `Layout.css` | 顶栏 + 主内容区（Outlet）+ 底部 Tab；所有子路由共用。 |
| **顶栏** | `TopBar.jsx` + `TopBar.css` | 标题居中、可选左侧返回、右侧信箱；微信风格。 |
| **底栏** | `TabBar.jsx` + `TabBar.css` | 四栏：树洞、食堂、关于我们、我的；选中态绿色。 |
| **设计变量** | `index.css` | `--wx-green`、`--wx-bg`、`--wx-bar-bg`、`--wx-text`、`--wx-text-secondary`、`--wx-border` 等，全项目统一。 |

- **AuthGuard**、**AuthContext** 已存在，与 UI 复用无关，但所有需登录的页面都会经过它们。

---

## 二、帖子系统 UI 现状

| 页面 | 文件 | UI 完成度 | 说明 |
|------|------|-----------|------|
| **帖子总览** | `TreeHole.jsx` + `TreeHole.css` | ✅ 已开发 | 双列网格、`PostCard` 列表、右下角 FAB 发帖；当前用 `MOCK_POSTS`。 |
| **帖子卡片** | `PostCard.jsx` + `PostCard.css` | ✅ 已开发 | 头像 + 用户名、内容摘要、♥/💬 统计；可复用「卡片 + 头像 + 元信息」模式。 |
| **发帖页** | `PostNew.jsx` + `PostNew.css` | ✅ 已开发 | 匿名说明、textarea、最多 3 张图片（预览+删除）、提交按钮；未接 API（TODO）。 |
| **帖子详情** | `PostDetail.jsx` + `PostDetail.css` | ✅ 已开发 | 作者区、正文、点赞、评论列表、回复、发表评论表单；用 mock 数据。 |

- **可复用点**：卡片样式（白底、圆角 12px、padding、阴影）、列表+空状态、详情「头部+内容+操作+评论区」结构、表单（label + input/textarea + 按钮）。

---

## 三、个人中心 UI 现状

| 页面 | 文件 | UI 完成度 | 说明 |
|------|------|-----------|------|
| **个人主页** | `MyZone.jsx` + `MyZone.css` | ✅ 已开发 | 横条 1：头像+用户名+邮箱；横条 2/3：我的帖子/我的点评；横条 4：本周点评数。 |
| **我的帖子** | `MyPosts.jsx` + `MyPosts.css` | ✅ 已开发 | 复用 `PostCard` 列表；空状态「暂无帖子，去首页发一条吧」。 |
| **我的点评** | `MyReviews.jsx` + `MyReviews.css` | ⚠️ 占位 | 仅一句「我的点评功能开发中」。 |
| **修改资料** | `ProfileEdit.jsx` + `ProfileEdit.css` | ✅ 已开发 | 头像上传、用户名输入、保存；成功/错误提示 2 秒。 |

- **可复用点**：**横条（bar）** 样式（`myzone-bar`：白底、圆角、padding、hover），可复用于「分区入口」「商家入口」等列表项。

---

## 四、登录 / 注册 / 其他

| 页面 | 文件 | UI 完成度 | 说明 |
|------|------|-----------|------|
| **登录** | `Login.jsx` + `Login.css` | ✅ 已开发 | 学号/邮箱 + 密码、登录/暂不登录、跳转注册；有 loading、成功/错误提示。 |
| **注册** | `Register.jsx` + `Register.css` | ✅ 已开发 | 表单页，有样式。 |
| **信箱** | `Mailbox.jsx` + `Mailbox.css` | ✅ 已开发 | 说明文案 + 列表（点赞/评论提醒），点击进帖子；mock 数据。 |
| **关于我们** | `AboutUs.jsx` | ⚠️ 占位 | 仅「关于我们 / Coming soon」，无独立 CSS。 |

- **可复用点**：表单结构（label + input + 按钮、message 提示）、整页居中盒子（如 `login-box`）。

---

## 五、食堂系统 UI 现状（本次重点）

以下 8 个页面**仅存在组件骨架**（一个 `<h1>`），**无布局、无样式、无业务 UI**：

| 页面 | 文件 | 路由 | 需要新设计的 UI |
|------|------|------|-----------------|
| 食堂分区 | `CanteenArea.jsx` | `/eat` | 分区列表/网格（每个分区一张卡片或入口） |
| 区域商家列表 | `MerchantList.jsx` | `/eat/:area` | 商家列表（卡片或列表，可能带头图、名称） |
| 商家菜品列表 | `FoodList.jsx` | `/eat/merchant/:id` | 菜品列表（图片+名称+价格等） |
| 菜品详情（用户端） | `FoodDetail.jsx` | `/eat/food/:id` | 大图、名称、价格、描述、可选加购/点评入口 |
| 店铺创建 | `StoreCreate.jsx` | `/merchant/create` | 表单：店铺名、描述、分区等 |
| 菜品管理 | `FoodManage.jsx` | `/merchant/manage` | 菜品列表 + 编辑/删除/上架下架等操作 |
| 菜品发布 | `FoodCreate.jsx` | `/merchant/food/new` | 表单：菜品名、价格、图片、描述等 |
| 菜品详情（商家端） | `MerchantFoodDetail.jsx` | `/merchant/food/:id` | 查看/编辑单菜品 |

- 以上均**未**在 `Layout.jsx` 的 `TITLE_BY_PATH` 或 `showBack` 里做细分（目前仅通过 `pathname.startsWith('/eat')` 等给标题和返回），后续做 UI 时可按需补充各子路径的标题与返回键。

---

## 六、可复用 vs 需新设计 汇总

### 可直接或稍作改造复用的

1. **设计体系**  
   - `index.css` 的 CSS 变量（颜色、背景、圆角、阴影）。  
   - 新页面沿用同一套即可。

2. **卡片样式**  
   - `PostCard` 的：白底、圆角 12px、padding、阴影、头像+主信息+元信息。  
   - **可复用于**：食堂分区卡片、商家卡片、菜品卡片（可新写 `AreaCard` / `MerchantCard` / `FoodCard`，结构参考 PostCard，类名与语义按页面区分）。

3. **横条列表项**  
   - `MyZone` 的 `myzone-bar`（整块可点击、白底、圆角、padding）。  
   - **可复用于**：分区入口、商家入口等（样式可抽成通用 `.list-bar` 或沿用类名约定）。

4. **表单模式**  
   - Login / PostNew / ProfileEdit：`label` + `input`/`textarea` + 主按钮 + 成功/错误 `message`。  
   - **可复用于**：StoreCreate、FoodCreate、ProfileEdit 已具备。

5. **空状态**  
   - MyPosts 的「暂无帖子，去首页发一条吧」。  
   - **可复用于**：暂无分区、暂无商家、暂无菜品等（复制结构改文案即可）。

6. **详情页结构**  
   - PostDetail：顶部作者/信息区 → 正文/内容区 → 操作区（点赞）→ 评论区 + 发表评论。  
   - **可参考用于**：FoodDetail（头部图/名/价 → 描述 → 操作/加购/点评）。

7. **Layout / TopBar / TabBar**  
   - 已统一；新页面只需在 Layout 内按需补「子路径标题」和「是否 showBack」。

### 需要新设计的（食堂 + 商家）

| 类型 | 内容 |
|------|------|
| **用户端食堂** | CanteenArea（分区选择）、MerchantList（商家列表）、FoodList（菜品列表）、FoodDetail（菜品详情）的布局与交互。 |
| **商家端** | StoreCreate（店铺表单）、FoodManage（菜品管理列表+操作）、FoodCreate（菜品表单）、MerchantFoodDetail（商家看/编辑菜品）。 |
| **通用组件（建议）** | 若希望风格统一，可新做：`AreaCard`、`MerchantCard`、`FoodCard`（列表用）、可选 `FoodDetailCard`（详情用），样式与 PostCard / myzone-bar 保持一致。 |

---

## 七、建议的 UI 开发顺序（仅 UI 层）

1. **食堂用户端**  
   - CanteenArea → MerchantList → FoodList → FoodDetail  
   - 先做列表卡片（可复用卡片与横条风格），再做 FoodDetail 详情布局。

2. **商家端**  
   - StoreCreate、FoodCreate（表单，复用现有表单模式）  
   - FoodManage（列表+操作）  
   - MerchantFoodDetail（查看/编辑）

3. **收尾**  
   - Layout 中为 `/eat/:area`、`/eat/merchant/:id`、`/eat/food/:id`、`/merchant/*` 等补标题与返回键逻辑。  
   - 如需「我的点评」与食堂点评打通，再补 MyReviews 的列表/详情 UI。

---

以上为当前项目的 **UI 盘点**：帖子与个人中心大部分已完成并可复用；食堂 8 个页面需从零做 UI，建议优先复用设计变量、卡片与横条样式、表单与空状态模式，再按上述顺序逐个新设计。
