# Step3-页面模板层实施级详细设计文档

## 1. 文档目标

本文用于承接 `docs/09-Deploy/Web前端迁移步骤与开发顺序说明.md` 中的 Step 3。

这份文档不再停留在“为什么要做模板层”的说明，而是直接回答下面几个实施问题：

- 模板层在当前前端架构里的边界是什么
- 首批页面模板到底有哪些，分别负责什么
- 每个模板组件建议暴露哪些插槽和 props
- 模板层和 Step 4 主壳的关系如何划分
- 后续页面迁移时，应该怎样套模板、怎样验收、怎样识别做错了

本文默认前提：

- 仅治理 `frontend/`
- 不改 `frontend-app/`
- 不改后端接口与 `shared/*` API 共享层
- 模板层只解决页面结构复用，不承接业务逻辑

## 2. 当前现状

### 2.1 已有基础

在进入 Step 3 前，项目里已经具备：

- Step 1 设计 Token 层
- Step 2 基础 UI 组件层
- 首批 Web 视觉语言与桌面化规范文档

当前仓库中，模板层组件也已经实际存在于：

- `frontend/src/components/templates/PageHeader.jsx`
- `frontend/src/components/templates/SectionHeader.jsx`
- `frontend/src/components/templates/FilterBar.jsx`
- `frontend/src/components/templates/ListPageLayout.jsx`
- `frontend/src/components/templates/DetailPageLayout.jsx`
- `frontend/src/components/templates/FormPageLayout.jsx`
- `frontend/src/components/templates/DashboardPageLayout.jsx`
- `frontend/src/components/templates/AdminPageLayout.jsx`

这说明 Step 3 已经不是纯规划阶段，而是进入“结构收口与标准固化”阶段。

### 2.2 当前仍存在的问题

虽然模板文件已经存在，但如果没有统一设计约束，后续仍然会出现这些问题：

- 同类页面仍然可能各写各的结构
- 页面级 CSS 反向覆盖模板结构，导致模板名义复用、实际上未复用
- 模板 props 越加越多，逐渐业务化
- Step 4 主壳与页面模板边界混乱，出现双重布局控制

所以本轮文档的核心不是“新增几个 layout 文件”，而是把模板层的职责和使用方式定死。

## 3. 模板层定位

建议把 `frontend/` 前端结构固定理解为四层：

1. `styles / token` 层
   负责颜色、字号、间距、阴影、圆角、动效等设计变量。
2. `components/ui` 层
   负责 Button、Card、Input、Tag、Badge、Toast、EmptyState 等基础件。
3. `components/templates` 层
   负责页面结构，不负责业务逻辑。
4. `pages / 业务组件` 层
   负责请求、状态、权限、数据组织、页面行为。

模板层的唯一职责是：

- 固定页面分区
- 固定信息主次
- 固定桌面端内容密度和布局节奏
- 给页面提供统一结构插槽

模板层明确不负责：

- 请求接口
- React Query / 状态管理
- 登录态与权限判断
- 提交、删除、弹窗控制
- 任何只服务单一业务页的特殊逻辑

## 4. 设计原则

### 4.1 结构复用优先于业务复用

要复用的是“页面骨架”，不是“某个模块的内容实现”。

