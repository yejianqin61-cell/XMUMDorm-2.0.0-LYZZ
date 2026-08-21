 # Step 2 基础 UI 组件层详细设计文档

## 1. 文档目标

本文档用于细化 `Web前端迁移步骤与开发顺序说明.md` 中的 Step 2：

- 建立 Web 端真正可复用的基础 UI 组件层
- 避免页面继续自己手搓按钮、卡片、空态和表单控件
- 为 Step 3 的页面模板层提供统一积木

这份文档重点是“怎么设计一层长期可复用的 UI 组件体系”，不是直接做某个业务页面。

## 2. 当前现状

### 2.1 已有基础组件资产

当前 `frontend/src/components/ui/` 已存在：

- `ActionCard.jsx`
- `AppCard.jsx`
- `EmptyState.jsx`
- `ErrorState.jsx`
- `FadeInSection.jsx`
- `InfoCard.jsx`
- `MediaCard.jsx`
- `MetricCard.jsx`
- `PageSkeleton.jsx`
- `RouteTransition.jsx`

此外，项目里还存在一些“半基础、半业务”的组件：

- `Card.jsx`
- `EmptyState.jsx`
- `CategorySidebar.jsx`
- `TabBar.jsx`
- `TopBar.jsx`

### 2.2 当前问题

当前组件层还没有形成真正统一的基础 UI 体系，主要问题有：

- 缺少按钮、输入框、标签、弹窗等最基本基础件
- `ui/` 目录已有组件，但还不是完整设计系统
- 组件命名与职责边界还不够清晰
- 一些页面和业务模块仍在自己拼卡片和状态块
- 当前 `card.css` 更像局部抽象，还不是全站通用规范

### 2.3 Step 2 的核心任务

Step 2 不是盲目新建组件，而是：

- 盘活现有 `ui/*`
- 补齐真正缺失的基础组件
- 明确基础层 / 模板层 / 业务层边界
- 建立复用优先的开发规则

## 3. 组件层设计原则

### 3.1 复用优先

每次新增组件前必须先判断：

1. 现有组件能否直接复用
2. 现有组件能否通过 `variant` 扩展
3. 现有组件能否通过组合实现

只有以上都不成立，才允许新增组件。

### 3.2 基础层不写业务逻辑

基础 UI 组件层不应该直接耦合：

- 某个具体接口结构
- 某个具体业务模块
- 某个具体页面文案

例如：

- `Button` 应该存在
- `PublishButton` 不应该作为基础组件存在

### 3.3 风格统一，差异靠参数

同类组件必须通过统一风格 + 参数化差异来解决：

- `variant`
- `size`
- `tone`
- `disabled`
- `loading`

而不是同类组件复制多份。

### 3.4 组合优于巨型万能组件

不建议一上来造一个超大组件承担所有场景。

更推荐：

- 小基础件
- 清晰组合关系
- 在模板层再组织

## 4. 建议的组件分层

### 4.1 Base Primitive 层

