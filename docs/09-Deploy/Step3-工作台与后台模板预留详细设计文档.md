# Step3-工作台与后台模板预留详细设计文档

## 1. 文档目标

本文档用于细化 `Step3-页面模板层详细设计文档.md` 中第二批增强模板的最后一项工作：

- 为 Web 端预留统一的 `DashboardPageLayout`
- 为后台治理页预留统一的 `AdminPageLayout`
- 明确模板层和业务页之间的结构边界
- 为 Step 4 Web 主壳替换、Step 5 页面治理提供稳定入口

这份文档的重点不是立即大规模重构后台页面，而是先把“工作台页”和“后台页”未来如何统一，讲清楚、定下来。

## 2. 当前背景

当前 Step 3 已经完成的模板包括：

- `PageHeader`
- `SectionHeader`
- `FilterBar`
- `ListPageLayout`
- `DetailPageLayout`
- `FormPageLayout`

这意味着：

- 常规内容页、列表页、详情页、表单页已经有了统一模板入口
- 还缺少两类更偏“中控台 / 管理台”的页面骨架

目前项目中已存在两类代表页面：

- `frontend/src/pages/MyZone.jsx`
  代表“用户工作台 / 我的页 / 工具入口页”
- `frontend/src/pages/SquareOrgAdmin.jsx`
  代表“后台管理 / 配置运营 / 高信息密度管理页”

这两个页面都已经具备真实业务价值，但还没有抽象成统一模板层入口。

## 3. 本轮任务边界

### 3.1 本轮要解决的事

- 明确工作台页模板结构
- 明确后台页模板结构
- 固定模板 props 和插槽边界
- 明确首批建议接入页面
- 为后续模板实现提供低风险开发顺序

### 3.2 本轮不解决的事

- 不批量重写后台业务逻辑
- 不统一后台所有表单、表格、弹层细节
- 不替换 Web 主壳
- 不推动 App 端布局一起变化
- 不在这一轮把所有页面都迁到 Dashboard / Admin 模板

## 4. 设计原则

### 4.1 模板只负责结构，不负责业务

模板层不应直接承担：

- 数据请求
- 查询参数管理
- 权限判断逻辑
- 表单提交逻辑
- 弹层开关逻辑

这些仍由页面层负责。

模板层只负责：

- 页面区域划分
- 主次信息编排
- 桌面端与移动端响应式结构
- 区块间距与节奏统一

### 4.2 Dashboard 与 Admin 必须分型

虽然两者都属于“管理感较强”的页面，但目标完全不同：

- `DashboardPageLayout` 解决“总览、快捷入口、近期状态”
- `AdminPageLayout` 解决“配置、筛选、管理、编辑”

不能把二者重新做成一个“万能页面布局”，否则会回到模板层失控的问题。

### 4.3 允许轻量接入，不强制一次到位

这两个模板第一轮更适合：

- 先提供结构壳
- 先给现有页面统一入口
- 逐页把内部区域再慢慢收敛

也就是说，允许先“包一层模板”，后续再持续治理内部细节。

## 5. DashboardPageLayout 设计

## 5.1 适用页面

适合以下页面类型：

- 我的主页
- 用户工作台
- 学生工具总览页
- 某模块的运营首页

首批建议页面：

- `MyZone.jsx`

## 5.2 页面目标

Dashboard 类型页面的核心不是“连续阅读”，而是：

- 快速建立全局感知
- 快速进入高频功能
- 快速查看最近状态
- 快速定位下一步动作

因此其信息架构应优先体现：

- 顶部总览
- 关键指标
- 核心工作区
- 次要信息区

## 5.3 建议结构

```text
DashboardPageLayout
  Summary
  Stats
  QuickActions
  Main
  Secondary
  FooterActions (optional)
```

## 5.4 建议 props

建议第一版 props 如下：

- `summary`
  用于个人卡片、欢迎区、账户概览区
- `stats`
  用于关键指标卡片组
- `quickActions`
  用于高频功能入口区
- `main`
  用于课程、待办、近期动态等主工作区
- `secondary`
  用于更多工具、说明、帮助、信息补充
- `footer`
  可选，用于底部统一操作区
- `className`
  允许页面挂接自定义类
- `contentClassName`
  允许对主体区做局部扩展

