# Task 025: 桌面端跳过 PWA 启动视频和安装引导

- **Phase**: 5 — 可访问性/桌面清洁
- **关联审计问题**: L-1, L-2
- **优先级**: 🟢 低危
- **预计工作量**: 10 分钟

## 背景

`App.jsx` 中的 `SplashScreen`（166KB 视频, 2-3s 延迟）和 `InstallPrompt`（PWA 安装引导）对所有端生效。桌面端不应播放 PWA 启动视频或显示手机安装引导。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/App.jsx` | SplashScreen 和 InstallPrompt 添加桌面端跳过逻辑 |

## 执行步骤

### Step 1: SplashScreen — 桌面端立即完成

在 `startSplashTimers` 开头添加：

```js
if (typeof window !== 'undefined' && window.innerWidth >= 768) {
  setShowSplash(false);
  return;
}
```

### Step 2: InstallPrompt — 桌面端不渲染

在组件 return 之前添加：

```js
if (typeof window !== 'undefined' && window.innerWidth >= 768) return null;
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 桌面端（≥768px）打开无 2 秒黑屏，无 PWA 安装弹窗
- [ ] 移动端（<768px）行为不变

## 提交信息

```
fix(web): skip PWA splash video and install prompt on desktop

Co-Authored-By: Claude <noreply@anthropic.com>
```
