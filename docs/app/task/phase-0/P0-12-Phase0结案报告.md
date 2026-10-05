# P0-12 · Phase 0 结案报告

| 项 | 值 |
|---|---|
| 负责人 | 甲（所有者本人） |
| 依赖 | P0-01 … P0-11 |
| 状态 | ✅ 结案（2026-10-02） |
| 结论 | **G1 / G2 / G3 / G5 成立** · **G4 部分成立**（四个 spike 都有书面结论，其中真机项待跑）· **G6 接口就绪、实机构建归所有者** |
| 子任务 | 12 个全部完成（P0-01…P0-12），**16 个提交**，其中 **3 个是独立的修复提交** |

> **一句话**：Phase 0 把"能不能做"变成了"已经证明能做"—— **脚手架、五格导航壳、令牌接入、四把尺子进 CI 全部落地并实测**；
> **R1/R3 拿到了可复现的一手证据，R2 拿到了源码级结论**；**唯一没做的是"真机上跑"**（无设备），因此 R7 与 R1/R2/R3 的部分清单**明确标为待真机**，⛔ 没有写成通过。

---

## 1. 出口门逐条判定（G1–G6）

| # | 出口门 | 判定 | 可复现的证据 |
|---|---|---|---|
| **G1** | 脚手架成立 | ✅ **成立** | `npx tsc --noEmit` → exit 0 · `npx expo-doctor` → **21/21 checks passed** · `npx expo export --platform android --no-bytecode` → **成功**（3.63 MB / 3269 模块） |
| **G2** | 导航壳成立 | ✅ **成立（代码与打包级）** | 五格配置唯一处 + 动作型第 5 格（`disabled`+`tabPress`）· 二级顶部 Tab 条 · **`SafeAreaProvider` 全仓恰 1 处** · 打包产物内含 `publish-center` / `screen-tools` / `tab.publish` / `topbar-mailbox` / `--dorm-inset-top` |
| **G3** | 令牌已生效 | ✅ **成立** | `design-debt-report.js --path app/src --fail-on-zero` → **exit 0，宪法级违规：无**（`#hex`=0 · `fontSize` 字面量=0 · 内联双语三元=0 · `t('key')`=4 · 自有 UI 组件引用=4） |
| **G4** | 四个 spike 有书面结论 | ⚠️ **部分成立** | R1 ✅（含 prebuild 产物 manifest 实测）· R2 ✅（源码级）· R3 ✅（含假 DOM 跑通读表）· R7 ⚠️（规则级全过，**真机矩阵未跑**）。四份结论文档均落 `docs/app/evaluation/` 与 `docs/app/test/` |
| **G5** | 四把尺子绿且进 CI | ✅ **成立** | 本地 `npm run rulers` → **exit 0**（设计债 0 违规 / 对比度 22 组不达标 0 / 品牌色阶全门通过 / `textSafe` **22/22**）· `.github/workflows/app-rulers-and-tests.yml`（⛔ 无 `continue-on-error`、无 `|| true`、不用任何 secret） |
| **G6** | 可安装构建通道 | ⚠️ **接口就绪** | `app/eas.json`（development / preview=APK / production）+ 命令 `npx eas-cli build --profile preview --platform android`。⛔ **实机构建需要 Expo 账号，归所有者**；本报告不声称已出过构建 |

---

## 2. 提交清单（16 个，全部 conventional commit）

| # | commit | 说明 |
|---|---|---|
| 1 | `ff1955e` | **docs(app)**：拆解 Phase 0 为 12 份子任务文档并设计 86 条测试用例 |
| 2 | `674a7b8` | **feat(app)**：建立 Expo SDK 57 工程骨架并落依赖准入登记（P0-01） |
| 3 | `488c391` | **docs(app)**：回填 P0-01 执行记录与子任务状态 |
| 4 | `586b2f1` | **feat(app)**：接入设计令牌并建立主题层（P0-02） |
| 5 | `da13648` | **feat(app)**：建立双语词条层与错误文案渲染器（P0-03） |
| 6 | `d9b1897` | **feat(app)**：建立唯一安全区容器与顶栏（宪法第 17 条）（P0-04） |
| 7 | `ba55c86` | **fix(app)** ⚠️：把 reanimated/worklets 钉回 SDK 57 版本，并修 Jest 的三处解析问题 |
| 8 | `13284ce` | **feat(app)**：建立五格底栏导航壳与动作型第 5 格（P0-05） |
| 9 | `e847223` | **feat(app)**：建立二级顶部 Tab 条与筛选 Chips（宪法 4.8）（P0-06） |
| 10 | `f8d1ec0` | **feat(app)**：建立注册表驱动的发布中心与 A-05 提交门禁（P0-07） |
| 11 | `5d8cb64` | **fix(app)** ⚠️：放宽 Jest 超时并限制并发，修掉渲染用例的随机超时 |
| 12 | `74f2e48` | **feat(app)**：建立校方系统内嵌容器与课表抽取（R3）（P0-08） |
| 13 | `80090e4` | **fix(app)** ⚠️：装 `expo-system-ui`（Android 上 `userInterfaceStyle` 必需）并还原 prebuild 改写的脚本 |
| 14 | `2a25b41` | **docs(app)**：落库 R1 返回键结论（含 manifest 实测）并建立返回策略（P0-09） |
| 15 | `91345c7` | **docs(app)**：建立安全区机型矩阵记录表（R7）（P0-10） |
| 16 | `49dc7cc` | **ci(app)**：四把尺子与 App 单测接入 CI（宪法 14.1）（P0-11） |

