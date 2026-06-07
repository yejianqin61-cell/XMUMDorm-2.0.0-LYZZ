# Task 01: Expo Router 架构迁移

**优先级**: 🔴 P0 — HIGH
**依据**: `docs/06-Analyze/移动端App项目审计报告_V3.0.html` — 风险 #1
**当前状态**: 自定义 TabNavigator + 简易 router.ts（22 行）
**目标状态**: Expo Router 文件系统路由（`app/` 目录）
**预估工期**: 4-5 天

---

## 一、现状分析

### 当前架构

```
mobile/src/
├── navigation/
│   ├── TabNavigator.tsx   ← 自定义 5-Tab 切换（useState 驱动）
│   └── router.ts          ← 22 行简易发布订阅路由
├── screens/
│   ├── TreeholeScreen.tsx  (549 行)
│   ├── EatScreen.tsx       (调度 → CanteenHomeScreen)
│   ├── SquareScreen.tsx    (调度 → SquareHomeScreen)
│   ├── MyZoneScreen.tsx    (带 9 个 onXxx callback prop)
│   └── MailboxScreen.tsx   (独立)
└── ...
```

### 当前的问题

| 问题 | 影响 |
|------|------|
| TabNavigator 用 `useState(tab)` 切换 | 没有 URL 路由，无法深度链接 |
| router.ts 发布订阅 | 无类型安全，路由参数靠 string |
| MyZoneScreen 接受 9 个 callback props | 子页面导航通过 prop drilling，极度耦合 |
| 无 `app/` 目录 | 无法使用 Expo Router 的文件系统路由 |
| 无 `_layout.tsx` | 无法使用 Slot/Stack/Tabs 布局 |
| `app.json` 中没有 `expo-router` plugin | Expo Router 未启用 |

### 目标架构

```
mobile/src/app/
├── _layout.tsx            ← Root Layout (Stack)
├── (tabs)/
│   ├── _layout.tsx        ← Tab Layout
│   ├── index.tsx          → 树洞 (重定向或默认 Tab)
│   ├── treehole.tsx       → TreeholeScreen
│   ├── eat.tsx            → EatScreen
│   ├── square.tsx         → SquareScreen
│   ├── mailbox.tsx        → MailboxScreen
│   └── myzone.tsx         → MyZoneScreen
├── post/
│   ├── [id].tsx           → PostDetailModal (改为路由页面)
│   └── new.tsx            → NewPostModal
├── canteen/
│   ├── index.tsx          → CanteenHomeScreen
│   ├── [shopId]/
│   │   └── food/
│   │       └── [foodId].tsx → FoodDetailScreen
│   └── search.tsx         → CanteenSearchScreen
├── admin/
│   ├── _layout.tsx        ← Admin Stack
│   ├── index.tsx          → AdminScreen
│   ├── users/
│   │   ├── index.tsx      → AdminUserListScreen
│   │   └── [userId].tsx   → AdminUserDetailScreen
│   └── ...
└── ...
```

---

## 二、任务拆解

### M01-Task001: 环境准备与 Expo Router 配置

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:
1. `app.json` 添加 `expo-router` plugin
2. 确认 `expo-router` 已安装（`package.json` 已有 `~56.2.8`）
3. 创建 `mobile/src/app/` 目录
4. 创建 `mobile/src/app/_layout.tsx` — Root Stack Layout
5. 验证 `expo start` 能正常启动 Expo Router

**验收标准**:
- [ ] `app.json` 包含 `expo-router` plugin
- [ ] `app/_layout.tsx` 存在且能渲染
- [ ] `expo start` 不报错

---

### M01-Task002: Tab 导航迁移（5 个主 Tab）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M01-Task001 |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1.5 天 |

**工作内容**:
1. 创建 `app/(tabs)/_layout.tsx` — 复用现有 `TabNavigator` 的 Tab 配置
2. 迁移 `TreeholeScreen` → `app/(tabs)/treehole.tsx`
3. 迁移 `EatScreen` → `app/(tabs)/eat.tsx`
4. 迁移 `SquareScreen` → `app/(tabs)/square.tsx`
5. 迁移 `MailboxScreen` → `app/(tabs)/mailbox.tsx`
6. 迁移 `MyZoneScreen` → `app/(tabs)/myzone.tsx`
7. 删除 `mobile/src/navigation/TabNavigator.tsx`

**关键决策**: MyZoneScreen 的 9 个 `onXxx` callback 改为 `router.push('/xxx')`

