# Task 03: Mobile UI 组件库补全

**优先级**: 🟡 P1 — MEDIUM
**依据**: `docs/06-Analyze/移动端App项目审计报告_V3.0.html` — 风险 #3
**当前状态**: Mobile 9 个组件（5 UI + 4 业务）；Web ~60 个组件
**目标状态**: Mobile ≥ 25 个组件（≥ 12 UI + ≥ 13 业务）
**预估工期**: 2-3 天

---

## 一、现状对比

### 已有 Mobile 组件 (9)

| 组件 | 类型 | 文件 |
|------|------|------|
| GlassView | UI | `ui/GlassView.tsx` |
| Card | UI | `ui/Card.tsx` |
| EmptyState | UI | `ui/EmptyState.tsx` |
| StyledButton | UI | `ui/StyledButton.tsx` |
| StyledInput | UI | `ui/StyledInput.tsx` |
| PostCard | 业务 | `PostCard.tsx` |
| PostCardWaterfall | 业务 | `PostCardWaterfall.tsx` |
| ReportModal | 业务 | `ReportModal.tsx` |
| TreeholeSkeletonCard | 业务 | `TreeholeSkeletonCard.tsx` |

### 欠缺的关键组件

#### UI 组件 (7 个 — 跨模块复用)

| # | 组件 | Web 对应 | 用途 | 优先级 |
|---|------|---------|------|--------|
| 1 | `SkeletonCard` | `SkeletonCard.jsx` | 通用骨架屏 | P0 |
| 2 | `SkeletonPost` | `SkeletonPost.jsx` | 帖子列表骨架屏 | P0 |
| 3 | `SkeletonFood` | `SkeletonFood.jsx` | 食堂列表骨架屏 | P0 |
| 4 | `ImagePreview` | `ImagePreview.jsx` | 全屏图片预览 (Lightbox) | P0 |
| 5 | `LikeBurst` | `LikeBurst.jsx` | 点赞粒子爆发动画 | P1 |
| 6 | `UserLevelBadge` | `UserLevelBadge.jsx` | 用户等级徽章 | P1 |
| 7 | `LevelProgressBar` | `LevelProgressBar.jsx` | 等级进度条 | P1 |

#### 业务组件 (6 个 — 模块专属)

| # | 组件 | 所属模块 | 用途 | 优先级 |
|---|------|---------|------|--------|
| 8 | `LevelUpModal` | 等级系统 | 升级弹窗（全局 Modal） | P1 |
| 9 | `StackedCardCarousel` | 广场 | 图片堆叠轮播 | P2 |
| 10 | `FoodCard` | 食堂 | 菜品卡片 | P1 |
| 11 | `ProductCommentItem` | 食堂 | 点评列表项 | P2 |
| 12 | `ClubCard` | 社团 | 社团卡片 | P2 |
| 13 | `MarketplaceItemCard` | 二手 | 二手商品卡片 | P2 |

---

## 二、任务拆解

### M03-Task001: 骨架屏组件（3 个 — P0）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

**SkeletonCard** — 通用骨架屏
```tsx
// components/ui/SkeletonCard.tsx
// Props: { width?, height?, borderRadius?, style? }
// 实现: Animated.View + 渐变动画 (opacity pulse)
// 参考: frontend/src/components/SkeletonCard.jsx
```

**SkeletonPost** — 帖子骨架屏（用于树洞/广场列表）
```tsx
// components/ui/SkeletonPost.tsx
// 布局: [头像占位] [标题占位] [内容行占位×3] [图片占位]
```

**SkeletonFood** — 食堂卡片骨架屏
```tsx
// components/ui/SkeletonFood.tsx
// 布局: [图片占位 200×150] [标题占位] [描述占位] [评分占位]
```

**验收标准**:
- [ ] 3 个 Skeleton 组件可独立使用
- [ ] 渐变脉冲动画流畅 (useNativeDriver: true)
- [ ] TreeholeScreen / EatScreen / SquareScreen 使用新 Skeleton 替代旧的内联骨架屏

---

### M03-Task002: ImagePreview 全屏图片预览（P0）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1 天 |

**工作内容**:
```tsx
// components/ui/ImagePreview.tsx
// Props: { images: string[], initialIndex?: number, visible: boolean, onClose: () => void }
// 实现:
//   - Modal + FlatList (horizontal, pagingEnabled)
//   - 双指缩放 (PinchGestureHandler from react-native-gesture-handler)
//   - 关闭按钮 + 下滑关闭手势
//   - 页码指示器 "2/5"
//   - 分享按钮
// 参考: frontend/src/components/ImagePreview.jsx (84行 JSX)
```

**集成点** — 替换所有内联图片查看：
- PostCard → 点击图片调用 ImagePreview
- PostDetailModal → 点击图片调用 ImagePreview
- FoodDetailScreen → 点击菜品图调用 ImagePreview
- MarketplaceDetailScreen → 点击商品图调用 ImagePreview

**验收标准**:
- [ ] 支持多图左右滑动
- [ ] 支持双指缩放
- [ ] 下滑关闭手势正常
- [ ] 页码指示器正确

---

### M03-Task003: 等级系统 UI 组件（3 个 — P1）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

**UserLevelBadge** — 等级徽章
```tsx
// components/ui/UserLevelBadge.tsx
// Props: { level: number, size?: 'sm' | 'md' }
// 参考: frontend/src/components/UserLevelBadge.jsx (21行)
```

