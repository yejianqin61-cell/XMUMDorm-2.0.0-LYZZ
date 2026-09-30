# RN 前端基座选型 + Google Play / App Store 上架调研

**调研日期**：2026-09-29
**调研目标**：判断「直接拿别人的半成品 RN 前端来做 native App」是否成立，并给出 1 个月内上架 Google Play 的可行路径（含 Apple 端少量原生增强）
**证据类型**：本地仓库实测（`jest` / `tsc` / `expo config`）+ GitHub REST API 与 `raw.githubusercontent.com` 原文 + Google/Apple/Expo 官方文档（来源见附录）

---

## 0. 结论（先看这里）

1. **不要更换基座。** 本项目 `mobile/` 已经是一个完整的 **Expo SDK 56 + Expo Router** App：**69 屏 / `src+app` 120 文件 10,064 行 / 测试 21 文件 3,003 行 / 20 套测试 417 条全绿（实测 4.74s）**、后端 API 覆盖率 96%。三个候选模板加起来**没有提供这 69 屏里的任何一屏**，采用它们等于丢掉 1 万行已验证代码，换回几个配置文件。
2. **三个候选仓库全部不建议采用**，两条最硬的理由：**它们都用 NativeWind/Tailwind**（与宪法硬约束 `StyleSheet.create` + `expo-blur` 冲突），**都没有对接你自己的 Express + JWT 后端**（都没有 auth）。其中 `JoseCortezz25/expo-starter-template` **完全没有 LICENSE 文件**，商用上架在法律上不可用。
3. **真正值得「抄」的只有工程/运维文件，不是 UI 代码**：`eas.json`、CI workflow、Maestro E2E、Sentry 接入、i18n 校验、store assets 清单。唯一在版本上对齐 SDK 56 的参考基座是 `roninoss/create-expo-stack`（其当前模板即 `expo ~56.0.4` / RN 0.85.3，与你完全一致）——建议**生成一次性项目用来 diff 配置**，而不是抄代码。
4. **离上架的真正差距不是 UI，而是合规与发布链路。** 实测硬缺口：`app.json` **没有 `android.package`**（Play 必需）、没有 `eas.json`（EAS 未初始化）、移动端 **API 仍指向局域网 IP**、**没有应用内注销账号入口**、**没有隐私政策页**、被自动附加 **`RECORD_AUDIO` 敏感权限**、iOS 打开了 `NSAllowsArbitraryLoads`。
5. **「1 个月上架 Google Play」的真卡点不是写代码，而是 Google 的规则与审核排队**：若是 2023-11-13 之后创建的**个人账号**，必须**≥12 名测试者连续封闭测试 14 天**，之后生产访问审核 ≤7 天、发布审核最多 7 天 → 理论最短 **D22–D30（3–4.5 周）**，可行但紧；**组织账号不适用该测试要求，但强制 D-U-N-S**（对个人学生通常更慢）。另外两条已生效的硬要求：**自 2026-08-31 起新应用/更新必须 target API 36**（今天 2026-09-29，该期限已过），以及 UGC 应用必须提供**接受使用条款 + 举报 + 屏蔽用户**（我们目前只有举报）。详见 §5。
6. **一个必须先确认的假设**：UGC 政策要求"屏蔽用户"，而后端目前没有该能力——这可能需要**改后端**，与"后端不用写"的前提冲突。建议先决策是否复用现有管理员 ban/mute 机制，还是新增用户级 block 接口。

---

## 1. 现状核查（一手证据）

### 1.1 已具备的能力

| 项目 | 实测结果 | 验证方式 |
|---|---|---|
| 测试 | **20 suites / 417 tests 全通过**，4.74s | `npx jest --silent --runInBand` |
| 代码规模 | `src+app` **120 文件 / 10,064 行**；`src/screens` **69 屏**；测试 21 文件 / 3,003 行 | 文件统计（本次实测） |
| 技术栈 | Expo SDK **56.0.0**、RN 0.85.3、React 19.2.3、expo-router 56.2.8 | `npx expo config --type public` |
| 路由 | **Expo Router 迁移已完成**（`mobile/app/` 19 个路由文件） | 目录实测 |
| 平台 | `platforms: ['ios','android']` | `expo config` |
| 插件 | `expo-router` / `expo-image-picker` / `expo-notifications` | `expo config` |
| 后端 | 生产 Express 存活：`xmumdorm-200-lyzz-production.up.railway.app`（`/api/health` 返回 Express 404，说明服务在跑） | `web_fetch` |
| 隐私政策 | Web 端 `https://www.xmumdorm.com/privacy` 返回 **HTTP 200** | `web_fetch` |

> 注：`docs/06-Analyze/performance/移动端开发进度评估_V2.0.md`（2026-06-01）里「expo-router 已安装未使用」「69 屏为状态机导航」的描述**已过期**，Expo Router 迁移已在 `63d9ad9` 落地。该文档需要更新。

