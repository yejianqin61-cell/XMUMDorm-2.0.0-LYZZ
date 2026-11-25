# 校方系统 WebView 评估 + UI/UX 改进方向

**日期**：2026-11-14　**性质**：evaluation 层（实测结论 + 设计提案；提案部分需所有者拍板后才进 task 层）
**实测环境**：本机在**校内网络**（三域名均解析到 `10.68.x.x`）· AVD `Pixel_API35`（Android 15，WebView 新）+ `Pixel_7haha`（**Android 13**，WebView 155）· api=local（本机后端连生产库）· 未登录状态 · 深色主题
**证据**：`app/.preview/shots/`（`ux-system-*.png`、`a13-*.png`、`smoke-*.png`），`openssl s_client`、页面源码与前端 bundle 静态分析

---

## 第一部分 · 三个校方系统的 WebView 评估

### 1.1 一览

| | AC（课表来源） | Moodle | 签到 |
|---|---|---|---|
| 域名 | `ac.xmu.edu.my` | `l.xmu.edu.my` | `acad.xmu.edu.my/mobile` → 跳 `cas.xmu.edu.my` |
| 证书 | ZeroSSL ECC（**90 天短证书**，到期 2026-12-24），链完整 | Sectigo `*.xmu.edu.my`，**链缺交叉证书** ⛔ | Sectigo `*.xmu.edu.my`，链完整 |
| Android 13 实测 | 正常 | **⛔ 打不开：`SSL error: The certificate authority is not trusted`**（net_error −202） | 正常（首屏白 5–10 秒） |
| 登录方式 | 学号+密码，表单 `autocomplete="off"` | Moodle 自有登录页（无 SSO 按钮） | **CAS 统一认证**（有 Remember Me；登录接口有验证码字段） |
| 会话载体 | PHP 会话 cookie | `MoodleSession` 会话 cookie，**服务器闲置超时 3600 秒** | CAS 票据 cookie + 业务 token 存在 **`sessionStorage`** ⛔ |
| 页面形态 | **桌面页**，无 viewport meta，字很小 | 响应式 | 移动端 SPA（umi） |

### 1.2 问题清单（按严重度）

**W-1 ⛔ Moodle 在 Android ≤13 整个打不开（已实测）**
- 原因：`l.xmu.edu.my` 只发了 `叶子 → R36 中间证书`，**没发** `R46 ← USERTrust RSA` 的交叉证书。`acad` 和 `cas` 发了，所以它们没事。
- Android 13 系统信任库里**没有** Sectigo R46/E46 根（实测 `/system/etc/security/cacerts` 无 `3afde786.0`/`e071171e.0`）；Android 14+ 的 Conscrypt APEX 才有。
- Chrome 浏览器自带根库所以学生用 Chrome 打开是好的——**"浏览器能开、我们 App 不能开"**，最伤口碑的一种故障。马来西亚学生手里 Android 12/13 的中端机比例不低。
- 修法（二选一，建议都做）：
  1. **根治**：请校方 IT 在 Moodle 服务器的证书链里补上交叉证书（与 acad/cas 同配置），一行配置的事。
  2. **App 侧兜底**：加 `network_security_config.xml`，仅对 `xmu.edu.my` 域把 **Sectigo R46 根**（公开根证书）加进 trust-anchors（`system` + 内置 R46）。⚠ 只"多信一个公开根"，⛔ 绝不做 `onReceivedSslError → proceed()`。要写 config plugin（CNG，不能手改 `android/`），改完要在 Android 13 AVD 上复测确认 WebView 认这份配置。

**W-2 ⛔ 加载失败时显示 RN WebView 的默认错误页（已实测）**
- 画面是 `Error loading page / Domain: undefined / Error Code: 3 / Description: SSL error…`——技术性文案，违反宪法 10.4「可感知/可理解/可改正」。
- AC、签到的 `onError` 没接任何回调，失败就是白屏或这页英文。
- 修法：`renderError` 换成设计系统的 `ErrorState`，按错误类型给三种文案：**证书**（"学校网站证书不被本机信任" + 用浏览器打开）、**不可达**（"只能在校园网内访问" + 重试）、**超时**（重试）。

