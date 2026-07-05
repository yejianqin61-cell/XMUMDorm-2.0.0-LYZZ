# Task 017: 迁移 pages/ 中的组件到 components/

- **Phase**: 4 — 目录职责清理
- **关联审计问题**: M-4
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

`pages/Errands/ErrandCard.jsx` 和 `pages/Marketplace/MarketplaceItemCard.jsx` 是可复用卡片组件而非路由页面，`pages/Clubs/ClubCommentsSection.jsx` 是评论区组件。它们放在 pages/ 中混淆了目录语义。

## 涉及文件

| 旧路径 | 新路径 |
|--------|--------|
| `pages/Errands/ErrandCard.jsx` | `components/errands/ErrandCard.jsx` |
| `pages/Marketplace/MarketplaceItemCard.jsx` | `components/marketplace/MarketplaceItemCard.jsx` |
| `pages/Clubs/ClubCommentsSection.jsx` | `components/clubs/ClubCommentsSection.jsx` |

## 执行步骤

### Step 1: 创建目标目录

```bash
mkdir -p frontend/src/components/errands
mkdir -p frontend/src/components/marketplace
mkdir -p frontend/src/components/clubs
```

### Step 2: 移动文件并更新 import

- 移动文件到新位置
- 更新所有引用这些文件的 import 路径

### Step 3: 确认 CSS 路径

检查这些组件是否 import 了相对路径的 CSS，移动后可能需要调整路径。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `ls frontend/src/pages/Errands/ErrandCard.jsx` 确认已移除
- [ ] `grep -rn "ErrandCard" frontend/src/` 确认引用路径已更新

## 提交信息

```
refactor(web): move reusable card components from pages/ to components/

Co-Authored-By: Claude <noreply@anthropic.com>
```
