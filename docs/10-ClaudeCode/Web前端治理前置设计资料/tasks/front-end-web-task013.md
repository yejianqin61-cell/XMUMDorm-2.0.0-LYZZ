# Task 013: 页面 CSS 条件化移除 TabBar 底部间距

- **Phase**: 3 — 消除硬编码与样式碎片化
- **关联审计问题**: H-4
- **优先级**: 🟠 高危
- **预计工作量**: 15 分钟

## 背景

约 15 个页面 CSS 文件中使用 `padding-bottom: calc(var(--tabbar-height, 72px) + var(--safe-bottom, 0px) + ...)` 预留移动端底部 TabBar 的空间。桌面模式下 TabBar 不渲染，但这些间距仍然存在，浪费 ~100px 的垂直空间。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/index.css` | 在桌面端媒体查询中将 `--tabbar-height` 和 `--safe-bottom` 置零 |

## 执行步骤

### Step 1: 在 `@media (min-width: 768px)` 中覆写变量

在 `index.css` 的桌面端媒体查询块中（Task 001 已创建）添加：

```css
@media (min-width: 768px) {
  /* ...现有规则... */

  /* 桌面端无 TabBar + 无刘海/底部指示条，将相关间距归零 */
  :root {
    --tabbar-height: 0px;
    --safe-bottom: 0px;
    --safe-top: 0px;
    --safe-pb: 24px;
    --safe-pt: 12px;
  }
}
```

采用全局变量覆写方案而非逐文件修改。所有使用 `var(--tabbar-height)` 的 CSS 自动在桌面端归零。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 桌面端所有页面的底部不再有 ~100px 的 TabBar 预留空白
- [ ] 移动端（<768px）TabBar 间距不变

## 提交信息

```
fix(web): zero out mobile tab-bar spacing vars on desktop breakpoint

Co-Authored-By: Claude <noreply@anthropic.com>
```
