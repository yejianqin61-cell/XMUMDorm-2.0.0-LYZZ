# T01 Token 基础盘点与命名落地

## 1. 任务目标

建立 Web 端统一 token 命名骨架，并在现有 `frontend/src/styles/tokens.css` 中完成第一轮结构化整理。

## 2. 影响范围

- `frontend/src/styles/tokens.css`
- 只读参考：
  - `frontend/src/styles/card.css`
  - `frontend/src/styles/state.css`
  - `frontend/src/styles/states.css`

## 3. 不可触碰边界

- 不批量改业务页面 UI
- 不改 `frontend-app/**`
- 不改 `shared/**`
- 不在本任务里重写所有旧 CSS

## 4. 实施步骤

1. 盘点现有 `tokens.css` 和已使用的 `--ui-*` 变量。
2. 按 section 重组 `tokens.css`：
   - colors
   - typography
   - spacing
   - radius
   - shadows
   - motion
   - layout
   - z-index
3. 建立 foundation token 与 semantic token 主体命名。
4. 保留必要的旧变量兼容入口，但先不做完整映射。
5. 在文档或注释中明确命名规范。

## 5. 验收方式

- `tokens.css` 结构清晰
- 已有颜色、字号、间距、圆角、阴影、动效、布局、层级 token 骨架
- 无业务页面回归性改动

## 6. 推荐提交信息

`refactor(web-ui): reorganize token foundation and naming structure`

## 7. 前置依赖

- 无

## 8. 后置影响

- 为 T02 兼容映射和样式接管提供基础
