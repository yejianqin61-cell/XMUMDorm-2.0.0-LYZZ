# 广场 & 食堂 RetroUI 全量组件改造计划

> 原则：**复用复用再复用。除非 RetroUI 没有，绝不自己手写。**
> 基准：Phase 0 已完成 Button / Card / Badge / Modal 四件套替换。

---

## 一、全景盘点

### 1.1 食堂模块（13 页 + 5 Feature + 12 组件）

| 页面 | 行数 | 当前自写 UI 依赖 |
|---|---|---|
| CanteenHome | ~30 | Banner轮播(Carousel) + 区域网格(Card) + 吃啥(Button) + 排行榜(Tab) |
| CanteenArea | ~200 | 全定制（拖拽编辑区 + 贴图），**不纳入改造** |
| CanteenSearch | ~150 | Input(搜索) + Tab(分类) + Card(结果) |
| CanteenBannerManage | ~500 | Card + Button + 图片上传（管理端，低优先级）|
| FoodList | ~350 | CategorySidebar(Tab) + CategorySection(Accordion) + FoodCard(Card) |
| FoodDetail | ~350 | Card + Button + Badge + ReviewCard(Card复合) + Modal |
| FoodReviewPublish | ~120 | Radio(评级) + Textarea(评论) + Button |
| FoodCreate | ~100 | **FoodForm**: Input ×3 + Select ×2 + Textarea + Button |
| FoodManage | ~100 | FoodCard(Card) ×N + Button |
| FoodShopHot | ~100 | MerchantHeader(Avatar+Card) + FoodCard(Card) + Loader |
| MerchantList | ~100 | Card(商家/产品) + Badge(营业状态) + Tab(筛选) + AreaCard |
| MerchantFoodDetail | ~150 | Card + Input + Select + Textarea + Button |
| MerchantShopEdit | ~150 | Card + Avatar(logo) + Input ×3 + Textarea + Button |

**食堂 Feature 组件：**

| Feature | 当前实现 | RetroUI 目标 |
|---|---|---|
| CanteenBannerCarousel | 自写轮播 + CSS 动画 | **Carousel** |
| CanteenRegionGrid | 自写 Grid + Link | Card 包裹 |
| CanteenPickMeal | 自写骰子动画 + Card | Card + Button + **Loader** |
| CanteenHomeRankings | 自写 Tab + rank badge | **Tab** + Card + Badge |
| CanteenFoodSquare | 帖子列表卡片 | Card + Button |

**食堂业务组件：**

| 组件 | 当前实现 | RetroUI 目标 |
|---|---|---|
| FoodCard | BEM Card + Image + Badge/评分 | Card + Badge + **Tooltip** |
| FoodDetailView | 图片轮播 + 信息区 + 评论区 | Card + Carousel + Dialog |
| FoodForm | Input + Select + Textarea + ImageUpload | **Input** + **Select** + **Textarea** |
| MerchantCard | BEM Card + logo + info | Card + **Avatar** + Badge |
| MerchantHeader | Card + logo + info + action | Card + **Avatar** + Badge + **Tooltip** |
| ReviewCard | Card + rating + content | Card + Badge |
| StoreForm | Input ×N + Textarea | **Input** + **Textarea** |
| CategorySection | 自写折叠列表 | **Accordion** |
| CategorySidebar | 自写垂直Tab | **Tab** (vertical) |
| CanteenSearchBar | 自写搜索框 | **Input** + icon |
| AreaCard | BEM Card + area info | Card |
| StackedCardCarousel | 自写堆叠动画 | **Carousel** |

### 1.2 广场模块（15 页 + 12 Square组件）

| 页面 | 行数 | 当前自写 UI 依赖 |
|---|---|---|
| SquareHome | ~130 | Hero + ModuleGrid(Card) + HotTopics(Card) + HotActivities(Card) + TrendingBoard + QuickActions(Card) |
| SquareTrendingList | ~140 | Tab + Card + Badge + Button |
| SquareTrendingDetail | ~150 | Card + Tab + PostShell(已改造) |
| SquareTrendingPostDetail | ~50 | PostDetailShell ✅ (Phase 0 已改) |
| SquareTrendingPostNew | ~100 | Input + Select + Textarea + Button + ImageUpload |
| SquareCampusFeed | ~150 | Tab + Card + Button(filter) |
| SquareCampusPostNew | ~150 | Input + Select + Textarea + Button + ImageUpload |
| SquareCampusPostDetail | ~50 | PostDetailShell ✅ |
| SquareClub | ~120 | Card + Tab + Button |
| SquareClubPostDetail | ~150 | Card + Tab + Button + 评论区 |
| SquareErrands | ~150 | Card + Badge + Button + Tab |
| SquareSecondHand | ~250 | Card + Badge + ImagePreview + Tab |
| SquareFreshmanGuide | ~200 | Card + Accordion(话题展开) |
| SquareOrgAdmin | ~300 | Tab + Card + Button + Input(管理端) |

