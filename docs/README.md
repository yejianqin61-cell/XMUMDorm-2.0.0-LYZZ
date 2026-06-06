# XMUMDorm 文档中心

本目录按照软件工程生命周期分层组织，共 10 层。

```
Constitution → Requirement → Clarify → Architecture → Module → Tasks → Analyze → Implement → Test → Deploy
```

---

## 目录索引

| 层级 | 路径 | 内容 |
|------|------|------|
| 00 | [Constitution/](00-Constitution/) | 项目宪法：产品信任原则、技术约束、编码规范 |
| 01 | [Requirement/](01-Requirement/) | 需求文档：PRD、业务需求、WHY |
| 02 | [Clarify/](02-Clarify/) | 需求澄清：缺陷清单、权限矩阵、模糊点确认 |
| 03 | [Architecture/](03-Architecture/) | 架构设计：API 设计、数据库设计、技术选型、液态玻璃设计体系 |
| 04 | [Module/](04-Module/) | 模块设计：各模块设计文档（M01-M08）|
| 05 | [Tasks/](05-Tasks/) | 开发任务：按模块拆解的可执行任务 |
| 06 | [Analyze/](06-Analyze/) | 分析报告：影响分析、风险评估、进度评估、UI 完备性分析 |
| 07 | [Implement/](07-Implement/) | 实施记录：开发公报、迁移清单、参考笔记 |
| 08 | [Test/](08-Test/) | 测试报告：Web 端 & 移动端模块测试 |
| 09 | [Deploy/](09-Deploy/) | 部署运维：Git 手册、生产环境 init-db 指南 |

---

## 快速导航

### 按角色

| 角色 | 推荐阅读 |
|------|----------|
| **新成员入职** | 00-Constitution → 03-Architecture → 04-Module |
| **产品/需求** | 01-Requirement → 02-Clarify → 06-Analyze |
| **架构师** | 03-Architecture → 04-Module |
| **开发工程师** | 04-Module → 05-Tasks → 07-Implement |
| **测试工程师** | 02-Clarify → 05-Tasks → 08-Test |
| **运维** | 03-Architecture → 09-Deploy |

### 按模块

| 模块 | 设计文档 | 开发任务 | 测试报告 |
|------|----------|----------|----------|
| M01 广场 | [设计](04-Module/M01-广场/) | [任务](05-Tasks/M01-广场/) | [测试](08-Test/Web端/广场模块测试报告.md) |
| M02 树洞 | [设计](04-Module/M02-树洞/) | — | [测试](08-Test/移动端/树洞模块测试报告.md) |
| M03 食堂 | [设计](04-Module/M03-食堂/) | [任务](05-Tasks/M03-食堂/) | [测试](08-Test/移动端/食堂模块测试报告.md) |
| M04 等级系统 | [设计](04-Module/M04-等级系统/) | [任务](05-Tasks/M04-等级系统/) | [测试](08-Test/Web端/等级系统测试报告.md) |
| M05 组织系统 | [设计](04-Module/M05-组织系统/) | — | [测试](08-Test/Web端/推送关于组织测试报告.md) |
| M06 管理员后台 | [设计](04-Module/M06-管理员后台/) | [任务](05-Tasks/M06-管理员后台/) | [测试](08-Test/Web端/举报与管理员后台测试报告.md) |
| M07 一站式平台 | [设计](04-Module/M07-一站式平台/) | — | [测试](08-Test/Web端/一站通模块测试报告.md) |
| M08 二手市场 | [设计](04-Module/M08-二手市场/) | — | [测试](08-Test/Web端/二手市场模块测试报告.md) |

---

## 项目总览

| 指标 | 数值 |
|------|------|
| 项目名 | XMUMDorm（厦马小筑 / Jack Dorm） |
| 版本 | V3.0 |
| 技术栈 | React 18 + Express + MySQL + JWT + TanStack Query |
| 后端模块 | 17 个 Route 文件（~12K 行） |
| 前端页面 | 86 个 Page（~22K 行） |
| 测试用例 | 108 个（100% 通过率） |
| 移动端 | React Native (Expo SDK 52+) |
| 仓库 | yejianqin61-cell/XMUMDorm-2.0.0-LYZZ |

---

## 文档维护约定

1. **新模块设计** → 在 `04-Module/` 下创建 `MNN-模块名/` 子文件夹
2. **新任务拆解** → 在 `05-Tasks/` 下对应模块文件夹，命名 `MNN-TaskNNN-描述.md`
3. **测试报告** → 在 `08-Test/` 下按 `Web端/` 或 `移动端/` 分组
4. **分析报告** → 在 `06-Analyze/` 下，命名 `<主题>_<版本>.md`
5. 所有文件使用 `.md` 格式，中文命名优先
