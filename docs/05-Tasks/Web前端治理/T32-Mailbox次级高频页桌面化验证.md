# T32-Mailbox次级高频页桌面化验证

## 1. 任务目标

选择 `Mailbox` 作为“我的”链路下的次级高频页，验证工作台之后的个人工具页在桌面壳下如何保持连续节奏。

## 2. 影响范围

- `frontend/src/pages/Mailbox.jsx`
- `frontend/src/pages/Mailbox.css`
- 如有必要，少量与消息列表布局强耦合的本地样式

## 3. 不可触碰边界

- 不重写消息接口
- 不重做消息读写逻辑
- 不顺手改完整个我的模块
- 不改 `shared/*`

## 4. 实施步骤

1. 对齐 Mailbox 与 MyZone 的桌面页节奏。
2. 收口页面外层容器、列表主区、辅助区关系。
3. 保持消息主流程与已有交互稳定。
4. 完成后执行 `npm run build:web`。

## 5. 验收方式

- Mailbox 在桌面主壳下不再像独立手机工具页。
- 与 MyZone 的体验连续性更强。
- 消息主列表节奏更清晰。
- `npm run build:web` 通过。

## 6. 推荐提交信息

`refactor(web-page): validate mailbox inside desktop workbench flow`

## 7. 前置依赖

- `T31-高频详情页桌面化二次验证.md`

## 8. 后置影响

- 为“我的”链路下更多次级工具页迁移提供参照。
