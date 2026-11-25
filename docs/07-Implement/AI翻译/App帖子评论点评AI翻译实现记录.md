# App 帖子 / 评论 / 点评 AI 翻译实现记录

日期：2026-11-16　分支：`dev-wx`　需求：[帖子评论点评AI翻译需求](../../01-Requirement/AI翻译/帖子评论点评AI翻译需求.md)　Web 端：[实现记录](Web帖子评论点评AI翻译实现记录.md)

后端接口 `POST /api/translate`、`GET /api/translate/config` 与按钮显示规则 `shared/utils/translation.js` 和 Web 共用（Web PR 已加，App 只接入）。

## 做了什么

| 文件 | 改动 |
| --- | --- |
| `app/src/features/translate/TranslateToggle.tsx` | 新增域组件：内容语言 ≠ 界面语言才出现「翻译」；点了才请求；译文在原文下方，可收起；失败给出可重试的提示。登录态由页面传 `isSignedIn`（组件不读 session，渲染处不必有 `SessionProvider`）；翻译配置每个进程只问一次 |
| `app/src/components/ui/CommentItem.tsx` | 新增可选 `contentAccessory`：正文下方的附加内容，由页面组合，本组件不含业务逻辑 |
| `app/src/components/ui/CommentThread.tsx` | 新增可选 `renderContentAccessory(node)`，透传给每条 `CommentItem` |
| `app/src/features/campus/TreeholePostDetail.tsx` | 新增可选 `contentAccessory`，挂在正文下方 |
| `app/src/features/campus/CampusScreens.tsx` | 树洞详情：正文挂 `kind="post"`，评论挂 `kind="comment"`；**万能墙不挂**（匿名内容、来源表不同） |
| `app/src/features/square/DishCommentThread.tsx` / `DishDetail.tsx` | 菜品点评与回复挂 `kind="review"`；`DishCommentThread` 新增 `isSignedIn`（默认 false） |
| `app/src/i18n/zh.ts` / `en.ts` | 新增 `translate.*` 四条词条 |
| `app/src/__tests__/p0-03-i18n.test.ts` | 按测试注释的规矩登记新命名空间 `translate.` |
| `app/src/__tests__/translate-toggle.test.tsx` | 新增 7 个用例 |
| `docs/app/design/App组件类型定义.md` | D01 / D02 补记新插槽 |

## 证据

1. `npx jest --ci src/__tests__/translate-toggle.test.tsx`：7 passed。覆盖：中文界面英文内容点击后按 `kind + id + zh` 请求并显示译文、收起后再展开不重复请求；英文界面中文内容请求 `en`；同语言、未登录、服务端未开启时不渲染且不请求配置（前两种）；请求失败显示提示；菜品点评按点评 ID 请求。
2. `npx jest --ci src/__tests__/p0-03-i18n.test.ts`：通过（登记新命名空间后）。
3. `npm run typecheck`（`tsc --noEmit`）：无错误。
4. `npx eslint` 改动文件：0 error；新组件 0 warning（其它文件的 warning 是原有的）。
5. `node scripts/design-debt-report.js --path app/src --fail-on-zero`：退出码 0，无硬编码色值，无宪法级违规。
6. App 全量 `jest --ci`：**Test Suites: 2 skipped, 199 passed；Tests: 16 skipped, 2119 passed，0 失败**。

## 未验证

- 没有在真机 / 模拟器上跑，只有 jest 渲染测试。
- 没有接真实翻译服务商（同 Web）。

## 风险

- 【算得】长评论区每条评论各自判断是否显示按钮，计算量是字符计数，可忽略；配置请求全进程只发一次。
- 【提案】标签字数：「收起译文」4 字、英文「Hide translation」，符合宪法 10.5 的 ≤6 汉字。
