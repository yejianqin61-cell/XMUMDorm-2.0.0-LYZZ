# Task 02: 大型组件拆分 + Custom Hooks 抽取

**优先级**: 🟡 P1 — MEDIUM
**依据**: `docs/06-Analyze/移动端App项目审计报告_V3.0.html` — 风险 #2, #3
**当前状态**: TreeholeScreen (549 行) 等大型单文件组件；`hooks/` 目录为空
**目标状态**: 每个 Screen ≤ 200 行；提取 ≥ 10 个 Custom Hook；≥ 15 个子组件
**预估工期**: 3-4 天

---

## 一、现状分析

### 需要拆分的 Screen（按行数排序）

| Screen | 行数 | 包含的逻辑 | 可拆出 |
|--------|------|-----------|--------|
| TreeholeScreen | 549 | Toolbar / TagBar / WaterfallGrid / FAB / Search / LangSwitcher / ScrollToTop / InfiniteScroll | 4 组件 + 4 Hooks |
| ScheduleScreen | ~400 | 周视图 / 课程卡片 / 导入 / 提醒 | 3 组件 + 2 Hooks |
| TodoScreen | ~380 | 列表 / 输入框 / 完成状态 / 筛选 | 2 组件 + 2 Hooks |
| SquareHomeScreen | ~350 | 热搜榜 / 轮播 / 四宫格 / 校园此刻 | 4 组件 + 1 Hook |
| MarketplaceHomeScreen | ~320 | 分类 Tab / 商品列表 / 搜索 | 3 组件 + 1 Hook |
| MarketplacePublishScreen | ~300 | 表单 / 图片选择 / 验证 | 2 组件 + 1 Hook |
| DiaryScreen | ~340 | 日记列表 / 编辑 / 往年今日 | 2 组件 + 1 Hook |
| MyZoneScreen | ~300 | 用户卡片 / 功能入口 / 今日待办 | 3 组件 |

### 当前 hooks/ 目录

```
mobile/src/hooks/
└── (empty)
```

0 个 Custom Hook。所有数据获取、滚动处理、状态管理逻辑都内联在 Screen 中。

---

## 二、任务拆解

### M02-Task001: TreeholeScreen 拆分（最优先 — 最大的文件）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | Task01 (Expo Router 迁移) |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1 天 |

**拆分方案**:

```
TreeholeScreen.tsx (549行)
    ↓
app/(tabs)/treehole.tsx          (~80行) — 编排层
components/treehole/
├── TreeholeToolbar.tsx           (~60行) — Brand + Search + LangSwitch + Bell
├── TreeholeTagBar.tsx            (~50行) — 横向滚动 Tag + 活跃指示器
├── PostWaterfallGrid.tsx         (~80行) — 双列瀑布流 + 加载更多 + 空态
└── FloatingActions.tsx           (~30行) — FAB + 回到顶部按钮

hooks/
├── usePosts.ts                   (~60行) — fetchPosts + mergePostsById + pagination
├── usePostTags.ts                (~40行) — getVisibleTags / getPostTagsList
├── useScrollToTop.ts             (~15行) — scrollRef + showTopBtn + scrollToTop
└── useInfiniteScroll.ts          (~30行) — onScroll throttle + hasMore + loadMore
```

**验收标准**:
- [ ] `treehole.tsx` ≤ 100 行
- [ ] 4 个子组件独立可测试
- [ ] 4 个 Hook 独立可复用
- [ ] 功能完全不变（快照测试验证）

---

### M02-Task002: ScheduleScreen + TodoScreen 拆分

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M02-Task001 |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1 天 |

**ScheduleScreen 拆分**:
```
ScheduleScreen.tsx
    ↓
components/schedule/
├── WeekView.tsx           (~100行) — 7 列周视图网格
├── CourseCard.tsx          (~50行) — 单个课程卡片
└── ScheduleHeader.tsx      (~40行) — 周选择器 + 导入按钮

hooks/
├── useSchedule.ts          (~50行) — fetch + parse + group by day
└── useScheduleReminder.ts  (~20行) — 提醒逻辑封装
```

**TodoScreen 拆分**:
```
TodoScreen.tsx
    ↓
components/todo/
├── TodoInput.tsx           (~40行) — 输入框 + 添加按钮
└── TodoListItem.tsx        (~50行) — 单条待办 + 完成/删除

hooks/
└── useTodos.ts             (~50行) — CRUD + filter + sort
```

**验收标准**:
- [ ] ScheduleScreen ≤ 120 行, TodoScreen ≤ 100 行
- [ ] `useSchedule` Hook 可独立测试
- [ ] `useTodos` Hook 可独立测试

---

### M02-Task003: Square + Marketplace 拆分

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M02-Task002 |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**SquareHomeScreen 拆分**:
```
components/square/
├── TrendingList.tsx        (~60行) — 热搜榜列表
├── FunctionGrid.tsx        (~40行) — 四宫格入口
└── CampusFeed.tsx          (~70行) — 校园此刻帖子流

hooks/
└── useTrendingPosts.ts     (~30行)
```

**MarketplaceHomeScreen 拆分**:
```
components/marketplace/
├── CategoryTabs.tsx        (~40行) — 分类 Tab
└── ProductCard.tsx         (~60行) — 商品卡片

hooks/
└── useProducts.ts          (~40行) — 筛选 + 分页
```

**验收标准**:
- [ ] SquareHomeScreen ≤ 100 行
- [ ] MarketplaceHomeScreen ≤ 80 行

---

### M02-Task004: Diary + MyZone + 剩余文件拆分 + 全量验证

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M02-Task003 |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:
1. DiaryScreen → `components/diary/` + `useDiary` Hook
2. MyZoneScreen → `components/myzone/` 子组件
3. MarketplacePublishScreen → `components/marketplace/PublishForm.tsx`
4. 全量测试回归: `cd mobile && npx jest`
5. 验证所有新 Hook 在 `hooks/index.ts` 中导出
6. 更新 `docs/07-Implement/mobile-refactor-components-record.md`

**验收标准**:
- [ ] `hooks/` 目录 ≥ 10 个 Hook 文件
- [ ] `components/` 目录 ≥ 20 个组件文件
- [ ] 所有大型 Screen ≤ 200 行（编排层）
- [ ] 全量测试 100% 通过
- [ ] 所有 Hook 有 JSDoc 注释

---

## 三、拆分原则

### 组件拆分规则
1. **一个组件只做一件事** — 如果组件描述需要用 "和" 连接，拆
2. **UI 与逻辑分离** — Screen = 编排层（组合组件 + Hook），组件 = 纯 UI
3. **复用优先** — 同一个模式出现 2 次 → 抽取为共享组件

### Hook 抽取规则
1. **数据获取** — 任何 `useState` + `useEffect` + API 调用的组合
2. **派生状态** — 任何 `useMemo` / `useCallback` 超过 5 行的计算
3. **事件处理** — 任何超过 10 行的事件处理函数

### 命名规范
```
组件: PascalCase.tsx → components/<module>/<Name>.tsx
Hook:  useXxx.ts     → hooks/useXxx.ts
```

## 四、完成定义 (DoD)

- [ ] 8 个大型 Screen 全部拆分，每个 ≤ 200 行
- [ ] `hooks/` 目录 ≥ 10 个文件
- [ ] `components/` 目录 ≥ 20 个文件（从 9 个增长）
- [ ] 全量测试 416+ 用例 100% 通过
- [ ] 无功能回归
