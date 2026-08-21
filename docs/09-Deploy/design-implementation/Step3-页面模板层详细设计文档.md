# Step 3 页面模板层详细设计文档

## 1. 文档目标

本文档用于细化 `Web前端迁移步骤与开发顺序说明.md` 中的 Step 3：

- 建立 Web 端统一的页面模板层
- 让后续页面迁移从“逐页重画”变成“套模板 + 填内容”
- 为 Step 4 Web 主壳替换和 Step 5 高频页面迁移提供结构基础

这份文档的重点不是直接改某个页面，而是先把“页面结构积木”设计清楚，方便你先把关。

## 2. 当前现状

### 2.1 已有基础

当前 Step 1 与 Step 2 已经完成的基础包括：

- 全站 token 体系已建立
- 基础 UI 组件已具备首批可复用能力
- `Card / Button / Input / Textarea / Select / Tag / Badge`
- `EmptyState / ErrorState / PageSkeleton / Modal / Toast`
- `RouteTransition / FadeInSection`

这意味着：

- 视觉变量已经有统一来源
- 基础交互控件已经不需要页面自己手搓
- 现在开始抽页面模板，时机已经成熟

### 2.2 当前问题

虽然基础件已经逐步统一，但页面层仍然存在几个核心问题：

- 同类页面还没有共用的结构骨架
- 页面头部、筛选区、列表区、详情区、操作区仍在各页零散拼装
- 桌面 Web 所需的信息密度、左右栏结构、页面节奏还没有固定下来
- 一旦直接开始批量改页面，仍然很容易出现“一页一个结构”的返工

### 2.3 Step 3 的核心任务

Step 3 的本质不是“多写几个 layout 文件”，而是：

- 把页面结构共性抽出来
- 固定高频页面的布局秩序
- 明确模板层与基础组件层、业务页面层的边界
- 让 Step 5 开始的页面迁移变成标准动作

## 3. 模板层设计目标

页面模板层必须同时满足 5 个要求：

1. 可复用：同类页面能直接套同一套骨架
2. 可扩展：允许模块在不破坏主结构的前提下做轻量差异
3. 可组合：模板由多个小结构模板组成，而不是单个巨型万能布局
4. 可落地：能快速拿代表性页面验证，不停留在文档抽象
5. 可桌面化：结构天然服务于 Web，而不是继续放大手机页面

## 4. 模板层在整体架构中的位置

建议把前端结构理解为 4 层：

### 4.1 Token 层

负责：

- 色彩
- 间距
- 圆角
- 阴影
- 动效
- 层级

### 4.2 Base UI 层

负责：

- 按钮
- 表单控件
- 卡片
- 标签
- 状态块
- 弹层

### 4.3 Page Template 层

负责：

- 页面头部结构
- 区块头结构
- 列表页骨架
- 详情页骨架
- 表单页骨架
- 工作台 / 后台页骨架

### 4.4 Route Page / Feature Page 层

负责：

- 数据请求
- 页面业务逻辑
- 模块内容编排
- 模板实例化

正式边界应该是：

- 模板层不直接写接口逻辑
- 模板层不直接耦合某个模块 API
- 页面层不再自己从零拼结构

## 5. 模板层设计原则

### 5.1 结构先于视觉

模板层首先解决的是：

- 页面分区
- 信息流向
- 主要操作位置
- 响应式结构

不是先解决：

- 某个页面按钮颜色
- 某个页面插图风格
- 某个局部文案排版

### 5.2 小模板组合优于大模板包打天下

不建议一开始就造一个：

- `UniversalPageLayout`

更推荐拆成：

- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`
- `DashboardPageLayout`
- `AdminPageLayout`

### 5.3 一类页面一套主骨架

Step 3 的核心就是把页面先分型：

- 列表页
- 详情页
- 表单页
- 工作台页
- 后台页

同类页面必须优先共用一套骨架，而不是每页重新定义。

### 5.4 模板层只承载结构，不承载业务判断

例如：

- `ListPageLayout` 应该存在
- `SquareTrendingLayout` 不应该作为第一批模板存在

业务模块的差异，优先在：

- 页面实例层
- 页面插槽内容层
- 模块级 wrapper

解决，而不是回到模板层重造一份。

## 6. 推荐模板分层

建议 Step 3 把模板层拆为三档：

### 6.1 页面头部与区块结构模板

负责页面内部的标准结构片段：

- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `Toolbar`
- `PageActions`

特点：

- 粒度小
- 高频复用
- 几乎所有页面都能消费

### 6.2 页面骨架模板

负责页面主体布局骨架：

- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`
- `DashboardPageLayout`
- `AdminPageLayout`

特点：

- 决定页面信息架构
- 决定左右栏和内容区关系
- 是 Step 3 的主角

### 6.3 模板内通用区域片段

负责模板内部重复区块：

- `SidebarPanel`
- `AsidePanel`
- `MetaGroup`
- `StickyActionBar`
- `SummaryGrid`