## 5.5 响应式建议

桌面端建议：

- `summary` 独占一行
- `stats` 可为 3 到 4 列指标网格
- `quickActions / main / secondary` 采用 2 列或 3 列混合编排
- 主区优先宽列，次区优先窄列

移动端建议：

- 所有区域回落为单列
- `quickActions` 和 `stats` 允许保持 2 列
- 避免把桌面复杂侧栏强塞到移动端

## 5.6 与 MyZone 的映射关系

`MyZone.jsx` 当前内容可以映射为：

- `summary`
  个人资料卡片
- `stats`
  帖子 / 点评 / 收藏统计
- `main`
  当前课程、Todo 预览
- `quickActions`
  食堂、课表、日记本、Todo、商家管理、管理员后台
- `secondary`
  关于我们、特别鸣谢、免责声明、联系我们
- `footer`
  编辑资料 / 登录 / 退出登录

这说明 `MyZone` 非常适合作为 Dashboard 模板的首个验证页。

## 5.7 模板边界

`DashboardPageLayout` 不应内置：

- 用户头像逻辑
- 登录态判断
- 课程请求逻辑
- Todo 排序逻辑
- 管理员入口判断

这些都应该由 `MyZone.jsx` 继续掌握，再作为插槽内容传给模板。

## 6. AdminPageLayout 设计

## 6.1 适用页面

适合以下页面类型：

- 后台管理列表页
- 后台配置页
- 后台内容运营页
- 多 tab 管理页

首批建议页面：

- `SquareOrgAdmin.jsx`

## 6.2 页面目标

Admin 类型页面的核心不是展示情绪氛围，而是：

- 高效切换管理对象
- 快速完成增删改查
- 保持信息密度可控
- 让操作路径稳定、可预期

它与主站内容页相比，应更强调：

- 结构克制
- 工具条明确
- 主区操作聚焦
- 次区提示可选

## 6.3 建议结构

```text
AdminPageLayout
  Header
  Toolbar
  Content
  Aside (optional)
  Footer (optional)
```

## 6.4 建议 props

建议第一版 props 如下：

- `header`
  用于页面标题、说明、状态提示、主操作
- `toolbar`
  用于 tab、筛选、搜索、批量操作入口
- `content`
  用于管理列表、表单区、编辑区
- `aside`
  可选，用于帮助说明、操作提示、规则说明、二级表单
- `footer`
  可选，用于底部统一操作或状态信息
- `mode`
  可选，预留 `default / dense / split`
- `className`
  允许页面挂接自定义类
- `contentClassName`
  允许对主内容区做局部扩展

## 6.5 mode 预留建议

建议模板先预留 `mode`，但第一轮不做复杂逻辑。

推荐含义如下：

- `default`
  常规后台配置页
- `dense`
  更高信息密度，适合表格 / 列表密集页
- `split`
  主区 + 侧区分栏更明显，适合“列表 + 编辑器”结构

这样可以避免后续再重复拆一套后台布局。

## 6.6 响应式建议

桌面端建议：

- `header` 顶部固定结构节奏
- `toolbar` 放在标题下方，优先承载 tab / filter / actions
- `content` 默认宽列
- `aside` 可作为 280px 到 320px 辅助列

移动端建议：

- `toolbar` 自动换行
- `content` 与 `aside` 回落为单列
- 不做复杂双栏强制并排

## 6.7 与 SquareOrgAdmin 的映射关系

`SquareOrgAdmin.jsx` 当前内容可以映射为：

- `header`
  广场后台标题、说明、可能的主操作入口
- `toolbar`
  组织管理 / 热搜管理 / 广场轮播 tab 切换
- `content`
  `OrgManager / TrendingAdmin / BannersAdmin`
- `aside`
  第一轮可为空

这说明 `SquareOrgAdmin` 适合作为 Admin 模板的最小验证页。

## 6.8 模板边界

`AdminPageLayout` 不应内置：

- tab 状态切换逻辑
- query key 定义
- 增删改查 mutation
- 表单字段细节
- 删除确认逻辑

这些应继续留在具体页面和模块内部。

## 7. 两类模板的差异对比

