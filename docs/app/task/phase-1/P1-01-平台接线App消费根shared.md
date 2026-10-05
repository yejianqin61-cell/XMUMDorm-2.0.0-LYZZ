# P1-01 · 平台接线：让 App 消费仓库根 `shared/`

**日期**：2026-10-02　**版本**：v1.0
**依赖**：无（本包第一件事）
**写作用域**：`shared/api/**` · `app/jest.config.js` · `app/metro.config.js` · `app/tsconfig.json` · `app/src/shared/**` · `app/src/app/_layout.tsx` · [依赖准入登记](../../evaluation/App依赖准入登记.md)
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
| **E2** | 根 `node_modules` **没有 `@babel/runtime`**（只有 `app/node_modules` 有），而 `shared/*.js` 经 app 的 babel 编译后会 `require` 它 | 同上，加载 `shared/api/canteen.js` | `Cannot find module '@babel/runtime/helpers/interopRequireDefault' from '../shared/api/canteen.js'` |
| **E3** | `shared/api/request.js:13-15` 从 **`localStorage`** 取 token，RN 下 `typeof window === 'undefined'` → 恒为 `null` | 通读 `shared/api/request.js:10-15` | App 里所有需登录接口都会匿名请求（→ 401/403） |

> **可参照的既有解法**：[`frontend/vite.config.js:32-36`](../../../frontend/vite.config.js) —— Web 用 `@shared` 别名指向 `../shared`，**并且显式把 `@tanstack/react-query` 也别名到 `frontend/node_modules`**。那是同一类"宿主工程要替 `shared/` 解析依赖"的问题，Web 已经踩过一次。

---

## 3. 交付物

| 文件 | 动作 | 说明 |
|---|---|---|
| `shared/api/platform.js` | **新增** | **运行时注入点**：`configureApi({ baseUrl, getToken, storage })` + 内部默认值。⛔ 里面**不得**出现任何平台判断（见 §4-1） |
| `shared/api/config.js` | 改 | `import.meta.env` 改为**平台中立读取**：注入值优先，Vite 语义作为兜底（写法见 §4-2） |
| `shared/api/request.js` | 改 | `getToken()` 改为**先查注入的 getter，再回落 `localStorage`**；两处均保持 Web 行为不变 |
| `app/src/shared/api.ts` | **新增** | App 侧**唯一**的接入点：调用 `configureApi`，给出 `baseUrl` 与 token 来源（token 的**实现**属 P1-13，本任务只留接口） |
| `app/jest.config.js` | 改 | 让 jest 能从 `shared/` 解析 `@babel/runtime`（§4-3） |
| `app/metro.config.js` | 改 | 让 Metro 同样解析得到（§4-3）；⛔ 只加 `resolver` 配置，**不得**把整个仓库根加进 `watchFolders`（会把 `frontend/`、`uploads/` 一起卷进解析范围） |
| `app/src/app/_layout.tsx` | 改 | 启动时调用一次 `configureApi`（幂等） |
| `docs/app/evaluation/App依赖准入登记.md` | 改 | 追加"跨包解析"一节的排查记录（E1/E2/E3 → 解法）。⛔ 本任务**不新增 npm 依赖** |

---

## 4. 实现要点

### 4-1 用"注入"而不是"平台分支"
`shared/` 里**不得**出现 `Platform.OS`、`isReactNative`、`typeof window` 之类的分支来判断"我现在跑在哪"。理由：那会让唯一真源长出平台分支，而每个新平台都要改它。
正确形态：`platform.js` 只存"宿主告诉我的事实"，`config.js`/`request.js` 只读它。

### 4-2 `import.meta.env` 的守卫写法（**本任务最容易写错的一行**）
要求同时满足：① RN/Hermes 下不抛；② Vite 下 `VITE_API_BASE_URL` 仍能被静态替换（否则 Web 构建会丢环境变量）。
→ 采用 **"注入优先 + 可选链兜底"**：注入值先用 `??` 短路；兜底表达式保持 `import.meta.env` 的**成员访问形状**并加 `?.`，使 RN 下安全、Vite 下仍可替换。
**验收方式就是 §6 的 TC-P1-01-3A + 4A**：App 侧不抛 / Web 侧仍能读到环境变量。

### 4-3 跨包模块解析（E2）
- **jest**：给 `@babel/runtime/*` 加 `moduleNameMapper` 指向 `<rootDir>/node_modules/...`（app 本地解决，⛔ 不改根 `package.json`）。
- **Metro**：在 `config.resolver` 上补 `extraNodeModules`（或 `nodeModulesPaths`）把 `@babel/runtime` 指到 `app/node_modules`。
- ⛔ **必须实测 Metro 那一条**（jest 通过 ≠ 打包通过）：验收见 TC-P1-01-5A。

### 4-4 token 的**同步**读取
`request.js` 的 `getToken()` 是**同步**调用，而 App 的安全存储（`expo-secure-store`）是**异步** API。
→ 注入的 `getToken` 必须读**内存镜像**，由 P1-13 在登录/登出/冷启动水合时写这个镜像。
⛔ 本任务**不实现** secure-store 读写（那是 P1-13），只把接口留成 `() => string | null`。

