# Task 04: API 层统一规范化

**优先级**: 🔵 P2 — LOW
**依据**: `docs/06-Analyze/移动端App项目审计报告_V3.0.html` — 风险 #4
**当前状态**: `client.ts` (78 行) + `request.js` (169 行) 两套 HTTP 封装并存；21 个 API 文件 vs Web 端 20 个
**目标状态**: 统一为 1 套 HTTP 封装；API 文件 100% 与 Web 端对齐（20 个）
**预估工期**: 1-2 天

---

## 一、现状分析

### 当前的双封装问题

| 文件 | 行数 | 提供的方法 | 被哪些 API 文件使用 |
|------|------|-----------|-------------------|
| `client.ts` | 78 | `apiGet`, `apiPost`, `apiDelete`, `apiPatch` | 部分较新的 API |
| `request.js` | 169 | `request`, `get`, `post`, `patch`, `del`, `requestRaw` | 部分较旧的 API |

**差异点**:

| 维度 | client.ts | request.js |
|------|-----------|------------|
| 语言 | TypeScript | JavaScript (JSDoc) |
| Token 缓存 | 每次从 AsyncStorage 读取 | 内存缓存 `cachedToken` |
| 业务数据提取 | `data.data ?? data` + `__exp` | `data.data !== undefined ? data.data : data` + `__exp` |
| 错误处理 | `safeJson` → `status: -1` 标记 | 抛 Error + `apiStatus` 属性 |
| 完整响应 | `apiGet` 直接返回 data | `requestRaw` 返回完整 body |
| FormData | 无特殊处理 | 自动跳过 Content-Type |

**问题本质**: 不同的开发者在不同时期各自加了封装，现在两个都在用，互不统一。哪个 API 用哪个封装是**随机的**。

### 额外的 API 文件

Mobile 有 21 个文件，Web 有 20 个。差异：
- Mobile 多了 `client.ts` — 这不应该在 `api/` 中（它是 HTTP 工具，应放 `utils/`）
- Mobile 多了 `config.js` — Web 也有

实际上是 Mobile 多了一个 `client.ts`（HTTP 工具混入 API 目录）。

---

## 二、任务拆解

### M04-Task001: 统一 HTTP 封装

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | — |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. **选定统一方案** — `request.js` (169 行, 功能更完整)
   - 支持: JWT 缓存, FormData, skipAuth, requestRaw, 完整错误处理
   - 将其重命名为 `mobile/src/utils/http.ts` (TypeScript 化)

2. **删除 `client.ts`** — 78 行，功能被 request.js 完全涵盖

3. **统一所有 API 文件的 import**:
```ts
// 之前 (两种 import 混用)
import { apiGet, apiPost } from './client';    // ❌
import { get, post } from './request';          // ❌

// 之后 (统一)
import { get, post, patch, del } from '../utils/http';  // ✅
```

4. **审计所有 21 个 API 文件**，逐个替换 import：

| API 文件 | 当前使用 | 改为 |
|----------|---------|------|
| `auth.js` | ? | `utils/http` |
| `posts.js` | ? | `utils/http` |
| `canteen.js` | ? | `utils/http` |
| ... (全部 21 个) | 逐个审计 | `utils/http` |

**验收标准**:
- [ ] `client.ts` 文件已删除
- [ ] 所有 21 个 API 文件 import 自 `utils/http`
- [ ] 无 `import ... from './client'` 残留
- [ ] 无 `import ... from './request'` 残留
- [ ] `utils/http.ts` 有完整 TypeScript 类型

---

### M04-Task002: API 文件对齐 Web 端

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M04-Task001 |
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. **对齐文件列表** — Mobile 应该是 20 个 API 文件（与 Web 一致）：