**W-3 ⛔ 签到系统每次关页面都要重新登录（静态分析，需真机账号复核）**
- 签到前端把登录态 `userLogin`（含 `tokenId`）和 `currentUser` 存在 **`sessionStorage`**；WebView 随页面卸载销毁，`sessionStorage` 跟着没。
- 结果：用户最高频的动作——**上课前点开签到**——每次都要走 CAS。如果 CAS 的 Remember Me cookie 是持久的，可以自动跳回；不是的话就要输学号、密码，可能还有验证码。工具 Tab "会话记忆"的承诺在这一格上**不成立**。
- 修法（按代价从低到高）：
  1. 先实测 CAS 勾选 Remember Me 后，杀进程重开能不能免密跳回（`devicectl` 可做，需要所有者本人的校园账号**在场**操作，⛔ 不由 agent 持有）。
  2. **WebView 常驻**：签到页不随页面卸载销毁（放在 Tools 栈底常驻，或做成全局隐藏宿主，同 Moodle 的 `WorkspaceHost` 思路），至少保证同一次 App 运行内不重登。
  3. ⛔ 不做：把 token 从 sessionStorage 抄到 localStorage——这属于"读/存校方凭据"，触碰 `SchoolSystemWebView.tsx` 头注释的红线。

**W-4 ⚠ "会话默认持久"的前提在三个系统上都不完全成立**
- `SchoolSystemWebView.tsx` 头注释写的是"会话默认就是持久的"。实际上三家用的都是**会话 cookie**（无 Expires），再加 Moodle 服务器**闲置 1 小时**就过期。
- Android WebView 杀进程后是否保留会话 cookie 要真机验证；即使保留，Moodle 一小时闲置也会把人踢回登录页。
- 好的一面：Moodle 已经有"原生工作区 + 本地快照"，离线也能看截止时间——**这才是正确方向**：把"会话记忆"改成"数据记忆"。
- 建议：R3 结论补一条实测——三系统各"登录 → 杀进程 → 1 分钟 / 1 小时 / 1 天后重开"，记录是否免登。

**W-5 ⚠ 密码管理器 / 自动填充基本用不上**
- AC 两个输入框都是 `autocomplete="off"`；WebView 里 Google 密码管理器的保存/填充体验本来就弱。
- 学生每次都要手输学号+密码。**这是"登录限制"里对体验影响最大的一条**，比证书更常见。
- 可做：确认 WebView 自动填充没被关（Android 8+ Autofill Framework 对 WebView 有效）；在登录页上方放一条原生提示"可用系统密码管理器保存"——⛔ 但 App 自己**不存**密码。

**W-6 ⚠ AC 是桌面页**
- 无 viewport meta，页面按 980px 宽渲染，表单字号约 9pt，触控目标远小于 44pt。
- 修法：允许双指缩放（确认 `setBuiltInZoomControls` 生效）；"读取本页课表"之后尽快把用户带回原生课表，**让用户在 AC 里停留的时间最短**。
- 可选：注入一段只改样式的 CSS（加 viewport、放大输入框）——不动表单行为，不违反宪法 4.1.2-4，但要所有者确认这算不算"改校方页面"。

**W-7 ⚠ 签到页的 `window.open` / 微信 JS-SDK**
- 签到前端用 `window.open` 打开附件预览（`/onlinePreview?url=`），RN WebView 默认会把新窗口交给**系统浏览器**，那边没有登录态 → 又是登录墙。
- 签到前端有 `wx.scanQRCode`（微信扫一扫），只在微信内可用；我们 WebView 里点"扫码"会没反应。主路径看起来是**签到码**（老师投屏、自动刷新），扫码不是必需，但要实测确认。
- 修法：接 `onOpenWindow`，同源（`*.xmu.edu.my`）在当前 WebView 内打开，外域才交给系统浏览器。

**W-8 ⚠ AC 证书是 90 天的 ZeroSSL**
- 校方续期一失败，AC 就会证书过期，课表导入整条链路断。App 侧没法修，但 W-2 的错误页要能把"证书过期"说清楚，不要让学生以为是我们 App 坏了。

**W-9 ℹ 校外不可达**
- 已知限制（R3 D-08）。但 App 里目前没有任何地方告诉用户"要连校园网"。工具 Tab 三张卡片应该在**打开前**就说明，而不是打开后白屏。

### 1.3 做得好的地方（保留）
- 域名不写 IP、强制 HTTPS 的不变量（`assertDomainOnly`）。
- Google SSO 防御分支（嵌入式 UA 禁做 OAuth）的判断是对的。
- 会话三态只看"页面上有没有密码框"，不猜 URL——稳。
- Moodle 的身份确认 + 代际（generation）+ 同源校验做得很严，跨账号串数据的风险控制到位。
- 不读、不存、不传校方凭据的红线清晰。

### 1.4 处置记录（2026-11-14）