**广场 Square 组件：**

| 组件 | 当前实现 | RetroUI 目标 |
|---|---|---|
| TodayCampusHero | 自写 Hero banner + 渐变 | Card + Button + Badge |
| TodayCampusSummary | 自写 digest card | Card |
| TodayCampusModuleGrid | Grid + Card ×N | Card |
| TodayCampusHotTopics | Card list + rank | Card + Badge(序号) |
| TodayCampusHotActivities | Card list | Card + Badge(状态) |
| TodayCampusTrendingBoard | 自写排行列表 | Card + **Tab** + Badge |
| TodayCampusQuickActions | 自写 icon grid | Card + Button(icon) |
| InterestRecommendationBlock | 自写推荐卡片 | Card + Badge |
| RelatedCampusTopicsBlock | 推荐关联 | Card + Badge |
| MyCampusRecommendations | 个性化推荐 | Card + Badge |
| HotTagsStrip | 标签横向滚动条 | **ToggleGroup** / Badge |

### 1.3 跨模块共享 UI（仍用旧样式）

| 组件 | 文件 | 当前样式 | RetroUI 目标 |
|---|---|---|---|
| Input | ui/Input.jsx | BEM input + iOS | **retroui/Input** |
| Select | ui/Select.jsx | BEM select | **retroui/Select** |
| Textarea | ui/Textarea.jsx | BEM textarea | **retroui/Textarea** |
| Tag | ui/Tag.jsx | BEM tag | 合并入 Badge |
| Toast | ui/Toast.jsx | 自定义 Toast | **Sonner** |
| EmptyState | ui/EmptyState.jsx | 自定义空状态 | **retroui/Empty** |
| PageSkeleton | ui/PageSkeleton.jsx | 骨架屏 | **Loader** + 自定义 |
| ErrorState | ui/ErrorState.jsx | 错误提示 | **Alert / Empty** |
| AppCard | ui/AppCard.jsx | 应用卡片 | Card + Badge |
| MediaCard | ui/MediaCard.jsx | 媒体卡片 | Card |
| MetricCard | ui/MetricCard.jsx | 指标卡片 | Card |
| InfoCard | ui/InfoCard.jsx | 信息卡片 | Card |
| ActionCard | ui/ActionCard.jsx | 操作卡片 | Card + Button |
| FadeInSection | ui/FadeInSection.jsx | 淡入动画 | framer-motion 保留 |
| RouteTransition | ui/RouteTransition.jsx | 路由过渡 | framer-motion 保留 |

---

## 二、RetroUI 组件库可用清单

以下 35 个 RetroUI 组件均可从源码提取：

| 类别 | 组件 | Phase 0 已装 | 后续需安装 |
|---|---|---|---|
| **基础** | Button | ✅ | — |
| **基础** | Card | ✅ | — |
| **基础** | Badge | ✅ | — |
| **基础** | Dialog/Modal | ✅ | — |
| **表单** | Input | | P1 |
| **表单** | Textarea | | P1 |
| **表单** | Select | | P1 |
| **表单** | Checkbox | | P5 |
| **表单** | Radio | | P5 |
| **表单** | Switch | | P5 |
| **表单** | Slider | | P5 |
| **表单** | Label | | P1 |
| **表单** | Calendar | | P5 |
| **导航** | Tab | | P2 |
| **导航** | ToggleGroup | | P2 |
| **导航** | Toggle | | P2 |
| **导航** | Breadcrumb | | P4 |
| **导航** | Menu | | P4 |
| **导航** | Context-menu | | P4 |
| **导航** | Command | | P5 |
| **导航** | TOC | | P5 |
| **展示** | Carousel | | P2 |
| **展示** | Avatar | | P4 |
| **展示** | Tooltip | | P4 |
| **展示** | Popover | | P4 |
| **展示** | Accordion | | P3 |
| **展示** | Text | | P3 |
| **展示** | Table | | P5 |
| **反馈** | Sonner (Toast) | | P3 |
| **反馈** | Empty | | P3 |
| **反馈** | Alert | | P3 |
| **反馈** | Loader | | P3 |
| **反馈** | Progress | | P5 |
| **图表** | Charts (4种) | | P5 |
| **布局** | Drawer | | P5 |

