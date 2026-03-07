# 食堂系统 UI 组件设计（Step 2）

> 列出食堂系统需要新增的 UI 组件：名称、用途、大致结构。不写具体代码，仅设计说明。

---

## 一、组件总览

| 组件名 | 用途 | 使用页面 |
|--------|------|----------|
| AreaCard | 单个食堂分区入口卡片 | CanteenArea |
| MerchantCard | 单个商家入口卡片 | MerchantList |
| MerchantHeader | 商家信息头部（名称、 logo 等） | FoodList |
| FoodCard | 单个菜品列表项卡片 | FoodList、FoodManage |
| FoodDetailView | 菜品详情展示（图、名、价、描述） | FoodDetail、MerchantFoodDetail（查看模式） |
| FoodForm | 菜品创建/编辑表单 | FoodCreate、MerchantFoodDetail（编辑模式） |
| StoreForm | 店铺创建/编辑表单 | StoreCreate |

---

## 二、各组件说明与大致结构

### 1. AreaCard

- **用途**：在「食堂分区」页展示一个分区（如东区、西区），点击进入该分区下的商家列表。
- **大致结构**：
  - 可选：左侧图标或缩略图（分区图）
  - 主文案：分区名称（中英可选）
  - 可选：副文案（如商家数量、「点击进入」）
  - 整体可点击，使用 `Link` 到 `/eat/:area`。
- **建议样式**：与现有横条/卡片风格一致（白底、圆角、padding），可参考 myzone-bar 或 PostCard。

---

### 2. MerchantCard

- **用途**：在「区域商家列表」页展示一个商家，点击进入该商家的菜品列表。
- **大致结构**：
  - 左侧：商家 logo/头图（方或圆角矩形）
  - 右侧：商家名称、可选一句简介或标签
  - 可选：评分、营业状态等
  - 整体可点击，使用 `Link` 到 `/eat/merchant/:id`。
- **建议样式**：横向卡片，与 PostCard 的「头像+主信息」布局类似，可复用卡片圆角与阴影。

---

### 3. MerchantHeader

- **用途**：在「商家菜品列表」页顶部展示当前商家信息，不负责跳转，仅展示。
- **大致结构**：
  - 商家 logo/头图（较大）
  - 商家名称
  - 可选：简介、地址、营业时间、评分
- **建议样式**：块级头部，与页面内容区分（如浅底或卡片块），无点击区域或仅作展示。

---

### 4. FoodCard

- **用途**：在列表中以卡片形式展示一个菜品（用户端菜品列表 / 商家端菜品管理列表）。
- **大致结构**：
  - 左侧：菜品图（固定比例，圆角）
  - 右侧：菜品名称、价格（主信息）；可选一行描述
  - 用户端（FoodList）：整卡可点击，`Link` 到 `/eat/food/:id`。
  - 商家端（FoodManage）：同布局，右侧或底部增加操作区（编辑、删除、上架/下架等按钮）。
- **建议**：可通过 `mode="user" | "merchant"` 或 `actions` slot 区分展示，样式统一（白底、圆角、阴影）。

---

### 5. FoodDetailView

- **用途**：纯展示一个菜品的详情（大图、名称、价格、描述等），用于用户端菜品详情页与商家端「查看」模式。
- **大致结构**：
  - 顶部：大图（可占宽、固定比例）
  - 下方：菜品名称、价格（突出）、描述（多行）
  - 可选：用户端加「去点评」「收藏」等操作按钮；商家端仅展示或带「编辑」按钮。
- **建议样式**：上下结构，图+信息块，与 PostDetail 的「头部+内容」类似。

---

### 6. FoodForm

- **用途**：菜品的新增与编辑，供「菜品发布」页与「商家端菜品详情编辑」共用。
- **大致结构**：
  - 字段：菜品名称（必填）、价格（必填）、图片（单张或多张，可选）、描述（多行文本，可选）。
  - 底部：提交按钮、取消/返回按钮。
  - 编辑模式可预填现有值；校验与提交逻辑由页面或父组件处理，表单只负责受控输入与回调。
- **建议样式**：与现有 Login/PostNew/ProfileEdit 表单一致（label + input/textarea + 按钮），可复用 `message` 成功/错误提示。

---

### 7. StoreForm

- **用途**：店铺的创建（及后续若有编辑店铺则复用）。
- **大致结构**：
  - 字段：店铺名称（必填）、所属分区（选择，如下拉或与 AreaCard 一致的分区列表）、简介/描述（多行，可选）、logo/头图（可选）。
  - 底部：提交按钮、取消按钮。
- **建议样式**：同上，与项目内表单风格统一。

---

## 三、与页面的对应关系

| 页面 | 使用的组件 |
|------|------------|
| CanteenArea | AreaCard（多个） |
| MerchantList | MerchantCard（多个） |
| FoodList | MerchantHeader（1 个）+ FoodCard（多个） |
| FoodDetail | FoodDetailView（1 个） |
| FoodCreate | FoodForm（1 个） |
| FoodManage | FoodCard（多个，mode=merchant 或带 actions） |
| MerchantFoodDetail | FoodDetailView（查看）+ FoodForm（编辑）或切换展示 |
| StoreCreate | StoreForm（1 个） |

---

## 四、设计原则（与现有项目一致）

- **设计变量**：继续使用 `index.css` 中的 `--wx-*`（绿色、背景、文字、边框）。
- **卡片**：白底、圆角 12px、适度阴影、padding，与 PostCard / myzone-bar 视觉统一。
- **表单**：label + input/textarea + 主按钮 + 可选 message 区域，与 Login、PostNew、ProfileEdit 一致。
- **空状态**：列表无数据时使用与 MyPosts 类似的提示文案与样式。
- **无障碍**：按钮使用 `aria-label`，链接使用语义化 `<Link>`，图片提供 `alt`。

---

以上为食堂系统 UI 组件的设计清单与大致结构，实现时可先做 AreaCard、MerchantCard、FoodCard、MerchantHeader、FoodDetailView，再做 FoodForm、StoreForm，并与对应页面对接。
