# P1-13 · token 供给与登录最小链路

**日期**：2026-10-02　**版本**：v1.0
**依赖**：P1-01（`@/shared/api` 注入接缝）· P1-02（落盘层）· P1-04/P1-05/P1-07（`Input`/`Button`/`ErrorSummary`/`Screen`）
**写作用域**：`app/src/features/auth/**` · `app/src/app/**` · `app/jest.setup.js` · `shared/api/request.js` · `app/src/i18n/**`
**上游**：宪法 **4.1.2-2**（JWT 只进 `expo-secure-store`）· **10.4**（成功不弹对话框 / 一个错误一个主行动）· 任务包 README **§7-10**（本轮更正的上游口径）· `middleware/auth.js` · `middleware/checkSanction.js`

---

## 1. ⚠️ 本轮更正的上游口径：不是"401 口径"，是**两个状态码**

任务名与文档一直写"401 口径"，**但后端实际用了两个**（读 `middleware/auth.js` 确认）：

| 情形 | HTTP | 响应体 |
|---|---|---|
| **没带令牌** | **401** | `{ status: -1, message: '未提供身份验证令牌，请先登录' }` |
| **令牌无效 / 已过期** | **403** | `{ status: -1, message: '身份验证令牌无效或已过期，请重新登录' }` |

而 **403 还被 `checkSanction` 用来表示"被封禁 / 被禁言"**，两者**只靠响应体的
`banned` / `muted` 标记区分**（`middleware/checkSanction.js`）。

于是只有两个坏选择：
- 只处理 401 → **令牌过期永远不会触发重新登录**（用户一直看到普通错误）；
- 把 403 一律当过期 → **把封禁伪装成"登录过期"，静默把用户登出**。

**先修了根因**：`shared/api/request.js` 抛错时**把响应体丢掉了**，App 拿不到那两个标记。
→ 独立提交 **`83f2a6a`** `fix(shared): 请求错误对象带上响应体`（纯新增字段，Web 零变化）。

---

## 2. 交付物

| 文件 | 内容 |
|---|---|
| `features/auth/tokenStore.ts` | `expo-secure-store` 封装 + **内存镜像**（请求层要同步读） |
| `features/auth/authFailure.ts` | **纯函数**：`classifyAuthFailure` / `isSessionInvalid` / `authFailureToAppError` |
| `features/auth/session.tsx` | `sessionReducer`（状态机）+ `SessionProvider` + `useSession` |
| `app/login.tsx` | 登录页（**最小链路**，⛔ 不是 `P15` 原型） |
| `app/_layout.tsx` | 挂 `SessionProvider` + 注册 `login` 路由 |
| `jest.setup.js` | `expo-secure-store` 的内存替身（该包**没有**官方 mock） |
| `i18n/{zh,en}.ts` | 新增 `auth.*` 8 个词条 |

---

## 3. 实现要点

### 3-1 令牌：**唯一的家是 `SecureStore`**，但请求层要同步读
`request.js` 读 token 是**同步**的（`getToken()`），而 SecureStore 只有异步 API。
所以：
- 真源在 SecureStore（宪法 4.1.2-2：⛔ 不进 AsyncStorage）；
- 另存一份**内存镜像**，由登录/登出/冷启动水合维护，`setTokenGetter(readTokenSync)` 注入给请求层；
- `saveToken` **先写镜像再写盘** —— 登录后的第一个请求必须立刻带上令牌；
- `clearToken` 也**先清镜像** —— ⛔ 不给"清了一半"的中间态。

降级：SecureStore 读/写失败一律当作"没有令牌"并**不抛**（否则根布局启动即白屏）。

### 3-2 会话状态机（纯函数）
```
restoring ──有令牌──▶ signedIn        signedIn ──401/403(令牌)──▶ expired（令牌已清）
          └─无令牌──▶ signedOut       signedIn ──logout─────────▶ signedOut
signedOut ──login 成功──▶ signedIn     expired  ──login 成功──▶ signedIn
```
⛔ **被封禁 / 被禁言不进 `expired`**：令牌仍然有效（只是不能发内容），
把人登出等于把"被处罚"伪装成"登录过期"，用户连"为什么被封"都看不到。
用例专门断言：`handleAuthFailure({status:403, body:{banned:true}})` 返回 `permission`
且**令牌仍在**。

### 3-3 冷启动只水合、不校验
水合只决定"有没有令牌"（→ `signedIn`/`signedOut`），**不发起校验请求**：
有效性交给第一次真实请求的 401/403。这样冷启动不会因为后端慢而卡住首页。

### 3-4 登出要**清落盘命名空间**
`clearToken()` + `clearNamespace()`。后者是 P1-02 落盘层注释里就写明的用途
（"登出时调用"）；⛔ 不清的话，下一个账号会看到上一个账号的**草稿与缓存**。

### 3-5 登录页是"最小链路"，⛔ 不是 `P15` 原型
`P15`（品牌头 + 表单卡 + 验证码倒计时 + 条款链接）不在本包四个骨架里，属后续任务。
本页只做：两个字段 + 提交 + 就近校验 + 失败走 `K04` 三段文案 + 成功直接离开
（⛔ 不弹成功对话框，宪法 10.4）。
⚠️ **登录接口的"凭据不对"是 200 + `message`**（`requestRaw` 不抛）→ 按 `badCredentials` 处理，
映射为 `validation`（"这一项填错了"）而**不是** `permission`（否则文案会变成"切换账号"）。

