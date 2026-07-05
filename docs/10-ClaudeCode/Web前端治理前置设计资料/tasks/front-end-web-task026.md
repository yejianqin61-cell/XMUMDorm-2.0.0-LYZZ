# Task 026: 拆分 Layout.jsx 标题映射表

- **Phase**: 5 — 可访问性/清洁
- **关联审计问题**: M-8
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

`Layout.jsx` 第 31-249 行包含约 220 行的路径→标题映射逻辑（`TITLE_BY_PATH_ZH`、`TITLE_BY_PATH_EN` + 74 行 if/else 链）。这是路由元数据的重复，应抽取到独立配置模块。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/config/pageTitles.js` | **新建** |
| `frontend/src/components/Layout.jsx` | 改为 import 新模块 |

## 执行步骤

### Step 1: 创建 `frontend/src/config/pageTitles.js`

将 `TITLE_BY_PATH_ZH`、`TITLE_BY_PATH_EN` 和标题解析函数移到新文件：

```js
export const TITLE_BY_PATH_ZH = { ... };
export const TITLE_BY_PATH_EN = { ... };
export function resolvePageTitle(pathname, isZh) { ... }
```

### Step 2: 修改 Layout.jsx

```js
import { resolvePageTitle, TITLE_BY_PATH_ZH, TITLE_BY_PATH_EN } from '../config/pageTitles';
```

删除 Layout.jsx 中的原地定义。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 页面标题显示不变

## 提交信息

```
refactor(web): extract page title mapping from Layout to config module

Co-Authored-By: Claude <noreply@anthropic.com>
```
