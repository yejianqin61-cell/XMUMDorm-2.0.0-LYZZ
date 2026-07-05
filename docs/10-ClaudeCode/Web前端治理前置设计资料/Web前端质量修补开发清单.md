# Web 前端质量修补开发清单

> 基于 2026-07-04 全量审计报告，将 40 项问题拆分为 5 个 Phase 的可执行开发任务。

## 审计基线

- **审计范围**: `frontend/src/` 全部 309 个文件 + `shared/` 33 个文件
- **发现问题**: 致命 4 / 高危 12 / 中危 16 / 低危 8，共 40 项
- **核心结论**: 桌面壳 (Step 4) 已搭建但因 `#root { max-width: 430px }` 全局锁死而无法生效；31 个页面仍引用旧组件体系；20+ CSS 文件使用未定义的 `--wx-*` 变量

---

## Phase 1: 解除桌面端全局阻塞 (预计 3-4 个任务)

> **目标**: 让桌面壳的三段式布局真正可见，统一颜色体系入口。
> **验收**: 1920px 宽度下 `#root` 不再被限制在 430px；SiteWebShell 的 Header/Sidebar/Main/Aside 完整展开。

### Task 1.1 — 解除 `#root` 桌面端宽度锁死

- **关联问题**: F-1
- **文件**: `frontend/src/index.css`
- **改动**:
  1. 将 `@media (min-width: 431px)` 改为 `@media (min-width: 431px) and (max-width: 767px)`，仅在手机/小平板范围保留「手机模拟居中」效果
  2. 在 `768px` 处新增断点：`#root { max-width: none; margin: 0; border-radius: 0; box-shadow: none; overflow: visible }`
  3. 同步检查 `body { padding-top/bottom: var(--safe-*) }` — 桌面端 safe-area 值为 0，理论上无害，但确认不产生意外偏移
- **验证**: `npm run build:web`，桌面端打开首页能看到三段式布局（侧栏+主内容+辅助栏）

### Task 1.2 — 合并 `index.css` 旧颜色体系到 `tokens.css`

- **关联问题**: F-2
- **文件**: `frontend/src/index.css`, `frontend/src/styles/tokens.css`
- **改动**:
  1. 将 `index.css` 中的 `--accent`, `--brand-1/2/3`, `--text-1/2/3`, `--app-bg`, `--app-surface` 等旧变量标记为 `/* @deprecated */`
  2. 在 `tokens.css` 末尾新增一节 `/* Legacy bridge from index.css */`，将这些变量映射到新 token（如 `--accent: var(--color-brand-primary)`）
  3. `--post-ios-*` 变量族暂时保留但加 `/* @deprecated — migrate pages to tokens.css */` 注释
- **验证**: `grep -r "var(--brand-1)" frontend/src/` 确认无残留引用，或引用处已通过 bridge 正确取值

### Task 1.3 — 定义 `--wx-*` 变量到 token 映射

- **关联问题**: F-3
- **文件**: 新建 `frontend/src/styles/legacy-wx-bridge.css`；修改 `frontend/src/App.jsx`
- **改动**:
  1. 新建 `legacy-wx-bridge.css`，将 `--wx-*` 映射到 `tokens.css`：
     ```css
     :root {
       --wx-green: var(--color-brand-primary);
       --wx-text: var(--color-text-primary);
       --wx-text-secondary: var(--color-text-secondary);
       --wx-text-tertiary: var(--color-text-tertiary);
       --wx-bar-bg: var(--color-bg-surface-muted);
       --wx-border: var(--color-border-default);
       --wx-bg-secondary: var(--color-bg-page);
       --wx-red: var(--color-danger);
     }
     ```
  2. 在 `App.jsx` 中 `import './styles/legacy-wx-bridge.css'`（放在 tokens.css 之后）
  3. 从各旧 CSS 文件中移除 fallback 值（如 `var(--wx-green, #07c160)` → `var(--wx-green)`），让映射层接管
- **验证**: `grep -r "\-\-wx-" frontend/src/` 确认所有引用均有定义来源

### Task 1.4 — 移除 `Layout.jsx` 桌面端 fullscreen 调用

