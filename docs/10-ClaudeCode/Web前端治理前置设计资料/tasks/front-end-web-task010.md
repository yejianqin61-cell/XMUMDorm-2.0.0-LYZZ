# Task 010: 合并 `state.css` 和 `states.css`

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: M-1
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

`states.css`（旧 `.state-loading` + doge GIF 背景 + `.pressable`）和 `state.css`（新 `.ui-state--*` + `.ui-page-skeleton`）两套状态样式在 App.jsx 中同时导入，造成 loading/error/empty 状态视觉不统一。

## 执行步骤

### Step 1: 合并内容

将 `state.css` 的全部内容追加到 `states.css` 末尾。

### Step 2: 移除 doge GIF 引用

将 `states.css` 中 `.state-loading::before` 的硬编码 doge GIF URL 替换为一个简单的 CSS spinner 或移除（让全局 PageSkeleton 统一处理 loading 态）。

### Step 3: 更新 App.jsx

移除 `import './styles/state.css'`，只保留 `import './styles/states.css'`。

### Step 4: 删除 state.css

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `layoutRoutes.jsx` 的 fallback loading 显示正常
- [ ] 旧 `.state-loading` 和新 `.ui-state--empty` 行为不变

## 提交信息

```
refactor(web): merge state.css and states.css into unified state layer

Consolidate the two competing state CSS files. Remove the hardcoded
doge GIF loading animation. Keep the pressable utility.

Co-Authored-By: Claude <noreply@anthropic.com>
```