正确方向：

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`

错误方向：

- `SquareTrendingLayout`
- `MerchantSpecialLayout`
- `FoodAdminDetailLayout`

### 4.2 插槽优先于业务型 props

模板层优先开放 JSX 插槽，而不是塞大量业务开关。

优先保留：

- `header`
- `filterBar`
- `list`
- `content`
- `aside`
- `actions`

谨慎新增：

- `withMerchantHeader`
- `showTreeHoleTips`
- `enableFoodReviewMode`

判断标准很简单：如果一个 prop 只服务 1 个页面，它就不该进入模板层。

### 4.3 桌面化优先，但必须允许移动回落

模板层是给 Web 桌面化治理服务的，因此默认应优先支持：

- 页面头部
- 主内容列
- 可选右侧辅助列
- 区块化阅读节奏

但同时必须保证：

- 中屏可以自然换行
- 小屏可以回落为单列
- 不强行把桌面多栏压给移动端

### 4.4 页面模板不与主壳抢职责

Step 3 模板层解决的是“页内结构”，Step 4 主壳解决的是“全局骨架”。

模板层不应处理：

- 全局顶部导航
- 全局左侧导航
- 全局右侧站点辅助栏
- 路由级壳切换

主壳也不应反向定义页面内部的 header、filter、detail 结构。

## 5. 模板目录与命名规范

模板统一放在：

```text
frontend/src/components/templates/
```

文件命名统一使用组件名直出：

```text
PageHeader.jsx
PageHeader.css
FilterBar.jsx
FilterBar.css
```

class 命名统一使用模板前缀：

- `.page-header`
- `.section-header`
- `.filter-bar`
- `.list-page-layout`
- `.detail-page-layout`
- `.form-page-layout`
- `.dashboard-page-layout`
- `.admin-page-layout`

禁止：

- 在模板内部掺入具体页面名 class
- 用业务模块 class 反向主导模板结构

## 6. 首批模板清单

### 6.1 结构片段模板

- `PageHeader`
- `SectionHeader`
- `FilterBar`

这类模板的特点是：

- 粒度小
- 高频复用
- 服务于多个页面类型

### 6.2 页面骨架模板

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`
- `DashboardPageLayout`
- `AdminPageLayout`

这类模板的特点是：

- 决定页面主要信息架构
- 决定主次区域关系
- 是页面桌面化改造的主要抓手

## 7. 单个模板的实施级设计

## 7.1 PageHeader

### 职责

- 提供页面级标题区
- 承载返回入口、眉标题、说明文字、元信息、主操作

### 当前代码接口

当前组件已存在的核心 props：

- `title`
- `description`
- `eyebrow`
- `backTo`
- `backLabel`
- `actions`
- `meta`
- `className`

### 推荐结构

```text
PageHeader
  Back
  Top
    Main
      Eyebrow
      Title
      Description
      Meta
    Actions
```

### 使用边界

- `actions` 只放页面主操作，不放复杂筛选区
- `meta` 放轻量状态信息，不放大块业务内容
- 页面标题层级统一，不允许每页各写一套标题语义

### 适用页面

- 发布中心
- 详情页
- 表单页
- 工作台页
- 后台页

## 7.2 SectionHeader

### 职责

- 提供页面内部二级区块标题
- 统一区块说明与轻操作位置

### 建议接口

- `title`
- `description`
- `action`
- `aside`
- `compact`
- `className`

### 使用边界

- 不承担页面返回逻辑
- 不承担全页主操作
- 只服务局部内容区块

## 7.3 FilterBar

### 职责

- 统一列表页、搜索页、后台页的筛选工具区

### 当前代码接口

当前组件已存在的核心 props：

- `search`
- `filters`
- `sort`
- `viewSwitcher`
- `actions`
- `sticky`
- `className`

### 推荐结构

```text
FilterBar
  Top
    Search
    Utility
      Sort
      ViewSwitcher
      Actions
  Filters
```

### 使用边界

- 模板本身不内置任何业务筛选项
- `filters` 推荐直接传 JSX，而不是继续堆专用 props
- 中屏下允许换行，小屏下允许堆叠

## 7.4 ListPageLayout

### 职责

- 提供标准列表页骨架
- 统一“头部 + 筛选 + 主列表 + 可选右栏 + 页脚”的桌面节奏

### 当前代码接口

当前组件已存在的核心 props：

- `header`
- `filterBar`
- `list`
- `aside`
- `footer`
- `className`
- `contentClassName`
- `mainClassName`
- `asideClassName`
- `asideSticky`

### 推荐结构

```text
ListPageLayout
  Header
  FilterBar
  Content
    Main
      List
    Aside
  Footer
```

### 使用边界

- `list` 必须始终是阅读主轴
- `aside` 是补充信息，不应反客为主
- 页面自己的 CSS 只能修内容表现，不应改掉模板主网格结构

### 典型页面

- `SquareTrendingList`
- `SquareCampusFeed`
- `MerchantList`
- `MyPosts`
- `MyReviews`

## 7.5 DetailPageLayout

### 职责