- **关联问题**: L-3（提升优先级，因影响桌面体验）
- **文件**: `frontend/src/components/Layout.jsx`
- **改动**:
  1. `handleFirstInteraction` 增加 `if (isDesktopShell) return;` 提前退出
  2. 确认 `onClick={handleFirstInteraction}` 在桌面模式下无副作用
- **验证**: 桌面端点击页面任意位置不触发全屏

---

## Phase 2: 统一组件引用 (预计 6-8 个任务)

> **目标**: 31 个页面全部迁移到新 `ui/` 组件体系，消除新旧组件并存。
> **验收**: `grep -r "from.*components/Card" frontend/src/pages/` 返回空；`grep -r "from.*components/EmptyState" frontend/src/pages/` 返回空。

### Task 2.1 — 迁移旧 Card → 新 ui/Card（11 个页面）

- **关联问题**: H-1
- **涉及文件**:
  - `pages/PostDetail.jsx`
  - `pages/FoodDetail.jsx`
  - `pages/MerchantList.jsx`
  - `pages/Rankings.jsx`
  - `pages/AreaProductRanking.jsx`
  - `pages/AboutTeam.jsx`
  - `pages/AboutEditor.jsx`
  - `pages/AboutEditorNote.jsx`
  - `pages/AboutAlgorithm.jsx`
  - `pages/AboutLevelAlgorithm.jsx`
  - `pages/AboutThanks.jsx`
- **改动**: `import Card from '../components/Card'` → `import Card from '../components/ui/Card'`
- **注意**: 旧 Card 使用 `className="card"` 而新 Card 默认使用 `.ui-card` 类。迁移时需同步检查页面 CSS 中对 `.card` 的引用是否需要改为 `.ui-card`，或在 JSX 上传入 `className` 兼容。
- **验证**: 逐页构建确认无样式断裂

### Task 2.2 — 迁移旧 EmptyState → 新 ui/EmptyState（13 个页面）

- **关联问题**: H-2
- **涉及文件**: `FoodDetail`, `FoodList`, `FoodManage`, `FoodShopHot`, `FoodReviewPublish`, `MerchantFoodDetail`, `MerchantList`, `MyPosts`, `PostDetail`, `MyReviews`, `Rankings`, `SquareTrendingList`, `AreaProductRanking`
- **改动**: `import EmptyState from '../components/EmptyState'` → `import EmptyState from '../components/ui/EmptyState'`
- **注意**: 新 EmptyState 的 props 不同（增加了 `icon`, `eyebrow`, `className`），需逐个检查调用处是否传了不兼容的 props。
- **验证**: 逐页检查空数据状态显示正常

### Task 2.3 — 迁移旧 Skeleton* → 新 ui/PageSkeleton（7 个页面）

- **关联问题**: H-3
- **涉及文件**:
  - `pages/TreeHole.jsx` — `SkeletonPost` → `PageSkeleton variant="list"`
  - `pages/PostSearch.jsx` — `SkeletonPost` → `PageSkeleton variant="list"`
  - `pages/PostTagFeed.jsx` — `SkeletonPost` → `PageSkeleton variant="list"`
  - `pages/MerchantList.jsx` — `SkeletonCard` → `PageSkeleton variant="card"`
  - `pages/FoodList.jsx` — `SkeletonFood` → `PageSkeleton variant="card"`
  - `pages/FoodShopHot.jsx` — `SkeletonFood` → `PageSkeleton variant="card"`
  - `pages/FoodManage.jsx` — `SkeletonFood` → `PageSkeleton variant="card"`
- **验证**: 逐页打开确认 Loading 骨架屏显示正常

### Task 2.4 — 清理旧组件文件（确认无残留引用后删除）

- **关联问题**: H-1, H-2, H-3（收尾）
- **文件**:
  - `components/Card.jsx` + `components/Card.css`
  - `components/EmptyState.jsx` + `components/EmptyState.css`
  - `components/SkeletonPost.jsx` + `components/SkeletonCard.jsx` + `components/SkeletonFood.jsx`
  - `components/Skeleton.css` + `components/SkeletonPost.css` + `components/SkeletonCard.css` + `components/SkeletonFood.css`
