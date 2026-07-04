# T03 Card 基础件统一

## 1. 任务目标

建立统一底层 `Card` 基础件，并让现有 Card 家族逐步收敛到同一基底。

## 2. 影响范围

- `frontend/src/components/ui/`
- `frontend/src/styles/card.css`
- 可能涉及：
  - `ActionCard.jsx`
  - `AppCard.jsx`
  - `InfoCard.jsx`
  - `MediaCard.jsx`
  - `MetricCard.jsx`

## 3. 不可触碰边界

- 不批量改业务页面
- 不直接重命名整批卡片组件
- 不在本任务里做 Button / 表单控件

## 4. 实施步骤

1. 明确底层 `Card` 的 props：
   - `variant`
   - `padding`
   - `tone`
2. 重构基础 `Card` 结构和样式。
3. 让现有 `ui/*Card` 优先基于底层 `Card` 组合实现。
4. 统一 card padding、border、shadow、radius 的 token 使用。
5. 验证旧用法兼容性。

## 5. 验收方式

- 有统一底层 `Card`
- 至少 2 个以上现有 Card 家族组件复用同一基底
- `npm run build:web` 通过

## 6. 推荐提交信息

`feat(web-ui): add shared card primitive and align card family`

## 7. 前置依赖

- `T01-Token基础盘点与命名落地.md`
- `T02-Token兼容映射与样式接管.md`

## 8. 后置影响

- 为列表页、详情页、工作台模板提供统一卡片积木