**LevelProgressBar** — 等级进度条
```tsx
// components/ui/LevelProgressBar.tsx
// Props: { currentExp: number, nextLevelExp: number, level: number }
// 参考: frontend/src/components/LevelProgressBar.jsx (22行)
```

**LevelUpModal** — 升级弹窗
```tsx
// components/business/LevelUpModal.tsx
// Props: { visible: boolean, newLevel: number, rewards?: string[], onClose: () => void }
// 参考: frontend/src/components/LevelUpModal.jsx (50行) + CSS (55行)
// 效果: Lottie 动画 + 粒子效果 + GlassView 背景
```

**验收标准**:
- [ ] UserLevelBadge 可显示不同等级的颜色/图标
- [ ] LevelProgressBar 动画过渡平滑
- [ ] LevelUpModal 弹出/关闭动画流畅
- [ ] 3 个组件集成到 MyZoneScreen + AboutLevelScreen

---

### M03-Task004: 业务卡片组件（3 个 — P1/P2）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

**FoodCard** — 食堂菜品卡片
```tsx
// components/canteen/FoodCard.tsx
// Props: { product: Product, onPress: () => void }
// 布局: [图片140×140] [名称] [价格] [评分★] [评论数]
```

**ClubCard** — 社团卡片
```tsx
// components/clubs/ClubCard.tsx
// Props: { club: Club, onPress: () => void }
// 布局: [头像] [社团名] [成员数] [简介(2行)]
```

**MarketplaceItemCard** — 二手商品卡片
```tsx
// components/marketplace/ProductCard.tsx
// Props: { item: MarketplaceItem, onPress: () => void }
// 布局: [图片] [标题] [价格] [发布时间]
```

**验收标准**:
- [ ] 3 个 Card 组件各自可独立渲染
- [ ] 各自集成到对应的列表 Screen 中
- [ ] 视觉上与 Web 端 1:1

---

### M03-Task005: 动画组件 + 全量集成验证（P2）

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M03-Task001 ~ 004 |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:
1. **LikeBurst** — 点赞粒子爆发动画 (react-native-reanimated)
2. **StackedCardCarousel** — 图片堆叠轮播 (FlatList + snapToInterval)
3. 全局扫描：用 grep 查找所有内联 Skeleton / Image 点击 / 等级显示，替换为新组件
4. 全量测试: `cd mobile && npx jest`

**验收标准**:
- [ ] LikeBurst 集成到 PostCard + PostDetailModal
- [ ] StackedCardCarousel 集成到 ClubProfileScreen
- [ ] 无内联重复实现的 UI 模式
- [ ] 全量测试 100% 通过

---

## 三、组件目录目标结构

```
mobile/src/components/
├── ui/                         ← 共享 UI (12 个)
│   ├── GlassView.tsx           ✅ 已有
│   ├── Card.tsx                ✅ 已有
│   ├── EmptyState.tsx          ✅ 已有
│   ├── StyledButton.tsx        ✅ 已有
│   ├── StyledInput.tsx         ✅ 已有
│   ├── SkeletonCard.tsx        🆕
│   ├── SkeletonPost.tsx        🆕
│   ├── SkeletonFood.tsx        🆕
│   ├── ImagePreview.tsx        🆕
│   ├── LikeBurst.tsx           🆕
│   ├── UserLevelBadge.tsx      🆕
│   └── LevelProgressBar.tsx    🆕
│
├── business/                   ← 业务组件 (≥13 个)
│   ├── PostCard.tsx            ✅ 已有
│   ├── PostCardWaterfall.tsx   ✅ 已有
│   ├── ReportModal.tsx         ✅ 已有
│   ├── TreeholeSkeletonCard.tsx ✅ 已有 (可替换为 SkeletonPost)
│   ├── LevelUpModal.tsx        🆕
│   └── StackedCardCarousel.tsx 🆕
│
├── treehole/                   ← 树洞专属 (4 个) → Task02 产出
│   ├── TreeholeToolbar.tsx
│   ├── TreeholeTagBar.tsx
│   ├── PostWaterfallGrid.tsx
│   └── FloatingActions.tsx
│
├── canteen/                    ← 食堂专属
│   └── FoodCard.tsx            🆕
│
├── clubs/                      ← 社团专属
│   └── ClubCard.tsx            🆕
│
├── marketplace/                ← 二手专属
│   └── ProductCard.tsx         🆕
│
├── schedule/                   ← 课表专属 → Task02 产出
│   ├── WeekView.tsx
│   ├── CourseCard.tsx
│   └── ScheduleHeader.tsx
│
├── todo/                       ← 待办专属 → Task02 产出
│   ├── TodoInput.tsx
│   └── TodoListItem.tsx
│
└── square/                     ← 广场专属 → Task02 产出
    ├── TrendingList.tsx
    ├── FunctionGrid.tsx
    └── CampusFeed.tsx
```

## 四、完成定义 (DoD)

- [ ] `components/` 目录 ≥ 25 个文件
- [ ] 7 个 UI 组件 + 6 个业务组件新建完成
- [ ] 所有 P0 组件集成到对应 Screen
- [ ] 无内联重复的 Skeleton / ImageViewer / Badge
- [ ] 全量测试 100% 通过