- **前置条件**: Task 2.1-2.3 全部完成，且 `grep` 确认无任何残留引用
- **注意**: 还需要检查 `components/` 内部是否有引用旧组件（如 `AreaCard.jsx`, `FoodCard.jsx`, `MerchantCard.jsx` 内部可能用了旧 Card）
- **验证**: `npm run build:web` 通过

### Task 2.5 — 迁移旧组件内部对旧 Card/EmptyState 的引用

- **关联问题**: H-1, H-2（组件层面）
- **涉及文件**:
  - `components/AreaCard.jsx` → 改用 `ui/Card`
  - `components/FoodCard.jsx` → 改用 `ui/Card`
  - `components/MerchantCard.jsx` → 改用 `ui/Card`
  - `components/ReviewCard.jsx` → 改用 `ui/Card`
  - `components/CategorySection.jsx` → 改用 `ui/EmptyState`
  - `components/PostDetailShell.jsx` → 改用 `ui/EmptyState`
- **验证**: `grep -r "from '\.\./Card'" frontend/src/components/` 和 `grep -r "from '\.\./EmptyState'" frontend/src/components/` 返回空

### Task 2.6 — 合并 `state.css` 和 `states.css`

- **关联问题**: M-1
- **文件**: `frontend/src/styles/states.css`, `frontend/src/styles/state.css`, `frontend/src/App.jsx`
- **改动**:
  1. 新建 `frontend/src/styles/global-states.css`
  2. 将 `states.css` 中的 `.state-loading`（去掉 doge GIF 引用）、`.state-error`、`.state-empty`、`.state-inline-error` 迁移到新文件
  3. 将 `state.css` 中的 `.ui-state--*` 和 `.ui-page-skeleton` 迁移到新文件
  4. `App.jsx` 中只保留一个 import
  5. 旧 `layoutRoutes.jsx` 中的 `className="state-loading route-loading"` Fallback 改为 `PageSkeleton`（或保持兼容）
- **验证**: `grep -r "states\.css\|state\.css" frontend/src/` 确认残留导入已清理

---

## Phase 3: 消除硬编码与样式碎片化 (预计 5-7 个任务)

> **目标**: 页面 CSS 收口到 tokens.css 体系，消除硬编码颜色/间距。
> **验收**: 至少 80% 的页面 CSS 颜色值通过 var() 引用 token。

### Task 3.1 — 修复 `Tag.css` 和 `Badge.css` 硬编码颜色

- **关联问题**: H-5
- **文件**: `frontend/src/components/ui/Tag.css`, `frontend/src/components/ui/Badge.css`
- **改动**:
  1. Tag.css：`#b86a12` → `var(--accent-canteen)` 的 darker 变体（或在 tokens.css 中新增 `--color-canteen-text`）；`#d4547d` → 新增 `--accent-club-text`；`#268a63` → 新增 `--accent-marketplace-text`
  2. Badge.css：`#a55a00` → `var(--color-warning)` 的 darker 变体；`#236db5` → `var(--color-brand-primary)` 的 darker 变体；`#247d5c` → `var(--color-success)` 的 darker 变体
  3. 如果需要 darker 变体，在 `tokens.css` 中补充定义
- **验证**: 视觉回归测试 — Tag/Badge 颜色与之前一致

### Task 3.2 — 修复 `Button.css` 硬编码渐变色

- **关联问题**: M-2（ui 层面）
- **文件**: `frontend/src/components/ui/Button.css`
- **改动**: `#78c5ff` → `color-mix(in srgb, var(--color-brand-primary) 70%, white)` 或新增 token `--color-brand-primary-light`
- **验证**: Primary Button hover 态渐变色与之前视觉一致

### Task 3.3 — 页面 CSS 条件化移除 TabBar 底部间距

- **关联问题**: H-4
- **涉及文件**: `PostDetail.css`, `CanteenHome.css`, `Layout.css`, `SquareHome.css`, `PublishCenter.css`, `TreeHole.css` 等约 15 个 CSS 文件
- **改动**:
  1. 在 `tokens.css` 中新增 `--safe-pb-desktop: 24px`（仅内容底部内边距，不含 tabbar）
  2. 各页面 CSS 在桌面端使用 `@media (min-width: 768px)` 覆盖 `padding-bottom`：
     ```css
     @media (min-width: 768px) {
       .page-class {
         padding-bottom: var(--safe-pb-desktop);
       }
     }
     ```
  3. 或使用新的 CSS 变量方案：定义 `--layout-bottom-pad` 在移动端 = tabbar + safe，桌面端 = 24px
