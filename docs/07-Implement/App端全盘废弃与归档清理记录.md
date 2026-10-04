# App 端全盘废弃与归档清理记录

**日期**：2026-09-29
**阶段**：07-Implement
**性质**：破坏性清理（App 客户端全盘推倒，从零重做）
**归档基线**：git tag `app-legacy-v1`

---

## 一、决策

| 决策 | 内容 |
|---|---|
| App 形态 | **全盘抛弃，不破不立** —— 旧 Expo RN 端与旧 Capacitor 端一并废弃，App 从零重做 |
| 设计层 | **设计哲学、设计宪法、前端风格全部作废**，从头重写；在产出新的《App 设计宪法》之前，不得编写任何 App 代码 |
| 影响面 | **只限 App 端**。Web 端（`frontend/`）与后端（`routes/`、`services/`、`middleware/`、`utils/`、`shared/`、`migrations/`）保持不动 |
| 可回溯性 | 先归档再删除；代码与文档均可由 `app-legacy-v1` 取回 |

### 清理前的两套 App 客户端（供后来者理解现状）

仓库中曾**并行存在两套** App 客户端，这也是本次必须明确范围的原因：

| 客户端 | 目录 | 技术 | 处置 |
|---|---|---|---|
| 旧移动端 | `mobile/`（191 个 git 文件） | Expo SDK 56 + RN 0.85.3 + Expo Router | 废弃删除 |
| 旧 Capacitor 端 | `frontend-app/`（311 个文件）+ `capacitor.config.ts` + `android/`（80）+ `ios/`（25） | Vite + React 打包进 Capacitor WebView | 废弃删除 |

两者最后一次改动均为 2026-09-27。

---

## 二、清理前必须先做的事（顺序不可颠倒）

### 2.1 修复 Windows 文件权限阻塞

**现象**：命令行**只能写仓库根目录**，`docs/`、`mobile/`、`.git/`、`frontend/` 等**所有已存在子目录一律拒绝写入**。这正是此前计划文档中记录的「`git tag` / `npm install` / `expo prebuild` 全部无法执行」的根因。

**根因（ACL 实测）**：仓库根目录给当前用户的完全控制项是 `USER:(F)`，**不带 `(OI)(CI)` 继承标记**，因此早于该授权创建的子目录一个都没继承到；Windows 的继承不追溯，父目录再授权也不会下发给已有子目录。

**处置**：会话切换到完全权限后实测，`docs/`、`mobile/`、`.git/`、`frontend/`、`frontend-app/`、`scripts/`、`uploads/` 全部恢复可写，`git status` 正常。首次 ACL 自动修复脚本判定为 `NOT_THIS_CLASS`（该目录的 `WRITE_DAC`/`WRITE_OWNER` 本就可用，也无 AppContainer 包权限项），即**不属于该脚本能修的那一类**，实际阻塞来自沙箱模式而非损坏的 ACL。

### 2.2 ⚠️ 抢救不在 git 里的发布签名密钥

**这是本次清理最大的风险点**：`android/app/dorm-release.keystore`（Play 发布签名密钥）**未被 git 跟踪** —— 它命中 `android/.gitignore`，随 `android/` 一起删除将导致已发布应用**永久无法更新**。

删除前已做**仓外备份**（位于仓库之外，不会被后续任何清理波及）：

```
D:\.pogget\user_storage\u_a02ec0\d5cdb\XMUMDorm-app-signing-backup\
├── android\app\dorm-release.keystore      ← Play 发布签名密钥（不可再生）
├── android\keystore.properties            ← 密钥口令
├── android\app\release\app-release.aab    ← 2026-08-23 已生成的发布产物
├── android\app\release\app-release.apk
├── android\app\huawei-sign.zip            ← 华为签名材料
└── frontend-app\.env.capacitor            ← App 端 API 基址
```

各项均以 SHA256 逐字节校验（源/目标哈希一致）。

