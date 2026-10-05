# P1-01 · 平台接线：让 App 消费仓库根 `shared/`

**日期**：2026-10-02　**版本**：v1.1（v1.1 ＝ 实现期发现的两处修正，见 §9；v1.0 见 git 历史）
**依赖**：无（本包第一件事）
**写作用域**：`shared/api/**` · `app/jest.config.js` · `app/metro.config.js` · `app/src/shared/**` · `app/src/app/_layout.tsx` · [依赖准入登记](../../evaluation/App依赖准入登记.md)
**上游**：宪法 **9.6 / 9.7**（`shared/{api,constants,utils,config,query}` 是 App 与 Web **共用**的五个子目录，⛔ 不得 fork）· 宪法 3.4（依赖准入）· 生产计划 §3（两个纵向切片都建在 `shared/api` 直连之上）

---

## 1. 目标

让 App **能安全地 `import` 仓库根的 `shared/**`**，并且**Web 行为零变化**。

> **为什么这是第一件事**：两个纵向切片的每一个数据请求都要走 `shared/api/*`（Web 已实现、已上线，是唯一真源）。现在 App 一 import 就崩 —— 不是"可能崩"，是**已实测崩**（§2）。不先修它，P1-13…17 全部无从谈起。

---

## 2. 实测证据（**本任务的存在理由，非推测**）

| # | 断点 | 复现命令 | 实测结果 |
|---|---|---|---|
| **E1** | `shared/api/config.js:6` 用 **Vite 专有的 `import.meta.env`** | 在 `app/` 内用 jest 加载 `shared/api/config.js` | `TypeError: Cannot read properties of undefined (reading 'VITE_API_BASE_URL')` —— **模块初始化即抛**，任何 import 链都过不去 |
| **E2** | 根 `node_modules` **没有 `@babel/runtime`**（只有 `app/node_modules` 有），而 `shared/*.js` 经 **babel-jest** 编译后会 `require` 它 | 同上，加载 `shared/api/canteen.js` | `Cannot find module '@babel/runtime/helpers/interopRequireDefault' from '../shared/api/canteen.js'` |
| **E3** | `shared/api/request.js` 从 **`localStorage`** 取 token，且只判了 `typeof window` | 通读 + 实测 | RN 有 `window` 但**没有 `localStorage`** → 裸访问是 **ReferenceError**（不只是"取不到 token"） |
| **E4** | `API_BASE_URL` 是 **import 时求值** 的模块常量 | 设计推演 | 宿主注入发生在运行时 → **App 不能依赖这个常量**（v1.0 的用例写错了，见 §9） |

> **可参照的既有解法**：[`frontend/vite.config.js:32-36`](../../../frontend/vite.config.js) —— Web 用 `@shared` 别名指向 `../shared`，**并且显式把 `@tanstack/react-query` 也别名到 `frontend/node_modules`**。那是同一类"宿主工程要替 `shared/` 解析依赖"的问题，Web 已经踩过一次。

---

## 3. 交付物

| 文件 | 动作 | 说明 |
|---|---|---|
| `shared/api/platform.js` | **新增** | **运行时注入点**：`configureApi` / `resetApiConfiguration` / `getInjectedBaseUrl` / `readInjectedToken`。⛔ 里面 0 处平台判断（由 TC-P1-01-6A 守着） |
| `shared/api/config.js` | 改 | `import.meta.env` → `import.meta.env?.`（两处，E1）；`getUploadUrl()` 改为**注入优先**（否则 App 里图片是相对路径） |
| `shared/api/request.js` | 改 | 新增 `resolveBaseUrl()`（注入优先）；`getToken()` 注入优先 + **`localStorage` 空判**（E3） |
| `app/src/shared/api.ts` | **新增** | App 侧**唯一**接入点：`configureAppApi()`（幂等）/ `setTokenGetter()` / `unwrapArray()` |
| `app/jest.config.js` | 改 | `@babel/runtime/*` → `<rootDir>/node_modules/...`（E2） |
| `app/metro.config.js` | 改 | `resolver.extraNodeModules['@babel/runtime']` —— **防御性**（实测当前 Metro 并不需要它，见 §9-2） |
| `app/src/app/_layout.tsx` | 改 | 模块顶层调用一次 `configureAppApi()` |
| `app/src/__tests__/p1-01-shared-bridge.test.ts` | **新增** | 18 条断言（对应 9 个编号用例） |
| [依赖准入登记](../../evaluation/App依赖准入登记.md) | 改 | 追加"跨包解析"排查一节。⛔ 本任务**不新增 npm 依赖** |

