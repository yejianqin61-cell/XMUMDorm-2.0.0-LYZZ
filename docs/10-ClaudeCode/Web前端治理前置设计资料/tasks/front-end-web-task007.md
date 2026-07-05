# Task 007: 迁移旧 Skeleton* → 新 ui/PageSkeleton（7 个页面）

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: H-3
- **优先级**: 🟠 高危
- **预计工作量**: 20 分钟

## 背景

7 个页面引用三个独立的旧 Skeleton 组件（SkeletonPost/Card/Food），而 `components/ui/PageSkeleton` 提供统一的骨架屏系统，支持 list/card/detail/dashboard/form 五种 variant。

## 涉及文件

| 页面 | 旧 import | 新 import | variant |
|------|-----------|-----------|---------|
| `pages/TreeHole.jsx:8` | `SkeletonPost` | `PageSkeleton` | `list` |
| `pages/PostSearch.jsx:6` | `SkeletonPost` | `PageSkeleton` | `list` |
| `pages/PostTagFeed.jsx:7` | `SkeletonPost` | `PageSkeleton` | `list` |
| `pages/MerchantList.jsx:7` | `SkeletonCard` | `PageSkeleton` | `card` |
| `pages/FoodList.jsx:9` | `SkeletonFood` | `PageSkeleton` | `card` |
| `pages/FoodShopHot.jsx:5` | `SkeletonFood` | `PageSkeleton` | `card` |
| `pages/FoodManage.jsx:4` | `SkeletonFood` | `PageSkeleton` | `card` |

## 执行步骤

### Step 1: 替换 import

```js
// 旧
import SkeletonPost from '../components/SkeletonPost';
import SkeletonCard from '../components/SkeletonCard';
import SkeletonFood from '../components/SkeletonFood';

// 新
import PageSkeleton from '../components/ui/PageSkeleton';
```

### Step 2: 替换 JSX 使用

```jsx
// 旧
<SkeletonPost />
<SkeletonCard />
<SkeletonFood />

// 新
<PageSkeleton variant="list" items={3} />
<PageSkeleton variant="card" items={3} />
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -rn "SkeletonPost\|SkeletonCard\|SkeletonFood" frontend/src/pages/` 返回空
- [ ] 页面 loading 骨架屏显示正常

## 提交信息

```
refactor(web): migrate 7 pages from legacy Skeleton* to PageSkeleton

Replace old SkeletonPost/SkeletonCard/SkeletonFood with the unified
PageSkeleton component supporting list/card/detail/dashboard/form variants.

Co-Authored-By: Claude <noreply@anthropic.com>
```
