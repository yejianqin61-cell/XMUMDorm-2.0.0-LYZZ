# Task 021: 修复 AboutEditor.jsx CSS 引用 + PostDetailShell.jsx 反向依赖

- **Phase**: 4 — 目录职责清理
- **关联审计问题**: M-12, M-7
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

1. `pages/AboutEditor.jsx` 引用 `import './AboutTeam.css'` — 实际复用了 AboutTeam 的卡片布局样式，命名有误导性。
2. `components/PostDetailShell.jsx` 从组件目录反向引用 `../../pages/PostDetail.css` — 组件不应该依赖页面级 CSS。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/AboutEditor.jsx` | 添加注释标注 CSS 复用意图 |
| `components/PostDetailShell.jsx` | 将 PostDetail.css 的依赖方式改为全局样式引用 |

## 执行步骤

### Step 1: AboutEditor.jsx

在 `import './AboutTeam.css'` 行末添加注释：
```js
import './AboutTeam.css'; /* Reuses AboutTeam card+heading layout pattern */
```

### Step 2: PostDetailShell.jsx

`PostDetailShell` 使用了 `.post-detail-*` 类名。这些样式定义在 `pages/PostDetail.css` 中。由于 PostDetailShell 只在 PostDetail 页面中使用，且 PostDetail.css 已在 PostDetail.jsx 中导入，PostDetailShell 中的 CSS import 是冗余的（CSS 已通过页面级 import 加载）。

移除 PostDetailShell.jsx 中的 `import '../../pages/PostDetail.css'` 行。CSS 由 PostDetail.jsx 负责加载。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] PostDetail 页面样式无变化

## 提交信息

```
fix(web): annotate AboutEditor CSS reuse, remove reverse CSS dep

Co-Authored-By: Claude <noreply@anthropic.com>
```