特点：

- 不直接作为页面入口暴露
- 用来支撑骨架模板复用

## 7. Step 3 第一批建议完成的模板

建议按优先级分两批推进。

### 7.1 第一批核心模板

这是进入页面迁移前必须先完成的：

1. `PageHeader`
2. `SectionHeader`
3. `FilterBar`
4. `ListPageLayout`
5. `DetailPageLayout`
6. `FormPageLayout`

### 7.2 第二批增强模板

等第一批验证稳定后再推进：

1. `DashboardPageLayout`
2. `AdminPageLayout`
3. `PageActions`
4. `StickyActionBar`
5. `AsidePanel`
6. `SummaryGrid`

原因是：

- 第一批已经足够覆盖 Web 主站大部分高频页面
- 第二批更偏工作台和后台治理，可后置

## 8. 单个模板的详细设计

### 8.1 PageHeader

用途：

- 页面标题
- 页面描述
- 面包屑 / 返回
- 右侧主操作区

建议结构：

```text
Back / Breadcrumb
Title + Description
Meta / Status / Tag
Primary Actions
```

建议 props 方向：

- `title`
- `description`
- `eyebrow`
- `breadcrumb`
- `backTo`
- `actions`
- `meta`
- `align`

要求：

- 标题层级固定
- 副标题宽度受控
- 主操作位始终统一落在右侧或标题下方

适用页面：

- 列表页
- 详情页
- 表单页
- 工作台页

### 8.2 SectionHeader

用途：

- 页面内区块标题
- 区块说明
- 区块右侧操作

建议结构：

```text
Section Title
Section Description
Inline Action / More Link
```

建议 props 方向：

- `title`
- `description`
- `action`
- `aside`
- `compact`

要求：

- 用于页面内部二级结构
- 不承担页面级返回和主导航责任

### 8.3 FilterBar

用途：

- 列表页筛选
- 排序
- 搜索
- 切换 tab / 视图模式

建议结构：

```text
Search
Tag Filters
Sort / View Controls
Right Utility Area
```

建议 props 方向：

- `search`
- `filters`
- `sort`
- `viewSwitcher`
- `actions`
- `sticky`

要求：

- 支持桌面横向排布
- 小屏自动换行
- 不把具体业务筛选逻辑写死在内部

### 8.4 ListPageLayout

用途：

- 广场流
- 热搜列表
- 商家列表
- 我的帖子
- 我的点评

建议结构：

```text
PageHeader
FilterBar
Main List Column
Right Aside (optional)
Pagination / Infinite Footer
```

建议 props 方向：

- `header`
- `filterBar`
- `list`
- `aside`
- `footer`
- `contentWidth`
- `asideWidth`

布局要求：

- 列表主列为主阅读区
- 右侧辅助栏可选
- 支持单列与双列两种桌面形态

推荐桌面宽度：

- 主列：`760px - 980px`
- 右栏：`280px - 320px`

### 8.5 DetailPageLayout

用途：

- 帖子详情
- 食物详情
- 二手详情
- 社团详情

建议结构：

```text
PageHeader / Back
Main Detail Body
Meta / Actions
Comments / Related Blocks
Aside Panels
```

建议 props 方向：

- `header`
- `hero`
- `content`
- `meta`
- `comments`
- `related`
- `aside`

布局要求：

- 正文宽度受控
- 主要阅读区与次级信息区分离
- 关联内容不挤占主正文

推荐桌面宽度：

- 正文：`720px - 820px`
- 详情主区：`800px - 960px`
- 右栏：`280px - 340px`

### 8.6 FormPageLayout

用途：

- 发帖
- 发布二手
- 发布活动
- 编辑资料
- 商家编辑

建议结构：

```text
PageHeader
Form Intro / Notice
Form Card / Sections
Sticky Action Bar
```

建议 props 方向：

- `header`
- `notice`
- `sections`
- `actions`
- `aside`

布局要求：

- 表单区可按 section 分组
- 桌面允许双列字段
- 底部提交区应统一，不再每页各写一套

### 8.7 DashboardPageLayout

用途：

- 我的页工作台
- 用户中心桌面版
- 某些运营首页

建议结构：

```text
Summary Hero
Quick Stats
Main Workbench
Secondary Panels
```

建议 props 方向：

- `summary`
- `stats`
- `main`
- `secondary`

要求：

- 明显区别于列表页
- 强化“总览 + 快捷入口 + 最近状态”

### 8.8 AdminPageLayout

用途：

- 后台列表页
- 后台配置页
- 后台详情页

建议结构：

```text
PageHeader
Toolbar / Filters
Main Admin Content
Side Meta / Help Panel (optional)
```

建议 props 方向：

- `header`
- `toolbar`
- `content`
- `aside`
- `mode`

要求：

- 风格更克制
- 信息密度更高
- 与主站模板共享基础节奏，但不过度校园化

## 9. 模板层的目录结构建议