### 1.2 上架硬缺口（实测，均为发布阻塞项）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| 1 | **无 `android.package`** | `expo config` 输出的 `android` 段没有 `package` 字段 | Play 上架必需；EAS 构建会要求补 |
| 2 | **无 `ios.bundleIdentifier`** | 同上，`ios` 段无 `bundleIdentifier` | iOS 构建/上架必需 |
| 3 | **无 `eas.json`** | 全仓库检索 `eas.json` 为空 | EAS Build/Submit 未初始化，等于没有发布链路 |
| 4 | **移动端 API 指向局域网** | `mobile/src/api/config.js:8` → `http://10.72.10.97:4040` | 装到用户手机上直接连不上后端 |
| 5 | **无应用内注销账号入口** | `mobile/` 内 `注销/deactivate` 仅出现在管理员端（`AdminUserDetailScreen`） | Play 与 App Store 均强制要求应用内可注销 |
| 6 | **无隐私政策页** | `mobile/` 内无 `PrivacyPolicy` 引用（Web 端有 `frontend/src/pages/PrivacyPolicy.jsx` + `/privacy`） | 商店必填隐私政策 URL，且应用内应可达 |
| 7 | **被附加敏感权限 `RECORD_AUDIO`** | `expo config` → `android.permissions: ['android.permission.RECORD_AUDIO']` | 敏感权限需在 Play 声明，与功能无关时是拒审风险 |
| 8 | **iOS 允许任意明文加载** | `app.json:14` `NSAppTransportSecurity.NSAllowsArbitraryLoads: true` | 审核会被追问；安全上也不该留 |
| 9 | 无暗色模式 | `userInterfaceStyle: 'light'` | 非阻塞，但 iOS 18+ 沉浸体验缺失 |
| 10 | 无崩溃上报 / 无 E2E | 未装 Sentry；无 Maestro/Detox | 上线后无观测手段，回归靠手工 |
| 11 | 类型检查未过 | `npx tsc --noEmit` → **93 errors / 30 文件**（重灾区是 `uri: string \| null` 与 `.finally` on void） | Metro 不做类型检查，**不阻塞打包**；但违反《移动端重构》"tsc 无错"验收标准 |
| 12 | 遗留目录 / 双份 config | `mobile/app_bak/`（旧路由，仍报 tsc 错误）；`src/api/config.js` 与 `shared/api/config.js` 两份并存 | 维护噪声；`shared/` 那份才是带生产域名的正确版本 |
| 13 | 宪法要求 `expo-image` 但未使用 | `expo-image` 不在 `package.json`；13 个屏用 `react-native` 的 `Image` | 图片缓存/性能弱于 `expo-image`；属规范偏差 |

### 1.3 架构现状（影响后续工期估算）

`mobile/app/**` 的 19 个路由文件**几乎都是薄壳**，例如：

```tsx
// mobile/app/(tabs)/square.tsx
export { default } from '../../src/screens/SquareScreen';
```

即：**文件系统路由已建立，但模块内部仍是状态机**（`EatScreen` 6 视图、`SquareScreen` 8 视图、`AdminScreen` 12 视图…），所以：
- 深链/返回栈仍不完整（`docs/06-Analyze/performance/移动端开发进度评估_V2.0.md` 已记录该问题）；
- 想上架**不必**先完成「每屏一条路由」的彻底重构——这是体验优化，不是发布前置。

---

## 2. 三个候选仓库评估（GitHub API + 仓库原文）

来源：各仓库 `package.json`、`README.md`、`app.json`、GitHub REST API；抓取日期 2026-09-29。

| 维度 | NativeShad | expo-nativewind-boilerplate | expo-starter-template |
|---|---|---|---|
| 仓库 | `chvvkrishnakumar/NativeShad` | `0xPixelNinja/expo-nativewind-boilerplate` | `JoseCortezz25/expo-starter-template` |
| 定位 | 标了 `is_template` 的模板仓 | 个人自用 boilerplate（非模板） | 脚手架，未标模板 |
| Expo / RN / React | `expo ^56.0.9` / RN **0.85.3** / React 19.2.3 | `expo ~53.0.12` / RN 0.79.4 / React 19.0.0 | `expo ~54.0.35` / RN 0.81.5 / React 19.1.0 |
| 样式 | **NativeWind v4 + Tailwind 3.4** | **NativeWind v4 + Tailwind** | **NativeWind v4 + Tailwind 3.4** |
| 路由 | expo-router | expo-router | expo-router（typedRoutes） |
| UI 组件 | 20+ 自研 CVA 组件 + bottom-sheet | 无 | 1 个 `cva()` 按钮 |
| Auth | **无** | **无** | **无**（仅 Zustand + AsyncStorage） |
| i18n | 无 | 无 | 无（按域拆 `*.messages.ts`） |
| 表单/校验 | 无 | 无 | RHF + Zod |
| 状态管理 | 无（连 React Query 都没有） | 无 | Zustand；**无 React Query** |
| 测试 / E2E / CI | **无 / 无 / 无** | 无 / 无 / 无 | jest-expo / 无 / **无** |
| `eas.json` | 无（只有 npm script） | 无 | **无**（README 明说没接） |
| License | MIT | Apache-2.0 | **无 LICENSE（`license: null`）** |
| Stars / Forks | 60 / 8 | 3 / 0 | 0 / 0 |
| 创建 → 最后推送 | 2025-09-22 → 2026-08-21 | 2025-08-11 → **2025-08-11（当天即停）** | 2026-07-29 → 2026-08-02 |
| 近 12 个月提交 | 11 次，仅覆盖 52 周中的 4 周 | **创建当天后 0 次** | **6 次，全在 2026-07-29～08-02** |

**逐个体检结论**

- **NativeShad** — 版本最接近（SDK 56 / RN 0.85.3），MIT，是三个里唯一带错误边界组件的。但：NativeWind 与宪法冲突；**0 测试、0 CI、无 i18n、无 auth**；一年 11 次提交、单人维护。README 徽章（自称 RN 0.79.6 / Router 3.5.23）与 `package.json`（0.85.3 / 56.2.9）**自相矛盾**，CHANGELOG 也非时序。→ **不采用**（可抄它的 error-boundary 逻辑）。
- **expo-nativewind-boilerplate** — SDK 53，**创建当天之后再无提交**，3 stars。→ **直接淘汰**。
- **expo-starter-template** — 6 次提交后停更，**无 LICENSE（商用不可用）**，无 EAS、无 CI、无 i18n、无服务端状态层，README 还把「没有 `StyleSheet.create` 样板」当卖点——**正好与你的宪法相反**。→ **直接淘汰**。

---

## 3. 更合适的候选（以及为什么仍然不整仓采用）

排名依据：维护活跃度、许可、能否对齐 Expo SDK 54+/56、是否耦合 BaaS、是否与宪法冲突。