- 提供详情页标准骨架
- 统一“头部 + 正文 + 元信息 + 评论 + 可选右栏”的阅读结构

### 当前代码接口

当前组件已存在的核心 props：

- `header`
- `hero`
- `content`
- `meta`
- `comments`
- `aside`
- `className`
- `mainClassName`
- `asideClassName`
- `asideSticky`

### 推荐结构

```text
DetailPageLayout
  Header
  ContentGrid
    Main
      Hero
      Content
      Meta
      Comments
    Aside
```

### 使用边界

- 正文宽度必须受控
- 评论区与补充信息区不能打断正文阅读主轴
- 页面级细碎模块不应回退成“大段 div 堆叠”

### 典型页面

- `PostDetail`
- `FoodDetail`
- `MarketplaceDetail`
- `ClubProfile`

## 7.6 FormPageLayout

### 职责

- 提供发布、创建、编辑类页面的标准表单结构

### 当前代码接口

当前组件已存在的核心 props：

- `header`
- `notice`
- `sections`
- `actions`
- `aside`
- `className`
- `asideSticky`

### 推荐结构

```text
FormPageLayout
  Header
  ContentGrid
    Main
      Notice
      Sections
    Aside
  Actions
```

### 使用边界

- `sections` 应按区块组织，不鼓励整页随意堆表单项
- `actions` 作为统一提交区出口，不再每页另造一套提交结构
- 小屏必须能安全回落为单列

### 典型页面

- `PostNew`
- `MarketplacePublish`
- `PublishErrand`
- `ProfileEdit`
- `FoodCreate`

## 7.7 DashboardPageLayout

### 职责

- 解决“总览 + 指标 + 快捷入口 + 主工作区”的工作台节奏

### 当前代码接口

当前组件已存在的核心 props：

- `summary`
- `stats`
- `quickActions`
- `main`
- `secondary`
- `footer`
- `className`
- `contentClassName`

### 推荐结构

```text
DashboardPageLayout
  Summary
  Stats
  QuickActions
  Content
    Main
    Secondary
  Footer
```

### 使用边界

- 模板不处理登录态、课程逻辑、Todo 逻辑
- 只负责把“总览、入口、状态”这几类内容排出稳定结构
- 视觉上允许更轻松、活泼，但不能回到移动端长列表式堆叠

### 首批代表页

- `MyZone`

## 7.8 AdminPageLayout

### 职责

- 解决后台管理页的高密度内容结构
- 统一标题区、工具条、主内容区、可选辅助区

### 当前代码接口

当前组件已存在的核心 props：

- `header`
- `toolbar`
- `content`
- `aside`
- `footer`
- `mode`
- `className`
- `contentClassName`
- `asideClassName`
- `asideSticky`

### 推荐结构

```text
AdminPageLayout
  Header
  Toolbar
  ContentGrid
    Content
    Aside
  Footer
```

### mode 预留建议

- `default`
- `dense`
- `split`

第一个版本允许只实现 `default`，其余作为语义预留。

### 使用边界

- 不在模板内部承接 tab 业务逻辑
- 不承接增删改查逻辑
- 不承接具体表单字段实现
- 共享 token，但视觉气质可比主站更克制

### 首批代表页

- `SquareOrgAdmin`
- 后续 `pages/Admin/*`

## 8. 页面映射矩阵

| 模板 | 首批验证页 | 迁移目标 |
| --- | --- | --- |
| `PageHeader` | `PublishCenter.jsx` | 统一页面标题区 |
| `SectionHeader` | 首页板块 / 工作台分区 | 统一二级区块标题 |
| `FilterBar` | `CourseReviewPage.jsx` | 统一搜索筛选工具区 |
| `ListPageLayout` | `MerchantList.jsx` | 统一列表页主结构 |
| `DetailPageLayout` | `FoodDetail.jsx` | 统一详情页阅读结构 |
| `FormPageLayout` | `PostNew.jsx` | 统一表单页骨架 |
| `DashboardPageLayout` | `MyZone.jsx` | 统一工作台页结构 |
| `AdminPageLayout` | `SquareOrgAdmin.jsx` | 统一后台页结构 |

