# XMUMDorm 文档中心

本目录按照软件工程生命周期分层组织，共 10 层。本项目采用 **Agent-Native（智能体原生）** 架构：文档是 Agent 之间的通信协议，Agent 通过文档而非对话协作。

> ⚠️ **App 客户端现状（2026-09-29 起）**：Dorm App 端已**全盘推倒重来**。旧 Expo RN 端（`mobile/`）与旧 Capacitor 端（`frontend-app/` + `android/` + `ios/` + `capacitor.config.ts`），连同其**设计哲学、设计宪法、前端风格**文档，已全部从工作区删除并归档于 git tag `app-legacy-v1`。
>
> 因此：**现存文档中一切涉及 App / 移动端 / RN / Expo / Capacitor 的设计、需求、任务与分析描述，一律视为历史材料，不得作为新 App 的实现依据。** 新 App 的设计宪法产出后，再在本索引中登记其位置。Web 端（`frontend/`）与后端不受影响，继续有效。

```
Human Idea → PM Agent → Architect Agent → Task Agent → Dev Agents → QA Agent → DevOps Agent
                    ↓              ↓            ↓            ↓            ↓           ↓
               01-Requirement  03-Architecture  05-Tasks  07-Implement  08-Test  09-Deploy
```

```
Constitution → Requirement → Clarify → Architecture → Module → Tasks → Analyze → Implement → Test → Deploy
```

### Agent 架构

| Agent | 角色 | 输入 | 输出 | 定义 |
|-------|------|------|------|------|
| **PM Agent** | 产品经理 | Human Idea + Constitution | `01-Requirement/` PRD | [定义](../.claude/agents/pm-agent.md) |
| **Architect Agent** | 系统架构师 | Requirements | `03-Architecture/` + `04-Module/` | [定义](../.claude/agents/architect-agent.md) |
| **Task Agent** | 任务拆解 | Architecture | `05-Tasks/` 任务计划 | [定义](../.claude/agents/task-agent.md) |
| **Backend Agent** | 后端开发 | Tasks | `routes/` + `migrations/` + 测试 | [定义](../.claude/agents/backend-agent.md) |
| **Frontend Agent** | Web 前端开发 | Tasks | `frontend/src/` 代码 | [定义](../.claude/agents/frontend-agent.md) |
| **QA Agent** | 测试工程师 | Implementation Records | `08-Test/` + 测试代码 | [定义](../.claude/agents/qa-agent.md) |
| **DevOps Agent** | 部署运维 | Test Reports (绿) | `09-Deploy/` 部署指南 | [定义](../.claude/agents/devops-agent.md) |

> 详见 [CLAUDE.md](../CLAUDE.md) 了解项目全局指引，`.claude/` 目录了解 Agent 架构细节。

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
| 08 | [Test/](08-Test/) | 测试报告：Web 端模块测试 |
| 09 | [Deploy/](09-Deploy/) | 部署运维：Git 手册、生产环境 init-db 指南 |
| Team | [team/](team/) | 团队协作契约、成员协作与变更流程 |

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
| M02 树洞 | [设计](04-Module/M02-树洞/) | — | — |
| M03 食堂 | [设计](04-Module/M03-食堂/) | [任务](05-Tasks/M03-食堂/) | — |
| M04 等级系统 | [设计](04-Module/M04-等级系统/) | [任务](05-Tasks/M04-等级系统/) | [测试](08-Test/Web端/等级系统测试报告.md) |
| M05 组织系统 | [设计](04-Module/M05-组织系统/) | — | [测试](08-Test/Web端/推送关于组织测试报告.md) |
| M06 管理员后台 | [设计](04-Module/M06-管理员后台/) | [任务](05-Tasks/M06-管理员后台/) | [测试](08-Test/Web端/举报与管理员后台测试报告.md) |
| M07 一站式平台 | [设计](04-Module/M07-一站式平台/) | — | [测试](08-Test/Web端/一站通模块测试报告.md) |
| M08 二手市场 | [设计](04-Module/M08-二手市场/) | — | [测试](08-Test/Web端/二手市场模块测试报告.md) |
| M10 学习资料 | [设计](04-Module/M10-学习资料/) · [需求](01-Requirement/module-specs/学习资料模块需求说明.md) · [可行性](02-Clarify/feasibility/学习资料模块可行性评估.md) | — | — |

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
| App 客户端 | 已全盘废弃并移出工作区，待从零重建（归档 tag `app-legacy-v1`） |
| 仓库 | yejianqin61-cell/XMUMDorm-2.0.0-LYZZ |

---

## 文档维护约定

1. **层级目录只放 README 和主题文件夹**：不得在 `00-Constitution` 至 `10-Study` 的层级根目录直接新增正文文档。
2. **新模块设计** → 在 `04-Module/` 下创建 `MNN-模块名/` 子文件夹。
3. **新任务拆解** → 在 `05-Tasks/` 下对应模块或横向主题文件夹中创建任务文档。
4. **测试报告** → 在 `08-Test/` 下按 `Web端/`、`reports/` 或 `regression/` 分组。
5. **分析报告** → 在 `06-Analyze/` 下选择 `audits/`、`phase-plans/`、`ui-research/`、`performance/` 或 `notifications/`。
6. 新增主题目录时，同时补充该层 README 索引；所有文件优先使用 `.md` 和中文命名。
