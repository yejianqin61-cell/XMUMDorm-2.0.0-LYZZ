# Step3-页面模板层实施级详细设计文档

## 1. 文档目标

本文档用于继续细化 `docs/09-Deploy/Web前端迁移步骤与开发顺序说明.md` 中的 Step 3。

它不是重复说明“为什么要做模板层”，而是把 Step 3 真正进入实施前需要拍板的内容写死，包括：

- 模板层的职责边界
- 首批模板的统一结构
- 每个模板的插槽与 props 约束
- 模板目录与样式组织规则
- 首批接入页面映射关系
- 开发顺序、验收标准、风险表征

这份文档的目标是让 Step 3 后续开发进入“按文档施工”，而不是“边写边想”。

## 2. 本轮范围

### 2.1 要解决的事

- 统一 Web 页面结构层
- 固定高频页面的桌面化信息架构
- 让页面迁移从“页面里直接拼结构”变成“模板 + 业务内容插槽”
- 为 Step 4 Web 主壳治理提供稳定内容容器

### 2.2 不解决的事

- 不改 `frontend-app/`
- 不抽共享 API 层
- 不改后端接口
- 不在模板层写请求逻辑、权限逻辑、提交逻辑
- 不在本轮统一所有业务页面视觉细节

## 3. 模板层定位

建议把 `frontend/` 的前端结构理解为四层：

1. `styles/token` 层
   负责颜色、间距、圆角、阴影、动效等设计变量。
2. `components/ui` 层
   负责 Button、Card、Input、Tag、Badge、EmptyState 等基础件。
3. `components/templates` 层
   负责页面结构，不负责业务逻辑。
4. `pages` / 业务组件层
   负责数据请求、状态管理、模块内容编排、页面行为。

模板层是“结构层”，不是“新业务层”。

## 4. 统一设计原则

### 4.1 结构复用优先

模板优先复用页面结构，不复用业务内容。

正确方向：

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`

错误方向：

- `SquareTrendingLayout`
- `FoodDetailBusinessLayout`
- `MerchantListSpecialLayout`

### 4.2 插槽优先于巨型 props

模板优先暴露结构插槽，不优先堆积大量业务 props。

优先：

- `header`
- `filterBar`
- `aside`
- `footer`

谨慎：

- `showHotTag`
- `withMerchantMode`
- `enableCommentSummary`

如果一个参数明显只服务某一个业务页面，就不应该进入模板层。

### 4.3 Web 桌面化优先

模板默认优先服务 Web 的桌面信息密度，而不是把移动页直接放大。

因此模板设计必须天然支持：

- 顶部标题区
- 主内容列
- 可选右侧辅助区
- 模块化分区
- 大屏与中屏的响应式退化

### 4.4 模板层不持有业务状态

模板组件不应直接知道：

- 接口返回结构
- React Query key
- 登录态细节
- 管理员权限判断
- 提交和删除逻辑

模板只消费最终已经整理好的 JSX 内容。

## 5. 首批模板清单

本轮 Step 3 统一按两批推进。

### 5.1 第一批核心模板

- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`

### 5.2 第二批预留模板

- `DashboardPageLayout`
- `AdminPageLayout`

说明：

- 第一批解决主站高频内容页
- 第二批解决“我的页面 / 工作台 / 后台管理”这类结构

## 6. 模板分类矩阵

| 模板 | 主要用途 | 典型页面 | 主结构特点 |
| --- | --- | --- | --- |
| `PageHeader` | 页面级标题区 | `PublishCenter` `FoodDetail` `PostNew` | 标题、描述、主操作 |
| `SectionHeader` | 区块级标题区 | 首页板块、列表分组、详情区块 | 标题、说明、右侧轻操作 |
| `FilterBar` | 筛选工具区 | 列表页、搜索页、后台 tab/filter 区 | 搜索、筛选、排序、右侧操作 |
| `ListPageLayout` | 列表页结构 | `MerchantList` `SquareTrendingList` `MyPosts` | 头部 + 筛选 + 列表 + 右栏 |
| `DetailPageLayout` | 详情页结构 | `PostDetail` `FoodDetail` `MarketplaceDetail` | 头部 + 正文 + meta + 右栏 |
| `FormPageLayout` | 表单页结构 | `PostNew` `FoodCreate` `ProfileEdit` | 头部 + 表单区 + 提交操作区 |
| `DashboardPageLayout` | 工作台页结构 | `MyZone` | 总览 + 指标 + 快捷入口 + 主工作区 |
| `AdminPageLayout` | 后台治理结构 | `SquareOrgAdmin` `pages/Admin/*` | 标题 + 工具条 + 管理内容 |

## 7. 单个模板的实施级设计

## 7.1 PageHeader

### 结构职责

- 放页面标题
- 放页面说明
- 放状态信息、标签、面包屑、返回入口
- 放页面主操作按钮

### 建议结构

```text
PageHeader
  Eyebrow / Breadcrumb / Back
  TitleGroup
    Title
    Description
    Meta
  Actions
```

### 建议 props

- `title`
- `description`
- `eyebrow`
- `breadcrumb`
- `backTo`
- `meta`
- `actions`
- `align`
- `className`

