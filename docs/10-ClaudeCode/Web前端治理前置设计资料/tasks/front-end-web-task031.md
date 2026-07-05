# Task 031: TreeHole 内容流桌面化代表页

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#3-task-51--treehole-内容流代表页)
- **优先级**: 🔴 首个代表页，验证「ListPageLayout + aside」全链路
- **预计工作量**: 2h

## 背景

TreeHole 是全校最活跃的内容流页面。当前布局是移动端全屏瀑布流 + 推荐块硬塞在帖子之间。桌面化目标：套 `ListPageLayout` 模板，主列纯帖子流，推荐/话题移到右侧 aside 常驻。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/TreeHole.jsx` | 套 ListPageLayout，拆分 aside，移动端兼容分支 |
| `pages/TreeHole.css` | 新增 `@media (min-width: 1080px)` 呼吸间距 |

## 执行步骤

### Step 1: JSX — 套 ListPageLayout 模板

将现有 `<RouteTransition>` 内部的 `TreeHoleToolbar` 和 `treehole-content` 重组为：

```jsx
<ListPageLayout
  header={<PageHeader title={isZh ? '树洞' : 'TreeHole'} />}
  filterBar={<TreeHoleToolbar selectedSlug={...} onSelectTagSlug={...} />}
  list={/* treehole-content — 纯帖子瀑布流 */}
  aside={isWide ? <AsideStack>...</AsideStack> : null}
  asideSticky
/>
```

### Step 2: JSX — 拆分 aside 内容

桌面端（`window.innerWidth >= 1080`）时：
- `InterestRecommendationBlock` 和 `RelatedCampusTopicsBlock` 从瀑布流 entry 列表中移除，放到 aside
- aside 使用 `AsideStack`（一个简单的 `display:flex; flex-direction:column; gap` 容器）

移动端（`<1080`）：aside 为 null，推荐/话题保留在瀑布流中（现有行为不变）。

### Step 3: CSS — 桌面端呼吸间距

```css
@media (min-width: 1080px) {
  .treehole-page--light {
    padding: 0;
  }
  .treehole-content {
    padding: var(--space-12) 0;
  }
  .treehole-grid {
    gap: var(--space-10);
  }
}
```

### Step 4: 移动端兼容确认

`<768px` 仍走旧 `Layout(mode="mobile")` 壳，不经过 `SiteWebShell`，所以 `ListPageLayout` 不会被渲染。无回归风险。

## 验收

- [ ] 桌面端 TreeHole 双栏：左瀑布流 + 右推荐/话题
- [ ] 推荐块不再打断帖子流
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过
- [ ] 滚动加载正常，标签筛选正常

## 提交信息

```
feat(web): desktop layout for TreeHole with ListPageLayout template

Co-Authored-By: Claude <noreply@anthropic.com>
```
