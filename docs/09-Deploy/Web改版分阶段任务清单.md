# Web 改版分阶段任务清单

## 1. 任务目标

本清单用于指导 `frontend/` 的 Web 桌面化治理，要求做到：

- 不影响 `frontend-app/` 的 App 前端
- 不破坏 `shared/*` 共享层
- 每个阶段都能单独提交、单独验收

建议提交规范统一使用 Conventional Commits，例如：

- `docs(web): add frontend inventory and desktop layout plan`
- `refactor(web): replace mobile tab shell with desktop web shell`
- `feat(web): migrate square pages to desktop layout`

## 2. 阶段总览

| 阶段 | 目标 | 结果 |
| --- | --- | --- |
| Phase 0 | 治理准备 | 盘点完成、规范完成、边界冻结 |
| Phase 1 | 壳层替换 | Web 独立桌面壳落地 |
| Phase 2 | 页面模板化 | 列表/详情/表单/工作台模板落地 |
| Phase 3 | 核心模块迁移 | 广场、食堂、我的页迁移到桌面模板 |
| Phase 4 | 后台与长尾模块治理 | 后台、社团、二手、指南、跑腿统一 |
| Phase 5 | 收尾与验收 | 统一样式、性能、QA、文档补全 |

## 3. Phase 0 治理准备

### Task 0.1 现状盘点固化

- 目标：把当前 Web 页面、组件、路由、壳层结构形成固定文档
- 输入：`pages/**`、`components/**`、`App.jsx`、`layoutRoutes.jsx`
- 产出：
  - `Web前端现状盘点表.md`
  - `Web桌面化布局规范.md`
  - `Web改版分阶段任务清单.md`
- 验收：
  - 文档可对照真实代码
  - 页面与组件清单完整
- 建议提交：
  - `docs(web): add web frontend inventory and governance docs`

### Task 0.2 共享层边界冻结

- 目标：明确本轮 Web 改版默认不改 `shared/*`
- 范围：
  - `shared/api/*`
  - `shared/query/*`
  - `shared/constants/*`
  - `shared/utils/*`
- 产出：
  - 边界说明文档确认
  - 开发规则写入团队约定
- 验收：
  - 后续 Web task 默认只动 `frontend/*`
- 建议提交：
  - `docs(shared): clarify web and app refactor boundary`

### Task 0.3 页面职责校正清单

- 目标：标出哪些 `pages/` 文件其实是页面片段，不是 route page
- 范围：
  - `Clubs/ClubCommentsSection.jsx`
  - `Errands/ErrandCard.jsx`
  - `Marketplace/MarketplaceItemCard.jsx`
  - 其他待确认文件
- 产出：
  - 待迁移文件清单
  - 页面与业务组件拆分规则
- 验收：
  - 后续不再把新增卡片组件继续放进 `pages/`
- 建议提交：
  - `refactor(web): classify route pages and feature fragments`

## 4. Phase 1 壳层替换

### Task 1.1 新建 Web 桌面主壳

- 目标：替换当前 `Layout.jsx` 的移动端 Tab 主导结构
- 范围：
  - `frontend/src/components/Layout.jsx`
  - 新增 Web 专属导航 / 侧栏 / 右侧辅助区组件
- 产出：
  - 桌面版 `WebLayout`
  - 统一 header / sidebar / aside 骨架
- 验收：
  - 桌面宽度下不再依赖底部 `TabBar` 作为主导航
  - 根路由页面能在新壳中正常切换
- 建议提交：
  - `refactor(web): introduce desktop web layout shell`

### Task 1.2 路由壳分离

- 目标：将“页面壳”和“业务页面”解耦
- 范围：
  - `App.jsx`
  - `layoutRoutes.jsx`
  - `Layout` 相关组件
- 产出：
  - 更清晰的主站路由结构
  - App 式 tab stack 逻辑移除或降级为移动端专用
- 验收：
  - 路由行为清晰
  - 页面刷新与深链可正常工作
- 建议提交：
  - `refactor(web): decouple route shell from tab stack behavior`

### Task 1.3 全局样式骨架建立

- 目标：建立桌面版 spacing / container / panel / typography 基础样式
- 范围：
  - `frontend/src/styles/**`
  - Web 壳层样式文件
- 产出：
  - 桌面容器
  - 栅格与间距规则
  - 基础面板样式
- 验收：
  - 新壳与旧页面可以并存
  - 样式不污染 `frontend-app/`
- 建议提交：
  - `feat(web): add desktop layout tokens and shell styles`

## 5. Phase 2 页面模板化

### Task 2.1 列表页模板

- 目标：抽出统一列表页结构
- 优先覆盖：
  - `SquareTrendingList`
  - `SquareCampusFeed`
  - `MerchantList`
  - `MyPosts`
  - `MyReviews`
- 产出：
  - `ListPageLayout`
  - 统一筛选区 / 列表区 / 侧栏区
- 验收：
  - 至少 2 到 3 个模块复用同一模板
- 建议提交：
  - `feat(web): add shared desktop list page template`

### Task 2.2 详情页模板

- 目标：抽出统一详情页结构
- 优先覆盖：
  - `PostDetail`
  - `FoodDetail`
  - `MarketplaceDetail`
  - `ClubProfile`