---

## 4. 实现要点

### 4-1 用"注入"而不是"平台分支"
`shared/` 里**不得**出现任何平台判断。理由：那会让唯一真源长出平台分支，而每个新宿主都要改它。
正确形态：`platform.js` 只存"宿主告诉我的事实"，`config.js`/`request.js` 只读它。

### 4-2 `import.meta.env` 的守卫写法（**最容易写错的一行**）
`import.meta.env?.VITE_API_BASE_URL?.trim()` —— **两个 `?.` 都必需**：RN/Hermes 下 `import.meta.env` 是 `undefined`，裸成员访问会在**模块初始化**时抛。
⚠️ 必须同时保证 Vite 的静态替换仍生效 → **已实测**（§8 A5）。

### 4-3 跨包模块解析（E2）
- **jest**：`moduleNameMapper` 把 `@babel/runtime/*` 指到 app 自己的 `node_modules`（⛔ 不改根 `package.json`）→ **load-bearing**。
- **Metro**：`resolver.extraNodeModules` 同样指路 → 实测**当前不需要**，保留为防御（§9-2）。

### 4-4 token 的**同步**读取
`request.js` 的 `getToken()` 是同步的，而 App 的安全存储（`expo-secure-store`）是异步的
→ 注入的 `getToken` 必须读**内存镜像**，由 P1-13 在登录/登出/冷启动水合时写。
**三态语义**（这是本任务的核心设计点，写错会导致 App 去读不存在的 localStorage）：
| 返回值 | 含义 | 调用方行为 |
|---|---|---|
| `undefined` | **没注入** | 回落历史行为（Web 的 localStorage） |
| `null` | 注入了但当前无 token | ⛔ **不得再回落** |
| `string` | 有 token | 直接用 |

### 4-5 阵列形状的防御式解包
`request.js:78-85`：响应体带 `exp` 时，**数组会被包成 `{__payload, __exp}`** → 所有列表会**静默变成对象**。
→ `app/src/shared/api.ts` 导出 `unwrapArray()`，切片任务统一使用。⛔ 不改 `request.js` 的既有返回语义（会动到 Web）。

### 4-6 显式修掉一个**潜在崩溃**（E3，实现期发现）
原 `getToken()` 写的是 `typeof window !== 'undefined' ? localStorage.getItem(...) : null`
→ **只在"没有 window"时安全**；RN 里 `window` 存在、`localStorage` 不存在 → **ReferenceError**。
改为 `typeof localStorage === 'undefined'` 判空 + `try/catch`。这是**实测发现**，不是预想。

---

## 5. 验收标准

| # | 判据 | 结果 |
|---|---|---|
| A1 | App 侧能 import `shared/api/*` 与 `config`，不抛（常驻测试，非临时探针） | ✅ 18 条断言全绿 |
| A2 | `npx tsc --noEmit` exit 0 | ✅ |
| A3 | `npx jest --ci` 0 failed，且原有 268 条一条不少 | ✅ **14 suites / 286 tests**（268 + 18） |
| A4 | `npx expo export --platform android --no-bytecode` 成功，且**能打入来自 `shared/` 的模块** | ✅ 见 §8 A4 |
| A5 | **Web 不回归**：`frontend` 的 `npx vite build` 成功，且 `VITE_API_BASE_URL` **仍被静态替换** | ✅ 见 §8 A5 |
| A6 | `npm run rulers` 四把 exit 0 | ✅ `宪法级违规：无` |
| A7 | `shared/` 下 0 处平台分支 | ✅ TC-P1-01-6A |

