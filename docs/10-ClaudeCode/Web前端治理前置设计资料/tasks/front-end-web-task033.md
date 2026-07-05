# Task 033: CanteenHome 门户首页桌面化

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#5-task-53--canteenhome-门户首页)
- **优先级**: 🔴 与 TreeHole 并列为最高频页面
- **预计工作量**: 2.5h

## 背景

CanteenHome 当前是 6 个 section 垂直堆叠、`gap: 8px`、`padding: 12px 16px`——典型 App feed。改造为网页门户：双栏网格 + 呼吸内边距 + 极简文案。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/CanteenHome.jsx` | 重组为双栏网格布局，删设计注释文案 |
| `pages/CanteenHome.css` | 新增 `@media (min-width: 1080px)` 呼吸间距 + 网格 |

## 执行步骤

### Step 1: 文案清理

删除 3 处设计注释文案：

```diff
- title: "把吃什么、去哪吃、最近吃什么都放在首页"
+ (删除 hero title，只保留 "食堂" 主标题)

- subtitle: "围绕食堂入口、推荐内容、热度榜单和美食内容流..."
+ (删除 subtitle)

- stats: 保持不变（"入口 / 榜单 / 推荐" 简洁可用）
```

### Step 2: 布局从堆叠 → 双栏网格

```jsx
<div className="canteen-home-inner">
  <section className="canteen-home-hero">{/* 保留，精简文案 */}</section>
  <div className="canteen-home-body">
    <main className="canteen-home-main">
      <CanteenSearchBar />
      <CanteenBannerCarousel />
      <CanteenRegionGrid />
      <CanteenHomeRankings />
      <CanteenPickMeal />
      <CanteenFoodSquare />
    </main>
    <aside className="canteen-home-aside">
      <QuickLinks />    {/* → 商家列表、热门单品、地图模式 */}
      <DailyPick />     {/* 随机推荐 */}
    </aside>
  </div>
</div>
```

### Step 3: CSS — 网格 + 呼吸间距

```css
@media (min-width: 1080px) {
  .canteen-home-inner {
    max-width: var(--layout-max-width);
    margin: 0 auto;
    padding: var(--space-12);
    gap: var(--space-12);
  }
  .canteen-home-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: var(--space-12);
    align-items: start;
  }
  .canteen-home-main {
    max-width: 960px;
  }
  .canteen-home-aside {
    position: sticky;
    top: calc(80px + var(--space-8)); /* header 高度 + 间距 */
  }
}
```

## 验收

- [ ] 桌面端食堂首页双栏——主内容 + 右侧快捷入口
- [ ] 无设计注释暴露在 UI 上
- [ ] 主内容区 ≤ 960px
- [ ] 内边距 ≥ 24px
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过

## 提交信息

```
feat(web): desktop portal layout for CanteenHome, remove design commentary

Co-Authored-By: Claude <noreply@anthropic.com>
```
