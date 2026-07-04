# T06 Tag 与 Badge 统一

## 1. 任务目标

统一 `Tag` 和 `Badge` 的职责、视觉和状态，避免胶囊类元素在不同页面语义混乱。

## 2. 影响范围

- `frontend/src/components/ui/Tag.jsx`
- `frontend/src/components/ui/Badge.jsx`
- 相关样式文件

## 3. 不可触碰边界

- 不批量改业务筛选逻辑
- 不把模块色语义写死在页面里

## 4. 实施步骤

1. 明确语义边界：
   - `Tag` 用于筛选、分类、可交互标签
   - `Badge` 用于状态、数量、标识
2. 设计 `variant`、`size`、`tone`。
3. 接入模块 accent 和基础 token。
4. 选取代表性筛选区和状态区做接入验证。

## 5. 验收方式

- `Tag` 与 `Badge` 职责不混乱
- 颜色、圆角、间距、状态统一
- `npm run build:web` 通过

## 6. 推荐提交信息

`feat(web-ui): add shared tag and badge primitives`

## 7. 前置依赖

- `T01-Token基础盘点与命名落地.md`
- `T02-Token兼容映射与样式接管.md`

## 8. 后置影响

- 为列表筛选、模块标签、状态展示提供统一元素
