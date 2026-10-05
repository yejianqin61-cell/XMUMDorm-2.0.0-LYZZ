# Phase 0 · 地基与风险清除 —— 子任务包（索引）

**日期**：2026-10-02　**版本**：v1.0
**性质**：**task 层执行文档包**。上游：[生产开发计划-三周到内测](../生产开发计划-三周到内测.md) §2（Phase 0）· [App 设计宪法](../../constitution/App设计宪法.md)（v1.4，已批准）· [App 页面骨架与布局规范](../../design/App页面骨架与布局规范.md) v1.0
**执行者**：所有者本人（"phase0 全部我来，因为地基方面的工作，我来处理会好点"）。乙、丙**不参与 Phase 0**，他们的任务从 Phase 1 开始建在本文档的产物之上。

---

## 0. 一句话

**Phase 0 不是"搭个壳"，是把"能不能做"变成"已经证明能做"**：脚手架 + 五格导航壳 + 令牌接入 + **四个 spike（R1/R2/R3/R7）的书面结论** + 四把尺子进 CI。

## 1. 出口门（全部打勾才算 Phase 0 结束）

| # | 出口门 | 判据 | 状态 |
|---|---|---|---|
| G1 | **脚手架成立** | `app/` 在 SDK 57 线上装得上、TypeScript 编译过、`npx expo-doctor` 无致命项 | ⏳ |
| G2 | **导航壳成立** | 五格底栏（第 5 格＝动作型格位）· 二级顶部 Tab 条 · 唯一安全区容器，**在真机上跑起空壳** | ⏳ |
| G3 | **令牌已生效** | 界面视觉**只能**来自 `tokens/generated/native-tokens.ts`；`app/src` 内 0 个 hex 字面量、0 个 `fontSize:` 字面量 | ⏳ |
| G4 | **四个 spike 有书面结论** | R1 返回键 · R2 原生 Tab 与动作格位 · R3 校方系统内嵌 · R7 安全区机型矩阵，**每条都有"成立/不成立/待真机"三态结论** | ⏳ |
| G5 | **四把尺子绿且进 CI** | `design-debt-report --path app/src --fail-on-zero` · `contrast-check --file ... --fail` · `brand-ramp --hue 261.2 --fail` · `gen-tokens --check` 全部 exit 0，并写进 `.github/workflows/` | ⏳ |
| G6 | **可安装构建通道成立** | `eas.json` + 构建命令已落库；**真机构建由所有者执行**（需要 Expo 账号） | ⏳ |

> ⛔ **不属于 Phase 0 的出口门**：EAS 真机构建**必须实际发出**（需要账号 + 真机，归所有者）；灰度的"孤岛"是本文档无法代替真机验证的四项（G4 中标注"待真机"的部分）。

## 2. 子任务清单与执行顺序

> **顺序即依赖**：P0-02/03/04 是 P0-05/06/07 的前置；P0-08（R3）与 P0-09/10（R1/R7）可与 05/06/07 并行，但**结论文档必须在 P0-12 之前落库**。

