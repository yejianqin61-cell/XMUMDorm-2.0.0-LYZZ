# Step4-Web主壳详细设计文档

## 1. 文档目标

本文档用于承接已经完成的 Step 1 到 Step 3，正式细化 Step 4：

- 用桌面 Web 主壳替换当前移动端 PWA 主壳
- 保持 `frontend/` 继续独立演进，不影响 `frontend-app/`
- 让后续高频页面迁移建立在稳定的 Web 壳之上

这一步不是“大改几个页面”，而是先把 Web 的容器、导航、内容区和辅助区统一起来。

## 2. 当前阶段背景

Step 1 到 Step 3 已完成的内容包括：

- Token 层已建立
- 基础 UI 组件层已建立
- 页面模板层已建立
- 代表页模板验证已完成

当前项目已经具备：

- `PageHeader / SectionHeader / FilterBar`
- `ListPageLayout / DetailPageLayout / FormPageLayout`
- `DashboardPageLayout / AdminPageLayout`

因此 Step 4 的重点不再是页面内部结构，而是把页面放进统一的 Web 容器里。

## 3. 当前主壳现状

根据当前代码，`frontend/` 的主壳仍然明显偏移动端：

### 3.1 当前主站壳

当前主站入口链路大致为：

```text
App.jsx
  -> Layout.jsx
    -> TabBar.jsx
    -> root tab stack
    -> Outlet
```

当前 `Layout.jsx` 仍以这些假设为前提：

- 四个主 Tab 常驻
- 主要模块通过底部 Tab 切换
- 根 Tab 页面通过整屏横向切换承载
- `SquareHome / TreeHole / CanteenHome / MyZone` 作为常驻 pane

这更接近“手机 App 壳”，而不是“桌面网页壳”。

### 3.2 当前后台壳

当前后台入口链路大致为：

```text
App.jsx
  -> /myzone/admin
    -> components/Admin/AdminLayout.jsx
```

当前 `AdminLayout.jsx` 已经有：

- 侧边栏
- 顶栏
- 内容区

但它仍然更像“独立后台小壳”，还没有和主站 Step 4 的结构方案统一到同一设计语言和接入方式中。

## 4. Step 4 的核心目标

Step 4 只解决主壳层问题，核心目标有 4 个：

1. 让 Web 首页看起来像网页，而不是放大的手机页
2. 用桌面导航结构替代底部 Tab 的主导航职责
3. 让列表页、详情页、表单页、工作台页有统一落位容器
4. 为 Step 5 的页面批量迁移提供稳定外壳

## 5. 本轮边界

### 5.1 本轮要做的事

- 设计主站 Web 主壳结构
- 设计后台 Web 主壳关系
- 明确路由与页面如何接入新主壳
- 明确桌面端、平板端、手机端三套响应策略
- 明确 Step 4 的开发顺序

### 5.2 本轮不做的事

- 不批量迁移业务页面内部布局
- 不重写共享 API 层
- 不改动 `frontend-app/`
- 不大规模清理旧 CSS
- 不在这一轮完成全站桌面化

## 6. Step 4 在整体迁移中的位置

整个迁移链路应保持为：

```text
Step 1 Token
-> Step 2 基础组件
-> Step 3 页面模板
-> Step 4 Web 主壳
-> Step 5 高频页面迁移
-> Step 6 模块级治理与长尾清理
```

Step 4 的价值在于把“页面模板”放进“网页容器”。

如果跳过这一步直接改页面，会出现：

- 页面内容像网页，外层仍像 App
- 导航语义冲突
- 右侧辅助栏无处安放
- 后续返工成本很高

## 7. 主壳设计原则

### 7.1 壳层只负责容器与导航

Web 主壳应负责：

- 全局头部
- 左侧导航
- 主内容容器
- 右侧辅助栏
- 全局布局断点

Web 主壳不应负责：

- 页面数据请求
- 页面筛选逻辑
- 具体业务卡片内容
- 页面级 loading / empty / error

### 7.2 主站壳与后台壳同源但分型

主站壳与后台壳应共享：

- 基础 token
- 基础组件
- 页面模板节奏
- 桌面布局规则

但应保留不同职责：

