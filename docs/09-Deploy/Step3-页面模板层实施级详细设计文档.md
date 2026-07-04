# Step3 页面模板层实施级详细设计文档

## 1. 文档目标

本文用于承接 [Web前端迁移步骤与开发顺序说明.md](/D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web前端迁移步骤与开发顺序说明.md) 中的 Step 3。

本轮不是继续讨论“要不要做模板层”，而是把下面几件事定死：

- 模板层在当前 `frontend/` 架构中的职责边界
- 现有模板组件的真实接口、适用范围、禁止事项
- 页面迁移时应该怎么套模板，而不是重新画页面
- Step 3 和 Step 4 Web 主壳之间如何分责
- 后续 Step 5 高频页面迁移的接入顺序与验收标准

本文默认前提：

- 仅治理 `frontend/`
- 不改 `frontend-app/`
- 不改后端接口
- 不主动改 `shared/*`
- 模板层只解决页面结构复用，不承接业务逻辑

## 2. 当前现状

### 2.1 当前已存在的模板组件

当前仓库中，Step 3 首批模板已经存在于：

- `frontend/src/components/templates/PageHeader.jsx`
- `frontend/src/components/templates/SectionHeader.jsx`
- `frontend/src/components/templates/FilterBar.jsx`
- `frontend/src/components/templates/ListPageLayout.jsx`
- `frontend/src/components/templates/DetailPageLayout.jsx`
- `frontend/src/components/templates/FormPageLayout.jsx`
- `frontend/src/components/templates/DashboardPageLayout.jsx`
- `frontend/src/components/templates/AdminPageLayout.jsx`

这说明 Step 3 已经不是“概念设计阶段”，而是“标准收口阶段”。

### 2.2 当前已接入的代表页面

通过代码检索，模板层已经被以下页面消费：

| 模板 | 当前代表页 |
| --- | --- |
| `PageHeader` | `PublishCenter.jsx` `MerchantList.jsx` `FoodDetail.jsx` `PostDetail.jsx` `PostNew.jsx` `ProfileEdit.jsx` `SquareTrendingList.jsx` `SquareOrgAdmin.jsx` `pages/Admin/AdminDashboard.jsx` |
| `SectionHeader` | `PublishCenter.jsx` `FoodDetail.jsx` `PostDetail.jsx` `PostNew.jsx` `ProfileEdit.jsx` `MerchantList.jsx` `SquareTrendingList.jsx` `TodayCampusQuickActions.jsx` `pages/Admin/AdminDashboard.jsx` |
| `FilterBar` | `MerchantList.jsx` `SquareTrendingList.jsx` `Handbook/CourseReviewPage.jsx` |
| `ListPageLayout` | `MerchantList.jsx` `SquareTrendingList.jsx` |
| `DetailPageLayout` | `FoodDetail.jsx` `PostDetail.jsx` |
| `FormPageLayout` | `PostNew.jsx` `ProfileEdit.jsx` |
| `DashboardPageLayout` | `MyZone.jsx` |
| `AdminPageLayout` | `SquareOrgAdmin.jsx` `pages/Admin/AdminDashboard.jsx` |

### 2.3 当前仍然存在的风险

虽然模板已经出现，但如果不把规则写清楚，后面很容易继续失控：

- 同类页面仍然各自加一层页面级布局，模板只是“包了一层名字”
- 业务页通过局部 CSS 反向改模板主结构
- 模板 props 越加越多，逐渐演变成业务组件
- Step 4 主壳和 Step 3 模板同时控制宽度、侧栏、留白
- 接新页面时仍然先复制旧页面结构，而不是先找模板

所以本轮目标不是“新增更多模板”，而是把现有模板的使用规范、迁移顺序、验收口径固定下来。

## 3. 模板层在整体架构中的定位

建议把 `frontend/` 的结构固定理解为四层：

1. `styles / tokens` 层
   负责颜色、字号、间距、圆角、阴影、层级、动效。
2. `components/ui` 层
   负责按钮、输入框、卡片、标签、弹层、状态块等基础件。
3. `components/templates` 层
   负责页面结构，不负责业务逻辑。
4. `pages / features` 层
   负责请求、状态、权限、文案、列表数据组织、页面行为。

模板层的唯一职责：