| 维度 | DashboardPageLayout | AdminPageLayout |
| --- | --- | --- |
| 页面目标 | 总览与分发 | 管理与操作 |
| 阅读节奏 | 卡片化、轻量跳转 | 高密度、连续操作 |
| 主结构 | Summary + Stats + Workbench | Header + Toolbar + Content |
| 视觉气质 | 轻松、校园感、欢迎态 | 克制、稳定、工具感 |
| 典型页面 | MyZone | SquareOrgAdmin |
| 侧栏角色 | 次要信息补充 | 规则说明 / 辅助操作 |

这张表的意义是帮助后续页面归类时不再模糊。

## 8. 推荐目录与命名

建议在现有模板目录继续平铺：

```text
frontend/src/components/templates/
  DashboardPageLayout.jsx
  DashboardPageLayout.css
  AdminPageLayout.jsx
  AdminPageLayout.css
```

保持与现有模板一致，原因是：

- 当前模板数量还不多
- Step 3 仍在收敛期
- 平铺更利于统一审查与快速迭代

## 9. 首批接入建议顺序

建议按以下顺序推进：

1. 先实现 `DashboardPageLayout` 模板壳
2. 用 `MyZone.jsx` 做最小接入验证
3. 再实现 `AdminPageLayout` 模板壳
4. 用 `SquareOrgAdmin.jsx` 做最小接入验证
5. 接入后仅调整最外层结构，不大改内部业务块

这样做的好处是：

- 风险最低
- 容易回归验证
- 不会把 T14 变成后台大重构任务

## 10. 可见成果预期

完成模板预留后，短期内会带来三类结果：

### 10.1 代码层

- 工作台页和后台页拥有统一模板入口
- 后续页面不需要再从零拼页面骨架
- 模板层覆盖范围从内容页扩展到管理页

### 10.2 开发流程层

- Step 4 改 Web 主壳时，页面结构接入点更稳定
- 后续做“我的页桌面化改造”时不必重新发明骨架
- 后台页新增时可先套 `AdminPageLayout`

### 10.3 维护层

- 减少工作台页和后台页各自散落布局样式
- 降低未来页面分化后的返工成本

## 11. 风险点

### 11.1 过度抽象风险

如果模板 props 一开始设计得过多、过细，会导致：

- 页面接入成本反而变高
- 模板变成新的业务容器

因此第一版应优先保持少量核心插槽。

### 11.2 误把页面内部模块也强行模板化

例如：

- 把成员管理表单直接抽成 Admin 模板内置块
- 把 Todo 预览直接写死进 Dashboard 模板

这会让模板层失去边界。

### 11.3 视觉误混风险

如果 Dashboard 和 Admin 视觉语言过于相似，会造成：

- 用户对“内容入口页”和“管理后台页”感知混乱
- 后续 UI 节奏难以统一

因此两者应共享基础 token，但保留不同的结构节奏与氛围强度。

## 12. 验收标准

本阶段文档验收标准建议如下：

1. `DashboardPageLayout` 与 `AdminPageLayout` 的用途边界明确
2. 两类模板的建议 props 与插槽结构明确
3. 与 `MyZone.jsx`、`SquareOrgAdmin.jsx` 的映射关系明确
4. 已说明本轮不做的大项边界
5. 已明确后续落地顺序

若进入代码实现阶段，再增加：

1. 模板组件文件已创建
2. 至少 1 个 Dashboard 页完成最小接入
3. 至少 1 个 Admin 页完成最小接入
4. `npm run build:web` 通过

## 13. 需要你把关的点

下面这些点最值得你先拍板：

1. `MyZone` 是否确认作为 `DashboardPageLayout` 首个验证页
2. `SquareOrgAdmin` 是否确认作为 `AdminPageLayout` 首个验证页
3. `AdminPageLayout` 是否接受先只预留 `aside` 和 `mode`，第一轮不做复杂行为
4. Dashboard 页面是否接受“总览区、指标区、快捷入口区、主工作区”这套固定节奏

## 14. 结论

T14 的核心不是“再做两个名字不同的 layout 文件”，而是把工作台页和后台页正式纳入统一模板层。

只要这一层边界先定清楚，后面 Web 前端继续治理时：

- 工作台页可以独立演进而不影响 App 端旧结构
- 后台页可以逐步治理而不必一次重构
- Step 4 和 Step 5 都会更容易拆任务、控风险、做验收
