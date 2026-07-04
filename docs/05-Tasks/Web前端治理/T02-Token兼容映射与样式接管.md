# T02 Token 兼容映射与样式接管

## 1. 任务目标

让新 token 体系可以安全接管现有基础样式，同时保留 `--ui-*` 兼容层，降低迁移风险。

## 2. 影响范围

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/card.css`
- `frontend/src/styles/state.css`
- `frontend/src/styles/states.css`

## 3. 不可触碰边界

- 不批量改页面级 CSS
- 不改业务组件逻辑
- 不改 `frontend-app/**`
- 不改 `shared/**`

## 4. 实施步骤

1. 在 `tokens.css` 中建立新 token 到 `--ui-*` 的映射。
2. 让 `card.css` 优先消费新 token 或兼容映射后的 token。
3. 检查 `state.css`、`states.css` 是否存在硬编码可替换项。
4. 逐步减少旧变量对 `--post-ios-*` 的依赖。
5. 确保迁移后旧组件仍可继续运行。

## 5. 验收方式

- `card.css`、`state.css`、`states.css` 可由新 token 体系驱动
- 兼容层仍可支撑旧组件
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-ui): add token compatibility mapping for legacy styles`

## 7. 前置依赖

- `T01-Token基础盘点与命名落地.md`

## 8. 后置影响

- 为 Card、Button、表单控件等基础组件统一提供稳定样式基座