**验收标准**:
- [ ] 5 个 Tab 可以通过底部 Tab Bar 切换
- [ ] 每个 Tab 显示对应 Screen 内容
- [ ] MyZoneScreen 不再有 callback prop drilling
- [ ] `TabNavigator.tsx` 已删除
- [ ] 5 个 Tab 模块测试仍通过

---

### M01-Task003: Stack 导航迁移（子页面路由化）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M01-Task002 |
| **复杂度** | ⭐⭐⭐⭐ |
| **预估** | 2 天 |

**工作内容**:
逐个将当前的 Modal + callback 模式改为 Expo Router Stack 路由：

| 当前实现 | 目标路由 | 涉及 Screen |
|----------|----------|-------------|
| `PostDetailModal` (setSelectedPost) | `app/post/[id].tsx` | TreeholeScreen |
| `NewPostModal` (showNewPost) | `app/post/new.tsx` | TreeholeScreen |
| `NewTrendingPostScreen` | `app/square/trending/new.tsx` | SquareHomeScreen |
| `NewCampusPostScreen` | `app/square/campus/new.tsx` | SquareHomeScreen |
| `TrendingDetailScreen` | `app/square/trending/[id].tsx` | SquareHomeScreen |
| `CampusPostDetailScreen` | `app/square/campus/[id].tsx` | SquareHomeScreen |
| `FoodDetailScreen` | `app/canteen/[shopId]/food/[foodId].tsx` | CanteenHomeScreen |
| `FoodReviewPublishScreen` | `app/canteen/review/new.tsx` | FoodDetailScreen |
| `ClubProfileScreen` | `app/clubs/[clubId].tsx` | ClubsHomeScreen |
| `MarketplaceDetailScreen` | `app/marketplace/[itemId].tsx` | MarketplaceHomeScreen |
| `MarketplacePublishScreen` | `app/marketplace/new.tsx` | MarketplaceHomeScreen |
| `AdminScreen + 11 sub-screens` | `app/admin/` Stack | MyZoneScreen |
| `ProfileEditScreen` | `app/profile/edit.tsx` | MyZoneScreen |
| 所有 About*Screen | `app/about/` Stack | MyZoneScreen |

**验收标准**:
- [ ] 所有子页面通过 `router.push()` 导航（非 Modal state）
- [ ] 浏览器/深度链接可直接打开子页面
- [ ] 返回按钮正常工作（`router.back()` 或自动）
- [ ] 现有 20 个测试套件全部通过
- [ ] `router.ts` 文件已删除

---

### M01-Task004: 清理与验证

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M01-Task003 |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:
1. 删除 `mobile/src/navigation/` 整个目录
2. 删除 `mobile/src/screens/` 中已迁移到 `app/` 的旧文件
3. 更新所有 import 路径
4. 全量测试：`cd mobile && npx jest`
5. 手动验证 5 Tab + 核心子页面导航
6. 更新 `docs/00-Constitution/移动端约束.md` — 标记 "Expo Router 已实施"

**验收标准**:
- [ ] `navigation/` 目录已删除
- [ ] `screens/` 目录已清空（或仅保留未迁移的过渡文件）
- [ ] `npm test` → 416+ 用例 100% 通过
- [ ] 手动测试：树洞→帖子详情→返回、广场→热搜详情→返回、食堂→菜品详情→返回

---

## 三、风险与注意事项

| 风险 | 缓解措施 |
|------|----------|
| Expo Router 与现有 `index.ts` 的 `registerRootComponent` 冲突 | `router.ts` 注释中说存在冲突 — 需要验证 Expo SDK 56 是否已修复 |
| 深层路由参数传递 | 使用 `useLocalSearchParams` 替代 state |
| 69 个 Screen 逐个迁移工作量大 | 优先迁移核心路径（树洞/食堂/广场），Admin 可以批次处理 |
| 测试用例依赖旧架构 | 测试文件引用 `../screens/`，迁移后需更新 import |

## 四、完成定义 (DoD)

- [ ] `app/` 目录存在且有完整的 `_layout.tsx` 层级
- [ ] 5 Tab + 核心子页面 (≥15) 使用 Expo Router 路由
- [ ] `navigation/` 目录已删除
- [ ] `router.ts` 已删除
- [ ] 全部 416+ 测试用例通过
- [ ] 手动验收：深度链接、返回导航、Tab 切换
