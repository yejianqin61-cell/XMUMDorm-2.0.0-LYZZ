# T04 Button 基础件统一

## 1. 任务目标

建立统一 `Button` 基础件，替代页面中零散的按钮样式实现。

## 2. 影响范围

- `frontend/src/components/ui/Button.jsx`
- 相关样式文件
- 少量代表性组件接入验证

## 3. 不可触碰边界

- 不做全站按钮替换
- 不改业务流程
- 不引入复杂业务耦合按钮

## 4. 实施步骤

1. 设计 `Button` props：
   - `variant`
   - `size`
   - `loading`
   - `disabled`
   - `iconLeft`
   - `iconRight`
   - `block`
2. 实现主按钮、次按钮、文字按钮、危险按钮、模块强调按钮。
3. 接入 token 体系，统一圆角、颜色、阴影、focus-visible。
4. 选取 1 到 2 个代表性场景验证复用。

## 5. 验收方式

- `Button` 具备完整状态
- 至少 2 个场景可复用
- `npm run build:web` 通过

## 6. 推荐提交信息

`feat(web-ui): add shared button primitive`

## 7. 前置依赖

- `T01-Token基础盘点与命名落地.md`
- `T02-Token兼容映射与样式接管.md`

## 8. 后置影响

- 为表单页、详情页、空态组件提供统一操作按钮
