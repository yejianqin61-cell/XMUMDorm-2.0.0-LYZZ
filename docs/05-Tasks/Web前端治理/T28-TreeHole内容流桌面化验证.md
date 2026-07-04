# T28-TreeHole内容流桌面化验证

## 1. 任务目标

选择 `TreeHole` 作为 Step 5 首个代表页，验证高密度内容流页面在主壳下的桌面化策略是否成立。

## 2. 影响范围

- `frontend/src/pages/TreeHole.jsx`
- `frontend/src/pages/TreeHole.css`
- `frontend/src/components/TreeHoleToolbar.jsx`
- 如有必要，少量与 TreeHole 强耦合的展示组件样式

## 3. 不可触碰边界

- 不重写帖子接口与查询逻辑
- 不重构无限滚动与预取机制
- 不顺手改其它广场页
- 不改 `shared/*`

## 4. 实施步骤

1. 识别 TreeHole 当前仍然保留的移动端整屏假设。
2. 收口 TreeHole 在桌面主壳下的主列节奏与外层容器关系。
3. 调整工具栏、标签栏、内容流、推荐块之间的桌面层次。
4. 保持主要业务交互不回归。
5. 完成后执行 `npm run build:web`。

## 5. 验收方式

- TreeHole 在桌面主壳下不再像放大的手机 feed。
- 页面主列阅读节奏更稳定。
- 工具栏与内容流关系更清晰。
- 主要交互不回归。
- `npm run build:web` 通过。

## 6. 推荐提交信息

`refactor(web-feed): validate treehole in desktop shell`

## 7. 前置依赖

- `T27-后台壳收敛与接入预留.md`

## 8. 后置影响

- 为 `PostSearch`、`PostTagFeed` 等同类内容流页提供桌面化参照。