最底层基础件：

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Radio`
- `Switch`
- `Tag`
- `Badge`
- `Card`
- `Divider`
- `Spinner`

特点：

- 不带业务语义
- 不带模块耦合
- 只关心结构、状态、样式

### 4.2 Feedback 层

反馈与状态组件：

- `Toast`
- `Modal`
- `EmptyState`
- `ErrorState`
- `PageSkeleton`
- `InlineNotice`
- `ConfirmDialog`

### 4.3 Navigation / Structure 层

基础导航与结构组件：

- `Tabs`
- `Breadcrumb`
- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `Toolbar`
- `Pagination`

### 4.4 Existing Card Family 层

现有 `ui/*Card` 可以继续保留，但建议视为“基础卡片家族”，而不是散装页面卡：

- `AppCard`
- `ActionCard`
- `InfoCard`
- `MediaCard`
- `MetricCard`

后续应统一基于同一个 `Card` 基底实现。

## 5. Step 2 第一批必须完成的组件

建议按优先级分两批：

### 5.1 第一批核心组件

这是后续几乎所有页面都会用到的：

1. `Button`
2. `Input`
3. `Textarea`
4. `Select`
5. `Tag`
6. `Badge`
7. `Card`
8. `EmptyState`
9. `ErrorState`
10. `PageSkeleton`

### 5.2 第二批增强组件

等第一批稳定后再推进：

1. `Tabs`
2. `Modal`
3. `Toast`
4. `Breadcrumb`
5. `PageHeader`
6. `SectionHeader`
7. `FilterBar`
8. `Pagination`

## 6. 单个组件的设计规范

### 6.1 Button

用途：

- 主操作
- 次操作
- 文本操作
- 危险操作

建议 props 方向：

- `variant`: `primary | secondary | tertiary | danger | accent`
- `size`: `sm | md | lg`
- `loading`
- `disabled`
- `iconLeft`
- `iconRight`
- `block`

必须支持状态：

- default
- hover
- active
- disabled
- loading
- focus-visible

### 6.2 Input / Textarea / Select

统一目标：

- 保持一致的高度、边框、圆角、聚焦态
- 通过 shared field styles 统一表现

建议 props 方向：

- `label`
- `hint`
- `error`
- `required`
- `disabled`
- `prefix`
- `suffix`

要求：

- 表单控件的错误态统一
- 不允许每个页面自己写输入框视觉

### 6.3 Tag / Badge

两者语义要区分：

- `Tag`：可筛选、可分类、可交互
- `Badge`：状态、计数、标识

避免后续混成一个所有场景都乱用的胶囊组件。

### 6.4 Card

`Card` 是整个项目最关键的基础件之一。

建议支持：

- `variant`: `default | strong | soft | interactive`
- `padding`: `sm | md | lg`
- `tone`: `default | square | canteen | club | marketplace | admin`

要求：

- 现有 `card.css` 的能力要尽量继承
- 现有 `AppCard` / `InfoCard` 等要逐步收敛到同一基底

### 6.5 EmptyState / ErrorState

当前已有对应组件，建议不要重造。

Step 2 应做的是：

- 统一视觉语言
- 统一 props 结构
- 统一 CTA 区域样式
- 统一图标 / 插图位置

### 6.6 PageSkeleton

目标：

- 替代各页面自己搓 loading 骨架

建议分类型：

- 列表骨架
- 详情骨架
- 卡片骨架
- 表单骨架

## 7. 现有组件的处理策略

### 7.1 可以直接纳入基础组件体系的

- `ui/EmptyState.jsx`
- `ui/ErrorState.jsx`
- `ui/PageSkeleton.jsx`
- `ui/RouteTransition.jsx`
- `ui/FadeInSection.jsx`

处理方式：

- 保留
- 统一风格
- 补规范

### 7.2 可以收敛到 Card 家族的

- `ActionCard.jsx`
- `AppCard.jsx`
- `InfoCard.jsx`
- `MediaCard.jsx`
- `MetricCard.jsx`

处理方式：

- 统一继承 `Card`
- 收敛 padding、标题、meta、icon、pill 的 token

### 7.3 暂不纳入基础层的

- `TabBar.jsx`
- `TopBar.jsx`
- `CategorySidebar.jsx`

原因：

- 它们更接近页面壳或模板层
- 不是基础 UI primitive

## 8. 文件结构建议

### 8.1 当前推荐结构

考虑到项目里已经有 `frontend/src/components/ui/`，建议继续沿用，不另起炉灶：

```text
frontend/src/components/ui/
  Button.jsx
  Input.jsx
  Textarea.jsx
  Select.jsx
  Tag.jsx
  Badge.jsx
  Card.jsx
  EmptyState.jsx
  ErrorState.jsx
  PageSkeleton.jsx
  Modal.jsx
  Toast.jsx
```

### 8.2 样式组织建议

可采用两种方式之一：

方式 A：

- 每个基础组件独立 CSS

方式 B：

- `ui/base.css`
- `ui/forms.css`
- `ui/feedback.css`
- `ui/card.css`

当前更推荐方式 A + 少量共享样式文件，原因是更利于渐进迁移。

## 9. 开发顺序建议

Step 2 推荐按下面顺序实施：

1. 先确认 Step 1 token 层
2. 先重构 `Card` 基底
3. 再做 `Button`
4. 再做表单控件组：`Input` / `Textarea` / `Select`
5. 再统一 `Tag` / `Badge`
6. 再统一 `EmptyState` / `ErrorState` / `PageSkeleton`
7. 最后再补 `Modal` / `Toast` / `Tabs`

这样做的原因是：

- 卡片和按钮最先决定页面视觉感
- 表单控件是后续发布页的基础
- 状态组件可帮助后续模板统一

## 10. 每个组件的验收要求

每个基础组件完成时，至少要满足：

1. 有明确单一职责
2. 有统一 props 设计
3. 有完整状态
4. 使用 Step 1 token
5. 至少有 2 个以上场景可复用
6. 不与现有组件职责重叠

## 11. 不在 Step 2 内做的事

Step 2 不应该做：

- 大规模业务页面改版
- 改造主站整体布局
- 重写模块导航
- 重做后台壳
- 在基础组件里塞业务接口逻辑

Step 2 的目标是把“积木”做好，不是把整栋楼盖完。

## 12. 推荐提交拆分

建议后续代码提交按下面粒度拆：

1. `feat(web-ui): add shared card primitive`
2. `feat(web-ui): add shared button primitive`
3. `feat(web-ui): add shared form field primitives`
4. `refactor(web-ui): unify empty error and skeleton states`
5. `feat(web-ui): add shared modal and toast primitives`

不要把整个 UI 体系一口气塞进一个 commit。

## 13. 已定稿决议

当前 Step 2 已根据产品方向正式定稿如下：

1. 继续沿用 `frontend/src/components/ui/` 作为 Web 基础组件主目录。
2. 现有 `ui/*Card` 采用“保留名称、逐步收敛到底层 `Card` 基底”的方式，不做一刀切重命名。
3. `Button`、`Input`、`Textarea`、`Select` 现在就进入统一基础组件建设，不再继续放任页面内零散实现扩散。
4. `Modal`、`Toast` 放到 Step 2 第二批，不挤占第一批核心基础件节奏。
5. 接受后续逐步把现有页面中的局部按钮、空态、表单控件替换成统一基础组件。

### 13.1 组件目录决议

正式结论：

- 基础组件统一沉淀到 `frontend/src/components/ui/`

原因：

- 当前项目已经有 `ui/` 目录基础
- 延续现有目录比重开目录成本更低
- 能减少后续目录迁移噪音

### 13.2 Card 家族决议

正式结论：

- 保留现有 `AppCard`、`InfoCard`、`MediaCard` 等名称
- 逐步让它们统一继承底层 `Card`

原因：

- 有利于平滑迁移
- 不会一次性打断现有业务认知
- 可以先统一实现，再考虑未来是否收紧命名

### 13.3 第一批基础组件决议

第一批必须优先完成：

- `Card`
- `Button`
- `Input`
- `Textarea`
- `Select`
- `Tag`
- `Badge`
- `EmptyState`
- `ErrorState`
- `PageSkeleton`

第二批再做：

- `Tabs`
- `Modal`
- `Toast`
- `Breadcrumb`
- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `Pagination`

## 14. 结论

Step 2 的价值不在于“多几个组件文件”，而在于把后续所有页面改版都变成“组装统一积木”，而不是重复造轮子。

只要 Step 2 做稳，后面的页面模板和模块迁移就会明显轻松很多。