- 固定页内结构
- 固定信息主次关系
- 固定桌面端内容密度与阅读节奏
- 提供统一插槽，让业务页只填内容

模板层明确不负责：

- 接口请求
- React 状态与副作用
- 登录态、权限态判断
- 提交、删除、弹窗开关逻辑
- 单一业务页专属样式结构

## 4. 设计原则

### 4.1 结构复用优先于页面复用

要复用的是“页面骨架”，不是“某个业务页的实现细节”。

正确方向：

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`

错误方向：

- `SquareTrendingSpecialLayout`
- `FoodReviewAdminLayout`
- `MerchantPublishLayout`

### 4.2 插槽优先于业务型 props

模板优先暴露 JSX 插槽，不优先暴露“为了单个页面生造的开关”。

优先保留的接口形态：

- `header`
- `filterBar`
- `list`
- `content`
- `meta`
- `comments`
- `aside`
- `actions`

谨慎新增的接口形态：

- `showFoodTip`
- `usePostMode`
- `withMerchantRuleBox`

判断标准：

- 如果一个 prop 只服务一个页面，大概率不应该进入模板层
- 如果一个 prop 会让模板内部开始理解业务语义，也不应该进入模板层

### 4.3 小模板组合优于万能大模板

不建议新增一个 `UniversalPageLayout` 包打天下。

更可控的方向是：

- 小结构模板负责高频片段
- 页面骨架模板负责整体布局
- 业务页负责把内容填入模板

### 4.4 桌面化优先，但必须可回落

模板层服务的是 Web 改版，所以默认要优先支持：

- 页面头部
- 主列内容
- 可选右侧辅助列
- 更清晰的区块节奏

同时必须保证：

- 中屏可以自然换行
- 小屏可以回落为单列
- 不能为了桌面化，硬把复杂双栏强塞给移动回落场景

### 4.5 模板层不与主壳抢职责

Step 3 负责页内结构，Step 4 负责站点级壳。

模板层不应处理：

- 全局 Header
- 全局左侧导航
- 全局右侧站点辅助栏
- 路由级壳切换

主壳也不应去定义页面内部的：

- `PageHeader`
- `FilterBar`
- `SectionHeader`
- `DetailPageLayout` 内容结构

## 5. 模板目录、命名与样式归属规范

### 5.1 目录规范

模板统一放在：

```text
frontend/src/components/templates/
```

### 5.2 文件命名规范

文件名统一使用组件名直出：

```text
PageHeader.jsx
PageHeader.css
FilterBar.jsx
FilterBar.css
```

### 5.3 class 命名规范

统一使用模板名前缀：

- `.page-header`
- `.section-header`
- `.filter-bar`
- `.list-page-layout`
- `.detail-page-layout`
- `.form-page-layout`
- `.dashboard-page-layout`
- `.admin-page-layout`

禁止：

- 在模板内部出现具体业务页面名 class
- 页面业务 class 反向定义模板主结构 class

### 5.4 样式归属规范

样式职责应这样划分：

- 模板 CSS 负责：栅格、列宽、区块间距、位置关系、响应式回落
- 页面 CSS 负责：内容皮肤、业务卡片视觉、少量局部增强

页面 CSS 不应做的事：

- 重写模板主网格
- 重写模板头部层级
- 通过负 margin 破坏模板节奏
- 用页面 class 覆盖模板核心布局类

## 6. Step 3 首批模板清单

### 6.1 结构片段模板

- `PageHeader`
- `SectionHeader`
- `FilterBar`

特点：

- 粒度小
- 高频复用
- 基本所有页面都能消费

### 6.2 页面骨架模板

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`
- `DashboardPageLayout`
- `AdminPageLayout`

特点：

- 决定页面主结构
- 决定主次区域关系
- 是 Web 桌面化迁移的主要抓手

## 7. 单个模板的实施级设计

## 7.1 `PageHeader`

### 职责

- 承载页面级标题区
- 放置返回入口、眉标题、页面标题、描述、元信息、主操作

### 当前代码接口

当前实际 props：

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

### 必填/选填建议