第二轮扩散验证建议继续覆盖：

- `SquareTrendingList.jsx`
- `PostDetail.jsx`
- `ProfileEdit.jsx`
- `MyPosts.jsx`
- `MyReviews.jsx`
- `pages/Admin/AdminDashboard.jsx`

## 9. 与 Step 4 主壳的边界

Step 3 与 Step 4 的关系必须固定如下：

- Step 3 模板层负责页内结构
- Step 4 主壳负责站点级框架

可以理解为：

```text
SiteShell
  ShellHeader / Sidebar / Aside
  ShellContent
    PageTemplate
      PageHeader / FilterBar / Detail / Form / Dashboard / Admin
        BusinessContent
```

这条边界一旦打乱，就会出现：

- 主壳和页面模板都在管宽度
- 主壳和页面模板都在管侧栏
- 页面 CSS 和模板 CSS 互相抢结构控制权

所以后续页面迁移必须先判断“这是壳问题，还是模板问题”，不能混着修。

## 10. 响应式规则

统一按三档处理：

### 10.1 Desktop

- 默认桌面形态
- 允许双列或主列加右侧辅助列
- 强调阅读密度和分区层次

### 10.2 Tablet

- 保留主次结构
- 允许右栏下沉
- 允许 FilterBar 换行

### 10.3 Mobile Fallback

- 所有模板都必须可回落为单列
- 右栏不强保留
- 底部操作区可以保留，但不能遮挡内容

## 11. 推荐开发顺序

建议继续严格遵循下面顺序：

1. `PageHeader`
2. `SectionHeader`
3. `FilterBar`
4. `ListPageLayout`
5. `DetailPageLayout`
6. `FormPageLayout`
7. `DashboardPageLayout`
8. `AdminPageLayout`

每实现或调整一个模板，都要配至少一个代表页做最小接入验证。

## 12. 验收标准

Step 3 通过验收，至少应满足：

1. `components/templates` 下首批模板文件齐全。
2. 模板层不直接写请求逻辑、权限逻辑、提交逻辑。
3. 模板层优先消费 Step 1 token 和 Step 2 基础组件。
4. 至少有列表页、详情页、表单页、工作台页、后台页各 1 个代表页完成接入。
5. 页面迁移时不再从零拼 header、filter、layout。
6. Step 4 主壳接入后，模板层仍能保持职责单一。
7. `npm run build:web` 通过。

## 13. 做错时的典型表征

### 13.1 模板层业务化

表征：

- props 越来越多，且只服务单个页面
- 模板文件里开始出现接口名、模块名、权限分支
- 接一个新页面时必须先改模板源码

### 13.2 名义复用，实际没复用

表征：

- 页面对外包了模板，但内部结构还是各写各的
- `PageHeader`、`FilterBar` 没有真正成为统一入口
- 旧 CSS 越叠越多，模板 CSS 没形成主导

### 13.3 Web 仍然像放大的手机页

表征：

- 列表页没有明确主列与补充列
- 详情页正文和操作区混在一起
- 表单页没有统一提交区，按钮位置每页都不同

### 13.4 主壳和模板打架

表征：

- 壳和模板同时控制内容宽度
- 壳和模板同时定义右栏位置
- 页面自己再加一套最外层布局，导致三层结构重叠

## 14. 待你把关的问题

进入下一轮模板扩散前，建议重点确认这几项：

1. 是否确认 `MyZone` 继续作为 `DashboardPageLayout` 的代表验证页。
2. 是否确认 `SquareOrgAdmin` 继续作为 `AdminPageLayout` 的代表验证页。
3. 是否接受列表页默认采用“主列 + 可选右栏”的桌面结构。
4. 是否接受表单页统一收口到底部操作区。
5. 后台页是否继续采用“共享 token，但视觉更克制”的方向。

## 15. 结论

Step 3 的价值，不是多出一层目录，而是把后续 Web 改版从“逐页重画”推进到“模板化迁移”。

只要这份实施级设计先拍板，后面无论是 Step 4 主壳治理，还是 Step 5 高频页面桌面化迁移，都能按统一结构推进，明显降低返工和样式分裂风险。
