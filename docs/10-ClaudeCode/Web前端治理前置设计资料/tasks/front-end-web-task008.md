# Task 008: 清理旧组件文件（Card, EmptyState, Skeleton*）

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: H-1, H-2, H-3（收尾）
- **优先级**: 🟠 高危
- **预计工作量**: 15 分钟

## 背景

Task 2.1-2.3 将所有页面中的旧组件引用迁移到了新的 ui/ 体系。现在需要确认组件内部没有残留引用后，删除旧文件。

## 涉及文件（待删除）

- `components/Card.jsx` + `components/Card.css`
- `components/EmptyState.jsx` + `components/EmptyState.css`
- `components/SkeletonPost.jsx` + `components/SkeletonCard.jsx` + `components/SkeletonFood.jsx`
- `components/Skeleton.css` + `components/SkeletonPost.css` + `components/SkeletonCard.css` + `components/SkeletonFood.css`

## 执行步骤

### Step 1: 确认无残留引用

```bash
grep -rn "from '\.\./Card'" frontend/src/components/
grep -rn "from '\.\./EmptyState'" frontend/src/components/
grep -rn "SkeletonPost\|SkeletonCard\|SkeletonFood" frontend/src/components/
```

### Step 2: 删除文件

确认无引用后删除。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 无残留文件引用

## 提交信息

```
chore(web): remove legacy Card, EmptyState, and Skeleton* components

All 31 page references have been migrated to the new ui/ component
system in the preceding commits. These files are now dead code.

Co-Authored-By: Claude <noreply@anthropic.com>
```