| 字段 | 建议级别 | 说明 |
| --- | --- | --- |
| `title` | 必填 | 页面唯一主标题 |
| `description` | 选填 | 标题补充说明 |
| `eyebrow` | 选填 | 小标题或页面分类提示 |
| `backTo` | 选填 | 存在返回路径时使用 |
| `backLabel` | 选填 | 默认为英文 `Back`，后续可考虑统一国际化 |
| `actions` | 选填 | 页面级主操作，不放复杂筛选 |
| `meta` | 选填 | 轻量状态信息，不放大块内容 |
| `className` | 选填 | 允许页面轻量挂类 |

### 适用页面

- 发布中心
- 详情页
- 表单页
- 工作台页
- 后台页

### 禁止事项

- 不在 `actions` 里塞完整筛选栏
- 不把整块统计卡片放进 `meta`
- 不允许页面自己重新造一套 `h1 + 描述 + 按钮` 头部结构

## 7.2 `SectionHeader`

### 职责

- 提供页面内部二级区块标题
- 统一局部说明和轻操作出口

### 当前代码接口

当前实际 props：

- `title`
- `description`
- `action`
- `aside`
- `compact`
- `className`

### 推荐结构

```text
SectionHeader
  Main
    Title
    Description
  Aside
```

### 适用场景

- 首页板块头
- 工作台分区头
- 列表分区标题
- 详情页局部章节标题

### 禁止事项

- 不承担页面级返回逻辑
- 不承担全页主操作
- 不承载大面积筛选或复杂状态条

## 7.3 `FilterBar`

### 职责

- 统一列表页、搜索页、后台页的筛选工具区

### 当前代码接口

当前实际 props：

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

### 结构建议

- `search` 放搜索框或搜索输入组
- `filters` 放标签筛选、Select 组合、范围过滤器
- `sort` 放排序项
- `viewSwitcher` 放列表/卡片切换等轻切换器
- `actions` 放新建、导出、批量操作入口

### 使用边界

- 模板不直接内置任何业务筛选项
- 优先传 JSX，而不是继续堆专用 props
- 中屏下允许换行，小屏下允许纵向堆叠

### 禁止事项

- 不把分页器塞到 `FilterBar`
- 不把页级 `PageHeader` 主操作全部下沉到这里
- 不让 `FilterBar` 承担列表内容或数据状态提示

## 7.4 `ListPageLayout`

### 职责

- 提供标准列表页骨架
- 固定“头部 + 筛选 + 主列表 + 可选右栏 + 页脚”的桌面节奏

### 当前代码接口

当前实际 props：

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

### 主次关系要求

- `list` 必须是阅读主轴
- `aside` 只能承载补充信息、说明、推荐、轻工具
- `footer` 只承载页尾补充信息，不承载主筛选和主操作

### 典型页面

- `SquareTrendingList`
- `MerchantList`
- 后续 `SquareCampusFeed`
- 后续 `MyPosts`
- 后续 `MyReviews`

### 禁止事项

- 页面 CSS 不应改掉模板主列宽度关系
- 不要让 `aside` 变成比主列表更重的区域
- 不要在 `list` 之外再包一套页面自定义大网格

## 7.5 `DetailPageLayout`

### 职责

- 提供详情页标准骨架
- 固定“头部 + 主体 + 元信息 + 评论 + 可选右栏”的阅读结构

### 当前代码接口

当前实际 props：

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

### 区块语义建议

- `hero` 放封面、摘要、主信息卡
- `content` 放正文或详情主体
- `meta` 放作者信息、统计、结构化说明
- `comments` 放评论、互动区
- `aside` 放关联推荐、行动入口、规则提示

### 典型页面

- `PostDetail`
- `FoodDetail`
- 后续 `MarketplaceDetail`
- 后续 `ClubProfile`

### 禁止事项

- 不把评论区插到正文上方打断主阅读轴
- 不让右栏抢主内容节奏
- 不回退成“单页一大串 div 堆叠”

## 7.6 `FormPageLayout`

### 职责

- 提供发布、创建、编辑类页面的标准表单结构

### 当前代码接口

当前实际 props：

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

### 区块语义建议

- `notice` 放规则提醒、提交须知、轻量警示
- `sections` 放分段表单区块
- `aside` 放示例、预览、帮助、草稿说明
- `actions` 放统一底部提交区

### 典型页面

