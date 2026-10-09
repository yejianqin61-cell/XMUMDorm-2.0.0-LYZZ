# Phase 2 收口验收记录

日期：2026-10-09  
范围：Phase 2 收口改进工程 Task 01–06  
基线：`Phase2审计报告.md` 中的 D-1～D-8；代码证据以当前 HEAD 为准。

## 结论

Phase 2 的代码收口项已完成，关键自动化证据通过。当前不能宣称“线上完全验收”或“可上架”：条款 migration、发布门禁和错误映射已在仓库内验证，但真实后端部署、真实账号矩阵、设备验收和正式法律正文仍未完成。

## 1. Task 01–06 证据

| Task | 结果 | 证据 |
|---|---|---|
| 01 消息历史游标契约 | 通过 | `__tests__/routes/marketplaceChatMessages.test.js`：游标、非法游标、末页响应 |
| 02 历史分页与轮询合并 | 通过 | `app/src/__tests__/p2b-06-chat.test.tsx`；typecheck 通过 |
| 03 长会话夹具回归 | 通过 | 501 条消息跨 6 页，最终 id 集合 `1..501` 且无重复 |
| 04 条款接受服务端真源 | 通过（仓库级） | `migrations/070_user_terms_acceptances.sql`、条款服务测试、用户路由测试 |
| 05 发布门禁服务端判定 | 通过（仓库级） | 四个 UGC 创建入口未接受时均 `403 / TERMS_NOT_ACCEPTED`，INSERT 未执行；已接受当前版本可进入发布处理 |
| 06 四态与双语回归 | 通过（仓库级） | 未接受、当前版本、旧版本、状态缺失回归；中英文条款错误文案和打开条款动作已接线 |

## 2. 验证命令

- 根目录：`npm test -- --runInBand __tests__/routes/termsPublishingGate.test.js __tests__/routes/users.test.js __tests__/routes/posts.test.js __tests__/routes/confessions.test.js __tests__/services/termsAcceptance.test.js`
- App：`npm.cmd run typecheck`
- App：`npm.cmd test -- --runInBand --silent src/__tests__/p2a-02-viewer.test.tsx src/__tests__/p2a-04-publish-host.test.tsx src/__tests__/p2a-05-publish-route.test.tsx`

结果：根目录 5 suites / 100 tests 通过；App 3 suites / 23 tests 通过；typecheck 通过。根目录测试中的 `console.error` 来自既有数据库错误路径断言，不是失败。

## 3. 仍未关闭的外部证据

- Migration `070_user_terms_acceptances.sql` 尚未由真实部署记录证明已执行。
- 真实测试账号仍不足以覆盖买家、有会话卖家和独立无权限账号矩阵。
- development build 的触控、横屏、大屏、最大字号、读屏和 reduced-motion 记录仍缺失。
- 隐私政策与服务条款正文仍是占位内容，不能用于正式上架。
- 默认并行 verify 的 OOM / 未关闭句柄问题仍未处理；本轮采用串行命令取得可复核结果。

因此本记录关闭的是代码与自动化验收，不关闭部署、设备和法务发布门槛。