> **三个修复提交各自独立**（符合"测试没过 → 修 bug 也算独立提交"的要求）：
> `ba55c86`（真实依赖越界）· `5d8cb64`（测试基建）· `80090e4`（Android 双主题必需依赖）。

---

## 3. 测试与门禁证据（最终一跑）

| 门 | 命令 | 结果 |
|---|---|---|
| App 单测 | `cd app && npx jest --ci` | ✅ **13 suites / 267 tests / 0 failed** |
| 类型检查 | `cd app && npx tsc --noEmit` | ✅ exit **0** |
| 依赖体检 | `cd app && npx expo-doctor` | ✅ **21/21 checks passed** |
| 四把尺子 | `cd app && npm run rulers` | ✅ exit **0** |
| 打包（Metro + Hermes 字节码） | `cd app && npx expo export --platform android` | ⚠️ Hermes 步骤**本机环境**拒绝（`hermesc … index.hbc … permission denied`，退出码 6）；**Metro 侧已完成（3269 模块）** → 用 `--no-bytecode` 复验 **成功** |
| 打包（复验） | `cd app && npx expo export --platform android --no-bytecode` | ✅ 成功：`entry-*.js` **3.63 MB** |

**测试分层与用例索引**：[docs/app/test/Phase0测试用例.md](../../test/Phase0测试用例.md)（五层架构 + 宪法条款 → 用例追溯表 + 总门 T1–T5）。

---

## 4. 四个 spike 的结论位置与一句话

| Spike | 结论文档 | 一句话结论 |
|---|---|---|
| **R1** Android 返回键 | [R1-Android返回键结论.md](../../evaluation/R1-Android返回键结论.md) | **默认安全且已实测**：prebuild 产物 manifest 含 `enableOnBackInvokedCallback="false"`；**危险组合是 API 33–35 + predictive back 被打开**；⛔ Expo Go 测不出来 |
| **R2** 原生 Tab 与动作格位 | [R2-原生Tab与动作格位结论.md](../../evaluation/R2-原生Tab与动作格位结论.md) | **选 (a) `unstable-native-tabs`，机制 = Trigger 的 `disabled`**；⛔ 无 `onPress`、`preventDefault()` 无效；稳定入口 (c) 在 SDK 57 **不存在** |
| **R3** 校方系统内嵌 | [R3-校方系统内嵌可行性结论.md](../../evaluation/R3-校方系统内嵌可行性结论.md) | **成立（有条件）**：钉版 `react-native-webview@13.16.1`、cookie 默认持久；两个"静默摧毁会话"的开关已定位；**主风险是 Moodle/签到 是否走 Google SSO** |
| **R7** 安全区机型矩阵 | [安全区机型矩阵记录.md](../../test/安全区机型矩阵记录.md) | **规则级全过**（9 形态纯函数 + S1/S3/S4/S5/S6 源码扫描）；**10 台真机待跑**（记录表已就位） |

---

## 5. 未闭合项（逐条：卡在哪 / 谁来做 / 阻塞什么）

