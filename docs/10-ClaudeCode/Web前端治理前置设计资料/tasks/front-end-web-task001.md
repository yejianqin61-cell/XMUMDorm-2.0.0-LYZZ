# Task 001: 解除 `#root` 桌面端宽度锁死

- **Phase**: 1 — 解除桌面端全局阻塞
- **关联审计问题**: F-1
- **优先级**: 🔴 致命 — 阻塞所有后续桌面化工作
- **预计工作量**: 30 分钟

## 背景

`frontend/src/index.css` 第 96-108 行将 `#root` 限制为 `max-width: 430px`，目的是在大屏幕上模拟手机预览效果。但桌面壳 SiteWebShell 需要 1440px 才能展开三段式布局，这个限制导致桌面壳完全不可见。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/index.css` | 修改媒体查询断点 |

## 执行步骤

### Step 1: 读取当前代码

找到 `frontend/src/index.css` 中的以下代码块（约第 96-108 行）：

```css
@media (min-width: 431px) {
  body {
    background-color: #070a14;
  }
  #root {
    max-width: 430px;
    margin: 0 auto;
    min-height: 100dvh;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.45);
    border-radius: 24px;
    overflow: hidden;
  }
}
```

### Step 2: 修改媒体查询

将 `@media (min-width: 431px)` 改为 `@media (min-width: 431px) and (max-width: 767px)`：

```css
/* 手机-平板过渡区：模拟手机预览效果 */
@media (min-width: 431px) and (max-width: 767px) {
  body {
    background-color: #070a14;
  }
  #root {
    max-width: 430px;
    margin: 0 auto;
    min-height: 100dvh;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.45);
    border-radius: 24px;
    overflow: hidden;
  }
}
```

### Step 3: 新增桌面端断点

在同一个文件末尾（或上述代码块之后）新增：

```css
/* 桌面端：解除手机模拟限制，让 SiteWebShell 三段式布局正常展开 */
@media (min-width: 768px) {
  body {
    background-color: var(--color-bg-page);
  }
  #root {
    max-width: none;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
  }
}
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 在浏览器 DevTools 中切换到 1920px 宽度，`#root` 元素宽度为 1920px（不再被限制在 430px）
- [ ] SiteWebShell 的 Header / Sidebar / Main / Aside 完整可见
- [ ] 手机宽度（375px-430px）下仍然保持居中模拟预览效果
- [ ] 平板宽度（768px）下正确过渡到全宽布局

## 风险点

- 部分页面 CSS 可能假设容器宽度 ≤ 430px 而写了死值，全宽后可能暴露这些隐藏的布局问题。如有此类问题，记录但不在此 Task 中修复。
- `body` 背景色从深色 `#070a14` 切换到 `var(--color-bg-page)` 后，可能出现视觉不一致。如有，记录到后续 Phase 处理。

## 提交信息

```
fix(web): unblock #root max-width for desktop viewports

Change the mobile phone simulator media query from (min-width: 431px)
to (min-width: 431px) and (max-width: 767px), and add a new desktop
breakpoint at 768px that removes the 430px width cap.

This is the prerequisite for all desktop layout work — the SiteWebShell
three-column layout was built but invisible due to this global constraint.

Co-Authored-By: Claude <noreply@anthropic.com>
```