| 排名 | 仓库 | Stars | 许可 | 最后推送 | 栈 | 与项目的关系 |
|---|---|---|---|---|---|---|
| 1 | **roninoss/create-expo-stack** | 2,573 | MIT | 2026-09-17 | 模板即 `expo ~56.0.4` / RN 0.85.3 / React 19.2.3 / router ~56.2.6 / reanimated 4.3.1，**StyleSheet，Tailwind 可选** | **版本完全对齐**，可用作一次性生成器 diff 配置 |
| 2 | **obytes/react-native-template-obytes** | 4,349 | MIT | 2026-06-02 | `expo ~54.0.32` / RN 0.81.5，TanStack Query 5、i18next、Maestro、13 条 CI | **运维资产最好**；样式是 uniwind/NativeWind → 只抄工程文件 |
| 3 | **infinitered/ignite** | 19,941 | MIT（LICENSE 实为 MIT，API 因生成代码豁免报 NOASSERTION） | 2026-06-07 | `expo 55.0.5` / RN 0.83.2，**React Navigation 而非 expo-router** | 导航模型与宪法冲突；i18n/测试思路可参考 |
| 4 | **expo/examples + 官方模板** | 3,735 | MIT（模板 0BSD） | 2026-09-03 | 官方线已到 **SDK 58 / RN 0.88-rc**（比项目高 2 个小版本） | 第一方、按主题索引（`with-sentry`、`with-maestro`…），**零锁定** |
| 5 | ixartz/React-Native-Boilerplate | 411 | MIT | 2025-08-31 | `expo ^49` / RN 0.72 | 版本过旧，淘汰（仅留 Detox 配置参考） |

**已核查并排除**：`TheWidlarzGroup/react-native-boilerplate` **不存在（404）**；`gluestack-ui-starter-kit` 404，实际两个 starter 分别 0★（2023）与 **已归档**（2024）；`tamagui/starter-free` **无 LICENSE**；**不存在权威的 `supabase-community` Expo starter**（该名 404），现存 Supabase 模板全部绑定 Supabase Auth，与自建后端冲突；`ixartz/Expo-Saas-Boilerplate` 404。

### 为什么「一个都不整仓采用」

所有模板的价值都集中在三层，而这三层**恰好是你宪法冻结的三层**：

| 模板的价值层 | 你的硬约束 | 采用代价 |
|---|---|---|
| 样式（NativeWind/Tailwind/Tamagui） | `StyleSheet.create` + `expo-blur` | 把 1 万行从 Tailwind 反写回 StyleSheet |
| 导航（Ignite = React Navigation） | Expo Router | 替换整套导航 |
| 鉴权/后端（Supabase/Firebase starter） | 自建 Express + JWT，158 个端点 | 丢掉整个后端 |

而且你**已经领先于候选**：417 条测试全绿、96% API 覆盖率，而候选模板大多连 API 层都没有。

---

## 4. 建议方案：保留 `mobile/`，只「选择性吸取」

### 4.1 该抄的具体文件（不含样式与后端主张）

| 目标 | 来源 | 地址 |
|---|---|---|
| `eas.json`（dev/preview/production profile、`appVersionSource: remote`、`autoIncrement`、`android.buildType: app-bundle`、`submit` 段） | obytes | `raw.githubusercontent.com/obytes/react-native-template-obytes/HEAD/eas.json` |
| CI：`lint-ts` / `type-check` / `test` / `expo-doctor` / `eas-build-preview` / `eas-build-prod` / `e2e-android-maestro` / `new-app-version` | obytes | `.github/workflows/`（13 个文件） |
| Sentry 接入（`@sentry/react-native`） | expo/examples | `github.com/expo/examples/tree/master/with-sentry` |
| expo-router 错误/加载态约定 | Expo 官方 | `docs.expo.dev/router/error-handling/` |
| 错误边界逻辑（JSX 需重写为 StyleSheet） | NativeShad | `components/error-boundary/`（ErrorBoundary / GeneralError / NetworkError） |
| i18n 方案 + 翻译校验（`eslint-plugin-i18n-json`、`lint:translations`） | obytes | `src/lib/i18n/`、`src/translations/` |
| 表单/校验依赖选型 | obytes 用 TanStack Form + Zod；JoseCortezz 用 RHF + Zod | 取依赖选型即可（**勿取无许可证仓库的代码**） |
| Maestro E2E 冒烟套件 + CI job | obytes `.maestro/`；expo/examples `with-maestro` | 同上 |
| 图标 / 截图 / 商店元数据清单 | Expo 官方 | `docs.expo.dev/guides/store-assets/` |
| SDK 56 已知良好配置基线（diff `app.json` / `tsconfig.json` / `metro.config.js`） | create-expo-stack 的 `cli/src/templates/base/package.json.ejs` | 生成一次性项目后 diff |

### 4.2 立刻要修的配置（发布阻塞项，见 §1.2）

1. `app.json` 补 `android.package`（如 `com.xmumdorm.dorm`）与 `ios.bundleIdentifier`；确认 `version`/`versionCode`/`buildNumber` 策略。
2. 新增 `eas.json`（含 `production` profile 与 `submit.production.android`），`eas init` 绑定项目。
3. `mobile/src/api/config.js` 切到生产域名（`shared/api/config.js` 已有正确值 `https://xmumdorm-200-lyzz-production.up.railway.app`），最好改为按 `__DEV__` / EAS profile 注入，而不是手改注释。
4. 用 `expo-image-picker` 的 `microphonePermission: false` + `android.blockedPermissions: ['android.permission.RECORD_AUDIO']` 去掉无关敏感权限。
5. 去掉 `NSAllowsArbitraryLoads`（生产走 HTTPS 后不再需要）。
6. 补移动端**注销账号**入口（调用后端注销接口）+ 应用内**隐私政策**页（可复用 Web 文案，或跳 `https://www.xmumdorm.com/privacy`）。
7. 清理 `mobile/app_bak/`、统一到 `shared/api/config.js` 一份 config。
8. 接入 Sentry（或等价方案）——上线后没有崩溃观测等于盲飞。

