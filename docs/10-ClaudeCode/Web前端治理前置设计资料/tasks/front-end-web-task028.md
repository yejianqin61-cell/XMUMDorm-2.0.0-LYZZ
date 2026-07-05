# Task 028: `scrollCache.js` / `schedulePersist.js` 移到 frontend/src/utils/

- **Phase**: 6 — 共享层规范化
- **关联审计问题**: M-14
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

`shared/utils/scrollCache.js` 使用 `sessionStorage`，`shared/utils/schedulePersist.js` 使用 `localStorage`。它们依赖浏览器 API，不属于纯逻辑 shared 层。应迁回 `frontend/src/utils/`。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `shared/utils/scrollCache.js` → `frontend/src/utils/scrollCache.js` | 移动 |
| `shared/utils/schedulePersist.js` → `frontend/src/utils/schedulePersist.js` | 移动 |
| 所有 import 这两个文件的地方 | 更新路径 |

## 执行步骤

### Step 1: 移动文件

```bash
mv shared/utils/scrollCache.js frontend/src/utils/
mv shared/utils/schedulePersist.js frontend/src/utils/
```

### Step 2: 更新 import

搜索所有引用并更新路径。

### Step 3: App 端处理

检查 `frontend-app/` 是否有对这两个文件的引用，如有则同步复制一份（App 端 WebView 也有这些 API）。

## 验收标准

- [ ] `npm run build:web && npm run build:app` 通过
- [ ] Web 端 scroll 恢复和 schedule 持久化正常

## 提交信息

```
refactor(shared): move browser-storage utils to frontend from shared

Co-Authored-By: Claude <noreply@anthropic.com>
```