- 主站壳更强调内容流、模块跳转、推荐与分发
- 后台壳更强调工具条、管理路径、操作密度

### 7.3 响应式要分层退化

桌面端优先，但不是只做桌面：

- 大屏桌面：三段式
- 小桌面 / 平板：双栏优先
- 手机 Web：允许退回简化布局

## 8. 主站主壳结构设计

## 8.1 推荐总结构

主站壳建议采用三段式结构：

```text
WebShell
  GlobalHeader
  Body
    PrimarySidebar
    MainViewport
    SecondaryAside
```

## 8.2 推荐区域职责

### GlobalHeader

负责：

- 品牌区
- 全局搜索入口
- 快捷操作入口
- 消息入口
- 用户入口

不负责：

- 页面二级标题
- 业务筛选条
- 页面专属操作

### PrimarySidebar

负责：

- 一级模块导航
- 当前模块高亮
- 可选的固定快捷入口

建议承载的一级导航包括：

- 广场
- 树洞
- 食堂
- 社团
- 二手
- 新生指南
- 跑腿
- 我的
- 管理后台

### MainViewport

负责：

- 页面主阅读区
- 页面模板内容承载
- 路由级页面切换

它是 Step 3 模板的主要消费区。

### SecondaryAside

负责：

- 推荐内容
- 帮助提示
- 模块二级信息
- 轻量快捷操作

不应承担必须操作，否则在窄屏下会产生体验断裂。

## 8.3 推荐宽度策略

建议桌面端宽度如下：

- 页面最大宽度：`1440px - 1600px`
- 左侧导航：`240px - 280px`
- 主内容区：`minmax(720px, 1fr)`
- 右侧辅助栏：`280px - 340px`

## 9. 后台主壳结构设计

## 9.1 推荐总结构

后台壳建议采用更克制的双栏或三段式：

```text
AdminShell
  AdminHeader
  AdminBody
    AdminSidebar
    AdminMain
    AdminAside (optional)
```

## 9.2 与当前 AdminLayout 的关系

当前 `components/Admin/AdminLayout.jsx` 已经具备最小后台壳雏形。

Step 4 不建议直接推翻重写，而应：

1. 保留其后台独立入口价值
2. 对齐 Step 4 的桌面布局规则
3. 后续逐步收敛到统一的 Web 壳设计语言

也就是说，后台壳可以视为 Step 4 的并行子路径，而不是阻塞主站壳替换的前置条件。

## 10. 路由接入策略

## 10.1 当前问题

当前 `App.jsx` 中：

- `/` 走 `Layout`
- `/myzone/admin` 走 `AdminLayout`

主站与后台是两套壳。

## 10.2 Step 4 建议方向

建议后续演进为：

```text
App.jsx
  -> WebAppShell
    -> SiteShellRoute
    -> AdminShellRoute
```

其中：

- 主站页面统一进入 `SiteWebShell`
- 后台页面统一进入 `AdminWebShell`

不要求第一轮就彻底统一实现，但要求结构方向先确定。

## 10.3 路由边界建议

主站壳承载：

- `/about/**`
- `/eat/**`
- `/myzone/**` 中非后台页面
- `/post/**`
- 以及其他主站模块页

后台壳承载：

- `/myzone/admin/**`
- 或后续独立后台命名空间

## 11. Step 4 与 Step 3 模板的关系

Step 4 不是替代 Step 3，而是消费 Step 3。

对应关系建议如下：

- `SiteWebShell > MainViewport > ListPageLayout`
- `SiteWebShell > MainViewport > DetailPageLayout`
- `SiteWebShell > MainViewport > FormPageLayout`
- `SiteWebShell > MainViewport > DashboardPageLayout`
- `AdminWebShell > AdminMain > AdminPageLayout`

这意味着：

- Step 3 负责页面内部结构
- Step 4 负责页面外部容器

两层边界必须稳定。

## 12. 断点与退化策略

### 12.1 大桌面 `>= 1440px`

建议：

- 完整三段式
- 右侧辅助栏常驻
- 全局头部完整显示

### 12.2 桌面 / 小桌面 `1200px - 1439px`

建议：