---

## 三、归档

1. 先提交此前未纳管的 App 设计与调研文档（`移动端宪法.md`、`移动端重写/`、`tech-research/` 及被其引用的约束/README 改动）。
2. 打 tag **`app-legacy-v1`**，覆盖全部待删资产。
3. 归档完整性核对（`git ls-tree` 实测）：

| 路径 | tag 内文件数 |
|---|---|
| `mobile/` | 191 |
| `frontend-app/` | 311 |
| `android/` | 80 |
| `ios/` | 25 |
| `capacitor.config.ts` | 1 |
| `docs/00-Constitution/principles/移动端宪法.md` | 1 |
| `docs/06-Analyze/tech-research/` | 2 |
| `docs/05-Tasks/移动端重写/` | 1 |
| `docs/06-Analyze/mobile/` | 2 |
| `docs/08-Test/移动端/` | 5 |
| `.claude/agents/mobile-agent.md` | 1 |

未纳入归档的是**与本轮无关的在途改动**（`marketing/`、`services/advertisementTarget.js`、`frontend/temp_retroui/`、`docs/retroui-rollout-plan.md`）——它们不被删除，因此无需归档，保持原有未提交状态。

---

## 四、删除清单

### 4.1 代码与原生工程
`mobile/`、`frontend-app/`、`android/`、`ios/`、`capacitor.config.ts`