---

## 6. 测试用例

> 编号 `TC-P1-01-<序号><类型>`；`A` = 自动化。**一条编号可含多条断言**（本任务共 9 个编号 / 18 条断言）。

| 编号 | 类型 | 用例 | 期望 | 结果 |
|---|---|---|---|---|
| **TC-P1-01-1A** | 自动 | import `shared/api/canteen` | `getRegions` 是函数，不抛 | ✅ |
| **TC-P1-01-2A** | 自动 | import `shared/api/config` | 模块初始化不抛；`API_BASE_URL` 是字符串 | ✅ |
| **TC-P1-01-3A** | 自动 | 注入 baseUrl 后**调用 `request('/api/ping')`** | 打到 `https://example.test/api/ping`；未注入时回落 `API_BASE_URL + path`；绝对 URL 不被拼接 | ✅ 3 条断言 |
| **TC-P1-01-4A** | 自动 | 源码扫描 `config.js`：`import.meta.env` 的成员访问**同一表达式内带 `?.`**；0 处裸 `import.meta.env.VITE_*` | 两条都成立 | ✅ |
| **TC-P1-01-5A** | 脚本 | `npx expo export --platform android --no-bytecode` → exit 0 且 bundle 内含来自 `shared/` 的模块 | 见 §8 A4（**用一次性探针证明**；永久复验点＝P1-14） | ✅ |
| **TC-P1-01-6A** | 自动 | 源码扫描 `shared/**`：0 处 `Platform.(OS\|select)`、0 处 `isReactNative` 标志 | 命中数 0 | ✅ |
| **TC-P1-01-7A** | 自动 | 注入 `getToken` → 请求头带 `Bearer`；注入返回 `null` → **不带且不回落**；未注入 → 回落（RN 下 `null`）；`configureAppApi` 接上 token 来源 | 四条都成立 | ✅ 4 条断言 |
| **TC-P1-01-8A** | 自动 | `unwrapArray`：`{__payload:[1,2]}`→`[1,2]`；数组原样；普通对象原样；`null`/`undefined` 不抛 | 四条都成立 | ✅ 4 条断言 |
| **TC-P1-01-9A** | 自动 | `getUploadUrl('/uploads/a.png')` 在注入后变绝对 URL；已是绝对 URL 的原样返回 | 两条都成立 | ✅ 2 条断言 |
| **TC-P1-01-1M** | 人工 | 通读 `git diff -- shared/api/` 确认**未注入时默认行为未变** | 逐行确认 | ✅ 见 §8 A5 的构建级旁证 |

**合计**：9 自动（18 条断言，18 passed）+ 1 人工 = **10 条**。

---

## 7. 风险与降级

| 风险 | 触发 | 处置 |
|---|---|---|
| 改 `shared/` 破坏 Web | A5 红 | 回退到"只加注入分支、不动默认取值"；再不行 → 在 `frontend/vite.config.js` 的 `define` 里显式补 `VITE_API_BASE_URL`（Web 侧配置，⛔ 不 fork shared）。**本次未触发**：vite build exit 0 且环境变量仍被替换 |
| Metro 解析 `@babel/runtime` 失败 | A4 红 | 已加 `extraNodeModules` 指路。**实测当前 Metro 并不需要**（bundle 内 0 处 `@babel/runtime`）→ 该配置是**防御性**的，保留成本为零；若将来红，第一嫌疑是它被误删 |
| `import.meta` 在 Hermes 上直接**语法**报错（不是 undefined） | A4 红且报语法错 | 把相关表达式收进"只在 Web 构建时被替换"的模块，RN 侧走注入。**本次未触发** |
| `tsconfig.json` 的 `include` 不含 `shared/` | `tsc` 报找不到模块 | `allowJs` 已为 `true`，被 import 的文件自动进入 program → **本次未触发**（tsc exit 0） |
| 有人再往 `shared/` 里加平台判断 | TC-P1-01-6A 红 | 测试即门禁（这正是把宪法 9.6/9.7 变成会失败的测试） |

