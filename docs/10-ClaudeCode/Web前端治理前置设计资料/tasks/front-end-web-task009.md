# Task 009: 迁移组件内部旧 EmptyState/Card 引用

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: H-1, H-2（组件层面）
- **优先级**: 🟠 高危
- **预计工作量**: 10 分钟

## 背景

`components/` 目录下的组件文件（非页面文件）内部也引用了旧 Card 和旧 EmptyState。Task 005-007 已处理页面文件，Task 008 删除了旧组件文件，本 Task 处理组件内部的残留引用。

## 涉及文件

| 文件 | 旧引用 | 新引用 |
|------|--------|--------|
| `components/AreaCard.jsx` | `import Card from './Card'` + `import './Card.css'` | `import Card from './ui/Card'`（删除 CSS import） |
| `components/FoodCard.jsx` | `import Card from './Card'` + `import './Card.css'` | `import Card from './ui/Card'`（删除 CSS import） |
| `components/MerchantCard.jsx` | `import Card from './Card'` + `import './Card.css'` | `import Card from './ui/Card'`（删除 CSS import） |
| `components/ReviewCard.jsx` | `import Card from './Card'` | `import Card from './ui/Card'` |
| `components/CategorySection.jsx` | `import EmptyState from './EmptyState'` | `import EmptyState from './ui/EmptyState'` |
| `components/PostDetailShell.jsx` | `import EmptyState from './EmptyState'` | `import EmptyState from './ui/EmptyState'` |

## 执行步骤

### Step 1: 替换 import 路径

对每个文件，将旧路径的 import 改为新路径。

### Step 2: 删除已不存在的 CSS import

`AreaCard.jsx`, `FoodCard.jsx`, `MerchantCard.jsx` 中有 `import './Card.css'`，此文件已在 Task 008 中删除，移除该 import 行。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -rn "from '\./Card'" frontend/src/components/ --include="*.jsx" | grep -v "ui/Card"` 返回空
- [ ] `grep -rn "from '\./EmptyState'" frontend/src/components/ --include="*.jsx"` 返回空

## 提交信息

```
fix(web): fix residual old component imports after legacy cleanup

Co-Authored-By: Claude <noreply@anthropic.com>
```