### 约束

- 标题层级统一，不允许每页自己乱改字号语义
- 右侧操作最多承载页面主操作，不承载复杂筛选
- 描述区宽度受控，避免超宽文本拖垮头部节奏

## 7.2 SectionHeader

### 结构职责

- 承担页面内部二级标题
- 承担某个内容区块的说明与轻量操作

### 建议结构

```text
SectionHeader
  HeadingGroup
    Title
    Description
  ActionArea
```

### 建议 props

- `title`
- `description`
- `action`
- `aside`
- `compact`
- `className`

### 约束

- 不承担页面级返回逻辑
- 不承担全页主操作
- 只服务局部区块

## 7.3 FilterBar

### 结构职责

- 统一列表页的搜索、筛选、排序、视图切换区

### 建议结构

```text
FilterBar
  Left
    Search
    Filters
  Right
    Sort
    ViewSwitcher
    Actions
```

### 建议 props

- `search`
- `filters`
- `sort`
- `viewSwitcher`
- `actions`
- `sticky`
- `className`

### 约束

- 内部不写死业务筛选项
- 允许传入纯 JSX
- 桌面端优先横向排布，中屏自动换行

## 7.4 ListPageLayout

### 结构职责

- 为“列表型信息流页面”提供标准骨架

### 建议结构

```text
ListPageLayout
  Header
  FilterBar
  Body
    MainColumn
      List
      Footer
    Aside
```

### 建议 props

- `header`
- `filterBar`
- `list`
- `aside`
- `footer`
- `contentWidth`
- `asideWidth`
- `className`
- `contentClassName`

### 布局约束

- 主列表列始终是阅读主轴
- 右侧栏可选，不应反客为主
- 允许“单列桌面模式”和“主列 + 右栏模式”

### 典型接入页

- `MerchantList.jsx`
- `SquareTrendingList.jsx`
- `SquareCampusFeed.jsx`
- `MyPosts.jsx`
- `MyReviews.jsx`

## 7.5 DetailPageLayout

### 结构职责

- 为详情页提供“正文主轴 + 次级信息 + 扩展内容”的标准结构

### 建议结构

```text
DetailPageLayout
  Header
  Hero
  Body
    MainContent
    SideMeta
  Comments
  Related
```

### 建议 props

- `header`
- `hero`
- `content`
- `meta`
- `comments`
- `related`
- `aside`
- `className`
- `contentClassName`

### 布局约束

- 正文列宽必须受控
- 评论区、相关推荐不直接打断正文阅读节奏
- meta 区和操作区优先放右栏或正文下方统一区域

### 典型接入页

- `PostDetail.jsx`
- `FoodDetail.jsx`
- `MarketplaceDetail.jsx`
- `Clubs/ClubProfile.jsx`

## 7.6 FormPageLayout

### 结构职责

- 为发布、编辑、创建类页面提供统一表单骨架

### 建议结构

```text
FormPageLayout
  Header
  Notice
  FormSections
  Aside
  StickyActionBar
```

### 建议 props

- `header`
- `notice`
- `sections`
- `aside`
- `actions`
- `className`
- `contentClassName`

### 布局约束

- 表单区按 section 组织，不鼓励整页纯 div 堆砌
- 提交区统一收口，减少每页单写按钮区
- 桌面端允许双列字段，但移动端必须回落单列

### 典型接入页

- `PostNew.jsx`
- `FoodCreate.jsx`
- `ProfileEdit.jsx`
- `Errands/PublishErrand.jsx`
- `Marketplace/MarketplacePublish.jsx`

## 7.7 DashboardPageLayout

### 结构职责

- 解决“总览 + 快捷入口 + 最近状态”的工作台节奏

### 建议结构

```text
DashboardPageLayout
  Summary
  Stats
  QuickActions
  Main
  Secondary
  Footer
```

### 建议 props

- `summary`
- `stats`
- `quickActions`
- `main`
- `secondary`
- `footer`
- `className`
- `contentClassName`

### 首批接入页

- `MyZone.jsx`

### 约束

- 不内置登录态逻辑
- 不内置课程表、Todo、管理入口判断
- 只提供工作台节奏骨架

## 7.8 AdminPageLayout

### 结构职责

- 解决后台/管理页的高密度结构

### 建议结构

```text
AdminPageLayout
  Header
  Toolbar
  Content
  Aside
  Footer
```

### 建议 props

- `header`
- `toolbar`
- `content`
- `aside`
- `footer`
- `mode`
- `className`
- `contentClassName`

### 首批接入页

- `SquareOrgAdmin.jsx`
- 后续 `pages/Admin/*`

### 约束

- 后台页允许更克制、更工具化
- 与主站共享 token，但不强行复刻主站活泼气质
- `mode` 只做预留，不在第一版塞复杂行为

## 8. 响应式规则

模板层统一按三档处理：

### 8.1 Desktop

- 适用于桌面 Web 主场景
- 默认允许双栏或三段式布局
- 强调内容密度、分区清晰、操作路径稳定

### 8.2 Tablet

- 允许保留主次结构
- 右栏可下沉
- FilterBar 支持换行
- Dashboard 的侧区可移动到主区后方

