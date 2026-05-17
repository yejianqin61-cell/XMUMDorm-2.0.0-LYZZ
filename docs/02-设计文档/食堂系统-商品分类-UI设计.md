# 食堂系统 · 商品分类（Category）UI 设计

> 基于现有 MerchantList → FoodList → FoodDetail 结构，为 FoodList 增加「商品分类浏览」能力。仅输出设计与结构，不包含完整代码实现。

---

## 一、功能需求摘要

- 商家在发布商品时**选择或创建**商品分类（如：主食、饮料、小吃、套餐）；分类按**创建顺序**展示。
- 每个商品**必须属于一个分类**；列表展示顺序：**先按分类分组 → 分类顺序 = 分类创建顺序 → 分类内商品顺序 = 商品创建顺序**。
- FoodList 采用**双栏布局**：左侧**分类导航**，右侧**按分类分组的商品列表**（每类为「分类标题 + FoodCard 列表」）。
- 左侧点击分类 → **滚动到对应区块**，当前分类**高亮**。
- 新增组件：**CategorySidebar**、**CategorySection**；**FoodCard** 继续复用。
- **FoodForm** 增加 **category** 字段（下拉或分类选择器）。

---

## 二、新增 UI 组件设计

### 1. CategorySidebar（分类导航栏）

| 项 | 说明 |
|----|------|
| **用途** | 在 FoodList 左侧固定展示当前商家的商品分类列表，点击后滚动到对应分类区块并高亮当前项。 |
| **Props** | `categories: Array<{ id, name }>`（按创建顺序）；`activeId: string \| number`（当前高亮分类 id）；`onSelect(id)` 点击回调。 |
| **结构** | 垂直列表，每项为可点击块：分类名称。选中态：背景/边框/文字高亮（如绿色底或左边框）。 |
| **样式** | 窄栏（宽度约 80–96px 或按字数自适应），可固定高度或随内容滚动；与右侧内容区有分隔线。 |
| **无障碍** | 使用 `role="navigation"` 或 `aria-label="商品分类"`；当前项 `aria-current="true"`。 |

### 2. CategorySection（分类区块）

| 项 | 说明 |
|----|------|
| **用途** | 在右侧商品区域内，包裹「一个分类的标题 + 该分类下的 FoodCard 列表」。 |
| **Props** | `category: { id, name }`；`foods: Array<Food>`；可选 `sectionRef` 用于滚动定位。 |
| **结构** | 块级容器，内含：`<h2>` 或 `<div>` 分类标题（如「主食」）+ `<ul>` 内多个 `<FoodCard>`。 |
| **样式** | 标题与现有页面标题风格一致（字号、字重）；列表与现有 FoodCard 列表间距一致。区块间可加适当 margin。 |
| **锚点 / ref** | 每个区块需有稳定 id 或 ref，供左侧点击时 `scrollIntoView` 或锚点跳转。建议 id 为 `category-${category.id}`。 |

### 3. FoodCard

- **无需改组件接口**，继续复用现有 FoodCard（`food` 含 id、name、price、image、description 等）。
- 数据层保证每个 `food` 带 `categoryId`，列表按「分类分组后」传入各 CategorySection 即可。

---

## 三、FoodList 页面结构更新

### 3.1 布局结构（双栏）

```
+------------------------------------------------------------------+
| MerchantHeader（不变，仍占整宽）                                   |
+------------------------------------------------------------------+
| CategorySidebar (左)  |  右侧滚动区                               |
| 固定或随滚            |  +----------------------------------------+ |
| 主食                  |  | CategorySection(id=主食)               | |
| 饮料                  |  |    【主食】                            | |
| 小吃                  |  |    FoodCard / FoodCard / ...          | |
| 套餐                  |  +----------------------------------------+ |
| ...                   |  | CategorySection(id=饮料)               | |
|                       |  |    【饮料】                            | |
|                       |  |    FoodCard / FoodCard                 | |
|                       |  +----------------------------------------+ |
|                       |  | ...                                    | |
+------------------------------------------------------------------+
```

- 左侧：**CategorySidebar**，宽度固定，可独立滚动或整页滚动时吸顶/固定视口左侧（具体可后续用 CSS 实现）。
- 右侧：**可滚动区域**，内部为多个 **CategorySection** 纵向排列；每个 Section 内为「分类标题 + FoodCard 列表」。

### 3.2 数据流（页面层）

- 从路由取 `merchantId`（即当前商家 id）。
- 请求或 Mock：该商家的**分类列表**（按 `sortOrder` 或 `createdAt` 排序）、**商品列表**（含 `categoryId`）。
- 在页面内：按 `categoryId` 将商品分组，分组顺序与分类列表顺序一致；分类内商品按创建顺序排序。
- 将「分类列表」传给 **CategorySidebar**；将「分组后的 { category, foods }[]」传给右侧，逐块渲染 **CategorySection**。

### 3.3 空状态

- 无分类时：右侧可提示「暂无分类」或「暂无商品」，左侧不展示分类栏或展示空。
- 某分类下无商品：该分类仍可在左侧展示，右侧对应 CategorySection 仅显示标题、无 FoodCard（或可选显示「该分类下暂无商品」）。

---

## 四、商品分类数据结构建议

### 4.1 分类（Category）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string / number | 主键 |
| merchantId | string / number | 所属商家 |
| name | string | 分类名称（如「主食」「饮料」） |
| sortOrder | number | 展示顺序，越小越靠前（或改用 createdAt 按创建顺序） |

- 后端若按「创建顺序」展示，可用 `createdAt` 排序，前端无需 `sortOrder`。

### 4.2 商品（Food）扩展

