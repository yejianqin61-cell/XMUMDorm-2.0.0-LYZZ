# Task 018: 分类处理 8 个悬空页面

- **Phase**: 4 — 目录职责清理
- **关联审计问题**: M-5
- **优先级**: 🟡 中危
- **预计工作量**: 15 分钟

## 背景

8 个文件位于 `pages/` 但未接入任何路由，属于死代码或状态不明。

## 涉及文件及处理方式

| 文件 | 处理 | 理由 |
|------|------|------|
| `pages/Eat.jsx` | 🗑 删除 | 仅重定向到 `/eat`，无实际功能 |
| `pages/SquareTrending.jsx` | 🗑 删除 | 功能已被 SquareTrendingList + SquareTrendingDetail 替代 |
| `pages/Clubs/ClubsHome.jsx` | 🗑 删除 | 功能已被 ClubListPage 替代 |
| `pages/Errands/ErrandsHome.jsx` | 🗑 删除 | 功能已被 SquareErrands 替代 |
| `pages/Handbook/HandbookHome.jsx` | 🗑 删除 | 功能已被 SquareFreshmanGuide 替代 |
| `pages/Handbook/HandbookCollections.jsx` | 🗑 删除 | 收藏功能已集成到 HandbookMe |
| `pages/Marketplace/MarketplaceHome.jsx` | 🗑 删除 | 功能已被 SquareSecondHand 替代 |
| `pages/AboutEditor.jsx` | ✅ 保留 | 已接入路由（`/about/editor-note` 实际渲染 AboutEditorNote，AboutEditor 是独立内容页） |

## 执行步骤

### Step 1: 确认零引用

```bash
grep -rln "Eat\.jsx\|SquareTrending\.jsx\|ClubsHome\|ErrandsHome\|HandbookHome\|HandbookCollections\|MarketplaceHome" frontend/src/ --include="*.jsx" --include="*.js" | grep -v "pages/"
```

### Step 2: 删除 7 个文件

确认无引用后直接删除。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 删除的文件确认无残留引用

## 提交信息

```
chore(web): remove 7 orphaned page files with no route references

Co-Authored-By: Claude <noreply@anthropic.com>
```