---

## 三、Phase 拆解

```
Phase 0 ████████████████████ ✅ 已完成
Phase 1 ░░░░░░░░░░░░░░░░░░░░ 表单三件套 + Label
Phase 2 ░░░░░░░░░░░░░░░░░░░░ 导航三件套 + Carousel
Phase 3 ░░░░░░░░░░░░░░░░░░░░ 反馈五件套 + Accordion/Text
Phase 4 ░░░░░░░░░░░░░░░░░░░░ 食堂全线改造
Phase 5 ░░░░░░░░░░░░░░░░░░░░ 广场全线改造
Phase 6 ░░░░░░░░░░░░░░░░░░░░ 锦上添花（余下组件 + 精修）
```

---

## Phase 1 — 表单系统 (Input / Textarea / Select / Label)

**目标**：食堂 & 广场所有表单页面接入 RetroUI 表单组件。

**RetroUI 源码依赖**：`Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Label.tsx`
**现有适配目标**：`ui/Input.jsx`, `ui/Textarea.jsx`, `ui/Select.jsx`, 新增 Label

### Task 1.1 — 安装 Input 组件
- [ ] 从 RetroUI 提取 `Input.tsx` → `components/retroui/Input.jsx`
- [ ] 创建适配器 `ui/Input.jsx`，映射现有 API（`size`, `error`, `placeholder`, `iconLeft/Right`, `disabled`）
- [ ] 验证：确保所有 `import Input from '../ui/Input'` 不变
- **影响范围**：FoodForm, FoodCreate, MerchantShopEdit, CanteenSearchBar, PostNew, SquareCampusPostNew, SquareTrendingPostNew, 登录注册页

### Task 1.2 — 安装 Textarea 组件
- [ ] 从 RetroUI 提取 `Textarea.tsx` → `components/retroui/Textarea.jsx`
- [ ] 创建适配器 `ui/Textarea.jsx`，映射现有 API
- [ ] 验证：FoodReviewPublish, FoodForm, PostNew 等页面
- **影响范围**：FoodReviewPublish, FoodCreate, MerchantFoodDetail, PostNew

### Task 1.3 — 安装 Select 组件
- [ ] 从 RetroUI 提取 `Select.tsx` → `components/retroui/Select.jsx`
- [ ] 创建适配器 `ui/Select.jsx`（RetroUI Select 基于 Base UI，需简化）
- [ ] 验证：FoodForm 分类选择、PostNew 标签选择
- **影响范围**：FoodForm, FoodCreate, PostNew, SquareCampusPostNew

### Task 1.4 — 安装 Label 组件（新增）
- [ ] 从 RetroUI 提取 `Label.tsx` → `components/retroui/Label.jsx`
- [ ] 新增 `ui/Label.jsx`
- [ ] 替换页面上 `<label className="...">` 为 `<Label>`
- **影响范围**：所有表单页面

### Task 1.5 — 合并 Tag 进 Badge
- [ ] 检查 Tag 的所有 tone/variant 组合
- [ ] Badge 补齐缺失的 tone 映射
- [ ] 将 `ui/Tag.jsx` 改为 re-export Badge
- **影响范围**：全站所有 Tag 使用处

**Phase 1 估时**：2-3h
**依赖**：Phase 0（已完成）
**验收**：vite build 零错误，全部表单页面样式统一为新粗野

---

## Phase 2 — 导航与轮播 (Tab / ToggleGroup / Toggle / Carousel)

**目标**：食堂首页和广场的导航切换 + 轮播全部 RetroUI 化。

**RetroUI 源码依赖**：`Tab.tsx`, `ToggleGroup.tsx`, `Toggle.tsx`, `Carousel.tsx`