### 4-5 阵列形状的防御式解包（**顺手补的一个真实隐患**）
`shared/api/request.js:78-85`：当后端返回体带 `exp` 时，**数组会被包成 `{__payload, __exp}`**。今天食堂的读端点不带 `exp`，但一旦带了，所有列表会**静默变成对象**。
→ 在 App 侧接入点写一个 `unwrapArray()`（`Array.isArray(d) ? d : d?.__payload ?? d`），并在切片任务里使用。⛔ 不改 `request.js` 的既有返回语义（会动到 Web）。

---

## 5. 验收标准

| # | 判据 |
|---|---|
| A1 | App 侧能 import `shared/api/canteen.js` 与 `shared/api/config.js`，**不抛异常**（有一枚常驻测试守着，不是临时探针） |
| A2 | `npx tsc --noEmit` exit 0 |
| A3 | `npx jest --ci` **0 failed**，且原有 268 条**一条不少**（⛔ 不得靠删测试变绿） |
| A4 | `npx expo export --platform android --no-bytecode` **成功**，且产物里能搜到来自 `shared/` 的模块 |
| A5 | **Web 不回归**：`frontend` 侧 `npx vite build` 成功（证明 §4-2 的写法没破坏 Vite 的静态替换） |
| A6 | `npm run rulers` 四把 exit 0 |
| A7 | `shared/` 下 **0 处**平台分支（`Platform.OS` / `isReactNative` / `typeof window` 判断跑在哪）—— 由源码扫描测守着 |

---

## 6. 测试用例

> 编号规则 `TC-P1-01-<序号><类型>`；`A` = 自动化，`M` = 人工。

| 编号 | 类型 | 用例 | 期望 |
|---|---|---|---|
| **TC-P1-01-1A** | 自动 | App 内 `import { getRegions } from '<shared>/api/canteen'`，断言是函数 | 不抛；`typeof === 'function'` |
| **TC-P1-01-2A** | 自动 | `import { API_BASE_URL } from '<shared>/api/config'`，在**未注入**时读取 | 不抛；得到一个字符串（`''` 或注入值），⛔ 不得是 `undefined` 引发的崩溃 |
| **TC-P1-01-3A** | 自动 | 调用 `configureApi({ baseUrl: 'https://example.test' })` 后重读 `API_BASE_URL` | **等于注入值**（证明注入优先于环境） |
| **TC-P1-01-4A** | 自动 | 源码扫描 `shared/api/config.js`：`import.meta.env` 的成员访问**同一表达式内**带可选链 | 正则命中；且文件内 0 处裸 `import.meta.env.VITE_*`（不带 `?.`） |
| **TC-P1-01-5A** | 自动 | `npx expo export --platform android --no-bytecode` 退出码 + 产物内容 | exit 0；bundle 文本包含 `shared` 模块特征串（如 `canteen` 的某函数名） |
| **TC-P1-01-6A** | 自动 | 源码扫描 `shared/**`：0 处 `Platform.OS` / `isReactNative` / `typeof window !== 'undefined'` 的**平台判断用法** | 命中数 0（注释里提到平台名不算 —— 按"用法"而非"字样"匹配） |
| **TC-P1-01-7A** | 自动 | 注入 `getToken: () => 'T'`，断言 `request()` 发出的请求头含 `Authorization: Bearer T`；注入 `() => null` 则不含 | 两次断言都成立（用 mock fetch） |
| **TC-P1-01-8A** | 自动 | `unwrapArray({__payload:[1,2],__exp:5})` → `[1,2]`；`unwrapArray([1])` → `[1]`；`unwrapArray({a:1})` → `{a:1}` | 三条都成立 |
| **TC-P1-01-1M** | 人工 | 通读 `git diff -- shared/api/` 确认**默认行为未变**：未注入时 Web 的取 token 与 baseUrl 路径与改前一致 | 逐行确认，无行为变化 |

**合计**：8 自动 + 1 人工 = **9 条**。

---

## 7. 风险与降级

| 风险 | 触发条件 | 降级动作 |
|---|---|---|
| **改 `shared/` 破坏 Web** | A5 失败（Vite build 红） | 回退到"**不改 config.js 的取值表达式，只把注入分支放在最前**"；若仍失败 → 在 `frontend/vite.config.js` 的 `define` 里显式补 `VITE_API_BASE_URL`（Web 侧配置，⛔ 不 fork shared） |
| **Metro 解析 `@babel/runtime` 失败** | A4 失败 | 备选：把 `@babel/runtime` 提升到根 `package.json`（**要登记为依赖变更**）；再不行 → 给 `shared/` 加 `babel.config` 让 app 的 babel 不注入 runtime helper（⛔ 最后手段，因为会让两端产物不一致） |
| **`import.meta` 在 Hermes 上直接语法报错**（不是 undefined） | A4 失败且报语法错 | 把 `import.meta` 相关表达式**收进一个只在 Web 构建时被替换的模块**，RN 侧走注入分支；须记录到依赖准入登记的排查一节 |
| **`tsconfig.json` 的 `include` 不含 `shared/`** | `tsc` 报找不到模块 | `allowJs` 已为 `true`（`expo/tsconfig.base`），被 import 的文件会自动进入 program；若仍报错 → 在 `include` 里补 `../shared/**/*.js`（**仅加 js，不加 .ts**） |

---

## 8. 执行记录

| 项 | 内容 |
|---|---|
| 状态 | ⏳ 未开始 |
| 提交 | —— |
| 机器证据 | —— |
| 遗留 | —— |