- **验证**: 桌面端页面底部不再有 ~100px 空白

### Task 3.4 — 修复 `FoodList.css` 硬编码移动端 chrome 高度

- **关联问题**: H-8
- **文件**: `frontend/src/pages/FoodList.css`
- **改动**: `height: calc(100dvh - 44px - 50px - ...)` → 桌面端使用 `min-height` 替代 `height`，移除移动端 chrome 的硬编码偏移
- **验证**: 桌面端 FoodList 页面不再凭空短 94px

### Task 3.5 — 高频页面 CSS 接入 tokens.css（第一批）

- **关联问题**: M-2
- **涉及文件**（按优先级）:
  1. `pages/TreeHole.css` — `#fbfcfe` → `var(--color-bg-page)`
  2. `pages/CanteenHome.css` — `#f2f2f7` → `var(--color-bg-page)`, `#9a5a13` → `var(--accent-canteen)`, `#10233b` → `var(--color-text-primary)`
  3. `pages/PostDetail.css` — `#fbfcfe` → `var(--color-bg-page)`
  4. `pages/Layout.css` — `rgba(0,0,0,0.45)` → token
- **验证**: 视觉回归 — 页面颜色与之前一致

### Task 3.6 — 整合 `AppCard` 到 `Card`（消除双 API）

- **关联问题**: M-11
- **文件**: `frontend/src/components/ui/AppCard.jsx`, `frontend/src/components/ui/Card.jsx`
- **改动**:
  1. 将 `AppCard` 的 `tone`/`strong`/`muted` props 合并到 `Card` 组件
  2. 将 `AppCard` 改为 deprecated re-export：`export { Card as AppCard } from './Card'`
  3. 所有 `import AppCard` 处改为 `import { Card }` 并更新 props
- **验证**: 所有使用 AppCard 的组件（EmptyState, InfoCard, MediaCard, ActionCard, MetricCard）正常工作

---

## Phase 4: 目录职责清理与死代码删除 (预计 4-5 个任务)

> **目标**: `pages/` 只放路由页面，`components/` 只放复用组件，清理所有死代码。
> **验收**: `pages/` 目录中不再有 Card/ItemCard 等组件名文件；mock 文件全部移除。

### Task 4.1 — 迁移 pages/ 中的组件到 components/

- **关联问题**: M-4
- **涉及文件**:
  1. `pages/Errands/ErrandCard.jsx` → `components/errands/ErrandCard.jsx`
  2. `pages/Marketplace/MarketplaceItemCard.jsx` → `components/marketplace/MarketplaceItemCard.jsx`
  3. `pages/Clubs/ClubCommentsSection.jsx` → `components/clubs/ClubCommentsSection.jsx`
- **改动**: 搬迁文件 + 更新所有 import 路径
- **验证**: `grep` 确认旧路径无残留引用

### Task 4.2 — 分类处理 8 个悬空页面

- **关联问题**: M-5
- **涉及文件**:
  - **确认删除**: `Eat.jsx`（仅重定向到 `/eat`）、`SquareTrending.jsx`（功能已被替代）
  - **确认删除或接入路由**: `Clubs/ClubsHome.jsx`, `Errands/ErrandsHome.jsx`, `Handbook/HandbookHome.jsx`, `Handbook/HandbookCollections.jsx`, `Marketplace/MarketplaceHome.jsx`
  - **修复后保留**: `AboutEditor.jsx`（需修复 CSS 引用 + 接入路由或合并到 AboutEditorNote）
- **验证**: 每个文件有明确的「保留+接入路由」或「删除」决策记录

### Task 4.3 — 删除 5 个 mock 数据文件

