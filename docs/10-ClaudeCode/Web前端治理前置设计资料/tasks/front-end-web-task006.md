# Task 006: 迁移旧 EmptyState → 新 ui/EmptyState（13 个页面）

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: H-2
- **优先级**: 🟠 高危
- **预计工作量**: 20 分钟

## 背景

13 个页面引用旧 `components/EmptyState`（纯 div 结构），而新 `components/ui/EmptyState` 使用 AppCard + Button 体系，支持 icon/eyebrow/className 等更丰富的 props。

新 EmptyState 是旧 API 的超集，迁移后不会丢失功能。

## 涉及文件

`AreaProductRanking`, `FoodDetail`, `FoodManage`, `FoodList`, `FoodReviewPublish`, `FoodShopHot`, `MerchantFoodDetail`, `MerchantList`, `MyPosts`, `PostDetail`, `MyReviews`, `Rankings`, `SquareTrendingList`

## 执行步骤

对所有 13 个文件执行：
```
import EmptyState from '../components/EmptyState'
→ import EmptyState from '../components/ui/EmptyState'
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -rn "from '\.\./components/EmptyState'" frontend/src/pages/` 返回空
- [ ] 页面空数据状态显示正常

## 提交信息

```
refactor(web): migrate 13 pages from legacy EmptyState to ui/EmptyState

Co-Authored-By: Claude <noreply@anthropic.com>
```