- 三段式仍保留
- 右侧辅助栏可收窄
- 左侧导航可压缩图文密度

### 12.3 平板 / 小桌面 `768px - 1199px`

建议：

- 优先双栏
- 右侧辅助栏可折叠或下沉
- 左侧导航可切抽屉式

### 12.4 手机 `<= 767px`

建议：

- 主站壳退回简化模式
- 允许继续保留底部导航作为移动 Web 兼容方案
- 不强制把桌面结构完全压缩到手机上

这意味着 Step 4 的目标是“桌面优先壳”，不是“所有端统一一个结构”。

## 13. 现有组件与未来壳组件建议

## 13.1 当前可利用的部分

当前可以继续利用或参考的部分包括：

- `Layout.jsx`
- `TabBar.jsx`
- `components/Admin/AdminLayout.jsx`
- `DashboardPageLayout`
- `AdminPageLayout`
- 已完成的页面头与区块头模板

## 13.2 建议新增的壳层组件

建议后续 Step 4 task 中新增或收敛出以下组件：

- `SiteWebShell`
- `SiteHeader`
- `SiteSidebar`
- `SiteAside`
- `ShellContent`
- `AdminWebShell`
- `ShellNavItem`
- `ShellQuickAction`

第一轮不要求全部做完，但建议先按这个命名方向准备。

## 14. Step 4 推荐实施顺序

建议严格按以下顺序推进：

1. 先新增主站壳结构组件
2. 先把 Header / Sidebar / MainViewport / Aside 占位搭起来
3. 先让主站根路由接入新壳
4. 暂时保留旧 `TabBar` 的移动兼容职责
5. 再选择 1 个高频页验证壳层下的页面落位
6. 最后再考虑后台壳与主站壳的进一步收敛

## 15. 首批验证页面建议

Step 4 完成首轮壳接入后，建议优先验证这些页面：

- `SquareHome`
  代表 Web 首页与内容入口
- `MyZone`
  代表工作台页在新主壳中的落位
- `MerchantList`
  代表列表模板在新主壳中的落位

后台侧可选验证：

- `SquareOrgAdmin`
  代表管理页模板与后台壳关系

## 16. 风险点

### 16.1 直接推翻旧壳风险

如果一次性完全删除旧 `Layout / TabBar`：

- 容易让手机 Web 直接回归
- 容易让主路由整体失稳

因此建议采用“桌面新壳接入 + 移动兼容保留”的过渡策略。

### 16.2 主壳和页面迁移同时推进风险

如果在同一个 task 里同时做：

- 主壳替换
- 多个页面模板迁移
- 样式重写

会导致问题难以定位、回归成本过高。

因此 Step 4 应只聚焦主壳。

### 16.3 把业务塞进壳层风险

如果把：

- 页面筛选
- 页面说明
- 页面 CTA
- 业务推荐块

直接写进壳层，就会让壳层重新业务化，失去复用价值。

## 17. 验收标准

Step 4 文档阶段验收建议如下：

1. 主站壳目标结构明确
2. 后台壳目标结构明确
3. 路由接入关系明确
4. 与 Step 3 模板的边界明确
5. 响应式退化策略明确
6. 实施顺序与首批验证页明确

进入代码实施阶段后，再增加：

1. Web 主站已进入桌面壳容器
2. 底部 Tab 不再承担桌面主导航职责
3. 至少 1 个高频页在新主壳下完成验证
4. `npm run build:web` 通过

## 18. 需要你把关的点

下面这些点最值得你先拍板：

1. Step 4 首批验证页是否确认优先 `SquareHome`
2. 手机 Web 是否接受保留旧 `TabBar` 作为兼容方案
3. 后台壳是否接受先保持独立入口，再逐步与主站壳统一设计语言
4. 右侧辅助栏在第一轮是否只做占位，不强制承载重业务

## 19. 结论

Step 4 的核心不是“重做首页”，而是正式把 `frontend/` 从移动端主壳切到桌面 Web 主壳。

只要这一步先做稳，后面的页面治理就会从“每页都要先想壳怎么摆”变成“所有页面都挂进同一个网页容器”，这会直接决定 Step 5 之后的推进效率和返工成本。
