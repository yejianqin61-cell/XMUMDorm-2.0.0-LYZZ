# Step5 高频页面桌面化详细设计方案

> **状态**: 待你把关
> **前置**: Phase 1-4 质量修补完成，桌面壳可见，模板系统就绪

---

## 0. 设计哲学

> 这两条原则是本次桌面化的灵魂。每个页面的方案都要经得起这两条的检验。

### 原则一：网页布局，拒绝堆叠

| 禁止 | 应采用 |
|------|--------|
| App 式全屏单列卡片堆叠（`gap: 8px` 一摞到底） | 有主次层级的网页布局，信息不在垂直方向无限堆 |
| 内容撑满全宽无约束 | 正文舒适阅读宽度（680-820px），留白不叫浪费 |
| 所有 section 等权排列，看不出谁是重点 | 视觉层级：hero > 主内容 > 辅助信息 |
| 12px/16px 的移动端紧窄内边距 | 桌面端 24-32px 的呼吸内边距 |
| 一个页面 = 一个长滚动列表 | 一个页面 = 有组织的网格或双栏结构 |

### 原则二：文案极简，只说用户需要的话

| 禁止 | 应采用 |
|------|--------|
| 把设计意图当标题（"把XXX放在首页"） | 用户视角的标题（"食堂"） |
| 把开发计划写进描述（"后续可以继续接入"） | 帮助用户理解的简短描述，或直接省略 |
| 把架构说明当副标题（"本次只把页面节奏整理进"） | 删掉，这是 commit message 不是 UI 文案 |
| 三行中文描述一个功能入口 | 一行标题 + 一行可选副标题，最多了 |
| 中英文全量展示时逐字翻译设计注释 | 英文用户只需要功能描述，不需要设计注释的翻译 |

### 当前违反文案原则的清单（本次全部修正）

| 文件 | 当前文案 | 类型 | 修正为 |
|------|---------|------|--------|
| `CanteenHome.jsx:27` | "把吃什么、去哪吃、最近吃什么都放在首页" | 设计意图 | `null`（删掉 hero title，只保留"食堂"主标题） |
| `CanteenHome.jsx:31` | "围绕食堂入口、推荐内容、热度榜单和美食内容流，收成一个更像网页首页的浏览节奏。" | 设计过程 | `null`（删掉 subtitle） |
| `PublishCenter.jsx:233` | "如果后续增加课程评价、食堂点评等投稿入口，可以继续接入这里，不需要重做业务接口。" | 开发路线图 | `null`（删掉整段） |
| `PostDetail.jsx:621` | "把最可能继续发生的操作集中放在正文卡片下方，桌面阅读时路径更稳定。" | 设计理由 | `null` |
| `PostDetail.jsx:641` | "评论树结构和交互逻辑保持不变，本次只把页面节奏整理进共享详情模板里。" | 重构说明 | `null` |
| `Mailbox.jsx:244` | "让个人工作台之后的消息页在桌面主壳下保持连续节奏，快速筛选、阅读和清空。" | 设计意图 | 简短功能描述或 `null` |
| `MerchantList.jsx:233` | "查看这个分区里的商家，同时把本区热门单品榜单放在右侧，方便一边选店一边做决定。" | 设计意图 | `null` |
| `SquareHome.jsx:203` | "用横向标签、低干扰入口和缩略预览，继续把首页保持在可快速扫读的节奏里。" | 设计方法论 | `null` |
| `SquareTrendingList.jsx:80` | "把当前全校讨论最密集的话题收进一张更像网页的榜单页里，方便快速浏览、判断热度和继续进入详情。" | 设计意图 | `null` |
| `SquareOrgAdmin.jsx:46` | "统一承载组织、热搜和轮播等运营管理入口，后续后台页可继续接入同一模板结构。" | 架构说明 | `null` |
| `AdminDashboard.jsx:191` | "把高频基础数字拆成紧凑卡片，保持后台信息密度，但不让阅读节奏失控。" | 设计理由 | `null` |

---

## 1. 每页改动范围

```
只改 3 层：
  ├── 页面最外层结构（套模板，从堆叠→网格）
  ├── 桌面端 CSS @media (min-width: 1080px)——加呼吸内边距、主列宽度约束
  └── 辅助栏内容（从 inline 提到 aside）+ 删掉设计注释文案

不改：
  ├── 业务逻辑、API 调用、状态管理
  ├── shared/ 层
  ├── 移动端渲染路径（<768px 仍走旧 Layout）
  └── 组件内部实现
```

## 2. 响应式策略

```
≥1080px   完整双栏（主内容 + 辅助栏），呼吸内边距 24-32px
768-1079  单栏，辅助栏沉底或隐藏
<768      旧移动壳，完全不动
```

---

## 3. Task 5.1 — TreeHole 内容流代表页

### 目标

把「移动端全屏瀑布流 + 推荐块硬塞在帖子之间」改成「网页双栏：主列纯帖子流 + 右侧推荐常驻」。

### JSX 改动

套 `ListPageLayout`，推荐/话题块从瀑布流内部移到 aside：

