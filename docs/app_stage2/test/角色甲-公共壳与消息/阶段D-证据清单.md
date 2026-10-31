# 阶段D 证据清单（交易视图与收口）

**日期**：2026-10-31　**范围**：R-16 / R-17 / R-18（阶段D-01…D-04）
**口径**：`✅ 机器` = 自动化用例或命令退出码；`⚠️ 静态` = 只核过源码；`❌ 未验证` = 需要真机。**真机证据按团队领导指示留到全部做完统一打包再验收**。

## 1. 自动化证据

| 用例文件 | 条数 | 断言主题 | 结果 |
|---|---|---|---|
| `app/src/__tests__/s2-31-mailbox-trade.test.tsx` | 7（新增） | 交易分类只列会话；无「全部已读/清空」；点会话进私信；切回互动仍是通知；会话空态与错误态；角标读 `unread-summary` | ✅ 7 passed |
| `app/src/__tests__/p2b-03-conversations.test.tsx` | 10 | 抽出 `ConversationList` 后行规范化/去重/空错态/进入口不变（mock 增 `useFocusEffect`） | ✅ 10 passed |
| `app/src/__tests__/p2b-04-mailbox.test.tsx` | 11 | 分批已读、可点性、公告不可清、通知空/错态 | ✅ 通过 |
| `app/src/__tests__/s2-10-mailbox-excerpts.test.tsx` | 6 | 摘要优先、失效说明、聚焦重取 | ✅ 通过 |
| `__tests__/routes/notifications.test.js` | 43（改写 4 例） | 分类口径：想要→互动、活动→系统、交易仅聊天；`byCategory` 求和 = `total`；清空交易不带走活动；`category=transaction` 的类型列表只有 `marketplace_chat` | ✅ 43 passed |
| `app/src/__tests__/p0-03-i18n.test.ts` + `p2d-01-i18n-gate.test.ts` | 39 + 5 | 词条中英同数、禁用词、字数门、⛔ 无内联双语三元 | ✅ 通过（与信箱两套合计 62） |

**命令与结果**

| 命令 | 结果 |
|---|---|
| `cd app && npm run verify:serial` | **exit 0**：typecheck + 全量 jest **2212 passed / 16 skipped（221 suites）** + 四把尺子 **34/34** |
| `npm test -- --runInBand` | **exit 0**：根用例 **1149 passed / 10 skipped（83 suites 通过、1 skipped）** |
| `npm run check:routes-cjs` | **exit 0** |

## 2. R-17 分类口径与 Web 回归（⚠️ 静态）

- **唯一真源**：`services/notificationService.js:52-77` 的 `CATEGORY_TYPES`
  （`interaction` 增 `marketplace_want` 与历史泛型 `marketplace`；`transaction` = `['marketplace_chat']`；`system` 并入 `MODULE_TYPES.affairs`）。
- **Web 侧不需要改代码**：`frontend/src/pages/Mailbox.jsx:51-56`（分类页签）、`:74`（请求带 `category`）、`:110-149`（分组与 `category` 取自服务端）、`:240-280`（按服务端字段渲染）。`:98` 的 `isAffair` 只用于分组 key 与文案，不决定分类归属。
- **Web 没有分类展示的自动化用例**（仓库里只有 `__tests__/web/mailboxAnonymousDisplay.test.js` 覆盖匿名文案）→ 本项按 **静态** 记账，⛔ 不写「Web 回归通过」。
- **泛型 `marketplace`**：全仓无写入方（`services/notificationService.js:34` 只有常量），按契约「不能仅凭名称算作聊天未读」显式落互动，含义待丁的存量样例确认（D-6）。

## 3. 逐项状态

| # | 验收项 | 机器/静态 | 真机 | 结论 |
|---|---|---|---|---|
| 1 | 交易页只出现会话，通知不混入 | ✅ `s2-31` 用例 1 / 4 | ❌ | 达成 |
| 2 | 交易分类不提供「全部已读 / 清空」 | ✅ `s2-31` 用例 2 | ❌ | 达成 |
| 3 | 点会话进入私信；切回互动仍是通知列表 | ✅ `s2-31` 用例 3 / 4 | ❌ | 达成 |
| 4 | 想要通知出现在互动、交易只剩会话类 | ✅ 服务端 4 例 + `byCategory` 求和断言 | — | 达成（Web 侧仅静态） |
| 5 | 分类角标与会话行未读都来自服务端 | ✅ `s2-31` 用例 7（summary）；行未读来自 threads | ❌ | 达成（两者**语义不同**，见 §4-3） |
| 6 | 词条中英同数、无内联三元 | ✅ 门禁 | — | 达成（本阶段新增词条 0 条） |
| 7 | 过期陈述有登记 | ✅ 本文 §5 | — | 达成 |