| 字段 | 类型 | 说明 |
|------|------|------|
| categoryId | string / number | 必填，所属分类 id |
| ... | 其余现有字段 | id, name, price, image, description, merchantId 等 |

- 列表排序规则：先按分类顺序（分类的创建顺序），再按商品创建顺序（或 `sortOrder`）。

### 4.3 前端展示用结构（示例）

- **分类列表**：`categories: Array<{ id, name }>`，顺序为展示顺序。
- **分组后商品**：`groups: Array<{ category: { id, name }, foods: Food[] }>`，与左侧分类顺序一致，用于渲染多个 CategorySection。

---

## 五、UI 交互说明（分类跳转与高亮）

### 5.1 点击分类 → 滚动到对应区块

- **方式 A（锚点）**：每个 CategorySection 根节点设置 `id="category-${category.id}"`，左侧 CategorySidebar 项用 `<a href="#category-xxx">` 或 `navigate('#category-xxx')`。实现简单，但滚动行为依赖浏览器，可能带默认滚动偏移。
- **方式 B（scroll + ref）**：每个 CategorySection 用 `ref` 或 `data-section-id` 注册到父组件；左侧点击时通过 `ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })` 滚动。便于控制偏移（如预留顶栏高度）和动画。

**建议**：优先采用 **scroll + ref**，便于与「当前可见分类高亮」联动。

### 5.2 当前分类高亮（active 状态）

- **方式 A（仅点击高亮）**：点击左侧某项时，将该项的 `category.id` 设为 `activeId`，该分类对应导航项应用 active 样式；滚动后不随滚动变化。
- **方式 B（滚动联动）**：监听右侧滚动容器的滚动事件，根据各 CategorySection 的位置与视口关系，计算「当前进入视口的第一个区块」对应的分类 id，设为 `activeId`，左侧对应项高亮（scroll spy）。

**建议**：先实现**点击高亮 + 滚动到区块**；若需「滚动时自动高亮当前分类」，再增加 scroll spy 逻辑。

### 5.3 左侧栏滚动

- 若分类较多，左侧栏可独立滚动，或整页滚动时左侧固定（sticky/fixed），仅右侧滚动。具体由布局与 CSS 实现决定。

---

## 六、React 组件结构设计

### 6.1 组件层级（示意）

```
FoodList（页面）
├── MerchantHeader
├── div.food-list-layout（双栏容器）
│   ├── CategorySidebar
│   │   └── 多个「分类项」（button 或 a）
│   └── div.food-list-main（右侧滚动区）
│       ├── CategorySection（category=主食, foods=[...]）
│       │   ├── 分类标题
│       │   └── ul > FoodCard × N
│       ├── CategorySection（category=饮料, foods=[...]）
│       └── ...
└── （空状态时仅 MerchantHeader + 提示）
```

### 6.2 状态与回调（FoodList 页面）

- `categories`：当前商家分类列表（按顺序）。
- `groups`：`{ category, foods }[]`，与分类顺序一致的分组结果。
- `activeCategoryId`：当前高亮分类 id，传给 CategorySidebar 的 `activeId`。
- `handleCategorySelect(id)`：点击左侧分类时调用；更新 `activeCategoryId`，并触发对应 CategorySection 的滚动（通过 ref 或锚点）。

### 6.3 CategorySidebar

- 接收：`categories`、`activeId`、`onSelect(id)`。
- 渲染：列表项点击时调用 `onSelect(category.id)`；项 className 或 aria 根据 `activeId === category.id` 设为 active。

### 6.4 CategorySection

- 接收：`category`、`foods`、可选 `sectionRef` 或 `id`。
- 渲染：带 id/ref 的容器 + 标题 + `foods.map(food => <FoodCard key={food.id} food={food} />)`。
- 不在 CategorySection 内提供「回复」等与帖子评论相关的逻辑，仅展示商品列表。

### 6.5 FoodForm 调整（商家端发布/编辑商品）

- **新增字段**：`category`（或 `categoryId`）。
- **类型**：下拉选择（`<select>`）或单选列表（从该商家的分类列表中选择一项）；若支持「新建分类」，可增加「+ 新建分类」入口，弹窗或内联输入名称后写入列表并选中。
- **校验**：发布/保存时必选一个分类。
- **数据**：提交时 `values` 中带 `categoryId`（或 `category` 为 id）；列表/分组时按 `categoryId` 归属。

---

## 七、与现有设计的关系

- **MerchantHeader**、**FoodCard**、**FoodList 路由**保持不变；仅在 FoodList 内增加「分类数据 + 双栏布局 + CategorySidebar + CategorySection」。
- **FoodCreate / MerchantFoodDetail** 中使用的 **FoodForm** 增加 category 字段与校验；商家端「菜品管理」列表若需按分类展示，可复用同一套分类与分组逻辑，或先保持一维列表再迭代。

---

## 八、总结表

| 输出项 | 内容 |
|--------|------|
| 新增组件 | CategorySidebar（分类导航）、CategorySection（分类标题 + FoodCard 列表） |
| FoodList 结构 | MerchantHeader + 双栏（CategorySidebar \| 多个 CategorySection） |
| 数据结构 | Category：id, merchantId, name, sortOrder/createdAt；Food 增加 categoryId；分组按分类顺序 + 分类内商品顺序 |
| 交互 | 左侧点击分类 → 滚动到对应区块（ref/scrollIntoView 或锚点）；当前分类 active 高亮；可选 scroll spy |
| React 结构 | FoodList 持有多组 state 与 handleCategorySelect；CategorySidebar / CategorySection 为无状态或受控组件；FoodCard 复用 |

以上为商品分类相关的 UI 与结构设计，实现时按此文档拆分为组件与数据层即可。