```jsx
<ListPageLayout
  header={<PageHeader title={isZh ? '树洞' : 'TreeHole'} />}
  filterBar={<TreeHoleToolbar ... />}
  list={/* 纯帖子瀑布流，不含推荐/话题 block */}
  aside={
    <AsideStack>
      <InterestRecommendationBlock items={recItems} />
      <RelatedCampusTopicsBlock items={topicItems} />
    </AsideStack>
  }
  asideSticky
/>
```

### CSS 新增

```css
@media (min-width: 1080px) {
  .treehole-page--light {
    padding: 0;           /* 去掉移动端 12px 紧边距 */
  }
  .treehole-content {
    padding: var(--space-12) 0;
  }
  .treehole-grid {
    gap: var(--space-10); /* 20px 呼吸间距，原来 12px */
  }
}
```

### 移动端兼容

`isDesktop = false` 时 aside 为 null，推荐/话题保留在瀑布流 inline——当前行为不变。

---

## 4. Task 5.2 — PostSearch + PostTagFeed

TreeHole 模式直接复用。改动量：每页 ~20 行 JSX。

---

## 5. Task 5.3 — CanteenHome 门户首页

### 当前问题

6 个 section 垂直堆叠，`gap: 8px`，`padding: 12px 16px`——纯 App feed。

### 目标

网页门户布局：hero 区 + 双栏网格，section 之间有呼吸感的分组。

### 从堆叠 → 网格

```
当前（App 堆叠）:
  hero (全宽)
  └─ SearchBar
  └─ Banner
  └─ RegionGrid
  └─ Rankings
  └─ PickMeal
  └─ FoodSquare
  └─ footer link

目标（网页网格）:
  hero (全宽，适度高度)
  ┌──────────────────────────┬────────────────┐
  │  SearchBar + Banner       │                │
  │  RegionGrid               │  快捷入口卡片   │
  │  Rankings + PickMeal      │  今日推荐       │
  │  FoodSquare               │  热门单品链接   │
  └──────────────────────────┴────────────────┘
  footer
```

### 文案清理

| 当前 | 修正 |
|------|------|
| eyebrow: "校园食堂门户" | 保留，简短标签 ✅ |
| title: "把吃什么、去哪吃、最近吃什么都放在首页" | → 删掉，hero 已有 "食堂" |
| subtitle: "围绕食堂入口…收成一个更像网页首页的浏览节奏。" | → 删掉 |
| stats: "入口 / 榜单 / 推荐" | 保留，简洁摘要 ✅ |

### 主列宽度约束

```css
.canteen-home-inner {
  max-width: var(--layout-max-width); /* 1440px */
  margin: 0 auto;
  padding: var(--space-12) var(--space-12); /* 24px 呼吸边距，原来是 12px 16px */
}

.canteen-home-hero {
  padding: var(--space-16) var(--space-12); /* 32px 原来是 20px 18px */
}
```

---

## 6. Task 5.4 — FoodDetail + MerchantFoodDetail

### 当前状态

已接入 `DetailPageLayout`，但 aside 可能为空。

### 改动

补 aside 内容 + 主列宽度约束：

```jsx
<DetailPageLayout
  header={...}
  hero={...}
  content={...}
  comments={...}
  aside={
    <AsideStack>
      <MerchantInfoCard shopId={shopId} />
      <RelatedFoods area={area} />
    </AsideStack>
  }
/>
```

主列正文宽度约束：
```css
@media (min-width: 1080px) {
  .detail-page-layout__main {
    max-width: 780px;  /* 舒适阅读宽度 */
  }
}
```

---

## 7. Task 5.5 — Mailbox + MyPosts + MyReviews

### 模式

`ListPageLayout` + 右侧放筛选/统计/快捷操作。简单直接。

### Mailbox 文案清理

| 当前 | 修正 |
|------|------|
| description: "让个人工作台之后的消息页在桌面主壳下保持连续节奏…" | → `null` 或简短："系统通知与消息" |

---

## 8. 不在此轮的页面

| 页面 | 原因 |
|------|------|
| About* 静态页 | 低频，信息密度已够 |
| Admin 后台 | 独立 AdminLayout，Step 6 |
| Login/Register | auth 组件独立 |
| Schedule/TodoList/Diary | 工具页，桌面敏感度高，Step 6 |

---

## 9. 执行顺序

```
5.1 TreeHole（首个代表页）→ 验证 ListPageLayout + aside 模式
5.2 PostSearch + PostTagFeed（同类扩散）
5.3 CanteenHome（门户首页，验证非 List 模板）
5.4 FoodDetail + MerchantFoodDetail（详情 aside 补全）
5.5 Mailbox + MyPosts + MyReviews（工作台收尾）
```

每个 Task 独立 commit。

---

## 10. 验收清单

每个 Task 满足：
- [ ] `npm run build:web` 通过
- [ ] 桌面端（≥1080px）为目标布局，有明确的主次层级
- [ ] 无设计注释/开发说明暴露在 UI 上
- [ ] 主内容区正文宽度受控（≤820px）
- [ ] 内边距 ≥ 24px（不再是移动端的 12-16px）
- [ ] 移动端（<768px）行为完全不变

---

> **请你审阅**：特别是 CanteenHome 的从堆叠→网格方案和 11 处文案清理清单。确认后从 Task 5.1 开始执行。
