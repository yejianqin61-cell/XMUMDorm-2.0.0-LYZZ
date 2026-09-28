# 课程表「周次（Week）」实现记录

> 2026-09-26 · 需求：「从 9.28 开始是第一个 week 的开始，然后每周要自动跟进；因为有的课程是 1-7 周，
> 所以不同 week 的课程表不一样；前端还要显示当前是 week 几」。

## 一、改之前的实际状况

课表的**数据层和接口层早就懂周次**，缺的只有一件事：**没有任何地方知道「今天是第几周」**。

| 层 | 现状 |
|---|---|
| 表 `timetable_meetings` | 每条上课安排带 `week_start` / `week_end`（迁移 `009`） |
| 解析器 `utils/scheduleParser.js` | 已把 `(Week 1-5)` 解析成 `week_start=1, week_end=5` |
| 接口 `GET /api/schedule/week?week=N` | SQL 已按周过滤：`week_start <= N <= week_end` |
| **前端** | `frontend/src/pages/Schedule.jsx` 写死 `const FIXED_WEEK = 1` |
| **前端** | `MyZone.jsx`、`PersonalAside.jsx` 都调用 `getScheduleWeek(1)` |
| **接口封装** | `shared/api/schedule.js` 的 `getScheduleWeek(week = 1)` 还给了默认值 1 |
| **后端定时任务** | `services/classReminderPush.js` 用环境变量 `CLASS_REMINDER_WEEK`（默认 1） |

所以：课表页**永远只显示第 1 周**，「今日课程 / 当前下一节课」也全按第 1 周算。

线上真实数据（生产库，改动前实测）：**54 门课 / 81 条上课安排 / 9 个用户**，出现的周次区间只有 4 种：

```
(Week 1-14) → 65 条      (Week 1-5) → 6 条
(Week 9-14) →  5 条      (Week 1-8) → 5 条
```

全是**连续区间**，没有 `(Week 1,3,5)` 这类单双周/逗号列表。最大周次 **14 → 学期长度 14 周**。

## 二、设计

### 1. 学期日历是唯一真相来源

新增 `shared/config/semesters.js`：一份学期数据（起始日 + 总周数）+ 纯函数日期运算，
**Web / Capacitor / 后端定时任务共用同一份**（前端走 `@shared/config/semesters`，后端 `require`）。

```js
export const SEMESTERS = [
  { id: '2026-09', nameZh: '2026/27 学年第一学期', nameEn: '...', startDate: '2026-09-28', weeks: 14 },
];
```

为什么放常量而不是数据库/环境变量（当初在三个方案里选 A）：

- 前端能在**首屏本地算出**周次，不用等接口（否则会先闪一下「第 1 周」再跳）；
- 可以**提前把下学期写进去**，到点自动切换，不依赖谁记得去改 Railway 变量；
- 忘加新学期时的行为是「学期已结束」，而**不会算出一个错的周次**。

### 2. 关键约定

- **第 1 周第 1 天 = `startDate`，必须是周一**（`validateSemesterCalendar` 会在测试里卡住写错的情况）。
  2026-09-28 是周一 → 第 1 周 = 9/28~10/4，第 2 周 = 10/5~10/11，第 14 周 = 12/28~2027-01-03。
- **周次边界按吉隆坡时间（UTC+8）的周一 00:00 切**，不用服务器/浏览器本地时区——
  和课前提醒的推送时间保持一致。实测边界：`2026-09-27T15:59Z` = 9/27 23:59 KL（还没开学），
  `2026-09-27T16:00Z` = 9/28 00:00 KL（第 1 周）。
- **开学前 / 学期结束后**：`resolveSemesterContext()` 返回 `status: 'before' | 'after'`，
  `week` 为 `null`，页面提示「还没开学 · 距开学 N 天」/「学期已结束」，默认仍展示第 1 周且可手动翻周。
- 日期运算全部走 `Date.UTC` 的「天数」整数，避开夏令时/浮点误差；`parseYmd` 会拒绝 `2026-02-31`
  这种会被 `Date` 自动进位的假日期。