### 4.3 商店合规对照：政策要求 vs 代码实测

两家商店对 UGC 应用的硬性要求，逐条对照本仓库实测结果：

| 要求 | Google Play | Apple | 本项目实测 | 结论 |
|---|---|---|---|---|
| 发帖前过滤不良内容 | UGC 政策要求持续审核 | 1.2(a) 过滤 | ✅ 服务端 `middleware/sensitiveWordFilter.js` + `checkSanction` 已覆盖 posts / confessions / square / clubs / marketplace / errands / handbook / canteen 的**全部创建与评论接口** | 已满足 |
| 举报内容与用户 | 必须 | 1.2(b) | ✅ 移动端 `ReportModal` + `routes/reports.js` + 管理端 `AdminReportList/DetailScreen` | 已满足 |
| **屏蔽用户** | **必须**（公开 UGC 与私信均要能屏蔽用户） | 1.2(c) 必须 | ❌ **不存在**：全仓库与后端 `routes/` 检索不到 block/拉黑，后端只有管理员侧 `ban`/`mute`（`AdminUserDetailScreen`、`routes/admin.js`） | **需改后端** |
| 接受使用条款 | UGC 政策要求"Requires users accept the app's terms of use" | 1.2 **不**要求 EULA（只要求联系信息） | ❌ 移动端无条款页、无同意勾选（Web 端有 `/terms` + 登录/注册勾选） | 移动端需补（Play 要求） |
| 公开联系方式 | — | 1.2(d) | ✅ `AboutInfoScreen` + 全站统一官方微信号 | 已满足 |
| **应用内注销账号入口** | 必须（应用内 + 可访问网页链接） | 5.1.1(v) 必须，入口需在设置内 | ❌ 移动端无入口；后端仅 `UPDATE users SET status='deactivated'`（`routes/users.js:284`、`routes/admin.js:380`） | **需改后端 + 移动端** |
| **注销须删除账号及其 UGC** | 要求删除账号与数据 | 必须删除该用户的 UGC（帖/图/评论） | ❌ 软注销，保留全部 UGC；`routes/auth.js:557` 只是拒绝登录 | **需改后端** |
| 隐私政策 URL（商店 + 应用内可达） | 必须 | 必须 | ⚠️ Web 有（`https://www.xmumdorm.com/privacy` 实测 HTTP 200），移动端无入口 | 移动端需补 |
| 审核者可用的登录凭据 | 必须（登录墙应用） | 需提供 demo 账号 | ⚠️ 尚未准备 | 提交前准备 |
| 匿名内容的合规风险 | UGC 政策适用 | **1.2 明确拒绝"主要用于随机或匿名聊天"的应用** | ⚠️ 树洞 / `routes/confessions.js` 为匿名 UGC | 需可见的审核机制与规则说明，降低首次被拒风险 |

**由此得到两条对计划的硬结论：**

1. **「后端不用写」这个前提，对商店合规不成立。** 「屏蔽用户」与「真正注销（含删除该用户 UGC）」至少两项需要后端新增/改造；这是本次调研最值钱的发现之一，建议在 T0 就做决策，不要等提交时才发现。
2. **一套改动同时满足两端。** 举报 / 屏蔽 / 注销 / 隐私政策 / 条款接受，Android 与 iOS 要求高度重叠，**不存在重复实现成本**——这也是"先做合规再做 UI 打磨"的理由。

---

## 5. Google Play 上架合规与工期

来源均为 Google 一手文档（`support.google.com/googleplay/android-developer`、`developer.android.com`）与 Expo 官方文档。

### 5.1 决定工期的第一因素：账号类型

| | 个人账号（personal） | 组织账号（organization） |
|---|---|---|
| 封闭测试要求 | **必须**：≥**12** 名测试者**连续 opt-in ≥14 天**；申请生产访问时仍须满足 | **不适用** |
| 前置条件 | Google Payments 资料（法定姓名/地址）验证；需政府 ID + 信用卡；还需**设备验证**（非 root 的 Android 10+ 真机 + Play Console App，约 1 分钟） | **强制 D-U-N-S 编号**，且名称/地址须与 Dun & Bradstreet 档案一致，否则"组织名称或地址不再通过验证"，逾期可能下架全部应用；另有网站验证 |
| 费用 | 一次性 **US$25**（预付卡不接受） | 同左 |
| 关键路径 | 14 天测试 + ≤7 天生产访问审核 + 最多 7 天发布审核 | 无 14 天测试，但 D-U-N-S 申请与验证是新的长杆 |

