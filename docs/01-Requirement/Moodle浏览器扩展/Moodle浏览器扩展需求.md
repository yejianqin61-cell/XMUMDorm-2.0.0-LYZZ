# Moodle 浏览器扩展 — Product Requirement Document

**版本**: V0.1
**编写日期**: 2026-10-31
**状态**: Draft（待团队领导裁决，见 §八）
**提出人**: xzy

---

## 一、需求概述

### 1.1 背景

Web 端的[学习日历](../../05-Tasks/学习日历/Task-学习日历-合并月历与今日待办.md)目前只能显示个人待办、课表和公共假期，**没有 Moodle 的作业 DDL 和考试**。原因不在接口，而在浏览器规则：

- **同源策略**：厦马小筑网页里的脚本不能读取 `l.xmu.edu.my` 返回的内容（Moodle 没有对我们开放 CORS）。
- **服务器代取需要密码**：后端代为登录 Moodle 就必须收集每位同学的校方密码，与「不读取、不落盘校方凭据」的既有原则冲突（[TO-CONFIRM D-08](../../app/TO-CONFIRM.md)）。
- ~~服务器连不到校内网~~：更正——D-08 记录三个校方域名为**内外双解析**（校内 `10.68.x.x` / 公网 `203.106.6.x`），连通性不是根本障碍，上面两条才是。

App 能读 Moodle，是因为它在内嵌 WebView 里让学生亲自登录，再在**同源页面内**调用 Moodle 官方 AJAX（`app/src/features/tools/moodle/`）。浏览器扩展可以在电脑浏览器里做同样的事。

### 1.2 目标

电脑浏览器装上扩展、并在浏览器里登录过 Moodle 后，厦马小筑 Web 的学习日历与「今天还有 N 项待办」**同时显示 Moodle DDL 与考试**。

### 1.3 范围

**In Scope:**
- Chrome / Edge 桌面版扩展（Manifest V3）
- 读取：已选课程、作业/测验截止事件（与 App 相同的三个官方 AJAX 方法）
- 数据**只存在本机浏览器**（`chrome.storage.local`），不上传任何服务器
- 厦马小筑 Web 学习日历、待办统计显示 Moodle DDL；未装扩展时给出提示

**Out of Scope:**
- 手机浏览器（大多不支持扩展；手机用户使用 App 自带的 Moodle 同步）
- 同步到厦马小筑服务器 / 跨设备共享（需新接口、数据库与隐私审查，另立需求）
- 课程公告、讨论区汇总（P1，待裁决 Q4）
- 读取或保存账号密码、cookie 内容
- 在扩展里提交作业或修改 Moodle 任何数据（只读）

---

## 二、用户故事

| # | As a... | I want to... | So that... | Priority |
|---|---------|-------------|------------|----------|
| 1 | 用电脑的学生 | 在学习日历上看到 Moodle 作业截止时间 | 不用在两个网站之间来回看 | P0 |
| 2 | 用电脑的学生 | 「今天还有 N 项待办」把 Moodle 未交作业也算进去 | 一眼知道今天要做多少事 | P0 |
| 3 | 在意隐私的学生 | 确认 Moodle 数据只在我自己电脑上 | 放心安装 | P0 |
| 4 | 学生 | 一键清除扩展里的 Moodle 数据 | 换电脑、借用电脑后不留痕 | P0 |
| 5 | 学生 | 在扩展弹窗里看到上次同步时间和失败原因 | 知道数据是不是最新的 | P1 |

---

## 三、功能需求

### 3.1 核心流程

1. 学生安装扩展，在浏览器里照常登录 `https://l.xmu.edu.my`。
2. 学生打开任意 Moodle 页面时，扩展的内容脚本在**该页面内**（同源）读取页面已有的 `sesskey`，调用 Moodle 官方 AJAX：
   - `core_course_get_enrolled_courses_by_timeline_classification`（课程）
   - `core_calendar_get_action_events_by_timesort`（截止事件）
   - `core_courseformat_get_state`（判断活动类型，用于沿用 App 的 DDL 判定）
3. 结果按 Moodle 用户分开保存到 `chrome.storage.local`，记录同步时间。
4. 学生打开厦马小筑 Web 的学习日历时，扩展在该页面注入的内容脚本通过 `window.postMessage` 把**截止事件投影**（标题、课程名、截止时间、Moodle 链接）交给页面；页面不直接接触 Moodle。
5. 学习日历把 Moodle DDL 以独立颜色画进月历，并计入「今天还有 N 项待办」。