### 3. 前端交互

课表页顶部新增**周次栏**：`‹ 第 N 周 · 本周  ›` + 日期范围（`10月12日 – 10月18日`），
左右箭头翻周；不在当前周时出现「回到本周（第 N 周）」。

「今日课程」区块**只在正看当前周时渲染**——翻到别的周时，「今天」并不属于那一周，
按旧逻辑它会拿别的周的数据冒充「今天」。

顺便清掉了 `Schedule.css` 里两条死样式（`.schedule-week-toolbar { display: none }`、
`.schedule-week-fixed`，全仓库无人引用），换成周次栏的样式。

## 三、改动清单

| 文件 | 改动 |
|---|---|
| `shared/config/semesters.js` | **新增**。学期日历 + `resolveSemesterContext` / `weekDateRange` / `clampWeek` / `currentTeachingWeek` / `formatWeekDateRangeLabel` / `formatYmdLabel` / `validateSemesterCalendar` |
| `__tests__/shared/semester.test.js` | **新增** 26 例 |
| `__tests__/services/classReminderPush.test.js` | **新增** 11 例 |
| `__tests__/frontend/scheduleWeek.test.js` | **新增** 15 例（页面/接口接线契约） |
| `services/classReminderPush.js` | 去掉 `CLASS_REMINDER_WEEK`，改用当前周；未开学/已结束不发；`kualaLumpurCalendarParts` 改为复用共享实现（并在测试里断言是同一个函数）；推送跳转从 `/about/schedule` 改成直达 `/myzone/schedule` |
| `routes/schedule.js` | `/api/schedule/week` 响应新增 `currentWeek` / `semesterStatus` / `totalWeeks` / `semester` |
| `frontend/src/pages/Schedule.jsx` | 去掉 `FIXED_WEEK`；周次状态 + 周次栏 + 翻周 + 回到本周 + 开学前后提示；今日课程门控 |
| `frontend/src/utils/schedulePersist.js` | 新增 `clearPersistedScheduleWeeks()`（重新导入会覆盖所有周次） |
| `frontend/src/pages/MyZone.jsx` | 「当前/下一节课」按本周查；不在教学周就不发请求 |
| `frontend/src/components/shell/PersonalAside.jsx` | 「今日课程」同上 |
| `frontend/src/pages/Schedule.css` | 周次栏 + 学期提示条样式（替换死样式） |
| `shared/api/schedule.js` | `getScheduleWeek(week)` 去掉默认值 1，并写明必须传周次 |
| `.env.example` | 移除 `CLASS_REMINDER_WEEK`，说明改由学期日历驱动 |
| `server.js` | 定时任务注释同步 |

## 四、顺带修掉的线上问题：课前提醒的周次

`services/classReminderPush.js` 原先固定 `week = CLASS_REMINDER_WEEK || 1`，于是：

| 时间 | 旧代码 | 新代码 |
|---|---|---|
| 教学周内（第 3 / 11 周） | 推 10 条 | 推 10 条（一致） |
| **学期已结束（假期）** | **仍推 10 条** | 不查库、不推送 |
| **开学前** | **仍推 10 条** | 不查库、不推送 |
| 有 `(Week 9-14)` 课的用户的第 9~14 周 | 该条记录被 `week_start=9 > 1` 排除，永远匹配不到 | 正常匹配 |

实测（生产库 + 同一个候选 SQL，见下）：

```
--- 2026-12-07 第 11 周 → status=during 当前周=11 ---
  新代码 week=11 → 10 条
  旧代码 week=1  → 10 条
--- 2027-02-01 学期已结束（假期） → status=after 当前周=null ---
  新代码：不查库、不推送
  旧代码 week=1  → 仍会推 10 条 ← 假期里骚扰用户
```