- **关联问题**: H-9
- **文件**: `frontend/src/data/mockCanteen.js`, `mockComments.js`, `mockNotifications.js`, `mockPosts.js`, `mockRankings.js`
- **前置验证**: `grep -r "mockCanteen\|mockComments\|mockNotifications\|mockPosts\|mockRankings" frontend/src/ --include="*.jsx" --include="*.js"` 确认零引用
- **改动**: 直接删除

### Task 4.4 — 拆分食堂 `components/canteen/` 页面片段到 `features/canteen/`

- **关联问题**: M-6
- **涉及文件**:
  - `components/canteen/CanteenRegionGrid.jsx`
  - `components/canteen/CanteenHomeRankings.jsx`
  - `components/canteen/CanteenPickMeal.jsx`
  - `components/canteen/CanteenBannerCarousel.jsx`
  - `components/canteen/CanteenFoodSquare.jsx`
- **目标目录**: `frontend/src/features/canteen/`
- **保留在 components/canteen/**: `CanteenSearchBar.jsx`（纯 UI 组件，无数据请求）
- **改动**: 搬迁文件 + 更新 `CanteenHome.jsx` 中的 import 路径
- **验证**: `npm run build:web` 通过

### Task 4.5 — 修复 `AboutEditor.jsx` 的 CSS 引用 + `PostDetailShell.jsx` 反向依赖

- **关联问题**: M-12, M-7
- **文件**: `pages/AboutEditor.jsx`, `components/PostDetailShell.jsx`
- **改动**:
  1. `AboutEditor.jsx`: 创建 `AboutEditor.css`（或复用已有的 About 系列 CSS），修正 import
  2. `PostDetailShell.jsx`: 将 `import '../../pages/PostDetail.css'` 改为在组件自身目录管理样式，或抽取共享样式到 `styles/`
- **验证**: 构建通过，样式不丢失

---

## Phase 5: 可访问性与跨端清洁 (预计 4-5 个任务)

> **目标**: 补齐焦点管理、aria 属性，消除桌面端 PWA 残留，清理 shared 层。
> **验收**: Modal 键盘焦点可锁；PWA 启动视频/安装引导在桌面端不触发。

### Task 5.1 — Modal 焦点捕获

- **关联问题**: M-9
- **文件**: `frontend/src/components/ui/Modal.jsx`
- **改动**:
  1. 打开时保存 `document.activeElement`
  2. 用 `useEffect` 在模态框容器上监听 keydown，Tab 时在模态框内可聚焦元素间循环
  3. 关闭时 restore 焦点到打开前的元素
- **验证**: 键盘 Tab 导航不会逃逸到模态框后面

### Task 5.2 — ShellNavItem 补充 `aria-current`

- **关联问题**: M-10
- **文件**: `frontend/src/components/shell/ShellNavItem.jsx`
- **改动**: `isActive` 为 true 时添加 `aria-current="page"`
- **验证**: 屏幕阅读器可正确播报当前页

### Task 5.3 — `SiteHeader` 补充头像 link 的 `aria-label`

- **关联问题**: Shell audit A2
- **文件**: `frontend/src/components/shell/SiteHeader.jsx`
- **改动**: 用户头像 `<Link to="/myzone">` 增加 `aria-label="个人中心"` 或在 fallback 头像上移除 `aria-hidden`
- **验证**: 屏幕阅读器可识别头像链接

### Task 5.4 — 桌面端跳过 PWA 启动视频和安装引导

- **关联问题**: L-1, L-2
- **文件**: `frontend/src/App.jsx`
- **改动**:
  1. `SplashScreen`: 在 `useEffect` 中检查 `window.innerWidth >= 768`，若桌面端则直接 `onReady()` 跳过视频
  2. `InstallPrompt`: 在组件顶部增加 `if (window.innerWidth >= 768) return null`
- **验证**: 桌面端打开无 2 秒视频黑屏，无 PWA 安装弹窗

### Task 5.5 — 拆分 `Layout.jsx` 标题映射表

- **关联问题**: M-8
- **文件**: `frontend/src/components/Layout.jsx`
- **改动**:
  1. 新建 `frontend/src/config/pageTitles.js`
  2. 将 `TITLE_BY_PATH_ZH`, `TITLE_BY_PATH_EN` 和标题解析逻辑迁移到新文件
  3. `Layout.jsx` 中改为 `import { resolvePageTitle } from '../config/pageTitles'`
- **验证**: 页面标题显示不变

---

## Phase 6: 共享层规范化 (预计 3-4 个任务，可并行)

> **目标**: Shared 层去浏览器依赖，API 签名一致化，补充测试。
> **注意**: 此 Phase 涉及双端联动，每次改动后需 `npm run build:web && npm run build:app`。

### Task 6.1 — `formatPostTime()` 支持中英文

- **关联问题**: M-13
- **文件**: `shared/utils/formatTime.js`
- **改动**: 增加 `locale` 参数（`'zh' | 'en'`），中文环境返回中文时间描述
- **联动**: 所有调用 `formatPostTime` 的 Web 和 App 页面需要传入 locale
- **验证**: 切换语言后时间戳显示对应语言

### Task 6.2 — `scrollCache.js` / `schedulePersist.js` 移到 `frontend/src/utils/`

- **关联问题**: M-14
- **文件**: `shared/utils/scrollCache.js`, `shared/utils/schedulePersist.js`
- **改动**: 搬迁到 `frontend/src/utils/`，更新所有 import 路径
- **验证**: Web 端 scroll 恢复和 schedule 持久化功能正常；`npm run build:app` 不报错

### Task 6.3 — 统一 shared API 函数签名

- **关联问题**: Agent A4
- **改动**:
  1. 约定标准签名 `functionName(id, body, files?)` — id 可选（create 无 id），body 为数据对象，files 为可选文件数组
  2. 统一 FormData 构建逻辑：抽取 `shared/utils/toFormData(body, files)` 消除 6 处重复的 Blob 检测
  3. 不强制一次性全部改完，但新代码和重构代码必须遵守
- **验证**: 改动后全量测试通过

### Task 6.4 — shared 层补充基础测试

- **关联问题**: M-15
- **改动**:
  1. `__tests__/shared/` 新建测试目录
  2. 优先覆盖：`formatTime.js`, `nestComments.js`, `formatTodoDue.js`, `apiError.js`
  3. 目标：核心工具函数 ≥ 80% 覆盖率
- **验证**: `npx jest __tests__/shared/` 全通过

---

## 开发执行规范

### 提交粒度

每个 Task 至少一个独立 commit，使用 Conventional Commits：

```
fix(web): unblock #root max-width for desktop (F-1)
refactor(web): migrate PostDetail to new ui/Card (H-1)
chore(web): delete 5 unused mock data files (H-9)
feat(web): add Modal focus trapping (M-9)
refactor(shared): add locale support to formatPostTime (M-13)
```

### 每 Task 验收标准

- [ ] `npm run build:web` 通过
- [ ] 关键路径手动回归（登录 → 首页 → 列表 → 详情）
- [ ] 若涉及 shared 层改动，额外执行 `npm run build:app`
- [ ] git diff 控制在 Task 范围内，不混入无关改动

### 不建议并行推进的 Task 组合

- Task 2.1-2.3（组件迁移）不要与 Task 3.3-3.5（CSS 接入 token）并行 — 先改 JSX 引用，确认无回归后再改 CSS
- Phase 6 可与 Phase 3-5 并行（操作不同目录，冲突概率低）

---

## 完成度追踪

| Phase | Tasks | 状态 | 预计工作量 |
|-------|-------|------|-----------|
| Phase 1: 解除阻塞 | 4 | ⬜ 未开始 | 0.5-1 天 |
| Phase 2: 统一组件 | 6 | ⬜ 未开始 | 1.5-2 天 |
| Phase 3: 消除硬编码 | 6 | ⬜ 未开始 | 1.5-2 天 |
| Phase 4: 目录清理 | 5 | ⬜ 未开始 | 1-1.5 天 |
| Phase 5: 可访问性 | 5 | ⬜ 未开始 | 1-1.5 天 |
| Phase 6: 共享层 | 4 | ⬜ 未开始 | 1-1.5 天 |
| **合计** | **30** | | **6.5-9.5 天** |

---

> **文档维护**: 每完成一个 Phase，更新本表状态并记录实际工时。发现问题清单遗漏时，追加到对应 Phase 或新增 Task。