## 4. 仍未验证 / 缺口（如实）

1. **真机**：分类切换、双账号会话未读数、顶栏与分类角标 —— 未验证（统一打包后验收）。
2. **R-14 仍未达成**：`POST /api/marketplace/chat/threads/:threadId/read`（`routes/marketplace.js:1156-1176`）只更新已读时间戳，不把 `marketplace_chat` 通知写成已读 → 读完会话后交易分类角标可能仍亮。契约判给丁（`Stage2统一口径与接口契约.md:87`），阶段C-05 已记，本轮**未改善**。
3. **角标 ≠ 会话行未读，是契约两条来源**：`marketplace_chat` 通知**按消息**写入（`routes/marketplace.js:146-163`），所以「交易分类角标」＝未读私信**通知条数**，而「会话行未读」＝**会话维度**未读数。两者天然可能不等（契约 L83-85 把它们分成两个来源），真机验收时不要当成同一个数字。
4. **泛型 `marketplace` 的真实归类**：待丁的存量样例；本轮按 D-6 暂落互动。
5. **Web 分类展示无自动回归**：只有静态核对。
6. 阶段 B 的未验证项仍有效（B-06 编辑屏回填/保存失败保留输入无组件级用例）。

## 5. 已过期的陈述（登记，⛔ 不改他人文件）

| # | 出处 | 过期说法 | 现状 |
|---|---|---|---|
| 1 | `app/src/features/mailbox/MailboxScreen.tsx`（改前 :11-15） | 通知目标「映射要等 S03 DeepLinkRouter」 | 阶段3-03 起 `features/mailbox/targets.ts` 就是唯一映射；阶段D-01 已更正注释 |
| 2 | `app/src/features/mailbox/ConversationsScreen.tsx`（改前 :10-11） | 「后端一次给到上限 100 条、不做分页」 | 阶段B-03 已消费 `nextCursor`；阶段D-01 已更正 |
| 3 | `app/src/features/mailbox/conversations.ts:122-127` | 「Phase D 把 `toMailboxError` 提到 `i18n/errors.ts`」 | 那个 Phase D 是旧 App 计划且已结案（`docs/app/task/phase-2/PhaseD结案小结.md`），收敛**未做** → 登记为收口债；需同时改乙域 `features/square/useCanteenResource.ts`，⛔ 本批不越界 |
| 4 | `docs/app_stage2/test/角色甲-公共壳与消息/阶段3-05-证据清单.md:49` | 「J2-4 分类常量按决定等丁样例，本轮不改」 | 阶段D-02 已改（D-6 拍板先改） |
| 5 | `docs/app_stage2/summary/角色甲-阶段3-批小结.md:29` | 同一结论 | 历史小结⛔ 不改写；结论已被本批取代 |
| 6 | `docs/app_stage2/task/角色甲-公共壳与消息/开发设计文档-甲.md:29,131-132` | 分类常量「待丁样例」仍为计划态 | D-6 已拍板先改，泛型暂落互动；计划原文保留，裁决回写在《四角色接线整合》§4.1 |
| 7 | `app/src/features/mailbox/ConversationsScreen.tsx`（改前空态动作） | 按钮文案「去看二手」却 push `/canteen` | 阶段D-01 改为 `/market` |

## 6. 本阶段改动文件

| 文件 | 改动 |
|---|---|
| `app/src/features/mailbox/ConversationList.tsx` | 新增：会话列表（取数 + 四态 + 行），两个宿主共用 |
| `app/src/features/mailbox/ConversationsScreen.tsx` | 收敛为页面外壳；更正注释；空态动作改 `/market` |
| `app/src/features/mailbox/MailboxScreen.tsx` | 交易分类分支、批量动作隐藏、角标改读汇总；更正注释 |
| `app/src/features/mailbox/notifications.ts` | 新增纯函数 `unreadCountsByCategory` 并被 `normalizeNotificationPage` 复用 |
| `app/src/i18n/zh.ts` / `en.ts` | 通知空态说明不再提「交易」 |
| `services/notificationService.js` | `CATEGORY_TYPES` 按 D2-12 改口径 |
| `app/src/__tests__/s2-31-mailbox-trade.test.tsx` | 新增 7 例 |
| `app/src/__tests__/p2b-03-conversations.test.tsx` | mock 增 `useFocusEffect`（列表改为聚焦重取） |
| `__tests__/routes/notifications.test.js` | 4 例按新口径改写 + 求和自洽断言 |