**要诚实说明的一点**：当前线上**已订阅推送的 5 个用户**里，`(Week 1-8)` 与 `(Week 9-14)` 两条记录的
时间与地点恰好相同（同一个周一 10:00 同一间教室，只是学期中换了授课教师记录），
所以「`(Week 9-14)` 收不到提醒」这个症状被掩盖了——他们仍然靠 `(Week 1-8)` 那条拿到了提醒。
真正**当下可见**的问题是假期里继续推送。修完之后两者都对。

## 五、验证

### 纯逻辑（jest）

- 连续 14 个周一 → 第 1…14 周，逐周递增（「每周自动跟进」的核心断言）；
- 14×7 天里每一天的 KL 00:30 与 23:59 都落在同一周；
- 周次边界按 KL 而非本地时区（15:59Z / 16:00Z 一对）；
- 今天 2026-09-26 → `before`，**距开学 2 天**；
- 2027-01-04 → `after`，已结束 1 天，**不会算出第 15 周**；
- 没配置学期 → `unknown` + 兜底 20 周，而不是猜一个错周次。

### 浏览器实测（真实浏览器 + 真实生产数据）

用 Playwright 冻结时钟（`page.addInitScript` 覆盖 `Date`）+ 注入真实用户 token，
用户 `Euxuhs`（uid 4）的课表**只有 `(Week 1-5)`**，是天然的对照样本：

| 场景 | 周次栏 | 日期范围 | 课数 | 今日课程 | 回到本周 |
|---|---|---|---|---|---|
| 冻结到第 3 周（10/12 周一） | `第 3 周` + **本周** 徽章 | 10月12日 – 10月18日 | **6** | 显示（New Media 15:00） | 无（已是本周） |
| 连点 5 次「下一周」 → 第 8 周 | `第 8 周` | 11月16日 – 11月22日 | **0**（7 天全部「无课程」） | **不显示** | 「回到本周（第 3 周）」 |
| 点「回到本周」 | `第 3 周` + **本周** | 10月12日 – 10月18日 | **6** | 显示 | 无 |
| 真实日期（不冻结，2026-09-26） | `第 1 周` | 9月28日 – 10月4日 | 6 | 不显示 | 无 |

翻周过程读到的标题依次是
`第 4 周 @ 10月19日 – 10月25日` → `第 5 周 @ 10月26日 – 11月1日` → `第 6 周 @ 11月2日 – 11月8日`
→ `第 7 周 @ 11月9日 – 11月15日` → `第 8 周 @ 11月16日 – 11月22日`，区间连续且正确。

真实日期下页面提示条为：**「还没开学 · 距开学 2 天（9月28日 起算第 1 周）」**。

侧边栏「今日课程」在同一屏里显示的是**今天**（第 3 周周一）的课，与主区正在浏览的第 8 周互不干扰 —— 符合预期。

- 接口实测：`GET /api/schedule/week?week=3` → `currentWeek=null`（今天未开学）、`semesterStatus='before'`、
  `totalWeeks=14`，第 3 周返回 6 条分布在第 1~4 天。
- `npx jest` → **35 suites / 519 tests 全绿**；`vite build ✓`；
  `scripts/check-frontend-no-undef.js` 全量扫描 246 个文件 0 处未定义标识符。

## 六、下次换学期要做什么

只改一个文件：把新学期作为一项加进 `shared/config/semesters.js` 的 `SEMESTERS`
（`startDate` 必须是周一、`weeks` 是总周数），提交部署即可。可以提前写，到点自动切换。
`__tests__/shared/semester.test.js` 里的日历自检能挡住「起始日不是周一 / 区间重叠 / 周数非法」。

## 七、本次没做（后续可选）

- `frontend-app/`（Capacitor）与 `mobile/`（RN）仍固定查第 1 周 —— 本次按约定只改 Web；
  共享日历已经就位，接上去是几行的事。
- 单双周（`(Week 1,3,5)`）与不连续区间：现有数据里没有，解析器也只支持连续区间。
- 假期（`frontend/src/data/holidays.js`）与课表叠加：目前课表不知道放假，仍按周次照常显示。