### Task 2.1 — 安装 Tab 组件
- [ ] 从 RetroUI 提取 `Tab.tsx` → `components/retroui/Tab.jsx`
- [ ] 新增 `ui/Tab.jsx` 统一导出
- [ ] 替换 CanteenHomeRankings 的 Tab 实现
- [ ] 替换 CanteenSearch 的分类 Tab
- [ ] 替换 FoodList/CategorySidebar 的分组 Tab
- [ ] 替换 SquareTrendingList 的类型 Tab
- [ ] 替换 SquareCampusFeed 的 Tab 筛选
- [ ] 替换 SquareHome 各区块的 Tab
- **影响范围**：CanteenHome, CanteenSearch, FoodList, SquareHome, SquareTrending, SquareCampusFeed, SquareClub, SquareErrands

### Task 2.2 — 安装 ToggleGroup / Toggle 组件
- [ ] 从 RetroUI 提取 `ToggleGroup.tsx`, `Toggle.tsx`
- [ ] 新增 `ui/ToggleGroup.jsx`
- [ ] 替换 HotTagsStrip（标签横向切换）→ ToggleGroup
- [ ] 替换 TodayCampusModuleGrid 的切换按钮 → ToggleGroup
- **影响范围**：SquareHome 组件族

### Task 2.3 — 安装 Carousel 组件
- [ ] 从 RetroUI 提取 `Carousel.tsx` → `components/retroui/Carousel.jsx`
- [ ] 适配 CanteenBannerCarousel → 直接替换为 Carousel
- [ ] 检查 SquareHome Hero 是否可用 Carousel
- [ ] 替换 StackedCardCarousel → Carousel（或保留堆叠动画作为 variant）
- **影响范围**：CanteenHome (Banner), FoodDetailView (图片轮播), SquareHome (Hero)

**Phase 2 估时**：3-4h
**依赖**：Phase 0 ✅, Phase 1（无硬依赖，可并行）
**验收**：食堂首页轮播/排行榜/分类切换全部 RetroUI 风格

---

## Phase 3 — 反馈系统 (Toast / Empty / Alert / Loader / Accordion / Text)

**目标**：全站反馈态统一为新粗野风格。

**RetroUI 源码依赖**：`Sonner.tsx`, `Empty.tsx`, `Alert.tsx`, `Loader.tsx`, `Accordion.tsx`, `Text.tsx`

### Task 3.1 — 安装 Sonner (Toast)
- [ ] 安装 `sonner` npm 包
- [ ] 提取 RetroUI Sonner 配置 → `components/retroui/Sonner.jsx`
- [ ] 替换 `ui/Toast.jsx` → 适配现有 `toast.success()` / `toast.error()` API
- [ ] 在 App.jsx 挂载 `<Toaster />`
- **影响范围**：全站所有 toast 调用

### Task 3.2 — 安装 Empty 组件
- [ ] 从 RetroUI 提取 `Empty.tsx` → `components/retroui/Empty.jsx`
- [ ] 改造 `ui/EmptyState.jsx` → 内部用 Empty，保留 `title/description/action` props
- **影响范围**：全站空状态（FoodList 空菜品、CanteenSearch 无结果、Square 各列表空态）

### Task 3.3 — 安装 Alert 组件
- [ ] 从 RetroUI 提取 `Alert.tsx` → `components/retroui/Alert.jsx`
- [ ] 改造 `ui/ErrorState.jsx` → 内部用 Alert variant="destructive"
- **影响范围**：全站错误状态

### Task 3.4 — 安装 Loader 组件
- [ ] 从 RetroUI 提取 `Loader.tsx` → `components/retroui/Loader.jsx`
- [ ] 新建 `ui/Loader.jsx`
- [ ] 逐步替换 PageSkeleton 的 loader 部分
- **影响范围**：CanteenPickMeal(loading), FoodShopHot(loading), FoodManage(loading), 全站 loading 态

### Task 3.5 — 安装 Accordion + Text 组件
- [ ] 提取 `Accordion.tsx`, `Text.tsx` → `components/retroui/`
- [ ] 替换 FoodList/CategorySection 的折叠分组
- [ ] 替换 SquareFreshmanGuide 的话题展开
- [ ] Text 用于统一排版（标题/正文层级）
- **影响范围**：FoodList, SquareFreshmanGuide, 全站排版

**Phase 3 估时**：3-4h
**依赖**：Phase 0 ✅
**验收**：全站 toast/loading/empty/error 状态全部统一

---

## Phase 4 — 食堂全线改造

**目标**：食堂所有页面串联 Phase 0-3 的新组件，逐页检查并改造。