---

## 8. 执行记录

**状态**：✅ 完成（2026-10-02）
**提交**：`feat(app): 平台接线让 App 消费仓库根 shared/ 并修掉两个真实崩溃点（P1-01）`

| 项 | 证据 |
|---|---|
| **A2** | `npx tsc --noEmit` → `TSC_EXIT=0` |
| **A3** | `npx jest --ci` → `Test Suites: 14 passed, 14 total` / `Tests: 286 passed, 286 total`（Phase 0 结束为 13/268） |
| **A4** | `npx expo export --platform android --no-bytecode` → `EXPORT_EXIT=0`，bundle 3.8 MB。**方法说明**：先用一次性探针（在 `app/src/shared/api.ts` 临时 `export * from '../../../shared/api/canteen'`）制造真实的 import 边，导出产物内 `contains('/api/canteen/regions') => True` → **证明 Metro 能解析并打包 `shared/*.js`**；探针**已回退**（不能把一次性探针留在代码里）。⛔ **永久复验点**：P1-14 首次真实 import `shared/api/*` 后必须再跑一次 A4 |
| **A5** | `frontend` 内 `npx vite build` → `VITE_EXIT=0`；再以 `VITE_API_BASE_URL=https://probe.invalid` 重跑 → 产物 `index-*.js` 内 `contains('probe.invalid') => True` → **证明 `import.meta.env?.` 写法没有破坏 Vite 的静态替换** |
| **A6** | `npm run rulers` → `RULERS_EXIT=0`；`硬编码色值 0` · `fontSize 字面量 0` · `引用自有 UI 组件 14` · `内联双语三元 0` · `宪法级违规：无` |
| **A7** | TC-P1-01-6A 通过 |
| **红→绿** | 实现前跑该用例集：`Test Suites: 1 failed` / `Cannot find module '@babel/runtime/helpers/interopRequireDefault'`（E2 先炸）；实现后 18/18 绿 |

**实现期发现并修掉的两个真实问题**：
1. **E3 潜在崩溃**：`getToken()` 只判 `typeof window` —— RN 有 `window` 无 `localStorage` → **ReferenceError**（实测 jest-expo 环境即复现）。已改为判 `localStorage` 本身 + `try/catch`。
2. **v1.0 的 `TC-P1-01-3A` 写错了**：原写"`configureApi` 后重读 `API_BASE_URL` 等于注入值"—— 但它是 **import 时求值** 的常量，注入不会改变已导入的绑定。已改为**断言行为**（`request()` 打到注入 origin），这也更符合"测接缝不测实现"。

**遗留**：无阻塞项。`app/src/shared/api.ts` 的 `resetAppApiConfiguration()` 目前只有 P1-13 会用到（已导出，暂无用例覆盖）。

---

## 9. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立：3 个实测断点、9 条交付物、10 条用例 |
| **v1.1** | **2026-10-02** | 实现期修正：① **新增 E3（`localStorage` ReferenceError）** 并修掉 —— 它比"取不到 token"严重一档，是**崩溃**；② **`TC-P1-01-3A` 从"断言常量"改为"断言行为"**（常量是 import 时求值的，注入改不了它）→ 新增 **E4**；③ **`TC-P1-01-5A` 明确"Metro 当前不需要 `@babel/runtime`"**（bundle 内 0 处），故 `metro.config.js` 的改动降级为**防御性**并如实标注；④ 新增 **`TC-P1-01-9A`**（`getUploadUrl` 也要走注入——否则 App 里图片是相对路径）；⑤ 用例数 9 → **10**（9 自动 + 1 人工） |