| Web | Mobile | 操作 |
|-----|--------|------|
| `admin.js` | `admin.js` | ✅ 保留 |
| `auth.js` | `auth.js` | ✅ 保留 |
| `canteen.js` | `canteen.js` | ✅ 保留 |
| `clubs.js` | `clubs.js` | ✅ 保留 |
| `config.js` | `config.js` | ✅ 保留（API_BASE_URL 等） |
| `diary.js` | `diary.js` | ✅ 保留 |
| `errands.js` | `errands.js` | ✅ 保留 |
| `handbook.js` | `handbook.js` | ✅ 保留 |
| `marketplace.js` | `marketplace.js` | ✅ 保留 |
| `notifications.js` | `notifications.js` | ✅ 保留 |
| `organizations.js` | `organizations.js` | ✅ 保留 |
| `posts.js` | `posts.js` | ✅ 保留 |
| `push.js` | `push.js` | ✅ 保留 |
| `rankings.js` | `rankings.js` | ✅ 保留 |
| `request.js` | — | ❌ 删除（已迁移到 utils/http.ts） |
| `schedule.js` | `schedule.js` | ✅ 保留 |
| `square.js` | `square.js` | ✅ 保留 |
| `tags.js` | `tags.js` | ✅ 保留 |
| `todos.js` | `todos.js` | ✅ 保留 |
| `users.js` | `users.js` | ✅ 保留 |
| `client.ts` | — | ❌ 删除（M04-Task001） |

最终 Mobile `api/` = 19 个文件（与 Web 的 20 个一致，少 `request.js` 因为移到了 utils/）

2. **逐文件对比 API 函数签名** — 确保每个 API 文件的导出函数名与 Web 端一致：

```bash
# 对比脚本
for file in mobile/src/api/*.js; do
  name=$(basename "$file")
  web_file="frontend/src/api/$name"
  if [ -f "$web_file" ]; then
    mobile_exports=$(grep -c "export" "$file")
    web_exports=$(grep -c "export" "$web_file")
    if [ "$mobile_exports" != "$web_exports" ]; then
      echo "MISMATCH: $name (mobile:$mobile_exports vs web:$web_exports)"
    fi
  fi
done
```

**验收标准**:
- [ ] `api/` 目录 = 19 个文件（移除 client.ts + request.js）
- [ ] 每个 API 文件导出函数名与 Web 端一致
- [ ] API 函数签名参数顺序与 Web 端一致

---

### M04-Task003: TypeScript 迁移 + 全量验证

| 项目 | 内容 |
|------|------|
| **Agent** | Mobile Frontend Agent |
| **依赖** | M04-Task002 |
| **复杂度** | ⭐⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. `utils/http.ts` — 从 `request.js` 迁移并加完整 TS 类型
2. `api/config.ts` — 从 `config.js` 迁移并加类型
3. 所有 API 文件保持 `.js` 不变（业务代码量太大，暂不全量 TS 化）
4. 全量测试: `cd mobile && npx jest`
5. 手动冒烟测试: 登录 → 树洞列表 → 帖子详情 → 发帖 → 食堂 → 广场

**验收标准**:
- [ ] `utils/http.ts` 类型安全（无 `any` 除非必要）
- [ ] 登录/注册 API 正常
- [ ] 树洞帖子流 API 正常
- [ ] 食堂数据 API 正常
- [ ] 全量测试 100% 通过

---

## 三、API 层规范（最终状态）

### 目录结构
```
mobile/src/
├── utils/
│   └── http.ts          ← 唯一 HTTP 封装 (get/post/patch/del/requestRaw)
├── api/
│   ├── config.ts        ← API_BASE_URL, STORAGE_TOKEN_KEY
│   ├── auth.ts          ← login, register, sendVerificationCode
│   ├── posts.ts         ← getPostList, getPostDetail, createPost, ...
│   ├── canteen.ts       ← getRegions, getShops, getProducts, ...
│   ├── ... (19 files)   ← 与 Web 端 1:1 对齐
│   └── ...
```

### 使用规范
```ts
// ✅ 正确 — 统一使用 utils/http
import { get, post, patch, del } from '../utils/http';
const posts = await get('/api/posts?page=1');

// ❌ 错误 — 不要直接 fetch
const res = await fetch(`${API_BASE_URL}/api/posts`);

// ❌ 错误 — 不要混用 client.ts 的 apiGet
import { apiGet } from './client';  // 此文件不存在
```

## 四、完成定义 (DoD)

- [ ] `client.ts` 已删除
- [ ] `api/request.js` 已删除
- [ ] `utils/http.ts` 是唯一的 HTTP 封装
- [ ] `api/` 目录 = 19 个文件（与 Web 对齐）
- [ ] 所有 API import 统一为 `from '../utils/http'`
- [ ] 全量测试 100% 通过
- [ ] 冒烟测试：核心流程 API 正常