### 3-6 新增一条依赖层面的记录
`expo-secure-store@57.0.4` **没有自带 jest mock**（目录里无任何 `*mock*` 文件）。
这是**唯一**一个我们自写替身的依赖，已登记进依赖准入登记 §3 #12。

---

## 4. 测试用例

> **8 个编号 / 33 条断言**（自动化）+ 1 条真机人工。

| 编号 | 类型 | 用例 | 结果 |
|---|---|---|---|
| **TC-P1-13-1A** | 自动 | 4 个文件齐备；⛔ `tokenStore` 不 import AsyncStorage 落盘层（**剥注释后**判）；SecureStore key 字符合法 | ✅ |
| **TC-P1-13-2A** | 自动 | save → 镜像**立刻**同步可读 → 再 hydrate 仍读得到（真落盘）；clear 双清；SecureStore 抛错时降级不抛 | ✅ |
| **TC-P1-13-3A** | 自动 | 口径：401(request)=noToken / 401(login)=badCredentials / 403 无标记=expiredToken / **403+banned·muted=sanctioned** / 其它=other | ✅ |
| **TC-P1-13-4A** | 自动 | `isSessionInvalid`：会话两类为真、**sanctioned 为假**；错误映射（会话→`permission`、凭据→`validation`） | ✅ |
| **TC-P1-13-5A** | 自动 | 状态机四态转移 | ✅ |
| **TC-P1-13-6A** | 自动 | 集成：有/无令牌冷启动；登录成功令牌落盘**且请求层同步可见**；登录失败不写令牌；**被封禁不清令牌**；令牌类 403 → 清令牌 + `expired`；登出清令牌**且清落盘命名空间**；无 Provider 直接抛 | ✅ 7 条断言 |
| **TC-P1-13-7A** | 自动 | 登录页：字段与按钮；空学号**不调接口**就近报错；成功落盘并离开（⛔ 不弹对话框）；失败出 `K04` 摘要 | ✅ 4 条断言 |
| **TC-P1-13-8A** | 自动 | 根布局挂了 Provider 与路由；feature 层去注释后 0 处中文字面量；0 hex/字号/浮层；复用 `@/shared/api` 注入接缝（⛔ 不新建第二套鉴权） | ✅ |
| **TC-P1-13-1M** | 人工 | 真机：冷启动带令牌直接进首页、令牌过期后**下一次请求**是否真的把人送回登录、被封禁账号提示是否说的是"封禁"而不是"登录过期"、登出后草稿确实消失 | ⏳ 待真机 |

---

## 5. 验收标准与证据

| # | 判据 | 结果 |
|---|---|---|
| A1 | `npx tsc --noEmit` exit 0 | ✅ |
| A2 | `npx jest --ci`（App）0 failed | ✅ **26 suites / 749 tests**（716 → 749，本任务 +33） |
| A3 | 仓库根 `npx jest __tests__` 0 failed（`shared/` 改动无回归） | ✅ 46 suites / 668 tests |
| A4 | 四把尺子 exit 0 | ✅ `宪法级违规：无` |
| A5 | `npx expo export --platform android --no-bytecode` exit 0 | ✅ |
| A6 | 上游口径错误已登记并更正 | ✅ README §7-10；`shared` 修复独立提交 `83f2a6a` |

---

## 6. 风险与降级

| 风险 | 触发 | 处置 |
|---|---|---|
| `signedIn` 只是"有令牌"，不代表令牌有效 | 令牌在别处被吊销 | 第一次请求会拿到 403 → `handleAuthFailure` 自动清令牌并置 `expired`；⛔ 不在冷启动主动打校验请求（会让首页等后端） |
| 页面**忘记**调用 `handleAuthFailure` | 某个 query 的 catch 里直接渲染了错误 | 约定：所有受保护请求的错误都过 `useSession().handleAuthFailure`（切片任务 P1-14…17 里接）；后续可在 queryClient 的全局 `onError` 里兜底 |
| 内存镜像与落盘不一致 | 两个进程/两次快速登录 | 以内存镜像为准（它决定"本次会话带什么令牌"）；冷启动重新水合 |
| `session:expired` 后的**跳转** | 现在只置状态、不强制跳登录页 | 属 UX 口径（Phase 2 逐页）；骨架已提供 `status`，页面据此决定显示"会话已过期 + 去登录"的 `O02 InlineNotice` |

---

## 7. 执行记录

| 项 | 内容 |
|---|---|
| 状态 | ✅ 完成（2026-10-02） |
| 提交 | P1-13 主体见 `git log --grep "P1-13"`；**独立修复** `83f2a6a`（`shared` 抛错带响应体） |
| 机器证据 | App tsc 0 · 26 suites / 749 tests · rulers exit 0（宪法级违规：无）· expo export exit 0；根 jest 668 passed |
| 遗留 | ① **TC-P1-13-1M 待真机**；② `P15` 完整鉴权原型（注册/找回密码/验证码倒计时/条款）属后续任务；③ 会话失效后的跳转口径属 Phase 2 逐页 |

---

## 8. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立并完成：令牌进 SecureStore + 内存镜像注入请求层；**401/403 双状态码口径**（含"被封禁不清令牌"）；会话状态机 + 水合/登录/失效/登出；登录最小链路；给 `shared/api/request.js` 补 `err.body`（独立提交）；登记 `expo-secure-store` 无官方 jest mock |
