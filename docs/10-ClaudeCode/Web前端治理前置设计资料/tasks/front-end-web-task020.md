# Task 020: 拆分食堂页面片段到 features/canteen/

- **Phase**: 4 — 目录职责清理
- **关联审计问题**: M-6
- **优先级**: 🟡 中危
- **预计工作量**: 20 分钟

## 背景

`components/canteen/` 下的 5 个"组件"实际是带有独立 API 请求的页面片段，不符合 UI 组件的定义。应迁移到 `features/canteen/`。

## 涉及文件

| 旧路径 | 新路径 |
|--------|--------|
| `components/canteen/CanteenRegionGrid.jsx` | `features/canteen/CanteenRegionGrid.jsx` |
| `components/canteen/CanteenHomeRankings.jsx` | `features/canteen/CanteenHomeRankings.jsx` |
| `components/canteen/CanteenPickMeal.jsx` | `features/canteen/CanteenPickMeal.jsx` |
| `components/canteen/CanteenBannerCarousel.jsx` | `features/canteen/CanteenBannerCarousel.jsx` |
| `components/canteen/CanteenFoodSquare.jsx` | `features/canteen/CanteenFoodSquare.jsx` |

**保留在 components/canteen/**：`CanteenSearchBar.jsx`（纯 UI 组件，无数据请求）

## 执行步骤

### Step 1: 创建目标目录

```bash
mkdir -p frontend/src/features/canteen
```

### Step 2: 移动文件 + 更新 CanteenHome.jsx import

移动 5 个文件，更新 `pages/CanteenHome.jsx` 中的 import 路径。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] CanteenHome 页面功能正常

## 提交信息

```
refactor(web): extract canteen page fragments to features/canteen/

Co-Authored-By: Claude <noreply@anthropic.com>
```