> `mobile/node_modules` 超长路径导致 `Remove-Item` 部分失败，改用扩展长度路径（`\\?\`）的 .NET 目录删除完成。

### 4.2 Agent 配置
`.claude/rules/mobile.md`、`.claude/agents/mobile-agent.md`、`.claude/skills/mobile-dev.md`、`.claude/skills/reactNative.md`

### 4.3 设计哲学 / 设计宪法
`docs/00-Constitution/principles/移动端宪法.md`、`移动端约束.md`

### 4.4 App 设计语言与前端风格
- `docs/04-Module/M03-食堂/Instagram风格食堂首页UI调研.md`
- `docs/01-Requirement/module-specs/食堂App首页Instagram风格改进规格.md`
- `docs/01-Requirement/module-specs/Phase3-底部Tab轮播广告与树洞话术治理规格.md`
- `docs/06-Analyze/ui-research/Phase3-底部Tab栏Apple风格调研.md`
- `docs/06-Analyze/ui-research/广场社团入口完整展示UI调研.md`
- `docs/10-ClaudeCode/App前端治理前置设计资料/`

### 4.5 App 任务 / 分析 / 测试
- 任务目录：`docs/05-Tasks/移动端App/`、`移动端重写/`、`移动端重构/`、`Capacitor迁移/`、`上线准备/`
- 散落任务：`docs/05-Tasks/Phase3/06-App Apple风格底部Tab栏.md`、`Phase1/P1-02-*`、`Phase1/P1-04-*`、`优化计划/Task009-*`（6 个）、`优化计划/下一步优化方案.md`
- 分析：`docs/06-Analyze/mobile/`、`tech-research/`、`performance/移动端开发进度评估_V2.0.md`、`performance/移动端基础架构评估.md`
- 测试：`docs/08-Test/移动端/`
- 记录：`docs/07-Implement/migration/Web到RN组件迁移清单.md`（该目录随之空置并已移除）

**合计**：代码约 610 个跟踪文件 + 文档约 40 个文件；工作区由约 1.6 GB 降至约 0.5 GB。

---

## 五、为消除悬挂引用所做的修订（保留文件，仅改内容）

| 文件 | 修订 |
|---|---|
| `CLAUDE.md` | 项目定位去 React Native；删除 Frontend Mobile 速查段，代之以「App 客户端」现状与开工前提 |
| `docs/README.md` | 顶部新增**权威现状声明**（现有文档中一切 App/移动端描述一律视为历史材料）；Agent 表删 Mobile Agent 行；模块测试列与目录维护约定去移动端 |
| `docs/00-Constitution/README.md` | 新增 App 约束全部作废声明；principles 索引去「移动端约束」 |
| `docs/00-Constitution/principles/技术约束.md` | 「移动端」行改为「待定（从零重建）」；样式/推送/单库多端口径同步 |
| `docs/00-Constitution/principles/编码规范.md` | 目录树删除 `mobile/` 分支 |
| `docs/00-Constitution/policies/安全策略.md` | CORS 说明去「移动端」 |
| `docs/03-Architecture/product-architecture/技术选型决策.md` | 删除 RN/Expo/expo-blur/Expo Notifications 选型行；「RN 1:1 复刻 Web UI」决策标记作废 |
| `docs/03-Architecture/product-architecture/校园社交平台用户体验与功能升级设计.md` | 顶部加作废声明：Capacitor/双形态相关章节（含第 8 节）不得作为依据 |
| `docs/01-Requirement/product/产品需求文档_PRD.md` | 「移动端（React Native）1:1 复刻」目标标记作废 |
| `docs/01-Requirement/module-specs/通知系统性能与信箱体验治理规格.md` | 顶部加声明：App UI 要求作废，共享通知 API 与索引部分继续有效 |
| `docs/01-Requirement/module-specs/个人空间风险治理规格.md` | 顶部加声明：App 端验收作废，Web 与共享公开资料接口继续有效 |
| `docs/06-Analyze/README.md` | 删除 `mobile/`、`tech-research/` 索引行 |
| `docs/06-Analyze/phase-plans/Phase3-入口与内容体验治理开发计划.md` | 顶部加声明 P3-15 与 App 验收项作废；修正指向已删规格的链接 |
| `docs/08-Test/README.md` | 删除 `移动端/` 索引行 |
| `docs/09-Deploy/README.md` | release 描述改为「真机预览调试」 |
| `docs/team/团队协作契约.md` | API 契约检查去 Capacitor App；密钥条款泛化为「客户端签名密钥」 |
| `README.md` / `README_CN.md` / `README_EN.md` | 删除「Android 应用正在逐步提供」的失效表述 |
| `docs/01-Requirement/presentation/Dorm Building...md` | 英文讲稿中「移动应用开发进行中」改为「旧版已退役，新版正在从零设计」 |
| `package.json` | 删除 `dev:app`、`build:app`、`build:capacitor`、`cap:sync`、`cap:open:ios`、`cap:open:android` 脚本；删除 `@capacitor/*` 依赖与 `@capacitor/assets`、`@capacitor/cli` |
| `.gitignore` | 删除 Capacitor 原生工程段与 `android/app/huawei-sign.zip` |
| `.claude/` 共 15 个文件 | 子代理清扫：agents 的职责/红线/协作关系、skills 的流程与 frontmatter、templates 的移动端小节与表格列 |

---

## 六、验证

| 验证项 | 结果 |
|---|---|
| 已删目录确认 | `mobile`、`frontend-app`、`android`、`ios`、`capacitor.config.ts` 均不存在 |
| Web 生产构建 | `cd frontend && npm run build` → **成功**（`✓ built in 9.04s`，EXIT=0）。根 `package.json` 去掉 `@capacitor/*` 未伤及 Web：`frontend/vite.config.js` 已将 `@capacitor/*` 设为 external |
| 悬挂相对链接扫描 | 全 `docs/` 扫描，修复后仅剩 2 处**既有**模板占位图链接（`./img/a.png`、`./img/diagram.png`，与本轮无关） |
| 测试套件 | 见下节「测试守卫修复」 |
| git 可写性 | `git status` / `git tag` 正常 |

### 测试守卫修复

`__tests__/frontend/` 下有一批**跨端静态守卫测试**通过读文件内容断言「Web 与 App 两端一致」（如 `aboutPageSlimming`、`brandAndJoinUs`、`contactChannelOnly`、`materialsRepoAddressGuard`、`myZoneCounts`、`registerEmailField`、`tabBarRouteOwnership`、`treeholeRecommendationCopy`、`userZoneReviews`）。App 层删除后这些路径不存在，必须收敛为 Web 单端断言或整文件删除——**不得改成空壳通过**。

处理结果见本目录同期提交说明；收敛原则：Web 端有对应物的保留 Web 断言，App 专属的整套删除。

---

## 七、残留与待决项（交接给 App 设计阶段）

### 7.1 必须由新设计决定，不得复用旧物
1. **App 技术形态**：旧的两条路线（Expo RN / Capacitor 套壳）均已废弃，新选型随《App 设计宪法》确定。`docs/00-Constitution/principles/技术约束.md` 与 `技术选型决策.md` 中该行现为「待定」。
2. **App 导航与信息架构**：旧「底部 Tab + FAB 发布」结论已作废。
3. **App 设计令牌与视觉语言**：旧「苹果式舒适 + Discord 社区感 + 一点 Neo-Brutalism」方向已作废。

### 7.2 Web 端残留的 App 适配代码（未动，待决定）
`frontend/src/utils/capacitor.js`、`imagePicker.js`、`fullscreen.js`、`frontend/vite.config.js` 的 `@capacitor/*` external 规则 —— 这些是 Web 工程内的原生壳适配层，当前对 Web 构建无影响（全部 `isNative()` 门控）。因为本轮范围明确限定「只限 App 端、Web 保持现状」，未予改动，**建议单独决策是否清理**。

### 7.3 表述已过期的对外材料
`docs/01-Requirement/presentation/Dorm_Presentation.html` 仍以「Capacitor 8 + Android、Android/iOS 上架、JPush 推送」为已交付成果叙述。该 deck 需要整页重写而非局部替换，留给对外材料整理时处理。

### 7.4 本地脚本
`scripts/create-app-review-account.js`（App 商店审核测试账号，命中 `.gitignore`，未跟踪）仍在磁盘上，功能已随 App 废弃而失效，可随时删除。

### 7.5 历史层保留不动
`docs/07-Implement/`（除已删的 RN 迁移清单）、`docs/08-Test/Web端/`、`docs/08-Test/regression/`、`docs/06-Analyze/` 下的验收记录 —— 属于历史记录，按项目约定「新的阶段决策另建文档，不覆盖历史验收记录」保留原文。

### 7.6 仍含 Capacitor 表述的 Web 侧计划文档（保留，受全局声明约束）
`docs/05-Tasks/优化计划/` 下的 `Task001-默认首页与今日校园首页改造`、`Task002-统一卡片状态与动效系统`、`Task008-体验升级测试任务清单`、`校园社交平台体验升级任务清单.md`、`校园社交平台体验升级技术开发文档.md`，以及 `docs/06-Analyze/phase-plans/Phase2-*`、`docs/05-Tasks/Phase2/*`、`Phase3/08-*`、`Phase1/P1-06`～`P1-08`、`docs/08-Test/regression/Phase3跨端回归验收记录.md` 等，均为「Web + Capacitor 双形态」时期的产物：**其 Web 侧要求继续有效，Capacitor 侧表述已失效**。

逐一改写成本高，且部分属于验收记录（不应覆盖），故保留原文，统一由 `docs/README.md` 顶部权威声明约束；后续做 Web 治理时顺手收敛即可。

---

## 八、下一步前置条件

**在产出新的《App 设计宪法》之前，不进入脚手架、不装依赖、不写任何 App 代码。** 设计层需按序产出：

1. App 设计哲学（要解决什么、产品性格、与 Web 的关系）
2. App 设计宪法（不可协商的硬约束：技术形态、导航模型、令牌唯一事实源、验收标准）
3. 前端风格体系（视觉语言、令牌、布局原型、组件规范）
4. 之后才是页面清单盘点与任务拆解