建议新增统一目录：

```text
frontend/src/components/templates/
  PageHeader.jsx
  SectionHeader.jsx
  FilterBar.jsx
  ListPageLayout.jsx
  DetailPageLayout.jsx
  FormPageLayout.jsx
  DashboardPageLayout.jsx
  AdminPageLayout.jsx
```

如果后续模板继续增多，再演进为：

```text
frontend/src/components/templates/
  common/
  list/
  detail/
  form/
  dashboard/
  admin/
```

当前第一轮更推荐：

- 先平铺

原因：

- Step 3 仍处于模板收敛期
- 平铺更利于快速审查和迭代
- 避免过早拆目录增加维护成本

## 10. 模板层与现有文件的关系

### 10.1 继续保留的层

可以继续保留：

- `frontend/src/components/ui/*`
- `frontend/src/components/*` 中已有可复用业务组件
- `frontend/src/pages/*` 路由页面

### 10.2 后续逐步收敛的层

后续应逐步从页面里抽出的部分包括：

- 页面头部重复结构
- 列表页筛选条
- 列表页顶部说明区
- 详情页返回区和 meta 区
- 表单页提交区

### 10.3 暂不在 Step 3 内解决的层

Step 3 不主动处理：

- Web 主壳全量替换
- 左侧导航和顶部全局壳
- App 端页面结构
- 路由重写

这些属于 Step 4 及之后阶段。

## 11. Step 3 的实施顺序建议

建议按下面顺序推进：

1. 先完成 `PageHeader`
2. 再完成 `SectionHeader`
3. 再完成 `FilterBar`
4. 再完成 `ListPageLayout`
5. 用一个高频列表页做模板验证
6. 再完成 `DetailPageLayout`
7. 用一个详情页做模板验证
8. 再完成 `FormPageLayout`
9. 用一个表单页做模板验证
10. 最后再补工作台与后台模板

这个顺序的好处是：

- 先把最通用的小结构稳定下来
- 再让大模板直接复用这些结构
- 每一层都有代表页验证，不会停留在抽象设计

## 12. Step 3 的代表性验证页面建议

### 12.1 列表页代表

建议优先选：

- `SquareTrendingList`
- `MerchantList`

原因：

- 一个代表内容流
- 一个代表工具型列表页

### 12.2 详情页代表

建议优先选：

- `PostDetail`
- `FoodDetail`

原因：

- 都是高频路径
- 都能验证正文区、操作区、评论区和右栏关系

### 12.3 表单页代表

建议优先选：

- `PostNew`
- `FoodCreate`

原因：

- 一种偏文本发布
- 一种偏管理表单

## 13. Step 3 的验收标准

Step 3 完成时，至少应满足：

1. 已形成首批页面模板组件目录
2. `PageHeader / SectionHeader / FilterBar / ListPageLayout / DetailPageLayout / FormPageLayout` 可用
3. 至少 1 个列表页、1 个详情页、1 个表单页接入验证
4. 模板层不直接耦合接口请求
5. 模板层优先消费 Step 1 与 Step 2 的 token 和基础组件
6. `npm run build:web` 通过

## 14. 不在 Step 3 内做的事

Step 3 不应该做：

- 全站页面批量重写
- Web 主壳全面替换
- 统一后台所有页面
- 全量清理旧页面 CSS
- 把所有页面一次性迁到 `features/`

Step 3 的边界就是：

- 先把页面结构模板层立住

## 15. 推荐提交拆分

建议后续代码提交按下面粒度拆：

1. `feat(web-template): add shared page header and section header`
2. `feat(web-template): add shared filter bar template`
3. `feat(web-template): add shared list page layout`
4. `refactor(web): migrate square trending to shared list page layout`
5. `feat(web-template): add shared detail page layout`
6. `refactor(web): migrate post detail to shared detail page layout`
7. `feat(web-template): add shared form page layout`
8. `refactor(web): migrate post new to shared form page layout`

不要把模板新增和多个业务页面迁移揉成一个大提交。

## 16. 待你确认的问题

下面这些点会直接影响 Step 3 真正落地的节奏，建议你在正式编码前确认：

1. Step 3 第一批代表页，你是否接受按 `SquareTrendingList -> PostDetail -> PostNew` 这个顺序验证
2. `PageHeader` 是否接受统一包含“标题 + 描述 + 右侧操作区”这一标准结构
3. Web 主站列表页是否普遍接受“主列表 + 可选右侧辅助栏”的桌面结构
4. 表单页是否接受统一引入“底部固定操作条 / Sticky Action Bar”
5. 后台模板是否本轮先只做规范预留，不立即并入第一批落地任务

## 17. 结论

Step 3 的关键价值，不是多一层目录，而是把后续 Web 改版从“逐页设计”推进到“模板化迁移”。

只要模板层先稳住，后面 Web 主壳替换、高频页面迁移和桌面化布局治理都会快很多，也更不容易返工。