> **可执行版本在 [TODO §五「Phase 0 结案后的一次性清单」](../../TODO.md#五phase-0-结案后的一次性清单所有者一次性做完)**（含"是否阻塞后续开发"与"最晚时点"）。
> 本节保留**证据级**细节（卡在哪、阻塞什么），TODO §五保留**动作级**索引 —— 两处不重复描述同一件事。

| # | 未闭合 | 卡在哪 | 谁来做 | 阻塞什么 |
|---|---|---|---|---|
| 1 | **真机矩阵 10 台/形态 + 10 条清单** | 无设备 | 所有者 | DoIT 第 5 条、宪法 17.4、G4 的 R7 部分 |
| 2 | **R1 真机 5 项**（逐级返回 / 栈底 / 发布中心内 / 后台恢复 / 对照组） | 无设备，且**必须 development build** | 所有者 | 宪法 4.5（结论前不锁返回栈实现） |
| 3 | **R2 真机 4 条**（不切页 / 返回落回 / Android `disabled` / 只隐藏第 5 格标签） | 无设备 | 所有者 | 导航壳的最终实现（若失败 → 请所有者裁决降级 B） |
| 4 | **R3 真机 6 项**（反 WebView / 会话跨重启 / `sharedCookiesEnabled` / 课表列语义 / 渲染时机 / 使用条款） | 无设备 + 校内网 | 所有者 | 头号功能的最终形态（失败 → 降级路径 A） |
| 5 | **EAS 首次构建** | 需要 Expo 账号（C-02 开发者账号类型未定） | 所有者 | 内测分发；若个人账号 → 12 人 × 14 天计时（**Day 1 就该进封闭测试轨**） |
| 6 | **`runtimeVersion` 策略（C-17）** | 待所有者 | 所有者 | 首次构建配置（宪法 11.3 待定项） |
| 7 | **二级 Tab 集合 C-03/C-04/C-05** | 待所有者 | 所有者 | 广场 / 工具 / 我的 的骨架（机制已落地，只差集合） |
| 8 | **字阶绝对值（TD-44）** | M3 官方字阶须人工读取 | 甲（Phase 1） | 视觉层级目前只有字重+颜色；逐屏验收的"字阶"项 |
| 9 | **`app/LICENSE` 是 Expo 模板自带的 MIT** | 需所有者决定删/换 | 所有者 | 法务观感（不阻塞） |
| 10 | **`app/assets/*.png` 仍是模板占位图标** | 品牌资产未定 | 甲（Phase 3 前） | 商店素材（不阻塞内测） |
| 11 | **prebuild 生成物 `app/android/` 留在本机** | 宪法 11.1 要求 gitignored（已忽略） | —— | 无（保留作为 R1 实证；如要干净可删） |

---

## 6. 对 Phase 1 的移交（**一个没见过本项目的人可以照着开工**）

### 6.1 目录定稿（乙丙照此执行）

```
app/src/
  app/                    # expo-router 路由与导航壳（只由甲改）
  components/ui/          # 自有 UI 组件（尺子在这里计数；乙丙只消费）
  design-system/          # 令牌 → 主题 / 字阶 / 间距 / 安全区（只由甲改）
  i18n/                   # 词条（共同拥有：只加 key，不删别人的）
  features/{navigation,tools,publish,square,campus,auth,me,mailbox}/
  shared/                 # 跨域纯逻辑（只由甲改）
```
> ⚠️ 仓库根的 `shared/{api,constants,utils,config,query}` 继续供 App 与 Web 共用（宪法 9.6/9.7）。

### 6.2 命令（本地 = CI 同一套）

```bash
cd app
npm run typecheck     # tsc --noEmit
npm run test:ci       # jest --ci
npm run rulers        # 四把尺子（与 CI job 逐字一致）
npm run verify        # 上面三样串起来
npm run start         # 起 dev server（真机用 development build；⛔ 返回键/Tab 行为别用 Expo Go 验）
```

### 6.3 已就位的可复用件（Phase 1 直接用，⛔ 不要重写）

| 组件 / 模块 | 位置 | 用途 |
|---|---|---|
| `Screen` + `useScreenInsets()` | `components/ui/Screen.tsx` | **唯一**安全区容器；页面只声明 `topMode`/`bottomMode` |
| `TopBar` | `components/ui/TopBar.tsx` | 标题 + **唯一动作**（信箱） |
| `IconButton` / `Text` | `components/ui/` | 命中区 ≥44/48 + 角标进 a11y；文字**不含绝对字号**（TD-44） |
| `TopTabStrip` / `FilterChips` | `components/ui/` | 二级导航（tab 角色）与筛选（button 角色）**两个组件** |
| `tabConfig` / `publishCenterGate` / `secondaryTabs` / `backPolicy` | `features/navigation/` | 五格定义、开合去重、二级状态仓库、返回策略（全纯逻辑） |
| `publish/registry` + `icons` | `features/publish/` | **新增一类发布 = 注册表一行 + 图标表一行**（测试双向守） |
| `schoolSystems` / `injectedScripts` / `extractSchedule` / `SchoolSystemWebView` | `features/tools/` | 头号功能（T-04/T-05）的现成载体 |
| `i18n` / `design-system` | `i18n/` · `design-system/` | 词条（缺词条=编译错）+ 令牌/主题 |

### 6.4 Phase 0 埋下的三条"自动守卫"（改错了会红）

1. **宪法级**：`npm run rulers`（`#hex` / `fontSize` / 内联三元 / `t(k)` / 自有组件引用）。
2. **结构级**（源码扫描测试）：`SafeAreaProvider` 恰 1 处 · `useSafeAreaInsets()` ≤2 处 · 无自绘 Tab 栏 · 无 `SafeAreaView` 导入 · 无写死 `paddingTop: 数字` · 无 `BackHandler` 劫持 · 无 IP 字面量 · 发布入口唯一 · Lucide 逐图标导入。
3. **契约级**：zh/en 键对称（编译期 + 测试）· 注册表 ↔ 图标表双向覆盖 · 五格不变量 · 网络错误三分。

---

## 7. 与计划的偏差（**如实登记**）

| 项 | 生产计划原文 | 实际 | 原因 |
|---|---|---|---|
| 目录结构 | `app/src/design-system/**` 等为 **【建议】** | **已定稿**（含 `components/ui/`） | `design-debt-report.js` 硬编码统计 `components/ui/`，放别处尺子永远红 |
| EAS 构建 | Phase 0 出口门 | 只落 `eas.json` + 命令；**实机构建归所有者** | 需要 Expo 账号（C-02 未定） |
| R1/R2/R3/R7 | "真机 spike" | **代码级证据 + 书面结论 + 真机待办清单** | 子代理/本机无设备；**不得把没测的写成测过了** |
| 字阶 | Phase 1 定 | Phase 0 定"不含绝对值"并登记 TD-44 | 宪法 2.5-② 要求分端生成，且 M3 数值须人工读取 |
| 打包 | 未提 | 额外做了 `expo export` 复验（Metro 级） | 这是**不依赖设备**就能证明"跨包令牌导入 + 路由发现 + babel 配置"成立的唯一手段 |

---

## 8. 回滚点（生产计划 §6.3 四条在本轮的状态）

| 触发 | 降级动作 | 本轮状态 |
|---|---|---|
| R3 不成立 | 课表改**手工粘贴文本** + 校方系统外链，⛔ 不引入 webview | ✅ **路径已就绪**：`extractSchedule` 的"制表符文本"通道与 `resolveEmbedMode('external')` 都在代码里 |
| R2 不成立 | **四格 + 发布 FAB**，⛔ 不自绘 Tab 栏 | ✅ **开关已就绪且有测试**：`buildTabBarConfig('fab')` 可构造；生产代码 0 处调用它（等所有者裁决） |
| 甲第 8 天没交出骨架 | 救火模式 + 内测再砍 8 页 | ✅ **不触发**：骨架在 Phase 0 已完成（超出计划预期） |
| 某域连续卡 2 天 | 按"可用但简"合入并登记已知缺陷 | —— 未发生 |

---

## 9. 下一步建议（给所有者）

1. **给两台 Android（一台 API 33–35、一台 Android 16）+ 一台 iOS 跑一批真机清单**：R1 5 项 → R2 4 条 → R7 10 台/形态 → R3 6 项。地点：校内网（R3 需要）。
2. **定 C-02 账号类型**：若个人账号，**立刻**把首个构建放进封闭测试轨（12 人 × 14 天计时）。
3. **定 C-03/C-04/C-05**（二级 Tab 集合）：机制已就绪，只差集合。
4. 之后即可让乙（工具域）与丙（内容社区域）按 §6.1 的目录定稿开工。

---

## 10. 执行记录

| 时间 | 动作 | 结果 |
|---|---|---|
| 2026-10-02 | 逐条核对 G1–G6 | ✅ 4 条成立 / 1 条部分成立 / 1 条接口就绪（见 §1） |
| 2026-10-02 | 最终一跑：`jest --ci` / `tsc` / `expo-doctor` / `npm run rulers` | ✅ 267 tests · tsc 0 · doctor 21/21 · rulers 0 |
| 2026-10-02 | 打包复验 | ✅ `expo export --platform android --no-bytecode`（3.63 MB）；⚠️ 带 Hermes 字节码时本机 `hermesc` 被环境拒绝（permission denied），非代码问题 |
| 2026-10-02 | 结案 | **Phase 0 结案**；⛔ 未 push（所有者要求） |