### 3.2 功能清单

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 1 | Moodle 同步 | 打开 Moodle 页面时自动同步；弹窗内「立即同步」按钮（需已打开 Moodle 标签页） | P0 |
| 2 | 本地存储 | `chrome.storage.local`，按 Moodle 用户隔离；登出 / 换账号时切换 | P0 |
| 3 | 交给 Web | 只对厦马小筑域名注入内容脚本；消息带固定命名空间与版本号 | P0 |
| 4 | Web 显示 | 学习日历新增「Moodle」图例与 DDL 芯片；统计条单列「Moodle N 项」 | P0 |
| 5 | DDL 判定 | 复用 App 的 `partitionMoodleDeadlines` 规则（抽到 `shared/`，两端同一份） | P0 |
| 6 | 清除数据 | 弹窗内「清除 Moodle 数据」 | P0 |
| 7 | 未安装提示 | 桌面浏览器未检测到扩展时，日历显示「安装扩展后可显示 Moodle DDL」 | P1 |
| 8 | 同步状态 | 弹窗显示上次同步时间、会话过期 / 未登录等原因 | P1 |
| 9 | 公告汇总 | 课程公告列表 | P2（待 Q4） |

---

## 四、验收标准

| # | 标准 | 验收方式 |
|---|------|----------|
| 1 | 登录 Moodle 后打开学习日历，Moodle DDL 出现在正确日期，时间按吉隆坡时区 | 手动 + 单元测试 |
| 2 | 「今天还有 N 项待办」包含 Moodle 未交 DDL，且已提交/已完成的不计入 | 手动 + 单元测试 |
| 3 | 扩展网络请求只发往 `l.xmu.edu.my`；没有任何请求发往厦马小筑后端或第三方 | DevTools 网络面板 |
| 4 | 扩展不读取 cookie、不出现密码输入框、不保存凭据 | 代码审查（权限清单不含 `cookies`） |
| 5 | Moodle 会话过期时，Web 显示旧数据 + 同步时间，扩展弹窗提示重新登录 | 手动 |
| 6 | 「清除 Moodle 数据」后，学习日历不再显示 Moodle DDL | 手动 |
| 7 | 未装扩展、或手机浏览器打开学习日历：页面正常，仅缺 Moodle 部分 | 手动 |
| 8 | 其他网页无法通过 postMessage 冒充扩展（校验来源与命名空间） | 单元测试 + 代码审查 |

---

## 五、约束与依赖

### 5.1 技术约束
- 只读、不落盘凭据（沿用 [TO-CONFIRM D-08](../../app/TO-CONFIRM.md) 的口径）。
- 扩展权限最小化：`host_permissions` 只含 `https://l.xmu.edu.my/*` 与厦马小筑 Web 域名；`permissions` 只含 `storage`。
- Moodle 接口、字段与 DDL 判定与 App 保持一致（`app/src/features/tools/moodle/contract.ts`、`deadlines.ts`）。
- Web 端为纯亮色，颜色取 `frontend/src/styles/tokens.css`。

### 5.2 模块依赖
- Web 学习日历：`frontend/src/pages/StudyCalendar.jsx`、`shared/utils/studyCalendar.js`
- App Moodle 模块（只复用纯函数，不改 App 行为）

### 5.3 数据依赖
- 学生自己的 Moodle 会话（浏览器内已登录）
- 无新增后端数据、无数据库迁移

---

## 六、非功能需求

| 需求 | 指标 |
|------|------|
| 性能 | 一次同步 ≤ 3 个 AJAX 请求批次；学习日历读取扩展数据 < 100ms |
| 安全 | 只读；不读 cookie；数据不出本机；消息校验来源 |
| 兼容 | Chrome / Edge 桌面版（Manifest V3）；手机端不支持，由 App 覆盖 |
| 可维护 | Moodle 升级导致接口变化时，扩展弹窗明确提示「同步失败」而不是显示错误数据 |

---

## 七、风险

- 【算得】依赖 Moodle 页面中的 `sesskey` 与 AJAX 接口；学校升级 Moodle 后可能需要适配（App 有同样风险）。
- 【提案】上架 Chrome 网上应用店需要开发者账号与审核；试点阶段可用「加载已解压的扩展程序」分发给内测同学。
- 【算得】数据只在一台电脑的一个浏览器里；换电脑需要重新同步。

---

## 八、待团队领导裁决

| # | 问题 | 选项 | 提出人建议 |
|---|------|------|-----------|
| Q1 | 是否立项 | 立项 / 暂缓 | 立项（P0 范围小，无后端改动） |
| Q2 | 代码放在哪里 | 仓库新增顶层 `extension/` / 单独仓库 | 新增 `extension/`，便于复用 `shared/` |
| Q3 | 分发方式与开发者账号归属 | 内测手动加载 → 应用店上架；账号归团队 / 个人 | 先内测手动加载，账号归团队 |
| Q4 | 是否包含课程公告汇总 | P0 / P1 / 不做 | P1，P0 先做 DDL |
| Q5 | 扩展需要识别的厦马小筑 Web 域名清单 | 生产域名 + 本地开发地址 | 由 DevOps 提供 |

---

## 九、附录
- 学习日历：[任务卡](../../05-Tasks/学习日历/Task-学习日历-合并月历与今日待办.md)、[实现记录](../../07-Implement/学习日历与今日待办实现记录.md)
- App Moodle 实现：`app/src/features/tools/moodle/`
- 校方系统内嵌裁决：[TO-CONFIRM D-08](../../app/TO-CONFIRM.md)