### Task 4.1 — CanteenHome 首页串联
- [ ] 审查 CanteenHome 引入的所有 Feature
- [ ] CanteenBannerCarousel → Carousel
- [ ] CanteenHomeRankings → Tab + Card + Badge
- [ ] CanteenRegionGrid → Card 包裹
- [ ] CanteenPickMeal → Card + Button + Loader
- [ ] CanteenFoodSquare → Card + Button
- [ ] CSS 清理（删除 CanteenHome.css 废弃样式）

### Task 4.2 — 菜品体系改造
- [ ] FoodList：CategorySidebar → Tab(vertical) + CategorySection → Accordion
- [ ] FoodCard：Card + Badge + Tooltip，删除 FoodCard.css 废弃样式
- [ ] FoodDetail：串联 Card + Button + Badge + Loader + Modal（图片预览）
- [ ] FoodDetailView：图片区用 Carousel，信息区用 Card
- [ ] FoodReviewPublish：Radio → 复古 Badge-toggle + Textarea + Button
- [ ] ReviewCard：Card + Badge(评分)

### Task 4.3 — 商家体系改造
- [ ] MerchantList：商家卡用 Card + Avatar + Badge(营业中)
- [ ] MerchantHeader：Card + Avatar + Badge + Tooltip
- [ ] MerchantFoodDetail：Card + Input + Select + Textarea + Button
- [ ] MerchantShopEdit：Card + Avatar(logo) + Input ×3 + Textarea + Button
- [ ] AreaCard：Card + Badge(area tag)

### Task 4.4 — 表单体系改造
- [ ] FoodCreate：Input + Select + Textarea + Button 全部串联
- [ ] FoodManage：FoodCard(Card) ×N + Button
- [ ] FoodShopHot：串联 Loader + Empty + MerchantHeader + FoodCard
- [ ] CanteenSearch：Input + Tab + Card
- [ ] CanteenBannerManage：Card + Button

### Task 4.5 — 食堂 CSS 瘦身
- [ ] 删除各 CSS 文件中已被 RetroUI 代替的样式块
- [ ] 保留布局类 CSS（grid, flex, spacing）
- [ ] 保留特效类 CSS（CanteenPickMeal 骰子动画、CanteenArea 拖拽地图）

**Phase 4 估时**：4-5h
**依赖**：Phase 0 ✅, Phase 1-3
**验收**：食堂 13 页全部 RetroUI 风格，零自写按钮/卡片/表单样式

---

## Phase 5 — 广场全线改造

**目标**：广场所有页面串联 Phase 0-3 的新组件，逐页检查并改造。

### Task 5.1 — SquareHome 首页串联
- [ ] TodayCampusHero → Card + Button + Badge
- [ ] TodayCampusSummary → Card
- [ ] TodayCampusModuleGrid → 6x Card 网格
- [ ] TodayCampusHotTopics → Card + Badge(序号 1-5)
- [ ] TodayCampusHotActivities → Card + Badge(状态)
- [ ] TodayCampusTrendingBoard → Card + Tab
- [ ] TodayCampusQuickActions → Card + Button(icon)
- [ ] InterestRecommendationBlock → Card + Badge
- [ ] HotTagsStrip → ToggleGroup / Badge 横滚
- [ ] CSS 清理（SquareHome.css）

### Task 5.2 — 榜单/信息流改造
- [ ] SquareTrendingList → Tab + Card + Badge
- [ ] SquareTrendingDetail → Card + Tab（PostDetailShell 已改造 ✅）
- [ ] SquareTrendingPostNew → Input + Select + Textarea + Button
- [ ] SquareCampusFeed → Tab + Card + Button(filter)
- [ ] SquareCampusPostNew → Input + Select + Textarea + Button

### Task 5.3 — 子频道改造
- [ ] SquareClub → Card + Tab + Button
- [ ] SquareErrands → Card + Badge(紧急/类型) + Tab
- [ ] SquareSecondHand → Card + Badge(价格/成色) + ImagePreview(Dialog)
- [ ] SquareFreshmanGuide → Card + Accordion

### Task 5.4 — 管理端改造
- [ ] SquareOrgAdmin → Tab + Card + Button + Input

### Task 5.5 — 广场 CSS 瘦身
- [ ] 删除 SquareTrendingList.css / 页面级废弃样式
- [ ] 保留动画/过渡（framer-motion 部分不动）
- [ ] 审查 PostDetailShell.css（Phase 0 已清理过，复查）