| 项 | 状态 | 做了什么 | 证据 |
|---|---|---|---|
| W-1 | ✅ App 侧已修；校方 IT 补链仍建议做 | config plugin [`app/plugins/withSchoolNetworkSecurity.js`](../../../app/plugins/withSchoolNetworkSecurity.js)：仅对 `xmu.edu.my` 在系统根之外补信 Sectigo R46/E46 公开根（取自 Android 15 系统信任库，指纹见 `app/plugins/certs/README.md`）；正式包禁明文，debug 覆盖放明文（Metro） | Android 13 AVD：修前 `net_error -202` + 默认错误页 → 修后 Moodle 首页正常加载、logcat 无握手错误；AC / 签到不受影响；Android 15 `smoke` 通过 |
| W-2 | ✅ | `SchoolSystemWebView` 接 `renderError` → 设计系统 `ErrorState`；新增错误种类 `certificate`（主行动「打开浏览器访问」）；`webViewError.ts` 把 Android/iOS 错误码分成 证书 / 无网络 / 超时 / 不可达 | Android 15 断网打开 AC → 显示「No connection · AC System · Turn on network, then retry」，不再露出 `Error Code` |
| 附带 | ✅ | AC 自动读表在登录页/错误页报「没读到课表」的误报：只在用户亲手点读表时才报空 | — |
| 附带 | ✅ | `devicectl metro` 去掉 `CI=1`（它会关掉 Metro 文件监听，改代码不热更新）；`devicectl build` 在 app.json / plugins 变化时先 `expo prebuild`（否则 config plugin 不生效） | — |
| W-3…W-9 | ⏳ 未动 | 需所有者账号在场实测后再定 | — |

测试：`p3w1-school-webview-cert.test.tsx`（16 例：插件挂载、只对校方域补根、不信任用户 CA、不放行证书错、错误分类 11 例、错误页两种主行动）；全量 2083 通过。

### 1.5 建议的执行顺序
1. **W-1**（发邮件给校方 IT + 写 NSC config plugin）—— 影响最大、修起来最便宜
2. **W-2** 自定义错误页
3. **W-3 / W-4** 用所有者本人账号在场做一次会话持久性实测，再决定签到 WebView 是否常驻
4. W-7 `onOpenWindow`、W-6 缩放、W-9 校园网提示

---

## 第二部分 · UI/UX 改进方向（设计提案）

> 以下基于本次截图与宪法 v1.4 的既定方向（苹果的舒适感 + Discord 的社区感 + 一点 Neo-Brutalism；暗色优先）。是**方向**，不是已定方案。

### 2.1 现在最伤的五件事（截图里直接可见）

| # | 问题 | 位置 | 为什么伤 |
|---|---|---|---|
| U-1 | **"Not allowed / needs a  account / Switch account, then retry"** | 广场·Today、工具·今日课表、今日待办 | 未登录被当成"权限不足"（401 映射成 `permission`，`{action}` `{role}` 为空）。新用户第一屏就是两把红锁，按钮还叫"切换账号"——用户根本没账号 |
| U-2 | 工具 Tab 首屏两个大块错误态，**真正的主功能（三个校方系统）被挤到折叠线以下** | 工具 | 宪法定义"工具 Tab = 本 App 最主要功能入口"，但首屏看不到入口 |
| U-3 | 一进课表**立刻弹系统通知授权** | `/tools/timetable` | 没有上下文的权限请求，拒绝率最高，而且 Android 上拒两次就再也弹不出 |
| U-4 | 校方系统页**双层标题**：「Tools」大标题 + 「AC Syst…」二级标题 + 内嵌页自己的标题条 | `/system/*` | 三层头部吃掉约 1/6 屏；系统名被截断；"Read timetable on this page"文案超出宪法 10.5 的 ≤6 汉字 |
| U-5 | 每次启动都有 LogBox 黄条 + 新装就提示"会话过期" | 全局 | 开发期噪音，但"会话过期"会出现在正式包里 |

### 2.2 设计主张：从"入口集合"变成"今天要做什么"

学生每天打开 App 只为三件事：**下一节课在哪、什么作业快截止、现在要不要签到**。竞品够不到的正是这个。所以建议把"今日"做成一条**时间轴**，校方系统退到"去处理"的位置：

```
┌───────────────────────────────┐
│ 周四 11月14日 · 第 7 周          │  ← 一行，替代 "Today's schedule" 大标题
├───────────────────────────────┤
│ ● 现在   10:00  CS201  A3-204   │  ← 进行中：品牌黄左边条（Neo-Brutalism 限定用法）
│          [ 签到 ]  ← 课程开始前后 15 分钟才出现
│ ○ 下一节 14:00  MA102  B1-101   │
│ ⚑ 今晚   23:59  CS201 Lab 3 截止 │  ← 来自 Moodle 快照
│ ✓ 待办   取快递                  │
└───────────────────────────────┘
```