### 8.3 Mobile Fallback

- 所有模板必须可回落为单列
- 不强行保留桌面右栏
- Sticky 操作区可保留，但要避免遮挡内容

说明：

- 模板层只提供结构回落能力
- 最终是否走 Web 主壳或移动壳，仍由 Step 4 路由壳策略决定

## 9. 样式与命名规则

### 9.1 目录规则

统一放在：

```text
frontend/src/components/templates/
```

### 9.2 文件规则

每个模板单独一组文件：

```text
PageHeader.jsx
PageHeader.css
```

### 9.3 class 命名规则

建议统一使用模板前缀：

- `.page-header`
- `.section-header`
- `.filter-bar`
- `.list-page-layout`
- `.detail-page-layout`
- `.form-page-layout`
- `.dashboard-page-layout`
- `.admin-page-layout`

避免：

- 页面名 class 混进模板内部
- 业务模块 class 反向污染模板样式

## 10. 与现有页面的映射策略

### 10.1 页面接入原则

每个页面接模板时遵循固定顺序：

1. 先替换最外层页面结构
2. 再接入头部模板
3. 再接入区块头/筛选条
4. 保留现有业务内容块
5. 最后视情况清理旧 CSS

### 10.2 首批代表页映射

| 模板 | 代表页 | 接入目标 |
| --- | --- | --- |
| `PageHeader` | `PublishCenter.jsx` | 统一页面头部 |
| `FilterBar` | `Handbook/CourseReviewPage.jsx` | 验证搜索/筛选结构 |
| `ListPageLayout` | `MerchantList.jsx` | 验证桌面列表主结构 |
| `DetailPageLayout` | `FoodDetail.jsx` | 验证正文与侧区分离 |
| `FormPageLayout` | `PostNew.jsx` | 验证统一表单骨架 |
| `DashboardPageLayout` | `MyZone.jsx` | 验证工作台结构 |
| `AdminPageLayout` | `SquareOrgAdmin.jsx` | 验证后台结构预留 |

### 10.3 第二批建议接入页

- `SquareTrendingList.jsx`
- `PostDetail.jsx`
- `ProfileEdit.jsx`
- `MyPosts.jsx`
- `MyReviews.jsx`
- `pages/Admin/AdminDashboard.jsx`

## 11. 实施顺序

建议继续严格按下面顺序推进：

1. `PageHeader`
2. `SectionHeader`
3. `FilterBar`
4. `ListPageLayout`
5. `DetailPageLayout`
6. `FormPageLayout`
7. `DashboardPageLayout`
8. `AdminPageLayout`

每落一个模板，都要配一个代表页做最小接入验证。

## 12. 验收标准

Step 3 真正完成，建议按以下口径验收：

1. `components/templates` 下首批模板文件齐全
2. 模板层没有直接写接口请求逻辑
3. 模板层优先消费 `ui` 基础件与 token
4. 至少有 1 个列表页、1 个详情页、1 个表单页完成接入
5. `MyZone` 与 `SquareOrgAdmin` 已有模板化接入入口
6. 页面迁移时不再从零手拼头部、筛选条、布局骨架
7. `npm run build:web` 通过

## 13. 如果做错了，会出现什么表征

这是给后续开发时自检用的。

### 13.1 模板层过度业务化

表征：

- 模板 props 越来越多，而且大多只给单个页面使用
- 模板内部出现接口名、模块名、业务判断分支
- 接一个新页面反而要先改模板源码

### 13.2 页面没有真正模板化

表征：

- 每个页面只是包了一层模板名，但内部结构仍各写各的
- `PageHeader`、`FilterBar` 没有真正复用
- 旧页面 CSS 越叠越多，没有收口

### 13.3 Web 仍像放大的手机页

表征：

- 列表页主列过窄或全屏单列无层次
- 详情页正文、操作区、相关信息混在一起
- 表单页没有统一操作区，提交按钮位置每页不同

### 13.4 模板和主壳边界打架

表征：

- 页面模板又开始处理全局导航、全局头部
- 页面内容宽度和 Step 4 主壳容器相互覆盖
- 同一页面既被模板控结构，又被页面 CSS 强行反向改结构

## 14. 需要你拍板的点

正式进入下一轮实施前，建议你重点确认这几项：

1. 是否确认 `MyZone.jsx` 继续作为 `DashboardPageLayout` 的首个验证页。
2. 是否确认 `SquareOrgAdmin.jsx` 继续作为 `AdminPageLayout` 的首个验证页。
3. 是否接受列表页默认采用“主列 + 可选右栏”的桌面结构。
4. 是否接受表单页统一引入底部操作区思路。
5. 后台页是否接受与主站共享 token，但保留更克制的管理台氛围。

## 15. 结论

Step 3 的关键不是“多几个 layout 文件”，而是把 Web 页面改造的结构秩序先立住。

只要这份实施级设计拍板，后续页面迁移就可以稳定进入：

`套模板 -> 接内容 -> 做桌面节奏 -> 清理旧结构`

这样 Step 4 的主壳治理和后续高频页面治理都会明显更稳，也更不容易返工。
