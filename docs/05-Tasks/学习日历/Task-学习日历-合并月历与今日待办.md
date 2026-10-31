# Task-学习日历-合并月历与今日待办

日期：2026-10-31　负责人：xzy（分支 `dev-xzy`）　状态：已实现，待人工验收与 PR 审查

## 来源

把个人项目 Moodle Compass（本地 Moodle 学习面板）里的两项能力移植到 Web：

1. **合并月历**：同一张月历上看个人待办、课表和公共假期；
2. **「今天还有 N 项待办」**：未完成待办合计，并分出逾期 / 今天截止 / 3 天内截止。

## 范围

| 做 | 不做（原因） |
| --- | --- |
| Web 新页面 `/myzone/calendar`（学习日历） | **Moodle DDL / 考试 / 公告汇总**：Web 端拿不到 Moodle 数据——浏览器同源策略禁止网页读取 `l.xmu.edu.my`，后端代取又需要收集校方密码（违背 D-08 口径）；App 是在内嵌 WebView 内同源读取。电脑端方案见 [Moodle 浏览器扩展需求](../../01-Requirement/Moodle浏览器扩展/Moodle浏览器扩展需求.md)（草案） |
| 待办页顶部「今天还有 N 项待办」统计 + 日历入口 | **App 端**：本次只做 Web |
| 「我的」工具区新增「学习日历」入口 | **PDF 出题**：学习资料整体出局（App 宪法 4.2.2-5） |
| 共享纯函数 `shared/utils/studyCalendar.js` + 单元测试 | 新接口、数据库迁移（全部复用现有 `/api/todos` 与 `/api/schedule/week`） |

## 允许改动的路径

- 新增：`shared/utils/studyCalendar.js`、`frontend/src/hooks/useAllTodos.js`、`frontend/src/pages/StudyCalendar.jsx`、`frontend/src/pages/StudyCalendar.css`、`__tests__/shared/studyCalendar.test.js`
- 修改：`frontend/src/routes/layoutRoutes.jsx`（加路由）、`frontend/src/pages/MyZone.jsx`（加入口）、`frontend/src/pages/TodoList.jsx` / `TodoList.css`（加统计条）
- 文档：本任务卡、[实现记录](../../07-Implement/学习日历与今日待办实现记录.md)、两层 README 索引

## 口径（不另造规则）

- 「今天 / 逾期」沿用待办页：本地日期，`due_date < today` 且未完成即逾期；
- 教学周只来自 `shared/config/semesters.js`；不在学期内的日期不显示周次、不显示课程；
- 假期只来自 `shared/config/holidays.js`，多天假期逐日展开；
- 「今天还有 N 项」= 全部未完成待办（含无截止日期），不受待办页筛选影响。

## 状态矩阵

| 状态 | 表现 |
| --- | --- |
| 未登录 | 「请先登录」 |
| 待办加载中 | 统计处显示「正在读取待办…」，月历照常显示假期 |
| 待办加载失败 | 顶部提示「待办加载失败，请刷新页面重试」 |
| 某周课表加载失败 | 顶部提示「部分周的课表加载失败」，其余周照常 |
| 没有未完成待办 | 「没有未完成的待办」 |
| 非教学周 | 日期无「第 N 周」标记；详情显示「不在教学周内」 |
| 一天超过 3 条待办 | 显示前 3 条 +「还有 N 项」，详情面板列出全部 |

## 验收

- [x] 纯函数单元测试（月历格子、教学周、假期、课表取当天、待办状态与统计、分组排序）
- [x] 页面在桌面与手机宽度渲染正确（测试替身数据）
- [x] 在详情面板添加待办后，月历与统计即时刷新
- [ ] 根目录 `npm test` 全量（46 套件）—— 本次环境无法安装依赖，见实现记录「未验证」
- [ ] `frontend` 的 `npm run build` 与 `npm run lint`—— 同上
- [ ] 真实账号、真实数据的人工验收（非实现者复核）