**Phase 5 估时**：4-5h
**依赖**：Phase 0-3 ✅, Phase 4
**验收**：广场 15 页全部 RetroUI 风格

---

## Phase 6 — 锦上添花（可选）

**目标**：安装剩余 RetroUI 组件，精修关键体验。

### Task 6.1 — 信息提示增强
- [ ] 安装 **Tooltip** → `retroui/Tooltip.jsx`
- [ ] 安装 **Popover** → `retroui/Popover.jsx`
- [ ] 安装 **Menu** + **Context-menu** → `retroui/`
- [ ] 替换 MerchantHeader 商家信息 tooltip
- [ ] 替换 SquareHome 各模块快捷操作 popover

### Task 6.2 — 更多原子组件
- [ ] Avatar、Checkbox、Radio、Switch、Slider、Progress
- [ ] Breadcrumb（面包屑导航）
- [ ] Calendar（日历 → Schedule 页面）
- [ ] Command（搜索面板）
- [ ] Charts（数据图表 → 统计面板）

### Task 6.3 — 精修与一致性
- [ ] 全局色板审查（确保 --ru-* 变量全部到位）
- [ ] Dark mode 适配（RetroUI 自带 dark theme）
- [ ] 响应式断点对齐
- [ ] 动画/过渡一致性
- [ ] 可访问性审计（focus-visible, aria labels）

**Phase 6 估时**：3-4h
**依赖**：Phase 0-5
**验收**：全站 RetroUI 覆盖率 >95%

---

## 四、全局时间线

```
Phase 0  ████████████████████████████████  ✅ 已完成  (2h)
Phase 1  ████████████████████░░░░░░░░░░░░  🔲 表单    (2-3h)
Phase 2  ████████████████████░░░░░░░░░░░░  🔲 导航    (3-4h)
Phase 3  ████████████████████░░░░░░░░░░░░  🔲 反馈    (3-4h)
Phase 4  ████████████████████░░░░░░░░░░░░  🔲 食堂    (4-5h)
Phase 5  ████████████████████░░░░░░░░░░░░  🔲 广场    (4-5h)
Phase 6  ████████████████████░░░░░░░░░░░░  🔲 精修    (3-4h)
        ─────────────────────────────────
总计：  ~21-27h（约 3-4 个工作日）
```

### 依赖图

```
Phase 0 (Button/Card/Badge/Modal) ✅
  ├── Phase 1 (Input/Textarea/Select/Label) ──┐
  ├── Phase 2 (Tab/Toggle/Carousel) ──────────┤
  └── Phase 3 (Toast/Empty/Alert/Loader) ─────┤
                                               ├── Phase 4 (食堂全线)
                                               └── Phase 5 (广场全线)
                                                     └── Phase 6 (精修)
```

Phase 1/2/3 可并行推进（互相无依赖），Phase 4/5 串行依赖前三者。

---

## 五、风险与对策

| 风险 | 级别 | 对策 |
|---|---|---|
| RetroUI Select 依赖 Base UI，移植复杂 | 中 | 简化为基础 select+styled div，放弃虚拟滚动等高级特性 |
| Carousel 与现有轮播 API 不兼容 | 中 | 先替换简单的 Banner 轮播，复杂轮播保留渐进改造 |
| Toast → Sonner 迁移需改调用方式 | 低 | 在 ui/Toast.jsx 内封装兼容层，外部调用不变 |
| CategorySidebar 竖排 Tab 动画复杂 | 低 | RetroUI Tab 支持 orientation="vertical" |
| 食堂/广场页面在改造期间不能中断 | 低 | 每个 Phase 独立 commit+PR，可单独 revert |
| CSS 瘦身可能误删仍有用的样式 | 中 | 每个 CSS 文件先注释后删除，build 验证后再移除 |

---

## 六、成功标准

- [x] Phase 0：Button/Card/Badge/Modal 四件套 ✅
- [ ] Phase 1-3 完成：13 个 RetroUI 组件安装 + 适配器就绪
- [ ] Phase 4-5 完成：食堂 13 页 + 广场 15 页全线 RetroUI 化
- [ ] Phase 6 完成：全站 >95% UI 由 RetroUI 驱动
- [ ] 全 Phase `vite build` 零错误
- [ ] 零新增自定义 CSS（除非 RetroUI 无对应组件）
- [ ] 每个 Phase 独立 PR，可 review 可 revert