# Task 016: 整合 AppCard 到 Card（消除双 API）

- **Phase**: 3 — 消除硬编码
- **关联审计问题**: M-11
- **优先级**: 🟡 中危
- **预计工作量**: 10 分钟

## 背景

`AppCard.jsx` 是 `Card.jsx` 的薄 wrapper，通过 `tone`/`strong`/`muted` 三个 prop 映射到 `Card` 的 `variant` prop。两个组件在同一个目录，新开发者不清楚该用哪个。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/ui/AppCard.jsx` | 添加 `@deprecated` JSDoc 注释 |

## 执行步骤

### Step 1: 在 AppCard.jsx 顶部添加 JSDoc

```js
/**
 * AppCard — thin tone→variant adapter over Card.
 * @deprecated Use `<Card variant="muted">` directly.
 *   AppCard will be removed in a future cleanup.
 */
```

AppCard 本身不删除（仍有 5 个组件引用它：EmptyState, InfoCard, MediaCard, ActionCard, MetricCard），但标记为 deprecated，引导新代码使用 Card。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] AppCard 使用者行为不变

## 提交信息

```
refactor(web): deprecate AppCard in favor of direct Card usage

Co-Authored-By: Claude <noreply@anthropic.com>
```