- `PostNew`
- `ProfileEdit`
- 后续 `MarketplacePublish`
- 后续 `PublishErrand`
- 后续 `FoodCreate`

### 禁止事项

- 不再每页额外造一套提交区
- 不鼓励把所有表单项无分组地一把堆到底
- 不通过页面 CSS 破坏底部操作区位置关系

## 7.7 `DashboardPageLayout`

### 职责

- 解决“总览 + 指标 + 快捷入口 + 主工作区”的工作台结构

### 当前代码接口

当前实际 props：

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

### 适用页面

- `MyZone`
- 后续用户中心总览页
- 后续运营总览页

### 使用边界

- 模板只负责编排，不处理登录态
- 模板不负责课程逻辑、Todo 逻辑、权限入口判断
- 视觉可以比后台活泼，但结构仍要克制

### 禁止事项

- 不把复杂业务判断写进模板内部
- 不为了某个工作台页新加特化 props
- 不让 `secondary` 成为另一套主工作区

## 7.8 `AdminPageLayout`

### 职责

- 解决后台管理页的高密度内容结构
- 统一标题区、工具条、主内容区、可选辅助区

### 当前代码接口

当前实际 props：

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

### `mode` 预留建议

- `default`
- `dense`
- `split`

现阶段只强制 `default` 可用，其余保留为语义扩展位。

### 适用页面

- `SquareOrgAdmin`
- `pages/Admin/AdminDashboard.jsx`
- 后续后台治理页

### 使用边界

- 不在模板内部承接 tab 逻辑
- 不承接增删改查逻辑
- 不承接具体表单字段实现
- 共享 token，但视觉允许比主站更克制

### 禁止事项

- 不把业务表格、业务表单结构写进模板
- 不把整个权限系统判断压到模板里
- 不让 `mode` 演变成页面业务开关集合

## 8. 页面类型与模板映射矩阵

### 8.1 已完成接入矩阵

| 页面 | 页面类型 | 当前应归属模板 | 当前状态 |
| --- | --- | --- | --- |
| `MerchantList.jsx` | 列表页 | `ListPageLayout` | 已接入 |
| `SquareTrendingList.jsx` | 列表页 | `ListPageLayout` | 已接入 |
| `FoodDetail.jsx` | 详情页 | `DetailPageLayout` | 已接入 |
| `PostDetail.jsx` | 详情页 | `DetailPageLayout` | 已接入 |
| `PostNew.jsx` | 表单页 | `FormPageLayout` | 已接入 |
| `ProfileEdit.jsx` | 表单页 | `FormPageLayout` | 已接入 |
| `MyZone.jsx` | 工作台页 | `DashboardPageLayout` | 已接入 |
| `SquareOrgAdmin.jsx` | 后台页 | `AdminPageLayout` | 已接入 |
| `pages/Admin/AdminDashboard.jsx` | 后台页 | `AdminPageLayout` | 已接入 |

### 8.2 下一批建议扩散页面

建议 Step 5 优先继续扩散到：

- `SquareCampusFeed.jsx`
- `MyPosts.jsx`
- `MyReviews.jsx`
- `MarketplaceDetail.jsx`
- `ClubProfile.jsx`
- `MarketplacePublish.jsx`
- `PublishErrand.jsx`
- `FoodCreate.jsx`

选择逻辑：

- 先接高频页面
- 先接结构相似页面
- 先接能验证模板泛化能力的页面

## 9. 和 Step 4 Web 主壳的边界

应固定为如下关系：

```text
SiteShell
  ShellHeader / Sidebar / GlobalAside
  ShellContent
    PageTemplate
      Header / Filter / Content / Aside / Footer
        BusinessContent
```

职责划分：

- Step 4 主壳负责站点级导航和外层容器
- Step 3 模板负责页内布局秩序
- 页面本身负责真实业务内容

如果边界打乱，典型后果会是：

- 主壳和模板同时控制内容宽度
- 主壳和模板同时控制右栏位置
- 页面自己又再套一层外部布局
- 同一页面出现三层栅格相互打架

## 10. 响应式规则

### 10.1 Desktop

- 默认桌面态
- 允许双列或主列加辅助列
- 强调模块化阅读节奏和页面呼吸感

### 10.2 Tablet

- 保留主次结构
- 允许辅助列下沉
- `FilterBar` 允许换行
- 页面头部操作区允许折行为第二行

