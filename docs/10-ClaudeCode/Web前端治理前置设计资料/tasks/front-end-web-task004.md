# Task 004: 移除 Layout.jsx 桌面端 fullscreen 调用

- **Phase**: 1 — 解除桌面端全局阻塞
- **关联审计问题**: L-3
- **优先级**: 🟡 中危（提升到 Phase 1，直接影响桌面体验）
- **预计工作量**: 10 分钟

## 背景

`Layout.jsx` 在用户首次交互时调用 `enterFullscreen()`（来自 `utils/fullscreen.js`）。这是移动端 PWA 模式下的体验优化，在桌面端浏览器中会意外触发全屏，造成困扰。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/components/Layout.jsx` | 在 handleFirstInteraction 增加桌面端判断 |

## 执行步骤

### Step 1: 修改 `handleFirstInteraction`

在 `handleFirstInteraction` 函数中增加 early return：

```js
const handleFirstInteraction = () => {
  if (isDesktopShell) return;   // ← 新增：桌面端不触发全屏
  if (hasTriedFullscreenRef.current) return;
  hasTriedFullscreenRef.current = true;
  enterFullscreen();
};
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 桌面端（≥768px）点击页面任意位置不触发浏览器全屏
- [ ] 移动端（<768px）首次交互仍然触发全屏

## 提交信息

```
fix(web): skip fullscreen on first interaction in desktop mode

Add an early return in Layout's handleFirstInteraction when mode is
'desktop' to prevent unexpected browser fullscreen on desktop.

Co-Authored-By: Claude <noreply@anthropic.com>
```
