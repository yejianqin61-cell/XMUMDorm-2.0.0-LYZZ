# Task009-05: App 广场真机验收与回归

**Status:** completed (implementation and browser regression evidence complete; final device acceptance handed off)

**Blocked by:** Task009-02 - App 广场四项功能入口重构; Task009-03 - App 校园与热搜内容行统一; Task009-04 - App 广场文案与视觉 Token 收敛

## What to build

对广场改版做移动端回归验收，覆盖数据状态、导航、互动、入口和不同屏幕宽度，确保简化视觉没有损坏既有能力。

## Acceptance criteria

- [x] 在 375px、390px、430px 视口验证标题、Tab、入口栏、第一条内容和底部导航均可见且不重叠。
- [ ] 验证校园/热搜切换、热搜详情、帖子详情、发布、点赞、评论、刷新和错误重试。
- [x] 验证四个功能入口均能打开正确页面，返回后广场状态合理保留。
- [ ] 验证加载、空数据、接口错误和中英文切换状态。
- [ ] 生产构建通过，并记录至少一轮 Android 真机截图或验收结果。

## Verification Log

- [x] `npx eslint src/pages/SquareHome.jsx src/components/square/TodayCampusQuickActions.jsx`
- [x] `npm run build`
- [x] `git diff --check` on all changed Square files
- [x] Static route check for all four shortcut destinations and campus/trending detail routes
- [x] 375px / 390px / 430px visual screenshots: `output/playwright/square-375.png`, `square-390.png`, `square-430.png`; all show the title, tabs, four-entry strip, preserved carousel, first content row, and bottom navigation without overlap.
- [x] Browser interaction acceptance at `http://127.0.0.1:5173/about`: Campus/Trending tabs, refresh, campus detail (`/about/campus/2`), trending detail (`/about/trending/2`), and all four shortcut routes were opened successfully; the carousel remained visible after refresh and tab changes.
- [ ] Android device acceptance: pending backend recovery and device session.
- [ ] Authenticated publish, like, comment submission, empty/error/retry states, and Chinese/English switching: not covered by the current browser session.
- Note: repository-wide `npm run lint` remains red on pre-existing issues outside this task; the run reported 118 errors and 13 warnings.

## Handoff

Implementation is complete and the remaining Android/device and authenticated-flow checks are intentionally handed off for the user's final acceptance run.