- 产出：
  - `DetailPageLayout`
  - 正文区 / 元信息区 / 关联信息区分层
- 验收：
  - 正文宽度、操作区、评论区结构统一
- 建议提交：
  - `feat(web): add shared desktop detail page template`

### Task 2.3 表单页模板

- 目标：抽出统一发布 / 编辑页模板
- 优先覆盖：
  - `PostNew`
  - `MarketplacePublish`
  - `PublishErrand`
  - `ProfileEdit`
  - `FoodCreate`
- 产出：
  - `FormPageLayout`
  - sticky 操作区
- 验收：
  - 多个表单页共享同一布局规则
- 建议提交：
  - `feat(web): add shared desktop form page template`

### Task 2.4 个人工作台模板

- 目标：把 `MyZone` 从移动端个人中心改为桌面工作台
- 范围：
  - `MyZone`
  - `Mailbox`
  - `Schedule`
  - `TodoList`
  - `Diary`
- 产出：
  - `DashboardPageLayout`
  - 摘要卡、快捷入口、任务面板
- 验收：
  - 首屏信息密度明显提升
- 建议提交：
  - `feat(web): add desktop dashboard layout for my zone`

## 6. Phase 3 核心模块迁移

### Task 3.1 广场首页与帖子流迁移

- 目标：先改流量最大页面
- 范围：
  - `SquareHome`
  - `TreeHole`
  - `PostDetail`
  - `PostSearch`
  - `PostTagFeed`
- 验收：
  - 浏览、发帖、搜索链路完整可用
- 建议提交：
  - `feat(web): migrate square and post flows to desktop layout`

### Task 3.2 食堂模块迁移

- 范围：
  - `CanteenHome`
  - `CanteenSearch`
  - `MerchantList`
  - `FoodList`
  - `FoodDetail`
  - `Rankings`
- 验收：
  - 首页、商家、菜品、排行链路正常
- 建议提交：
  - `feat(web): migrate canteen module to desktop layout`

### Task 3.3 我的页面模块迁移

- 范围：
  - `MyZone`
  - `MyPosts`
  - `MyReviews`
  - `ProfileEdit`
  - `Mailbox`
- 验收：
  - 个人中心核心操作完整
- 建议提交：
  - `feat(web): migrate my zone module to desktop workbench`

## 7. Phase 4 后台与长尾模块治理

### Task 4.1 后台布局规范化

- 范围：
  - `pages/Admin/*`
  - `components/Admin/*`
- 产出：
  - 统一后台列表页、详情页、配置页样式
- 验收：
  - 管理后台视觉与交互一致
- 建议提交：
  - `refactor(web-admin): standardize admin layout and page templates`

### Task 4.2 社团 / 二手 / 跑腿 / 指南模块迁移

- 范围：
  - `Clubs/*`
  - `Marketplace/*`
  - `Errands/*`
  - `Handbook/*`
- 验收：
  - 各模块都接入统一模板族
- 建议提交：
  - `feat(web): migrate feature modules to desktop templates`

### Task 4.3 页面职责与目录收敛

- 目标：把页面片段逐步迁出 `pages/`
- 范围：
  - 页面片段迁移到 `components/` 或 `features/`
- 验收：
  - `pages/` 只保留 route page
- 建议提交：
  - `refactor(web): move non-route fragments out of pages directory`

## 8. Phase 5 收尾与验收

### Task 5.1 视觉一致性治理

- 目标：清理零散页面样式差异
- 范围：
  - 页面级 CSS
  - 共用状态样式
  - 卡片、按钮、表单、空态、错误态
- 验收：
  - 设计 token 覆盖主要页面
- 建议提交：
  - `refactor(web): unify desktop visual tokens and states`

### Task 5.2 性能与体验优化

- 目标：保证桌面改版后首屏与交互稳定
- 范围：
  - 路由懒加载
  - 大列表渲染
  - 图片加载
  - 动效与滚动体验
- 验收：
  - 无明显卡顿
  - 无明显布局抖动
- 建议提交：
  - `perf(web): optimize desktop page loading and interactions`

### Task 5.3 QA 与回归清单

- 核心回归链路：
  - 登录
  - 浏览广场
  - 发帖
  - 食堂浏览
  - 个人中心
  - 后台入口
- 构建验收：
  - `npm run build:web`
- 如涉及共享层变更，还需额外执行：
  - `npm run build:app`
  - `npm run build:capacitor`
- 建议提交：
  - `test(web): add desktop regression checklist and final polish`

## 9. 执行顺序建议

建议严格按下面顺序推进：

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

不要跳过 Phase 1 直接逐页改 UI，否则后面还要二次返工。

## 10. 每个 Task 的最小执行模板

后续每个 task 文档都建议固定包含：

1. 目标
2. 影响范围
3. 不可触碰边界
4. 实施步骤
5. 验收方式
6. 提交信息建议

## 11. 结论

这份任务清单的核心思想是：

- 先把 Web 和 App 的边界守住
- 先把 Web 壳层和模板体系建起来
- 再做模块迁移
- 每完成一个 task 就独立提交一次

这样后续即使改版周期很长，也能保持节奏清晰、风险可控、提交历史干净。