来源：[14151465](https://support.google.com/googleplay/android-developer/answer/14151465)（封闭测试原文）、[6112435](https://support.google.com/googleplay/android-developer/answer/6112435)、[13628312](https://support.google.com/googleplay/android-developer/answer/13628312)、[13634885](https://support.google.com/googleplay/android-developer/answer/13634885)。

- 原文：个人账号（2023-11-13 之后创建）"must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days"，且"At least 12 testers must be opted in to your closed test when you apply for production access"。
- 测试者不足 → 生产访问保持关闭，只能"continue running your closed test"后重新申请；**任一测试者 opt-out 会重置该测试者的连续天数**。
- **豁免/困难通道：UNVERIFIED** —— 现行文档未记载任何延长期或困难豁免路径，早期 20 测试者时代的延期条款已不存在。

### 5.2 技术门槛（本轮不需要改代码，但必须落到构建配置）

| 项 | 现行要求 | 对本项目的影响 |
|---|---|---|
| **target API level** | **自 2026-08-31 起，新应用与更新必须 target Android 16（API 36）** | 必须在构建中显式声明 `targetSdkVersion 36`。用 `expo-build-properties` 的 `android.targetSdkVersion: 36` 固定（Expo SDK 56 的默认值 **UNVERIFIED**，不要赌）。来源：[target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| 16 KB page size | target API 35+ 必须支持；**2027-02-01 起**不合规的更新无法发布 | **当前不阻塞**：RN 自 0.77 起已支持，本项目 RN 0.85.3 / SDK 56 远在其后。来源：[page-sizes](https://developer.android.com/guide/practices/page-sizes)、[RN 0.77](https://reactnative.dev/blog/2025/01/21/version-0.77) |
| 打包格式 | **AAB 强制**（2021-08 起）；压缩后下载 ≤4 GB；>200 MB 需 Play Asset/Feature Delivery | EAS `production` profile 默认产出 `.aab` |
| 签名 | 新应用自动加入 Play App Signing（Google 持有签名密钥）+ 你自己持有**上传密钥**（RSA 2048+，可重置） | EAS 托管凭据 |
| 64 位 | 必需 | AAB 提供 `arm64-v8a` |
| 包名 | 反域名、Play 全局唯一、**创建后不可更改** | 必须先定 `android.package`（当前缺失） |
| versionCode | 每次发布 +1，上限 2,100,000,000 | `appVersionSource: remote` + `autoIncrement` |

### 5.3 提交前必须完成的 App content 声明

**必做**：隐私政策 URL（商店列表 + 应用内）、**Data safety 表单**、内容分级问卷（IARC）、广告声明（无广告）、**给审核者的可用登录凭据**（我们是登录墙 App，这一项缺失会直接导致无法审核）、目标受众声明 **18+**（规避 Families 政策）、**账号注销（应用内入口 + 可访问的网页链接）**、政府应用声明、UGC 审核机制。
来源：[9859455](https://support.google.com/googleplay/android-developer/answer/9859455)、[9859655](https://support.google.com/googleplay/android-developer/answer/9859655)、[13327111](https://support.google.com/googleplay/android-developer/answer/13327111)、[9867159](https://support.google.com/googleplay/android-developer/answer/9867159)、[9514050](https://support.google.com/googleplay/android-developer/answer/9514050)。

**UGC 政策原文要求**（`support.google.com/.../9876937`）：带 UGC 的应用"must implement robust, effective, and ongoing UGC moderation that: **Requires users accept the app's terms of use** … providing an **in-app system for reporting and blocking objectionable UGC and users**"；私信/提及场景必须能**屏蔽用户**；公开 UGC 必须能**举报内容与用户并屏蔽用户**。

> **本项目实测差距（§1.2 已列）**：移动端**只有举报**（`ReportModal`），**没有屏蔽用户**（全仓库与后端 `routes/` 均检索不到 block/拉黑，后端只有管理员侧的 ban/mute），**没有使用条款接受门槛**（Web 端有 `/terms` + 同意勾选，移动端没有）。这三项是首次提交最可能被拒的地方。
> 注意：**"屏蔽用户"很可能需要后端新增接口**——这会打破"后端零改动"的假设，需要单独立项确认。

**权限**：Permissions Declaration Form 由"高危或敏感权限（如 SMS、通话记录）"触发，其审核"may require up to several weeks"——**要主动避免触发**。本项目 `expo config` 里被自动附加了 `RECORD_AUDIO`（来自 `expo-image-picker`），与功能无关，应移除。

### 5.4 审核与发布

- 处理时间："can take a few hours or up to seven days (or longer in exceptional cases)"，官方建议"include a buffer period of at least a week between submitting your app and going live"；**新账号应用可能被延长审核**。生产访问申请审核"usually takes seven days or less"。
- 测试轨道：内部测试 ≤100 人且无前置要求；封闭测试需完成应用设置；**开放测试必须先获得生产访问**；**首次生产发布不支持分阶段发布**（直接全量给所选国家）。
- 地区/税务：马来西亚支持开发者注册 + 商户注册（MYR），中国支持（USD）；`RECORD_AUDIO` 无关但若涉及支付方式验证可长达 5 天。

### 5.5 最短关键路径（全新个人账号）

| 时间 | 动作 |
|---|---|
| D0 | 注册 + 付 US$25 + 填 Payments 法定姓名/地址 + 邮箱/手机验证；启动身份验证；设备验证（约 1 分钟） |
| D0–D1 | 建应用；完成 App content 全部声明（隐私政策、广告=无、**审核者测试账号**、目标受众 18+、内容分级、Data safety + 注销网页链接）；**把 UGC 的举报+屏蔽+条款接受做进构建** |
| D1 | EAS 出生产 AAB（`targetSdkVersion 36`）→ 上传到**封闭测试**（自动配置 Play App Signing）；**一次性邀请 15–20 名测试者** |
| D1–D15 | 12 名测试者连续 opt-in **14 天**（中途掉人则重新计时） |
| D15 | 申请生产访问（三段式表单） |
| D15–D22 | 生产访问审核 ≤7 天 |
| D22 | 首次生产发布 → 全量；常规审核数小时–7 天 |
| **≈D22–D30（3–4.5 周）** | **上线** |

**结论：「1 个月上架 Google Play」在个人账号下可行，但很紧**（14 + 7 + 最多 7 ≈ 26–30 天），且必须满足：身份验证当周完成、12 名测试者全程不掉、生产访问申请一次通过。
**会直接击穿 1 个月预算的情形**：①生产访问申请因"测试者不足/参与度不够"被退回（14 天重新计时）；②任一测试者 opt-out；③触发权限声明审核（"up to several weeks"）；④首次发布被拒后重审。
**组织账号并不会更快**：省掉 14 天测试，但 D-U-N-S 申请与组织验证是新的长杆，**除非该主体已有 D-U-N-S，否则不作为首选**。

**EAS 事实核对**：`production` profile 默认产 `.aab`；`eas submit --platform android` 上传；需在 EAS 配置 **Google Service Account key**；首次提交默认落在**内部测试轨道且为草稿**；**免费 EAS 计划够用**（每月重置的低优先级构建额度），付费只买优先级。来源：[submit/android](https://docs.expo.dev/submit/android/)、[app-versions](https://docs.expo.dev/build-reference/app-versions/)、[billing/plans](https://docs.expo.dev/billing/plans/)。

## 6. iOS 原生增强与 App Store

来源：Apple 审核指南与官方支持页、Expo SDK **56 版本化文档**（`docs.expo.dev/versions/v56.0.0/`）。

### 6.1 与 Android 重叠的硬要求（同一套改动，两端通吃）

| 条款 | 要求 | 对本项目 |
|---|---|---|
| **5.1.1(v)** | 支持账号创建的应用**必须在应用内提供账号注销**；入口需易找（账号设置内），**不得把用户推给邮件/客服**，且**要删除该用户的 UGC**（照片、视频、文字帖、评论） | **确定的拒审项**。而当前后端是软注销（§4.3），**必须改后端** |
| **1.2 UGC** | 四件事：①发布前过滤；②举报并有及时响应；③**屏蔽滥用用户**；④公布联系方式 | ①✅ ②✅ ③❌ ④✅（§4.3）。**注意：EULA 接受不属于 1.2**（这条是 Play 的要求） |
| **1.2 排除条款** | 明确拒绝"主要用于随机或匿名聊天"的应用 | 树洞 / `confessions.js` 是匿名 UGC → **必须让审核看得见审核机制**（管理后台可展示） |
| **4.8 第三方登录** | **不适用**：规定明确豁免"仅使用自家账号与登录体系"的应用 | 用户名密码 + 自建 JWT ✅ 无需 Sign in with Apple |
| **3.1.1 / 3.1.3(e)** | 线下消费的实物/服务**必须使用非 IAP 支付方式** | 学生二手**线下交易 → 无需 IAP，且用 IAP 反而违规**。⚠️ 未来若加"付费置顶/推广"则**必须转 IAP**（3.1.3(g)） |
| **2.5.1** | 只能用公开 API，且必须能运行在**当前在售 OS**（现为 iOS 27） | 不要用私有 API 或越狱/侧载手段 |
| **5.1.2 / ATT** | 跨公司追踪需 ATT 授权 | **无广告/归因 SDK ⇒ 不触发 ATT**；一旦引入广告 SDK 就必须加 `NSUserTrackingUsageDescription`，否则被拒 |
| 隐私清单 / 营养标签 | 隐私营养标签必填；Required Reason API 需在 privacy manifest 描述 | 用 Expo 的 `ios.privacyManifests` 配置 |

### 6.2 iOS 26「液态玻璃」——与本项目设计语言天然契合

- Apple 要求：上传 App Store Connect 的应用**必须用 Xcode 26+ 与 iOS 26 SDK 构建**，该规定**自 2026-04-28 起已生效**；下一个期限是 2027-04 的 iOS 27 SDK。图标改为**分层**、需提供 default / dark / clear / tinted 变体（用 Icon Composer 制作）。
- **Expo 侧已有官方支持**：`expo-glass-effect`（SDK 56）提供 `GlassView` / `GlassContainer`，底层就是 iOS 原生 `UIVisualEffectView`；参数含 `glassEffectStyle`（`regular` / `clear` / `none`）、`tintColor`、`isInteractive`、`colorScheme`。
- **限制**：`GlassView` **仅 iOS 26+ 有效，低版本自动回退为普通 `View`**；已知 bug——自身或父级 opacity 为 0 会让效果消失；需用 `isLiquidGlassAvailable()` / `isGlassEffectAPIAvailable()` 做守卫。
- **建议**：保留 `expo-blur` 作为 Android/旧 iOS 的降级路径，在 iOS 26+ 上用 `GlassView` 渲染 Tab 栏、导航与浮层；同时用 `ios.icon` 的 `{light, dark, tinted}` 提供分层图标。**投入极小、视觉收益极大，且正好是项目的"液态玻璃"设计体系。**
- 构建环境已满足：EAS 的 `sdk-56` 镜像自带 **Xcode 26.4 / macOS 26.4**，不会卡在 SDK 强制要求上。

### 6.3 在 Expo SDK 56 里加原生代码（"一点点 iOS 原生"的正确做法）

| 需求 | 做法 |
|---|---|
| 只改 Info.plist / 构建配置 | **config plugin** |
| 新系统能力（Live Activity、扩展、Spotlight） | 先找官方模块；没有就 **config plugin + 本地 Expo Module（Swift）** |
| 需要原生模块时 | 必须用 **development build**（`expo-dev-client`）——Expo Go 无法加载原生模块 |
| 何时需要 prebuild | 加原生库、改 app config、升级 SDK 后需 `npx expo prebuild --clean`；EAS 在 `ios/` 缺失时自动 prebuild |
| **铁律** | **绝不手改 `ios/` 目录**——一旦裸工程化，CNG/OTA 与升级成本失控 |

### 6.4 原生增强排序（按"性价比"）

| 优先级 | 特性 | 官方支持 | 说明 |
|---|---|---|---|
| **#1** | **Widgets + Live Activities** | ✅ **`expo-widgets`（SDK 56，BETA，iOS-only）**，`createWidget` / `createLiveActivity` | **全程无需写原生代码**。落地场景：课程表"下一节课"、二手消息 Live Activity |
| **#2** | **液态玻璃 UI + 分层图标** | ✅ `expo-glass-effect` + `ios.icon` | 近乎零成本，直击品牌设计语言 |
| **#3** | 触感反馈 | ✅ `expo-haptics`（Expo Go 内可用） | 数小时工作量，"iOS 手感"提升明显 |
| **#4** | SwiftUI 原生控件 + SF Symbols | ✅ `@expo/ui`（SDK 56）：SwiftUI `List/Form/Menu/Picker/Toggle/ContextMenu`，通用 `Icon` 在 iOS 走 SF Symbol | 单位时间内"原生感"收益最高 |
| #5 | MapKit 校园地图 | ✅ `expo-maps`（**ALPHA**，会破坏性变更） | 建议**商店过审之后**再做 |
| #6 | 分享扩展 / Core Spotlight | 社区 `@bacons/apple-targets` | 锦上添花 |
| — | 富推送（Notification Service Extension） | ❌ **Expo 无官方支持** | 跳过 |
| — | App Intents / Siri、App Clip、CallKit | v56 无官方模块 / 限制多 | **v1 全部跳过** |

### 6.5 TestFlight 与上架关键路径

- Apple Developer Program **US$99/年**；**个人**注册只需姓名/邮箱/电话/地址；**组织**注册需法人实体 + **D-U-N-S**（"allow up to 5 business days"，Apple 接收再 "up to 2 business days"），还需域名邮箱与可用网站。教育机构可申请费用豁免。
- **审核者 demo 账号是强制的**（"provide either an active demo account or fully-featured demo mode"）——我们是登录墙应用，必须准备。
- 年龄分级启用新档位（新增 13+ / 16+ / 18+），且**新增"社交媒体"问题**（是否通过社交信息流分发/放大/互动 UGC），**2026-09 起提交时必须回答** → 会显著影响本项目定级与目标受众。
- 首次审核：官方称 **90% 的提交在 24 小时内审完**；被拒后补正通常再加 1–3 天。
- TestFlight：内部最多 100 人 / 外部最多 10,000 人，构建有效期 90 天；**首个构建进入测试组前要过 beta 审核**。
- **最短路径：约 11–16 天**（D0 个人注册 → D1–3 建 app 记录与 bundle ID、EAS dev build → D2–6 补齐注销 / 举报 / 屏蔽 / 隐私政策 → D4–7 隐私标签、年龄分级、截图、demo 账号 → D7 上传并过 beta 审核 ~24h → D8 测试者安装）。**建议按 3 周预算。**

### 6.6 iOS 侧的阻塞与难点

1. **账号注销（5.1.1(v)）——一定被拒**，且"删除 UGC"这一条使其成为**后端改造**，不是加个设置项。
2. **UGC 合规证据**：每个 UGC 界面都要能触达举报/屏蔽，并有审核响应机制与公开联系方式。
3. **匿名树洞的观感问题**：1.2 明令排除"匿名聊天"类应用 → 必须让过滤与审核可见。
4. 年龄分级新增的社媒问题会影响面向学生群体的定级。
5. **Xcode 26 SDK 强制已生效**：本地用旧 Xcode 构建会在上传时被拒（EAS `sdk-56` 正常）。
6. **iOS 无法侧载**：没有付费账号就没有 TestFlight，测试链路比 Android 更长。
7. 整体上 **iOS 门槛高于 Android**：UGC/注销审核更严，且 Apple 明确重视界面精致度——这对纯 `StyleSheet.create` 代码库是一份额外要求。

> **给"苹果那边加上一点 iOS 原生"的直接答案**：按 **`expo-glass-effect`（液态玻璃 + 分层图标）→ `expo-widgets`（课程表 Widget / Live Activity）→ `expo-haptics` → `@expo/ui`（SwiftUI 控件 + SF Symbols）** 的顺序做，全部是官方模块、零原生代码、不需要裸工程化。**不要**为了 App Clip / App Intents / CallKit 去动原生工程。

## 7. 1 个月行动计划

**核心调度原则（最省时间的一条）**：**不要在全部功能做完后才启动 14 天封闭测试。** Google 只要求 12 名测试者**连续 opt-in 14 天**，不要求版本冻结。所以只要满足合规门槛（条款接受 / 举报 / 屏蔽 / 注销 / 隐私政策 / Data safety），就在 **T3 上传第一个版本并一次性邀请 15–20 人开始计时**，14 天窗口内继续开发、持续推更新，计时不重置。

### 前置决策（T0 之前必须回答）

| # | 决策 | 影响 |
|---|---|---|
| D1 | Play 账号是**个人**还是**组织**？ | 个人 = 必须 12×14 天；组织 = 强制 D-U-N-S。**先查主体是否已有 D-U-N-S** |
| D2 | **"屏蔽用户"是否允许改后端？** | 若坚持"后端零改动"，则只能复用现有管理员 ban/mute，**可能不满足 UGC 政策**，需承担首次审核被拒风险 |

### T0（今天）：并行启动不计入开发的两件长周期事项

1. 注册 Play Console（US$25）→ 完成**身份验证 + 设备验证**（非 root Android 10+ 真机 + Play Console App，约 1 分钟）。
2. 同时申请 **Apple Developer Program**（US$99/年，个人）——审核排队不等人，与 Play 并行。
3. 建应用、**锁定 `android.package`**（如 `com.xmumdorm.dorm`，此后不可改）。
4. 确认隐私政策 URL 可公开访问（`https://www.xmumdorm.com/privacy` 实测 HTTP 200；**建议再加一个静态 HTML 版本**，避免 SPA 客户端渲染导致抓取/审核歧义），并新增**注销说明页**（Play 要求"应用内入口 + 网页链接"）。

### T1–T3：只做发布阻塞项（约 3–4 天）

按 §1.2 与 §4.2 逐条收口：`android.package` / `ios.bundleIdentifier` / 版本号策略、去除 `NSAllowsArbitraryLoads`、`blockedPermissions: ['android.permission.RECORD_AUDIO']`、`eas.json` + `eas init` + Google Service Account key、API 地址切生产（按 EAS profile 注入）、**注销入口 / 隐私政策页 / 条款接受勾选 / 屏蔽用户**、Sentry、清理 `app_bak` 与重复 config。
收口前跑一遍 `npx expo prebuild --clean` 确认原生工程能生成（这是 EAS 构建真正要做的事）。

### T3：启动 14 天计时

出生产 AAB（`targetSdkVersion 36`）→ 上传**封闭测试**（自动配置 Play App Signing）→ **一次性邀请 15–20 名测试者**（缓冲 opt-out 风险）→ 完成 App content 全部声明（含**审核者可用的测试账号**、目标受众 18+、Data safety、内容分级、广告=无）。

### T4–T17：14 天窗口内并行

- 真机端到端冒烟：登录 → 树洞 → 发帖 → 食堂 → 广场 → 二手 → 我的。
- **iOS 侧**：TestFlight（见 §6）；UGC 合规改动两端共用，不要重复做。
- 清掉 `npx tsc --noEmit` 的 93 个错误（当前 CI 若加 type-check 会红；Metro 不受影响）。
- 补 Maestro 冒烟 + CI（抄 obytes 的 workflow）。
- 商店素材：手机截图 ≥2 张（建议 6–8 张）、feature graphic、短/长描述、图标。

### T15–T30：审核与上线

T15 申请生产访问 → T15–T22 生产访问审核（≤7 天）→ 首次生产发布（数小时–7 天，**首发不支持分阶段发布**）→ **T22–T30 上线**。

### 明确不要做的事

| 不要 | 原因 |
|---|---|
| 换基座 / 引入 NativeWind 模板 | §2、§3：丢掉 1 万行已验证代码，且违反宪法 |
| 加短信/通话记录等高危权限 | 触发 Permissions Declaration，审核"可能长达数周" |
| 首发用分阶段发布 | 首次发布不支持，只能全量 |
| 加广告 | 多一项声明与合规负担，与 1 个月目标无益 |
| 以为组织账号能绕开 14 天就是净赚 | D-U-N-S + 组织验证通常更慢 |
| 为了"iOS 原生"破坏 managed workflow | 一旦裸工程化，OTA 与升级成本失控；优先用 config plugin + dev client |

---

## 附录：证据来源

**本地实测**
- `npx jest --silent --runInBand`（`mobile/`）→ 20 suites / 417 tests passed / 4.74s
- `npx tsc --noEmit`（`mobile/`）→ 93 errors / 30 files
- `npx expo config --type public`（`mobile/`）→ sdkVersion 56.0.0；`android` 段无 `package`；`permissions: ['android.permission.RECORD_AUDIO']`
- 文件：`mobile/app.json`、`mobile/src/api/config.js`、`shared/api/config.js`、`mobile/app/(tabs)/square.tsx`

**外部**
- GitHub REST API：`api.github.com/repos/<owner>/<repo>`（stars / license / pushed_at / archived / is_template）
- 仓库原文：`raw.githubusercontent.com/<owner>/<repo>/HEAD/{README.md,package.json,app.json,eas.json}`
- `https://www.xmumdorm.com/privacy` → HTTP 200
- `https://xmumdorm-200-lyzz-production.up.railway.app/api/health` → Express 404（服务存活）

**Google Play（一手）**
- 封闭测试 / 生产访问：`support.google.com/googleplay/android-developer/answer/14151465`
- 注册与费用 / 设备验证：`/6112435`、`/14316361`
- 身份与 D-U-N-S：`/13628312`、`/10841920`、`/13634885`
- App content 声明：`/9859455`、`/10787469`、`/9859655`、`/13327111`、`/9867159`、`/9514050`
- UGC 政策：`/9876937`、`/12923286`
- 敏感权限：`/9214102`；地区/税务：`/9306917`、`/6223646`
- target API：`developer.android.com/google/play/requirements/target-sdk`；16 KB：`developer.android.com/guide/practices/page-sizes`；AAB：`developer.android.com/guide/app-bundle`；RN 0.77 16 KB 支持：`reactnative.dev/blog/2025/01/21/version-0.77`

**Apple / Expo（一手）**
- 审核指南：`developer.apple.com/app-store/review/guidelines/`（1.2、3.1.1/3.1.3(e)(g)、4.8、5.1.1(v)、5.1.2、2.5.1/2.5.12/2.5.16）
- 账号注销政策：`developer.apple.com/support/offering-account-deletion-in-your-app/`
- SDK 强制要求：`developer.apple.com/news/upcoming-requirements/`；Liquid Glass：`developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass`
- TestFlight / 年龄分级 / 加密合规：`developer.apple.com/help/app-store-connect/...`
- Expo SDK 56 模块：`docs.expo.dev/versions/v56.0.0/sdk/{glass-effect,widgets,haptics,ui,maps,background-task,tracking-transparency,notifications}`
- Expo 发布链路：`docs.expo.dev/submit/android/`、`docs.expo.dev/build-reference/{app-versions,infrastructure}`、`docs.expo.dev/billing/plans/`、`docs.expo.dev/config-plugins/introduction/`、`docs.expo.dev/workflow/continuous-native-generation/`

**未验证项**
- **Google Play Console 账号类型（个人 / 组织）与是否已注册** —— 无法从仓库判断，但它是决定工期的第一变量（§5.1）。
- 三个候选仓库的真实用户量（stars/forks 是唯一代理，且都无有效用户基础）
- `create-expo-stack` 实际生成产物（读的是 EJS 模板，未真跑生成）
- 各模板 `submit` 段能否不加修改地用于你的 EAS 账号
- NativeShad 的 GitHub `stats/commit_activity` 返回 HTTP 202 `{}`，故改用 52 周 `stats/participation` 与提交列表，其周对齐未独立核对
- **Expo SDK 56 的 `targetSdkVersion` 默认值**：未找到一手声明，故建议用 `expo-build-properties` 显式固定 36（§5.2）
- Permissions Declaration 对 photo/media 与 `POST_NOTIFICATIONS` 的具体口径（Play 政策页当日无法抓取）
- 12×14 封闭测试是否存在豁免/困难通道（现行文档未记载任何路径）
- Apple 新年龄分级对本项目问卷答案的具体档位
- 社区原生扩展（`@bacons/apple-targets` 等）的最近发布与维护状态（npmjs.com 返回 403）
- 是否存在官方 CallKit Expo 模块（由 SDK 页面清单推断，非明文声明）