| 编号 | 子任务 | 依赖 | 写作用域 | 状态 |
|---|---|---|---|---|
| [P0-01](P0-01-工程脚手架与依赖准入.md) | 工程脚手架与依赖准入 | — | `app/**`（除 `app/src/**`）、`.gitignore` | ⏳ |
| [P0-02](P0-02-令牌接入与主题层.md) | 令牌接入与主题层 | P0-01 | `app/src/design-system/**` | ⏳ |
| [P0-03](P0-03-双语词条层与错误文案渲染器.md) | 双语词条层与错误文案渲染器 | P0-02 | `app/src/i18n/**` | ⏳ |
| [P0-04](P0-04-唯一安全区容器.md) | 唯一安全区容器（S1–S8） | P0-02 | `app/src/components/ui/Screen.tsx`、`app/src/design-system/safe-area.ts` | ⏳ |
| [P0-05](P0-05-五格底栏导航壳.md) | 五格底栏导航壳（含动作型第 5 格） | P0-02/03/04 | `app/src/app/**`、`app/src/features/navigation/**` | ⏳ |
| [P0-06](P0-06-二级顶部Tab条.md) | 二级顶部 Tab 条 | P0-04/05 | `app/src/components/ui/TopTabStrip.tsx` | ⏳ |
| [P0-07](P0-07-注册表驱动的发布中心.md) | 注册表驱动的发布中心 | P0-05 | `app/src/features/publish/**` | ⏳ |
| [P0-08](P0-08-校方系统内嵌容器.md) | 校方系统内嵌容器（R3） | P0-04 | `app/src/features/tools/**` | ⏳ |
| [P0-09](P0-09-Android返回键spike.md) | Android 返回键 spike（R1） | P0-01 | `app/src/features/navigation/**`、`docs/app/evaluation/**` | ⏳ |
| [P0-10](P0-10-安全区与机型矩阵验收.md) | 安全区与机型矩阵验收（R7） | P0-04 | `docs/app/test/**` | ⏳ |
| [P0-11](P0-11-四把尺子接入CI.md) | 四把尺子接入 CI | P0-01..08 | `.github/workflows/**` | ⏳ |
| [P0-12](P0-12-Phase0结案报告.md) | Phase 0 结案报告 | 全部 | `docs/app/task/phase-0/P0-12-*.md` | ⏳ |

## 3. 测试用例

全部用例编号与期望写在 **[docs/app/test/Phase0测试用例.md](../../test/Phase0测试用例.md)**（本包的每个子任务文档在 §测试用例 给出自己那几条）。编号规则 `TC-P0-<子任务号>-<序号>`，`A` 结尾为自动化、`M` 结尾为人工/真机。

## 4. 路径定稿（本包的第一个产出，**乙丙照此执行**）

生产计划 §1 的表里，甲/乙/丙的目录是 `【建议】`，**第 1 天由甲定稿**。定稿如下（**原因：`design-debt-report.js` 的 `ownUiComponentRefs` 指标硬编码统计 `components/ui/` 这个字符串；把自有 UI 组件放在别处会让尺子永远红**）：

```
app/src/
  app/                    # expo-router 路由与导航壳（只由甲改）
  components/ui/          # 自有 UI 组件（尺子在这里计数；乙丙只消费，不改）
  design-system/          # 令牌 → 主题 / 字阶 / 间距 / 安全区口径（只由甲改）
  i18n/                   # 词条（共同拥有：只加 key，不删别人 key）
  features/<域>/          # 业务域：navigation(甲) tools(乙) square/campus(丙) publish(甲) auth/me/mailbox(甲)
  shared/                 # 跨域纯逻辑（只由甲改）
```

⛔ **`shared/{api,constants,utils,config,query}` 继续放在仓库根目录**（宪法 9.6/9.7：App 与 Web 共用的只有这五个子目录）；`docs/team/团队协作契约.md` 的写作用域表据此更新。

## 5. 与生产计划的口径差异（**必须知情**）

| 项 | 生产计划原文 | 本包处置 | 理由 |
|---|---|---|---|
| 甲/乙/丙 目录 | `【建议】` | **已定稿**（§4） | 尺子硬编码 `components/ui/` |
| 字阶绝对值 | Phase 1 定 | **Phase 0 不定，登记缺口** | 宪法 2.5-② 明确"字阶不写绝对 pt 常量"，且 M3 官方字阶数值须人工读取（宪法 15.2-1）→ [TODO](../TODO.md) **TD-44** |
| EAS 构建 | Phase 0 出口门 | 本包只落 `eas.json` 与命令；**实际构建归所有者** | 需要 Expo 账号与真机 |
| R1/R2/R3/R7 | "真机 spike" | 本包给**代码级证据 + 书面结论 + 真机待办清单** | 子代理环境无真机；不得把没测的写成测过了 |

## 6. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立。拆 12 个子任务 + 集中测试用例文档；定稿目录结构；登记"字阶绝对值"缺口为 TD-44 |