- **签到按钮按时间出现**：课程开始前后的窗口内，课表卡片上直接给「签到」→ 打开签到 WebView。这比让学生自己去工具 Tab 找快一步，也是真正的"刚需闭环"。⛔ 仍然不自动签到，只是把入口放在对的时间。
- **Moodle 截止跟课表合并**，不再是单独的 "Moodle due" 区块。
- **未登录时**这条时间轴照样能用：课表和 Moodle 快照都在本地。只有发布/私信这类社区功能才需要我们的账号。→ 直接解决 U-1。

### 2.3 逐项改法

**U-1 未登录 ≠ 无权限**
- 401 → 新状态 `signedOut`：灰色插画（⛔ 不用红色锁，红色留给真正的错误），文案「登录后同步」，按钮「去登录」。
- 403 才是「无权限」，且必须带上具体角色。
- 课表/待办这类**本地优先**的数据，未登录时直接展示本地内容，不出空态。
- 根因在 `features/campus/campusModel.ts:87`、`features/clubs/ClubScreens.tsx:42` 一类把 401 和 403 合并的映射——建议收口到一个 `classifyHttpError`，全局一改全改（符合设计哲学主线）。

**U-2 工具 Tab 重排**
- 首屏顺序：**三个校方系统卡片（带会话状态点：绿=已登录 / 灰=未登录 / 黄=已过期）** → 今日课表摘要 → 放假日 → 待办。
- 卡片上直接写状态：「已登录 · 3 分钟前」「需校园网」。打开前就设好预期（W-9）。

**U-3 通知授权改为"先说明、后弹窗"**
- 课表页首次进入不弹。在用户**第一次导入课表成功**后，给一张原生卡片：「上课前 10 分钟提醒你？」→ 点「好」才调系统授权。
- 拒绝后在设置里留一个开关，跳系统设置。

**U-4 校方系统页"沉浸式"头部**
- 去掉「Tools」大标题，只留一行 48dp 工具条：`✕  AC 系统  ·  ⟳  ⋯`。
- 「读取本页课表」改成工具条右侧图标按钮 + 课表页被检测到时才出现的底部浮条「发现课表 → 导入」（读表脚本已经在 `onLoadEnd` 自动跑，按钮可以变成被动提示）。
- `⋯` 菜单放：用浏览器打开、清除此系统会话、帮助（校园网说明）。
- 进度条：顶部 2dp 品牌蓝加载条，替代现在的白屏等待（签到页首屏白 5–10 秒）。

**U-5 发布前清理**
- 「会话过期」只在"之前确实登录过"的设备上出现（同 `nextSchoolSessionState` 的思路，App 自己的账号也该这样判）。
- LogBox 警告逐个清掉；`devicectl smoke` 已能统计 ReactNativeJS 警告，可以把"0 警告"设为门槛。

### 2.4 视觉层面（宪法内的微调）

- **广场四宫格**：「Campus g…」「Marketpla…」被截断。宪法 10.5 已经要求 ≤6 汉字，英文也需要一份短词表（Guide / Market / Clubs / Schedule）。四个图标蓝黄交替，信息上没有意义，建议**统一一种填充色**，黄色只留给"有新东西"的角标——让黄色重新稀缺。
- **分区标题下的横线**：每个 Section 一条 1px 分隔线，加上大号粗体，首屏视觉噪音偏高。苹果式做法是**靠间距分组**，Neo-Brutalism 的粗线只留给一个最重要的区块（今日时间轴）。
- **"Campus assistant"条**：位置在宫格和二级 Tab 之间，优先级不清。如果它是 AI 助手，建议并入顶栏图标或今日时间轴末尾的「问一问」。
- **浅色内嵌页 vs 深色 App**：三个校方页都是亮色，打开时从深色 App 跳进大白屏很刺眼。可以在加载期间铺一层与内嵌页同色的背景，再淡入，减少"闪白"。

---

## 第三部分 · 本次未验证、需要补的

| 项 | 为什么没做 | 怎么补 |
|---|---|---|
| 登录后的会话持久性（W-3/W-4） | 没有校园账号；⛔ agent 不持有任何真实账号 | 所有者在场，用 `devicectl` 驱动、本人输入密码 |
| CAS 登录是否必出验证码 | 同上 | 同上 |
| NSC 方案在 Android 13 WebView 上是否生效 | 需要改 config plugin + 重建原生壳 | 立项后在 `Pixel_7haha`（API 33）复测 |
| 校外网络下的表现 | 本机在校内网 | 手机热点下复测一次 |
| iOS | 本机是 Windows | EAS / macOS |