### 10.3 Mobile Fallback

- 所有模板必须可回落为单列
- 辅助列不强保留
- 底部操作区可存在，但不能遮挡正文
- 不能把桌面复杂栅格原样缩放到小屏

## 11. 实施顺序

建议继续按以下顺序推进：

1. 固定 `PageHeader`
2. 固定 `SectionHeader`
3. 固定 `FilterBar`
4. 固定 `ListPageLayout`
5. 固定 `DetailPageLayout`
6. 固定 `FormPageLayout`
7. 固定 `DashboardPageLayout`
8. 固定 `AdminPageLayout`

每推进一个模板，都要同步做一件事：

- 找一个真实页面做最小接入验证

不建议的顺序：

- 先批量改十几个页面，再回头收模板

因为这样会放大返工。

## 12. 页面迁移标准动作

后续任意页面接入模板层时，建议统一按下面流程执行：

1. 判断页面属于哪一类
   列表页、详情页、表单页、工作台页、后台页。
2. 先找已存在模板
   不先复制旧页面结构。
3. 映射区块
   把页面内容映射到 `header / filterBar / list / content / aside / footer` 等槽位。
4. 收敛页面 CSS
   删除或弱化页面对整体结构的控制，只保留内容皮肤。
5. 做桌面与移动回落检查
   确保模板结构在响应式下仍成立。
6. 做构建验证
   至少通过 `npm.cmd run build:web`。

## 13. 验收标准

Step 3 完成后，至少应满足：

1. `components/templates/` 下首批模板职责明确且接口稳定。
2. 模板层不直接写请求逻辑、权限逻辑、提交逻辑。
3. 模板层优先消费 Step 1 token 和 Step 2 基础 UI 组件。
4. 至少已有列表页、详情页、表单页、工作台页、后台页各 1 个真实代表页接入。
5. 页面迁移时不再从零拼页面头部、筛选区和布局骨架。
6. 页面 CSS 不再主导模板级结构。
7. Step 4 主壳接入后，模板层职责仍然单一。
8. 后续每个模板扩散任务都可以单独验收和单独提交。

## 14. 做错时的典型表征

### 14.1 模板层业务化

表征：

- props 越来越多，而且只服务单个页面
- 模板文件里开始出现接口名、模块名、权限分支
- 每接一个新页面都要先改模板源码

### 14.2 名义复用，实际没复用

表征：

- 页面对外包了模板，但内部结构仍然各写各的
- `PageHeader` 和 `FilterBar` 没成为统一入口
- 页面 CSS 继续抢主结构控制权

### 14.3 Web 看起来仍然像放大的手机页

表征：

- 列表页没有明确主列和补充列
- 详情页正文和辅助区混成一坨
- 表单页提交按钮位置每页都不同

### 14.4 模板层与主壳打架

表征：

- 壳和模板同时控制宽度
- 壳和模板同时定义侧栏
- 页面自己又包一层最外部栅格

### 14.5 页面迁移成本没有下降

表征：

- 每改一页都要重排结构
- 业务页模板接入后仍然要写大量重复布局 CSS
- 页面改版速度没有明显提升

## 15. 待你确认的问题

下面这些点建议你明确拍板，后面执行会更稳：

1. 是否确认 `MyZone.jsx` 继续作为 `DashboardPageLayout` 的标准代表页。
2. 是否确认 `SquareOrgAdmin.jsx` 与 `pages/Admin/AdminDashboard.jsx` 共同作为 `AdminPageLayout` 的验证页。
3. 是否接受列表页默认采用“主列 + 可选右栏”的桌面结构。
4. 是否接受表单页统一收口到底部 `actions` 操作区。
5. 对后台页，你是否确认“共享 token，但视觉更克制”的方向继续成立。
6. `PageHeader` 中的 `backLabel` 是否要在后续统一改为中文或接入国际化，而不是继续默认 `Back`。

## 16. 结论

Step 3 的价值，不是多一层目录，而是把后续 Web 改版从“逐页重画”推进到“模板化迁移”。

只要这份文档先拍板，后面 Step 4 主壳治理和 Step 5 高频页面迁移就都能按统一结构推进，返工会明显减少，页面风格也更容易保持一致。
