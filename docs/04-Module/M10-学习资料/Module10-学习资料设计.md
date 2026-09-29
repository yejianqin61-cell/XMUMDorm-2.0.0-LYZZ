# M10 · 学习资料模块设计

> 模块编号：**M10-学习资料**
> 版本：v1.2（grill 定稿：课程字典 + 三层 details）
> 阶段：04-Module
> 需求来源：[`docs/01-Requirement/module-specs/学习资料模块需求说明.md`](../../01-Requirement/module-specs/学习资料模块需求说明.md)
> 可行性依据：[`docs/02-Clarify/feasibility/学习资料模块可行性评估.md`](../../02-Clarify/feasibility/学习资料模块可行性评估.md)

---

## 0. 一句话架构

> **Git 仓库当数据库，CDN 当带宽，本站服务器只当「带鉴权的 GitHub 客户端」。**

读路径中**文件字节**（列表 / 预览 / 下载）完全不经过本项目服务器；写路径（上传 / 下架）经过已有 Express；课程名/id 映射走一个轻量缓存 API（几 KB，见 §3）。基础设施上**只新增数据库表**（课程字典 + 上传记录），不新增对象存储或文件缓存。

---

## 1. 角色与仓库拓扑

### 1.1 三方关系

```
┌──────────────────────┐        ┌──────────────────────────────┐
│ 本站 GitHub 账号      │        │ 专用小号（bot）                │
│ yejianqin61-cell/    │        │ James898-boom                │
│ XMUMDorm-2.0.0-LYZZ  │        │ （显示名 JennyJames_Boom898）  │
│ （代码仓库，不变）     │        │ 持有 fine-grained PAT         │
└──────────────────────┘        └───────────┬──────────────────┘
                                            │ 只授权 1 个仓库
                                            ▼
                              ┌──────────────────────────────┐
                              │ 资料库（public repo）           │
                              │ James898-boom/                │
                              │ Xmum-opensource               │
                              └──────────────────────────────┘
```

**为什么用专用小号**（可行性评估 §六 决策 2、§4.2 R1）：资料库是唯一有真实封禁/DMCA 风险的资产。放在小号名下，最坏情况只损失资料库，**不牵连主代码仓库与社团账号**。

### 1.2 为什么不放在主仓库

| 不用主仓库 `docs/` 存资料的原因 | 说明 |
|--------------------------------|------|
| 体积污染 | 主仓库会被 PDF 撑大，每次 `git clone` 都变慢 |
| 权限混淆 | 上传者将有权限通过 PR 触碰与代码同一仓库 |
| 风险耦合 | 资料违规会连带主仓库被 DMCA |
| 部署耦合 | 主仓库 push 会触发前端构建，传资料不该触发部署 |

---

## 2. 资料库结构规范

### 2.1 目录约定

```
Xmum-opensource/
├── index.json                  ← 索引，由后端在上传 PR 内写入；前端唯一入口
├── README.md                   ← 使用说明 + 版权声明 + 下架联系方式
├── LICENSE                     ← CC BY-NC-SA 4.0 之类，明确非商用
├── CONTRIBUTING.md             ← 命名规范、目录规范
├── .github/workflows/
│   └── validate.yml            ← PR 校验 + index.json 生成
└── c<courseId>/                ← 顶层按课程 id（稳定、永不重命名）
    └── <type>/                 ← notes / lecture / exam / answer / other
        └── <safe-filename>     ← 文件名非权威，元数据在 index.json
```

**顶层目录用稳定 `c<courseId>`**，理由：课程身份 = **名字 + 讲师**（可合并/可改名），`course_code` 已降级为可选属性、不可再当目录键。`courseId` 来自本站 `courses` 表（自增、永不复用），由服务端在上传时写进 PR 分支路径。**路径永不重命名**——admin 合并课程时只重写 `index.json` 的 `courseId` 字段，不搬文件。

> 课程聚合真相源是 `index.json` 里的 `courseId` 字段，**不是目录路径**。目录只负责存储组织，不承担聚合语义。「通用/其他」伪课程（承接选课攻略、GPA 换算等非课程资料）是一个保留的固定 `courseId`。

### 2.2 文件命名规范（Actions 强制校验）

- 允许字符：中文、字母、数字、`-` `_` `.` 空格
- **禁止**：`#` `?` `%` `&` `=` 等 URL 特殊字符（会破坏 CDN 链接）
- **禁止**：同名文件在同一目录重复（大小写不敏感判重）
- **禁止**：以 `.` 开头的隐藏文件（除 `.github/`）
- 建议：`<学期>-<类型>-<描述>.<ext>`，如 `2025-09-lecture-notes.pdf`

### 2.3 `index.json` Schema（v2）

**由后端在上传 PR 内一并写入**（与材料文件同一个 commit），main 上不需要任何回推。**前端只读这个文件**，不遍历目录（GitHub 无法列目录，且逐个调 API 会撞 60/h 限流）。

```json
{
  "schemaVersion": 2,
  "generatedAt": "2026-01-15T08:30:00Z",
  "commit": "a1b2c3d4e5f6...",
  "baseUrl": "https://cdn.jsdelivr.net/gh/James898-boom/Xmum-opensource@a1b2c3d",
  "stats": { "totalFiles": 128, "totalBytes": 483920128 },
  "courses": [
    { "courseId": 7, "name": "Data Structures", "lecturer": "" }
  ],
  "files": [
    {
      "path": "c7/notes/2025-09-03-linked-list.md",
      "name": "2025-09-03-linked-list.md",
      "ext": "md",
      "kind": "markdown",
      "title": "链表与树 · 第三课时笔记",
      "courseId": 7,
      "courseName": "Data Structures",
      "lecturer": "",
      "type": "notes",
      "lesson": 3,
      "lessonTitle": "链表与树",
      "examNode": null,
      "source": null,
      "tags": ["笔记", "链表"],
      "semester": "2025/09",
      "description": "覆盖链表与树，含手写示例",
      "size": 20480,
      "sha256": "…",
      "blobSha": "…",
      "updatedAt": "2026-01-15T08:00:00Z",
      "uploaderNickname": "匿名同学",
      "downloads": 0
    }
  ]
}
```

**关键设计点：**

| 点 | 说明 |
|----|------|
| `baseUrl` 固定到 **commit sha** | 避免 jsDelivr 的 7 天缓存导致「更新后看不到新版本」；每次 merge 后 `index.json` 里的 baseUrl 变化即天然破缓存 |
| `kind` 字段 | 渲染类型 `markdown` / `pdf` / `image` / `archive` / `document`，由扩展名映射，前端据此选渲染器 |
| `courseId` + `courses[]` | **聚合钥匙**。`courses[]` 是本次生成快照里出现的课程清单（id/name/lecturer）；`files[].courseId` 指向它。admin 合并课程时**只重写此字段，不搬文件** |
| `type` | 第一层五类：`notes` / `lecture` / `exam` / `answer` / `other` |
| `lesson` / `lessonTitle` | 第三层 a：课时整数 + 可选标题；`examNode` = 第三层 b：`midterm` / `final` / `quiz` / `assignment` / `monthly`，空 = 整门课 |
| `source` | 仅 `type=exam` 有意义：`official` / `recalled`，选填 |
| `uploaderNickname` | **资料库内唯一允许的「用户数据」**，且是昵称不是 ID。上传者信息主体存在本站 MySQL（FR-06） |
| `downloads` | `index.json` 里恒为 0，真实计数由本站 API 叠加（见 §4.3） |
| 未收录 = 不展示 | PR 分支里的文件即便公网可访问，只要没进 `main` 的 `index.json`，就不会出现在页面上 |

---

## 3. 读路径设计（文件字节零服务器）

> **口径澄清**：「零服务器」指**文件字节**（列表 / 正文 / PDF / 下载）不经本项目服务器。**课程名/id 映射**（`courseId → 名字+讲师`）由轻量 `GET /api/materials/courses` 提供（缓存、几 KB），因为课程字典活在本站 MySQL 且可合并——这是「零服务器读」与「课程可合并」共存的必要折中（grill 已定）。

### 3.1 三条读取链路

| 用途 | 链路 | 实测结论 |
|------|------|----------|
| 列表 | `https://cdn.jsdelivr.net/gh/<owner>/<repo>@<sha>/index.json` | CORS `*`，缓存 7 天 ✅ |
| Markdown 正文 | 同上 `<baseUrl>/<path>` → `fetch().text()` → `ReactMarkdown` | jsDelivr 返回 `text/markdown`；raw 返回 `text/plain`，两者都能渲染 ✅ |
| PDF 预览 | 同上 `<baseUrl>/<path>` → `<iframe>` | **必须用 jsDelivr**：`Content-Type: application/pdf` ✅ |
| 下载 | `<baseUrl>/<path>` + 强制下载参数 | CORS `*` ✅ |

### 3.2 CDN 选择矩阵（已实测）

| 端点 | MD Content-Type | PDF Content-Type | CORS | 缓存 | 用途 |
|------|-----------------|------------------|------|------|------|
| `raw.githubusercontent.com` | `text/plain` | ❌ `application/octet-stream` | `*` | 300s | **仅作降级下载兜底** |
| `cdn.jsdelivr.net/gh/…` | `text/markdown` | ✅ `application/pdf` | `*` | 604800s | **主链路** |

### 3.3 PDF 降级链

```
① jsDelivr iframe
     ↓ 失败（404 / 超体积上限 / 网络）
② https://mozilla.github.io/pdf.js/web/viewer.html?file=<encodeURIComponent(url)>
     ↓ 失败
③ 仅显示「下载」按钮（raw.githubusercontent 直链，指向浏览器下载）
```

前端需对 iframe 做**超时探测**（`load` 事件 8s 未触发即降级），而不能只依赖 `onError`（iframe 跨域时 error 事件不可靠）。

### 3.4 阶段 0 实测结果（**已完成**，在真实仓库跑通）

仓库：`James898-boom/Xmum-opensource` · 探针分支 `upload/phase0-probe` · PR #2（已关闭，未合并）

| # | 项目 | 实测结果 |
|---|------|----------|
| T1 | **jsDelivr 单文件上限** | **恰好 20 MiB（20,971,520 B，含）**。403 响应体原话：`File size exceeded the configured limit of 20 MB.`；20 MiB 整 → 200，21 MiB → 403 |
| T2 | **中文文件名** | ✅ **完全可用**。`c1/notes/2025-09-第三课时-链表与树.md` 返回 200 `text/markdown`；GET 内容 sha256 与 raw **完全一致**（确认 CDN 未改写内容） |
| T3 | **PDF Content-Type** | ✅ jsDelivr = `application/pdf`；raw = `application/octet-stream`。确认 PDF 预览**必须**走 jsDelivr |
| T4 | **体积与耗时** | 20MB blob 上传 **≈8.5s**，请求体 26.7MB（base64 膨胀）。60s 超时充足 |
| T5 | **大 blob 稳定性** | 20MB blob **偶发 `502 Bad Gateway`**，退避重试后成功 → 后端**必须**对大 blob 做指数退避重试 |
| T6 | **PR 校验链路** | 合法 PR → `validate` = **success**；追加 21MB 后 → **failure**。CI 门禁与体积规则在真实 PR 上均生效，check 名已注册为 `validate` |
| T7 | **未认证 GitHub API** | core **60 次/小时/IP** → 前端不得直连 api.github.com |

**T1 带来的关键结论：上限「零余量」**

jsDelivr 的上限是 20 MiB，本模块的上限也是 20 MiB —— **恰好压线**。

- 取 `MATERIALS_MAX_FILE_MB=20`（按 `20*1024*1024` 实现）**当前实测可用**（20,971,520 B 返回 200）；
- 但一个正好 20 MiB 的文件就落在 jsDelivr 的临界点上。若 jsDelivr 收紧上限，这类文件会**无法预览**；
- 缓解：§3.3 降级链。实测 raw 对 21MB 文件仍返回 200，**下载兜底始终可用**；
- 若要留余量可降到 **19 MiB**（实测 200）。这是产品取舍：20 MiB 压线但符合需求；19 MiB 更稳但少 1 MiB。

> ✅ T2 原被标为「隐藏风险」，实测证明**中文路径完全可用**，因此**不需要**「英文路径 + 中文 title」的备用方案。
> ✅ **Plan A（jsDelivr）成立，GitHub Pages 保持 Plan B 且暂不需要启用。**

---

## 4. 写路径设计（经过后端）

### 4.1 鉴权体系（**双层，不可混淆**）

| 层 | 主体 | 凭据 | 存放位置 |
|----|------|------|----------|
| 第一层 | 站点用户 | JWT | 浏览器 `localStorage`（沿用现状） |
| 第二层 | 站点服务器 → GitHub | **fine-grained PAT** | **仅服务端 `.env`，永不下发** |

**PAT 最小权限配置：**

| 项 | 值 |
|----|-----|
| Token 类型 | Fine-grained personal access token |
| Resource owner | `James898-boom`（登录名；显示名 JennyJames_Boom898） |
| Repository access | **Only select repositories** → 仅 `Xmum-opensource` |
| Permissions → Contents | **Read and write** |
| Permissions → Pull requests | **Read and write** |
| Permissions → Metadata | Read（自动必选） |
| Permissions → Workflows | **故意不授予**。后端不需要改 CI；实测无该权限时 `POST /git/refs`(201)、`PATCH /git/refs`(200)、`POST /git/blobs`(201) 全部可用。只有写 `.github/workflows/**` 才需要它（实测 403），该文件改由人工在网页端维护 —— 见 §8.2、§9 |
| Expiration | 最长 365 天，**必须设置轮换提醒** |

> ❌ 不使用 classic PAT（`repo` scope 会授权该账号**所有**仓库，权限过大）
> ❌ 不使用 `GITHUB_TOKEN`（那是 Actions 运行时变量，后端拿不到）
> ✅ 用 PAT 而非 `GITHUB_TOKEN` 提 PR 还有一个好处：**由 PAT 触发的 PR 会正常触发 `pull_request` workflow**（`GITHUB_TOKEN` 触发的事件不会递归触发其他 workflow）

### 4.2 API 设计

统一前缀 `/api/materials`，全部遵守现有响应约定 `{ status, message, data }`。
以下为**已实装**路由（`routes/materials.js`，共 15 条）。

| # | 方法 | 路径 | 鉴权 | 说明 |
|---|------|------|------|------|
| 1 | `GET` | `/api/materials` | 公开 | 列表。**从 GitHub API 读最新 index**（非 CDN，理由见 §4.5）并附 pinned `baseUrl`；支持 `q` `course` `type` `examNode` `kind` `sort` `page` `pageSize` |
| 2 | `GET` | `/api/materials/courses` | 公开 | **课程字典列表**（id/name/lecturer/资料数），来自 `courses` 表 |
| 3 | `POST` | `/api/materials/courses/resolve` | 登录 | 按 `name`(+`lecturer`) 解析课程：命中返回 `courseId`；未命中**自注册**（上传表单自动补全用） |
| 4 | `GET` | `/api/materials/file/*` | 公开 | 文本类返回**正文**（Markdown 渲染兜底）；二进制 302 跳转到 CDN |
| 5 | `POST` | `/api/materials/upload` | **登录** + 限流 | `multipart/form-data`，文件字段名 **`file`**；三层 details 见 FR-05 |
| 6 | `GET` | `/api/materials/upload/:id/status` | 登录 | 轮询 PR/merge 状态；PR 已合并则把库内状态推进为 `merged` |
| 7 | `GET` | `/api/materials/me/uploads` | 登录 | 我上传的（FR-11） |
| 8 | `GET` | `/api/materials/admin/stats` | admin | 看板（状态/类型分布、Top 下载、Top 上传、仓库体积） |
| 9 | `PATCH` | `/api/materials/admin/courses/:id` | admin | 改课程（名字/讲师/code） |
| 10 | `POST` | `/api/materials/admin/courses/merge` | admin | 合并课程：资料与别名并入目标课程，并**重写资料库 index 的 courseId** |
| 11 | `POST` | `/api/materials/download` | 公开 | 下载计数（**按 `path` 而非 id**，见下注；尽力而为，失败不报错） |
| 12 | `POST` | `/api/materials/:id/save` | 登录 | 收藏 toggle（FR-09） |
| 13 | `GET` | `/api/materials/me/saves` | 登录 | 我的收藏 |
| 14 | `PATCH` | `/api/materials/:id` | 本人 / admin | 修改元数据 → 触发 **metadata-only PR**（不动文件本体）。**不允许改 `type`**（会影响存储目录） |
| 15 | `DELETE` | `/api/materials/:id` | 本人 / admin | 下架。响应含 `notice`：CDN 可能有残留缓存 |

> **注（相对初稿的两处调整）**：
> ① 原计划 `POST /:id/download` 改为 **`POST /download` + body `{path}`** —— 管理员手工加进仓库的文件没有 DB 行，按 path 计数更健壮；
> ② 新增 `/me/saves` 与两条 `/admin/courses/*`（课程维护是 admin 合并能力的必要入口）。

**路由挂载**（`server.js`）：在现有 route 之后追加
```js
const materialsRoutes = require('./routes/materials');
app.use('/api/materials', materialsRoutes);
```

### 4.5 为什么后端必须从 API 读 index，而不是从 CDN

jsDelivr 对 `main` 的缓存是 **7 天**。若后端读 CDN 上的 index.json 再写回 PR，
就会把别人刚合并的条目**回滚掉**（读到过期副本 → 写回旧数据）。

因此：**文件字节走 CDN（零服务器带宽），index.json 的读写走 GitHub API（永远最新）**。
前端拿到的列表由后端代理，并在响应里附带钉到当前 main HEAD 的 `baseUrl`，
前端再用它直连 CDN 取字节。

### 4.3 上传时序（核心流程）

```
前端                     后端                           GitHub
 │                        │                              │
 │ ① POST /upload         │                              │
 │  (multipart, JWT)      │                              │
 ├───────────────────────>│                              │
 │                        │ ② authenticateToken          │
 │                        │ ③ 角色校验（student+）        │
 │                        │ ④ 限流（5次/小时/用户）       │
 │                        │ ⑤ 扩展名白名单 + 体积 ≤20MB   │
 │                        │ ⑥ 魔数嗅探真实类型            │
 │                        │ ⑦ 敏感词（**仅元数据**，正文不扫）│
 │                        │ ⑧ 解析课程 name+lecturer→courseId（自注册）＋sha256 软去重   │
 │                        │ ⑨ 生成路径 c<id>/<type>/<file> 与分支名                  │
 │                        │   upload/<ts>-<uid>-<sha8>   │
 │                        │                              │
 │                        │ ⑩ PUT /git/blobs（材料 + index.json）           │
 │                        ├─────────────────────────────>│
 │                        │ ⑪ POST /git/trees + /commits │
 │                        ├─────────────────────────────>│
 │                        │ ⑫ PATCH /git/refs（建分支）   │
 │                        ├─────────────────────────────>│
 │                        │ ⑬ POST /pulls（开 PR）        │
 │                        ├─────────────────────────────>│
 │                        │ ⑭ PUT /pulls/:n/enable       │
 │                        │    (GraphQL enablePullRequest│
 │                        │     AutoMerge 或 REST)        │
 │                        ├─────────────────────────────>│
 │                        │ ⑮ INSERT materials 记录       │
 │                        │    status='pending'          │
 │                        │ ⑯ logAudit()                 │
 │ <─── 200 {id, prUrl} ──┤                              │
 │                        │                              │ ⑰ Actions 校验
 │                        │                              │ ⑱ 通过 → auto-merge
 │                        │                              │ ⑲ index.json 随 PR 一并合并
 │ ⑳ 轮询 /status         │                              │
 ├───────────────────────>│ ㉑ 查 PR 状态                 │
 │                        ├─────────────────────────────>│
 │ <── {status:'merged'} ─┤                              │
```

**为什么用 Git Data API（blobs/trees/commits）而不是 Contents API**：Contents API 的写接口对 base64 请求体有约 1MB 级限制（编码后膨胀 1.33 倍），20MB 的 PDF 走不通。Git Data API 的 blob 接口可以直接传二进制/大文件。

**合并策略**：**squash merge**，commit message 固定为
```
[materials] <title> (<courseName>)

Course-Id: <courseId>
Type: <type>
Uploaded by: <nickname>
Material-Id: <db id>
```
理由：一个资料 = 一个 commit，NFR-07 的「可精确回滚」才能成立。

### 4.4 幂等与失败处理

| 场景 | 行为 |
|------|------|
| 网络中断在 ⑩–⑭ 之间 | 分支可能已建但 PR 未开。重试时**必须复用同名分支**（先查 refs：存在则在其上追加 commit，或 force-push 重置），**不得计划「删除后重建」** —— 见 §8.4 的 ruleset 约束 |
| 分支永久累积 | ruleset 未调整前，每次上传都会永久留下一个分支。处置见 §8.4 |
| Actions 校验失败 | PR 保留但打 label `validation-failed`；本站记录 `rejected` + 原因；**不自动关 PR**（留证据） |
| merge 冲突 | 每个上传 PR 都改 `index.json`，**并发上传时会冲突**。后端检测到不可合并后重试（重读 main 的 `index.json`、合并、再提交），仍失败标 `needs-manual` |
| PAT 失效（401） | 返回明确错误码 `MATERIALS_GITHUB_AUTH_FAILED`，并打 error 日志告警；**不要重试** |
| GitHub 5xx | 指数退避重试 2 次 |
| 超时 | 整体 60s 超时，返回「处理中」，记录保留 `pending`，由后台任务补查 |

---

## 5. 后端文件规划

### 5.1 新增文件

| 文件 | 职责 | 预估行数 |
|------|------|----------|
| `routes/materials.js` | 12 个端点，参数校验，调用 service | ~500 |
| `services/githubMaterials.js` | **唯一**与 GitHub 通信的模块。封装 blobs/trees/commits/refs/pulls、index 读取与缓存、错误归一化 | ~320 |
| `services/courseCatalog.js` | 课程字典：按 name+lecturer 解析/自注册、别名合并、列表缓存（轻量 API 的数据源） | ~150 |
| `services/materialValidation.js` | 白名单、魔数嗅探、敏感词、软去重、体积校验（可独立单测） | ~200 |
| `middleware/materialUpload.js` | multer 内存存储 + 20MB 限制 + 扩展名过滤 | ~50 |
| `shared/constants/materials.js` | 扩展名白名单、`kind` 映射、**type/examNode/source 枚举与 slug**、体积上限（Web/RN 共用） | ~80 |
| `shared/api/materials.js` | 前端/RN 共用 API 层 | ~140 |
| `migrations/069_materials.sql` | `courses` + `course_aliases` + `materials` + 收藏 + 下载计数（见 §6） | — |
| `scripts/run-migration-069-materials.js` | 迁移执行器 | ~12 |
| `__tests__/materials.test.js` | 路由集成测试（mock GitHub） | ~400 |
| `materials-repo/`（**已建**） | 资料库脚手架源码（只读 workflow + 校验器 + 生成器 + README/LICENSE/CONTRIBUTING），由下面这个脚本推送到外部资料库 | — |
| `scripts/materials/bootstrap-materials-repo.js`（**已建**） | 引导脚本：经 GitHub Contents API 把 `materials-repo/` 推到 `James898-boom/Xmum-opensource`（默认预演，`--apply` 才写入） | ~200 |

### 5.2 修改文件

| 文件 | 修改 |
|------|------|
| `server.js` | 引入并挂载 `materialsRoutes`；上传路由的 body limit 需单独放宽 |
| `init-db.sql` | 同步 §6 的新表（[数据库变更铁律](../../00-Constitution/policies/数据库变更铁律.md) 第 64 行强制要求） |
| `.env.example` | 新增 `GITHUB_MATERIALS_*` 配置项并注释 |
| `frontend/src/routes/layoutRoutes.jsx` | 新增 `/materials`、`/materials/upload`、`/materials/course/:id`、`/admin/materials` |
| `docs/README.md` | 模块索引表补 M10 |

> ⚠️ `server.js:74` 现有 `express.json({ limit: '1mb' })` 不影响 `multipart/form-data`（multer 不走 JSON 解析），但**若采用 base64 JSON 上传方案则必须放宽**。本设计走 multipart，**无需改动全局 limit**。

### 5.3 `services/githubMaterials.js` 接口契约

```js
// 读
fetchIndex({ force = false })            // → { schemaVersion, baseUrl, files: [...] }，带 5min 内存缓存
getFileText({ path })                    // → string（仅文本类，硬限 1MB，防内存爆）
cdnUrlFor({ path, ref })                 // → string

// 写
putBlob({ content /* Buffer|string */ }) // → blobSha
createCommitOnBranch({ branch, path, blobSha, message, parentSha }) // → commitSha
openPullRequest({ branch, title, body }) // → { number, url, nodeId }
enableAutoMerge({ pullRequestId })       // → boolean
getPullRequest({ number })               // → { state, merged, mergeable, labels }
deleteFile({ path, message })            // → commitSha

// 运维
healthcheck()                            // → { ok, scopes, repo, rateLimitRemaining }
```

**实现约束：**
- 用 **Node 原生 `fetch`**（Node 18+ 内置），**不引入 Octokit**——遵守项目「轻依赖」倾向，且只需 ~10 个 REST 调用
- 所有请求带 `Authorization: Bearer ${process.env.GITHUB_MATERIALS_TOKEN}`、`Accept: application/vnd.github+json`、`User-Agent`
- **日志脱敏**：任何日志不得出现 token（[安全策略](../../00-Constitution/policies/安全策略.md) 禁止事项 5）
- `fetchIndex` 结果带 **ETag**，可发 `If-None-Match` 走 304，省 CDN 流量

---

## 6. 数据库设计

### 6.1 `materials`（FR-06 上传审计）

```sql
-- migration: 069_materials.sql
-- description: 课程字典 + 学习资料上传记录/收藏/下载计数
-- depends: 001 (users 表必须存在)
-- reversible: DROP TABLE IF EXISTS material_downloads, material_saves, materials, course_aliases, courses;

-- 课程字典：聚合单位 = 名字 + 讲师（讲师未知用空串哨兵）
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL COMMENT '规范化课程名',
  lecturer VARCHAR(120) NOT NULL DEFAULT '' COMMENT '讲师；未知=空串',
  course_code VARCHAR(32) DEFAULT NULL COMMENT '可选，如 BSC103，不再唯一',
  is_pseudo TINYINT NOT NULL DEFAULT 0 COMMENT '1=通用/其他 伪课程（承接非课程资料）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name_lecturer (name, lecturer),
  KEY idx_name (name)
) COMMENT='课程字典（聚合单位=名字+讲师）';

-- 课程别名：admin 合并时把旧 id / 别称 / 多 code 指向 canonical
CREATE TABLE IF NOT EXISTS course_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '指向 courses.id',
  alias_name VARCHAR(180) NOT NULL,
  alias_lecturer VARCHAR(120) NOT NULL DEFAULT '',
  alias_code VARCHAR(32) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_alias (alias_name, alias_lecturer),
  CONSTRAINT fk_alias_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) COMMENT='课程别名/旧名/多 code';

CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '上传者 users.id',
  course_id INT NOT NULL COMMENT 'courses.id',
  type VARCHAR(16) NOT NULL COMMENT 'notes/lecture/exam/answer/other',
  material_path VARCHAR(512) NOT NULL COMMENT '仓库内相对路径 c<id>/<type>/<file>',
  title VARCHAR(100) NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  lesson INT DEFAULT NULL COMMENT '第三层a：课时序号',
  lesson_title VARCHAR(64) DEFAULT NULL COMMENT '第三层a：课时标题',
  exam_node VARCHAR(16) DEFAULT NULL COMMENT '第三层b：midterm/final/quiz/assignment/monthly；NULL=整门课',
  source VARCHAR(16) DEFAULT NULL COMMENT '仅 exam：official/recalled',
  tags VARCHAR(255) DEFAULT NULL COMMENT '逗号分隔，≤5 个',
  semester VARCHAR(16) DEFAULT NULL,
  kind VARCHAR(16) NOT NULL COMMENT 'markdown/pdf/image/archive/document',
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  branch_name VARCHAR(255) DEFAULT NULL,
  pr_number INT DEFAULT NULL,
  pr_url VARCHAR(512) DEFAULT NULL,
  commit_sha CHAR(40) DEFAULT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending/merged/rejected/removed',
  reject_reason VARCHAR(255) DEFAULT NULL,
  download_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  KEY idx_user_created (user_id, created_at DESC),
  KEY idx_status_created (status, created_at DESC),
  KEY idx_course_type (course_id, type),
  KEY idx_sha (file_sha256),
  CONSTRAINT fk_materials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_materials_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
) COMMENT='学习资料上传记录（资料本体在外部 GitHub 仓库）';

CREATE TABLE IF NOT EXISTS material_saves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  material_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_material (user_id, material_id),
  KEY idx_material (material_id),
  CONSTRAINT fk_msaves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msaves_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_downloads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '游客为 NULL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_material (material_id)
);
```

**设计说明：**

| 决策 | 理由 |
|------|------|
| `uk_name_lecturer` 联合唯一 + 空串哨兵 | MySQL 唯一约束对 NULL 不生效，用 `''` 表示未知讲师，保证「同名 + 同未知讲师」收束成一门课 |
| 不再用 `uk_sha` 全局唯一 | **软去重**（N1）：同 sha 且同 (course,type,path) 拒绝；同 sha 不同课允许 + 前端提示「库中已有相同文件」 |
| `course_id` FK + `type` 进 `materials` | 聚合与筛选都落在 DB 侧可查，与 `index.json` 的 `courseId` 对齐 |
| `is_pseudo` | 「通用/其他」伪课程固定 id，承接选课攻略、GPA 换算等非课程资料 |
| `course_aliases` | admin 合并时把旧 id/别称指向 canonical；合并触发 index 再生成（重写 `courseId`） |
| `material_downloads` 只插入不更新 | 保留原始流水；`materials.download_count` 做冗余计数供列表展示 |
| `deleted_at` | 遵守项目逻辑删除约定（[安全策略](../../00-Constitution/policies/安全策略.md) 审计与追溯） |
| 表名不带 `github` 前缀 | 未来若迁到 R2，表结构不用改（预留 FR-15） |

> **注意**：`materials` 表**不存文件内容、不存 CDN 地址**。CDN 地址由 `index.json` 的 `baseUrl` + `material_path` 运行时拼接，避免 commit sha 变化导致数据过期。

---

## 7. 前端设计

### 7.1 页面与组件

```
frontend/src/pages/Materials/
├── MaterialsHome.jsx          课程为中心：搜索/选课 + 课程列表
├── MaterialsHome.css
├── MaterialsCourse.jsx        课程页：四 tab（笔记/课件/试题/答案）+ 考试节点/课时筛选（FR-10）
├── MaterialsCourse.css
├── MaterialDetail.jsx         MD / PDF 渲染分发器
├── MaterialDetail.css
├── MaterialsUpload.jsx        上传表单（三层 details）+ 状态机
├── MaterialsUpload.css
├── MaterialsMine.jsx          我上传的 + 元数据编辑入口（FR-11 / PATCH）
└── components/
    ├── MaterialCard.jsx
    ├── CoursePicker.jsx       ← 课程自动补全（name+lecturer → resolve API）
    ├── TaxonomyFields.jsx     ← type / lesson / examNode / source 级联表单
    ├── MarkdownViewer.jsx     ← 复用 HandbookArticleDetail.jsx:367 的用法
    ├── PdfViewer.jsx          ← iframe + 降级链 + 超时探测
    └── UploadStatusTracker.jsx
```

### 7.2 `MarkdownViewer` 关键约束

```jsx
// ✅ 允许
<ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>

// ❌ 禁止：不得引入 rehype-raw / dangerouslySetInnerHTML
// 理由：资料库是公开可写的，raw HTML 渲染 = 存储型 XSS（且 MD 来自 bot 账号，
//       攻击者可通过 PR 注入 <script>，一旦 merge 即影响所有访客）
```

**相对路径资源解析**：MD 里的 `![](./img/a.png)` 必须重写成 `<baseUrl>/c7/notes/img/a.png`（与资料同目录）。实现方式：自定义 `components={{ img: ({ src, ...rest }) => <img src={resolveCdn(src)} {...rest} /> }}`，其中 `resolveCdn` 判断 `src` 是否以 `http` 开头，否则与资料所在目录拼接。

**外链安全**：所有 `<a>` 必须带 `target="_blank" rel="noopener noreferrer"`。

### 7.3 `PdfViewer` 关键约束

```jsx
// 主链路
<iframe src={cdnUrl} title={title} loading="lazy" onLoad={onLoaded} />
// + useEffect 8s 超时未 onLoaded → 切换降级源
```

- **必须** `encodeURIComponent` 路径段（中文/空格文件名，见 §3.4 T3）
- 移动端（`useIsMobile` 或 UA 判断）**默认不渲染 iframe**，直接给「打开 / 下载」
- 提供「在新标签页打开」兜底（`window.open`）

### 7.4 数据获取（TanStack Query）

沿用现有 queryKey 约定风格（参考 M07）：

```js
['materials','courses']                                    // 课程字典（轻量 API）
['materials','course', courseId, { type, examNode, page }] // 课程页
['materials','list', { q, course, type, examNode, sort, page }]
['materials','detail', path]
['materials','me','uploads', { page }]
['materials','upload','status', id]
['materials','stats']
```

`staleTime` 建议：列表 5min（与后端 index 缓存对齐）、详情 10min（CDN 已 7 天缓存）、状态轮询 `refetchInterval: 3000` 且**最多轮询 40 次**后停止并提示。

### 7.5 上传状态机（前端展示必须真实）

```
idle → validating(前端本地校验) → uploading → submitted → validating(GitHub Actions)
                                                              ├─ merged  → ✅ 已上线
                                                              ├─ rejected→ ❌ 显示原因
                                                              └─ timeout → ⚠️ 处理中，稍后到「我上传的」查看
```

**禁止**在收到后端 200 后就显示「上传成功」——必须等到 `merged`（FR-05 第 1 条）。

---

## 8. 资料库侧：Actions 与仓库配置

### 8.1 仓库设置（一次性，人工）

| 设置 | 值 | 依据 |
|------|-----|------|
| Visibility | **Public** | P1 |
| Allow auto-merge | ✅ 开启 | 官方文档：需配合分支保护 |
| Branch protection | 仓库已有 ruleset `rule`（作用于 `~ALL`）。需把 `validate` 加入其 `required_status_checks` | 官方文档明确 auto-merge **必须**有分支保护规则；当前该规则存在但列表为空 = 没有门禁 |
| ruleset ref 豁免 | 增加 `exclude: ["refs/heads/upload/*", "refs/heads/tmp/*"]` | **必须**，否则上传分支永远删不掉，见 §8.4 |
| Automatically delete head branches | ✅ 开启 | 配合上一条，merge 后自动清理 `upload/*` 分支 |
| Required approvals | **0** | bot 无法 approve 自己的 PR，必须为 0，否则永不 merge |
| Allow squash merging | ✅ | §4.3 合并策略 |
| Allow force push | ❌ | 保护历史 |
| Actions permissions | **Read only** | main 上不需要回推，见 §8.2；写权限会构成提权链，见 §9 |
| CODEOWNERS | `.github/**` 与 `index.json` 归管理员，并开启 **Require review from Code Owners** | 堵住 §9 的提权链；其余路径仍可自动合并 |
| Squash merge 标题 | 定为 `[materials] <title> (<courseName>)` | 便于 git log 追溯 |

### 8.2 资料库侧脚本（**已实现**）

落地为「只读 workflow + 校验器 + 生成器」三个文件，源码见本仓库 `materials-repo/`（由
`scripts/materials/bootstrap-materials-repo.js` 推送到资料库）：

| 文件 | 作用 |
|------|------|
| `.github/workflows/validate.yml` | **只读**（`permissions: contents: read`）。`pull_request` 触发，check 名称 `validate`，作为分支保护的 required status check |
| `.github/scripts/validate.mjs` | 校验器。**独立实现**，故意不与后端生成器共享代码（共享实现 = 共享 bug），用于校验而非生成 |
| `.github/scripts/build-index.mjs` | 生成器 / 修复工具。管理员手工加文件后重建索引；同时是后端生成器的参考实现。支持 `--check` 只检查 |
| `.github/scripts/lib/rules.mjs` | 规则单一来源：枚举、体积上限、黑名单、路径正则 |
| `.github/scripts/lib/walk.mjs` | 文件遍历 + 体积格式化 |

**校验器实际查的内容**：

```
A. 绊线：PR 改动了 .github/** → 直接失败（堵 §9 的提权链）
B. 路径：只允许 c<id>/<notes|lecture|exam|answer|other>/<file> 与顶层保留文件
C. 文件名：字符集（禁 # ? % & = + : ; , @ $ ! * ' " ( ) [ ] { } | \ < > ^ ~ `）、
           长度、无隐藏文件、无首尾空格、无 ".."
D. 扩展名：必须在白名单内，且不得命中永久黑名单（HTML/SVG/JS/可执行…）
E. 体积：单文件 ≤20MB；材料总量 ≤1GB
F. index.json：schema 正确 + 与磁盘**双向一致** —— 幽灵条目 / 缺条目 /
   type 与路径不符 / courseId 与 c<id> 不符 / kind 与扩展名不符 /
   examNode·source 枚举 / source 仅限 exam / title 非空 / size 与磁盘一致 /
   courses[] 覆盖所有被引用的 courseId
```

**`index.json` 由谁写**：**后端在上传 PR 内一并写入**（与材料文件同一个 commit）。

> 为什么不做「push 到 main 后重新生成 index.json」的 job：
> 分支保护一旦开启「Require a pull request before merging」，来自 Actions 的直推同样会被拒绝，
> 那样的 job 必然失败。把生成动作前移进上传 PR 即可绕开这个矛盾，并让 main 永远不需要回推。
> 代价：**并发上传会在 `index.json` 上冲突**，由后端重试解决（§4.4）。

**元数据从哪来**：不解析 PR body（脆弱）。后端直接把**完整条目**写进 `index.json`。
`build-index.mjs` 是**保留式**生成器：已有条目的 `title`/`tags`/`lesson`/`examNode`/`source`
原样保留，只补齐缺失项、删除幽灵条目、刷新 `size`/`sha256`。因此它是「修复工具」而非日常链路。

### 8.3 校验失败的可见性

PR 打 label `validation-failed` + 评论说明原因。后端 `GET /upload/:id/status` 读取该 label 与评论，把原因回显给上传者。

> 失败**不会**自动关闭 PR（保留证据）；同时 required check 不通过 → auto-merge 不会发生 → PR 会停在待人工处理状态。

### 8.4 仓库现有 ruleset 的约束（**实测发现，必须处理**）

实测 `GET /repos/James898-boom/Xmum-opensource/rulesets` 得知：仓库已存在一个名为 `rule` 的
**active** ruleset，作用于**所有分支**，且**没有任何豁免**：

```
conditions.ref_name.include = ["~ALL"]
bypass_actors = []            ← 连 owner 也不能绕过
rules: deletion · non_fast_forward · required_status_checks(列表为空)
```

**它对本模块的四点影响：**

| 规则 | 影响 | 实测证据 |
|------|------|----------|
| `deletion` | **任何分支都无法删除** → 原「删除分支重建」的重试策略不可用；每次上传会**永久留下一个分支** | `DELETE /git/refs/heads/tmp/perm-probe` → `422 Repository rule violations found / Cannot delete this branch` |
| `non_fast_forward` | 禁止强推 → 重试要在同一分支上**追加 commit**，不能 reset（除非按下面第 1 条豁免后才可以 force-push） | ruleset 明细 |
| `required_status_checks` | ① required 列表为空 = 没有门禁，auto-merge 不会出现；② **一旦填入 check 名，它同时拦截对 main 的直推** | 见下 |

**③ required checks 也拦截「直推 main」（v1.6 实测，影响架构）**

填好 required checks 之后，任何**直接提交/更新 main** 的操作都会失败：

```
Contents API PUT  →  409 Repository rule violations found
                     2 of 2 required status checks are expected
```

这推翻了初稿「管理员维护动作可以直推 main 以求即时」的假设。因此
**下架（`removeMaterial`）与课程合并重写索引（`commitIndex`）也必须走 PR + auto-merge**
（已统一改为经由 `publishChange()`）。代价是下架不再是「即时」，需等 PR 合并才生效 ——
这与设计里「下架 = 尽力而为」的口径一致。

**④ 连「创建分支」都被拦：所有自动化分支必须落在 exclude 前缀下（v1.6 实测）**

在 required checks 生效后，**只要分支不在 ruleset 的 exclude 列表里，连创建 ref 都会失败**：

```
POST /git/refs  refs/heads/chore/materials-bootstrap-xxx
  → 422 Reference update failed
```

原因：新 commit 上还没有任何 check 结果，直接违反 required_status_checks。

**结论：所有由代码创建的分支必须使用 `upload/*` 或 `tmp/*` 前缀。**
当前实现已满足：上传 `upload/<id>-c<course>-<sha8>`、元数据 `upload/meta-*`、
下架 `upload/remove-*`、索引维护 `upload/maint-*`、引导脚本 `tmp/bootstrap-*`。

**必须做的三处调整：**

1. **给 ruleset 的 ref 条件加排除**，让上传分支不受这三条规则约束：

   ```
   conditions.ref_name.include = ["~ALL"]
   conditions.ref_name.exclude = ["refs/heads/upload/*", "refs/heads/tmp/*"]
   ```

   这样 `main` 继续受保护，而 `upload/*` 分支可以 **force-push（重试友好）** 与 **删除（不累积垃圾）**。

2. **把 `validate` 加入 `required_status_checks`**，并开启 **Allow auto-merge** 与
   **Automatically delete head branches**（后者配合第 1 条，merge 后自动清理分支）。

   > ⚠️ **列表里只能有 `validate` 一个**。实测当前除了 `validate`（来自 Actions）还多了一个
   > 名为 `check` 的条目，但仓库里只有 `validate.yml` 一个 workflow，**没有任何东西会产生 `check`**。
   > 后果：PR 会永远停在「Expected — Waiting for status to be reported」，
   > **auto-merge 永不触发**，上传永远卡在 `pending`。必须把 `check` 删掉。

3. **所有写操作一律走 PR**（含下架与索引维护），**不得直推 main** —— 原因见上面 ③。

> ⚠️ **鸡生蛋问题**：`validate` 这个 check 名称**只有在 workflow 跑过至少一次之后**才会出现在
> ruleset 的勾选列表里。正确顺序是：先放 `validate.yml` → 开一个测试 PR 触发一次 →
> 再去把 `validate` 勾成 required。

**若暂不调整 ruleset 的降级方案**：后端重试必须「查同名分支 → 存在则 `POST /git/commits`
（parent = 分支当前 HEAD）→ `PATCH /git/refs` 推进」，**永不删除**；并接受分支永久累积。

---

## 9. 安全设计

| 威胁 | 缓解 |
|------|------|
| **PAT 泄漏到前端** | PAT 只读 `process.env`，只在 `services/githubMaterials.js` 使用；CI/验收时对 `frontend/dist` 全文检索 `github_pat_` 必须为空 |
| **CI 提权链（新识别，已在脚本层堵住）** | 资料库启用 auto-merge + required approvals=0，若 validate workflow 再持有 `contents: write`，则**任何能开 PR 的人改掉 `.github/workflows/**` 即可让 CI 以写权限执行任意代码**。三重缓解：① workflow 只给 `contents: read`；② 校验器把 `.github/**` 的改动判为**硬失败**（required check 不绿 → auto-merge 不发生；若攻击者删掉/改名 job，required check 永不上报，PR 同样卡死）；③ CODEOWNERS + Require review from Code Owners 把 `.github/**`、`index.json` 纳入人工审查 |
| **存储型 XSS（MD 注入）** | 禁止渲染 raw HTML（§7.2）；`react-markdown` 默认转义 |
| **恶意文件类型伪装** | 魔数嗅探（FR-07 第 4 步），不信任 `Content-Type` 与扩展名 |
| **路径穿越** `../../etc/passwd` | 后端对 `path` 做归一化：禁止 `..`、禁止绝对路径、禁止 `%2e%2e`；白名单字符集（§2.2） |
| **上传刷量** | 5 次/小时/用户 独立限流；全站 2500/15min 仍然生效 |
| **敏感内容上线** | FR-07 前置校验 + Actions 二次校验 + admin 下架 |
| 内存爆 | `getFileText` 硬限 1MB，超限返回 413 |
| **存储型 XSS（攻击者上传 HTML/SVG）** | 见 §16.1：**必须硬排除 `.html/.htm/.shtml/.xhtml/.svg/.js/.mjs/.xml`**。若启用 GitHub Pages 则该风险等级从「无」升为「高」——Pages 无法加 `nosniff`/CSP，交付的 HTML 会在 `*.github.io` 源上执行 |
| **CSRF** | 现有 API 用 `Authorization: Bearer`（非 Cookie），天然免疫；不引入 Cookie 鉴权 |
| **git 仓库被塞垃圾** | 单文件 20MB + 仓库 1GB 上限校验 + admin 可清理 |
| **版权/DMCA** | `LICENSE` + `README` 声明 + 上传声明勾选 + 快速下架通道（R1、R2） |
| **token 进日志** | 日志脱敏；`healthcheck` 只输出剩余额度不输出 token |

---

## 10. 环境变量

```bash
# ========== 学习资料模块（M10）==========
# 资料库（public 仓库）
GITHUB_MATERIALS_OWNER=James898-boom
GITHUB_MATERIALS_REPO=Xmum-opensource
GITHUB_MATERIALS_BRANCH=main
GITHUB_MATERIALS_CDN_BASE=https://cdn.jsdelivr.net/gh

# fine-grained PAT：仅 Contents(读写) + Pull requests(读写)，仅授权上面这一个仓库
# ⚠️ 绝不提交到 Git；绝不通过任何接口下发到前端
GITHUB_MATERIALS_TOKEN=

# 功能开关与限额
MATERIALS_ENABLED=1                 # 0 = 暂停受理新上传（应急开关）
MATERIALS_MAX_FILE_MB=20            # 单文件上限
MATERIALS_UPLOAD_ROLE=student       # student | admin
MATERIALS_UPLOAD_PER_HOUR=5         # 单用户每小时上传次数
MATERIALS_INDEX_CACHE_MS=300000     # index.json 服务端缓存 5 分钟
```

---

## 11. 与现有模块的复用对照

| 需求 | 复用对象 | 位置 |
|------|----------|------|
| Markdown 渲染 | `react-markdown` + `remark-gfm` | `frontend/package.json`；用法见 `HandbookArticleDetail.jsx:367` |
| 鉴权 | `authenticateToken` | `middleware/auth.js` |
| 管理员鉴权 | `requireAdmin` | `middleware/adminAuth.js` |
| 敏感词 | `getSensitiveWords` / `checkText` | `middleware/sensitiveWordFilter.js` |
| 审计 | `logAudit` | `services/auditLog.js` |
| 统一响应 | `{ status, message, data }` | 全站约定 |
| 前端请求层 | `request/get/post/del` | `shared/api/request.js` |
| Query keys | 命名风格 | `shared/query/queryKeys.js` |
| 课程种子 | 从 `timetable_courses` 聚合 distinct `(course_name, lecturer)` 作为课程字典种子 | `migrations/009_timetable_import.sql` |
| 迁移执行器 | `applySqlFile` | `scripts/apply-sql-file.js` |

**明确不复用**：`services/objectStorage.js`（R2）——一期刻意不用，保留给 FR-15 的大文件通道。

---

## 12. 测试计划

### 12.1 后端（`__tests__/materials.test.js`）

| # | 用例 | 断言 |
|---|------|------|
| T-01 | 未登录上传 | 401 |
| T-02 | 非白名单扩展名（`.exe` 改名 `.pdf`） | 400 + 魔数校验拦截 |
| T-03 | 超过 20MB | 400 + 明确提示 |
| T-04 | 命中敏感词（**元数据**） | 400 + `meta.word`/`meta.field`（正文不扫，见 §17.11） |
| T-05 | 重复 sha256 | 400 + 返回已有资料 |
| T-06 | 正常上传（mock GitHub） | 200 + 落库 `pending` + 调用链正确 |
| T-07 | GitHub 返回 401 | 500 + `MATERIALS_GITHUB_AUTH_FAILED` + 不重试 |
| T-08 | GitHub 返回 5xx | 重试 2 次后失败 |
| T-09 | 路径穿越 `../../x` | 400 |
| T-10 | 非本人删除 | 403 |
| T-11 | admin 删除任意 | 200 + 审计日志 |
| T-12 | index 缓存 | 连续 2 次 GET 只打 GitHub 1 次 |
| T-13 | 限流 5/小时 | 第 6 次 429 |
| T-14 | `MATERIALS_ENABLED=0` | 上传 503 |

### 12.2 前端手工验收

| # | 场景 |
|---|------|
| M-01 | 游客浏览列表 → 打开 MD → 目录/代码块/图片正常 |
| M-02 | 打开 PDF → iframe 内联渲染（**不是下载**） |
| M-03 | 下载 → 文件名是原始名、页面不跳走 |
| M-04 | 上传 8MB PDF → 状态机走到「已上线」 |
| M-05 | 上传 15MB PDF → 前端提前拦截 |
| M-06 | DevTools Network 面板确认：浏览/预览/下载全程**无 `/api` 请求**（除列表与计数） |

### 12.3 验收命令（NFR-01）

```bash
# 后端零文件流量的实证：预览一个 PDF 期间，后端日志应无对应请求
tail -f <后端日志> | grep -i materials
# 预期：只有 /api/materials（列表）与 /api/materials/:id/download（计数）
```

---

## 13. 实施步骤

| 阶段 | 步骤 | 产出 | 可并行 |
|------|------|------|--------|
| **0** | **实测 T1–T4**（§3.4） | 实测记录，回填本文档 | ❌ 必须先做 |
| 1 | 建专用小号 + 资料库 + PAT + 分支保护 + `validate.yml` | 可用的空资料库 | ✅ 与 2 并行 |
| 2 | `migrations/069_materials.sql`（courses + course_aliases + materials + 收藏 + 下载）+ `init-db.sql` 同步 + 执行器 | 表就绪 | ✅ 与 1 并行 |
| 3 | `services/githubMaterials.js` + `services/courseCatalog.js` + `healthcheck` | 能读能写 GitHub + 课程解析 | ❌ |
| 4 | `services/materialValidation.js` + 单测 | 校验层绿 | ✅ 与 3 并行 |
| 5 | `routes/materials.js` + 挂载 + 集成测试 | API 可用 | ❌ 依赖 3、4 |
| 6 | `shared/api/materials.js` + `shared/constants/materials.js` | 前端契约 | ✅ 与 5 并行 |
| 7 | 前端列表页 + MD 渲染 | 可浏览 | ❌ |
| 8 | 前端 PDF 预览 + 降级链 | 可预览 | ✅ 与 7 并行 |
| 9 | 上传页 + 状态机 | 可上传 | ❌ 依赖 5、6 |
| 10 | admin 下架页 + 看板 | 可治理 | ✅ 与 9 并行 |
| 11 | 移动端「打开 / 下载」入口 | RN 可用 | ✅ |
| 12 | 08-Test 测试报告 + 07-Implement 实施记录 | 文档闭环 | ❌ |

---

## 14. 未决问题

| # | 问题 | 建议 | 阻塞谁 |
|---|------|------|--------|
| Q1 | 资料库仓库 / 小号 | `James898-boom/Xmum-opensource` | ✅ 已定 |
| Q2 | jsDelivr 20MB 上限实测结果 | 阶段 0 实测 | 阶段 1、FR-05 上限 |
| Q3 | 中文文件名的 CDN 表现（T3） | 阶段 0 实测；不合规则改用英文路径 | 阶段 3、7 |
| Q4 | `index.json` 元数据通过 PR body 传递是否可靠 | 备选：引入 `<path>.meta.json` 旁车文件 | 阶段 1 |
| Q5 | 下载计数防刷 | 一期不防（已定） | ✅ 已定 |
| Q6 | 是否需要 `npm run migrate:materials` 脚本别名 | 建议加，与现有 `migrate:ads` 风格一致 | 阶段 2 |

---

## 15. 变更历史

| 日期 | 版本 | 变更 | 作者 |
|------|------|------|------|
| — | v1.0 | 初稿。已锁定：写路径走后端、专用小号 + 独立库、一期仅出文档 | — |
| — | v1.1 | 补 §16（Pages 决策与新识别问题）；存储口径更正见 `技术约束.md` | — |
| — | v1.2 | **grill 定稿**：课程字典（身份=名字+讲师，code 可选）、三层 details、软去重、元数据可改（metadata-only PR）、课程字典走轻量 API | — |
| — | v1.3 | **脚本落地**：`materials-repo/` 脚手架（只读 workflow + 校验器 + 生成器）；`index.json` 改为**后端在上传 PR 内写入**（去掉 push-to-main 回推，规避分支保护冲突）；新增 CI 提权链防护（§9） | — |
| — | v1.4 | **实测发现仓库 ruleset**（§8.4）：作用全部分支且无豁免，`deletion` 使分支永不可删 → 重试策略改为「复用分支」；需给 ruleset 增加 `upload/*`、`tmp/*` 豁免并把 `validate` 加入 required checks。另：PAT 实测无需 Workflows 权限即可用 Git Data API 建分支/传 blob（§4.1） | — |
| — | v1.5 | **阶段 0 实测完成**（§3.4）：jsDelivr 上限恰为 20 MiB（含）、中文路径可用、PDF Content-Type 正确、20MB 上传 8.5s、大 blob 偶发 502 需重试、PR 校验链路真实生效。**Plan A 成立** | — |
| — | v1.6 | **后端落地**（§17）：constants/迁移/校验/上传/GitHub 通信/课程字典/15 条路由/前端 API 层；测试 31 用例 + 全量 633 全绿。修复两个真实 bug（错误映射未接线、中文文件名 latin1 乱码）。编号 M09→M10 修正（M09 已被万能墙占用） | — |
| — | v1.7 | **端到端跑通**（§17.8）：生产代码创建 PR #5 → validate success → **auto-merge 成功** → index.json 与中文路径落 main → jsDelivr 字节一致 → 分支自动清理。另实测 required checks 也拦截**直推 main**（409）与**新建分支**（422），故所有写操作与自动化分支都必须走 PR / 落在 `upload/*`、`tmp/*` | — |
| — | v1.8 | **前端落地**（§18）：6 个页面 + 6 个组件 + 导航入口；纯逻辑抽到 `shared/utils` 并补 15 个用例；修复被既有守卫抓到的两个真 bug（`process` 未定义会让管理页整条路由崩溃、`mailto:` 字面量触发联系方式守卫）。全量 652 用例全绿 | — |
| — | v1.9 | **生产迁移执行 + 上线后修复**（§17.9/§17.10）：`069_materials.sql` 已在 Railway 生产库执行（5/5 表 + 伪课程就绪）。上线探活发现 `GET /api/materials/courses` **500**，根因是 `LIMIT ?`（二进制预处理 + JS number → errno 1210），共 3 处；新增 `utils/sqlLimit.js` 内联整数 + 静态守卫测试（含阳性对照）。同时修正「尚未配置」横幅的误导文案（它声称"只能浏览缓存"，实际返回空列表） | — |
| — | v1.10 | **敏感词误伤修复**（§17.11）：正文不再参与敏感词检查（词表含 `fk`/`sb` 两字母缩写，套到 1MB 课件正文上 7 个正常场景误杀 5 个）；拒绝时回传命中的词与字段；全局中间件的 ASCII 词改为**词边界**匹配（`USB`/`ISBN`/base64 不再误伤）。FR-07 同步修订 | — |

---

## 16. 补充：GitHub Pages 决策与新识别问题

> 本节回应「能否用 `github.io` 部署」的追问，并登记第一轮未覆盖的问题。

### 16.1 GitHub Pages 决策：**一期不启用**

实测结论（详见[可行性评估 §2.6](../../02-Clarify/feasibility/学习资料模块可行性评估.md)）：Pages **技术上完全可用**（PDF `Content-Type` 正确、有 CORS、Fastly 加速、中文路径友好、无 20MB 限制），但有一个否决性约束：

> **Pages 无法自定义响应头，且实测不发送 `nosniff`。任何被交付为 `text/html` 或 `image/svg+xml` 的文件都会在 `*.github.io` 源上执行 JS。**

在「学生可上传」的前提下，这等于给攻击者一个同源页面，而**我们既不能加 CSP 也不能加 nosniff**。因此：

| 项 | 决定 |
|----|------|
| 一期 | **不启用 Pages**，分发走 jsDelivr |
| Plan B | 若实测发现 jsDelivr 的 20MB 上限或中文路径不可用 → **按目录**启用 Pages 仅承接 PDF，MD/JSON 仍走 jsDelivr |
| 启用前提（三者缺一不可） | ① 白名单硬排除 HTML/SVG 类扩展名 ② Actions 二次校验 ③ `CONTRIBUTING.md` 明示 |
| 混合模式可行性 | ✅ 可行。Pages 无 commit pin，但 PDF 单文件自包含、变更频率低，不需要 pin；MD 需要 pin 规避 7 天缓存，正由 jsDelivr `@sha` 提供 |

**同时把下列扩展名加入永久黑名单**（无论是否启用 Pages，都是纵深防御）：

```
html htm shtml xhtml xht svg svgz js mjs cjs xml xsl xslt xsd rss atom
hta htc jsp asp aspx php phtml
exe dll bat cmd com scr msi ps1 sh bash zsh py rb pl jar apk
```

### 16.2 新识别问题（第一轮未覆盖）

| # | 问题 | 影响 | 处置建议 | 优先级 |
|---|------|------|----------|--------|
| **N1** | **去重策略误伤**：`uk_sha` 全局唯一，**两个不同课程上传同一份内容会被拒** | 中（真实场景：同一份公共讲义被两门课引用） | 改为**软去重**：同 sha 且同路径 → 拒绝；同 sha 异路径 → 允许，但前端提示「库中已存在相同文件，仍要上传？」 | 高 |
| **N2** | **RN 端 PDF 渲染**：React Native / Capacitor 无原生 PDF iframe | 中 | RN 用 `expo-web-browser` / Capacitor `@capacitor/browser`（已在 `package.json` 依赖中）打开 jsDelivr URL，交给系统查看器 | 高 |
| **N3** | **架构阶段缺失**：本模块直接进了 04-Module，跳过了 03-Architecture | 低（流程合规） | 本设计的 §1、§2、§4.1 实际承担了架构职责；建议后续在 `03-Architecture/` 补一份「外部存储分发架构」索引，指向本文档 | 中 |
| **N4** | **CDN 无法强下架**：jsDelivr 官方宣称「文件从 GitHub 删除后仍永久缓存」 | **高** | ① `docs` 层明确写死「下架 = 尽力而为，不保证即时」 ② 保留 jsDelivr purge 工具作应急 ③ admin 下架页必须展示该警示（已在 FR-08 落地） | 高 |
| **N5** | **单一订阅点**：所有请求都过 `GITHUB_MATERIALS_OWNER/REPO`，改名/迁移即全站 404 | 中 | `index.json` 内嵌 `baseUrl` 作为真相源，环境变量只用于「写入」；读取优先用 index 里的 baseUrl | 中 |
| **N6** | **无离线兜底**：若 GitHub 排查账号（可能性低但非零）或校园网阻断 | 中 | ① 后端 `fetchIndex` 落一份 **本地快照**（`data/materials-index.cache.json`）② 提供 `scripts/materials-export.js` 从 R2 反向重建入口 | 中 |
| **N7** | **与 handbook 的边界**：两者都是「文章 + 文件」，容易重复建设 | 中 | 在需求文档明确：**资料库 = 文件下载为主，不做互动**；handbook = 图文内容 + 互动。**资料不实现评论/点赞**，只做收藏 + 下载计数 | 中 |
| **N8** | **`index.json` 元数据投递依赖 PR body 解析**，较脆弱 | 中 | 备选：改为「旁车文件」`<path>.meta.json`（Actions 读取后**删除**，不留在 index 里），比解析 PR body 更稳 | 中 |
| **N9** | **仓库体积无限增长**，无生命周期策略 | 中 | admin 看板展示体积；设阈值告警（如 >700MB 提醒清理过期资料）；毕业/学期结束后归档策略 | 低 |
| **N10** | **GitHub API 版本漂移**：Rest API 有版本头（文档当前为 `2026-03-10`） | 低 | 所有请求显式带 `X-GitHub-Api-Version`，固定到已知版本，避免行为漂移 | 低 |
| **N11** | **下载计数写放大** | 低 | `material_downloads` 只插入；`materials.download_count` 由**定时聚合**而非每次 +1 | 低 |
| **N12** | **`.nojekyll`** | 低 | 若启用 Pages，需在仓库根放 `.nojekyll`，否则下划线开头目录（如 `_misc/`）会被 Jekyll 忽略 | 低 |
| **N13** | **宪法已更正**：图片实际走 R2，非「本地存储」 | — | ✅ 已完成：`技术约束.md` 第 14 行更正 + 新增「存储形态（权威口径）」一节 | ✅ 已完成 |
| **N14** | **课程/三层模型已定稿**：身份=名字+讲师（code 可选）、三层 details、软去重、元数据可改 | — | ✅ 已完成：见 §2、§4、§6（v1.2） | ✅ 已完成 |

### 16.3 更新后的实施顺序

在原 §13 的 **阶段 0** 之前插入：

| 阶段 | 步骤 | 说明 |
|------|------|------|
| **-1** | ~~关闭 N1 / N2 / N4~~ | ✅ 已在 grill 中定稿：N1→软去重、N2→`expo-web-browser`/Capacitor 浏览器、N4→文档写死「下架 = 尽力而为」 |

---

## 17. 实施记录（后端已落地并测试）

### 17.1 已交付文件

| 文件 | 说明 |
|------|------|
| `shared/constants/materials.js` | **规则单一来源**（ESM）。后端 `require()` 同一份 —— 项目已有 `require(ESM)` 先例（`routes/confessions.js → shared/utils/nestComments.js`），因此不需要像 `levelConfig` 那样维护两份 |
| `migrations/069_materials.sql` | 建 5 张表 + 伪课程种子 |
| `scripts/run-migration-069-materials.js` | 迁移执行器（含建表结果与伪课程的**逐项核对**） |
| `package.json` | 新增 `npm run migrate:materials` |
| `init-db.sql` | 已同步 069 的最终状态（数据库铁律要求） |
| `services/materialErrors.js` | 带 code 的错误类型 + code→HTTP 映射 |
| `services/materialValidation.js` | 扩展名 / 体积 / 魔数嗅探 / 元数据 / 敏感词 / 软去重 |
| `utils/multipartFilename.js` | 中文文件名 latin1 修复（见 §17.3②） |
| `middleware/materialUpload.js` | multer 内存存储 + 20 MiB + 扩展名过滤 + 错误翻译 |
| `services/githubMaterials.js` | 唯一 GitHub 通信层：blob 退避重试、**分支复用**、PR/auto-merge、index 读写 + 本地快照 |
| `services/courseCatalog.js` | 课程字典：解析 / 自注册（含并发竞态处理）/ 别名 / 合并（含 index 重写） |
| `routes/materials.js` | 15 条路由 |
| `shared/api/materials.js` | 前端 / RN API 层 + 本地预校验 |
| `__tests__/routes/materials.test.js` | 31 个用例 |
| `.env.example` | 新增 `GITHUB_MATERIALS_*` / `MATERIALS_*` 说明与 PAT 权限要求 |

### 17.2 测试结果

```
npx jest __tests__/routes/materials.test.js   →  31 passed
npx jest                                      →  43 suites / 633 tests 全绿（零回归）
```

其中含一项**双实现一致性守卫**：测试直接读取资料库仓库的
`.github/scripts/lib/rules.mjs`，断言 `TYPES` / `EXAM_NODES` / `SOURCES` / `EXT_KIND` /
体积上限 / 黑名单与后端常量完全一致。只改一边就会立刻失败。

### 17.3 实施中发现并修复的两个真实 bug

**① 路由错误映射未接线 —— 所有业务错误都会退化成无 code 的 500**

`wrap()` 最初写成 `.catch(next)`，但本项目**没有全局错误中间件**，
于是 `MaterialError` 携带的 `httpStatus` / `code` 全部丢失。
已改为在 `wrap()` 内直接调用 `fail()`，前端才能拿到 `MATERIALS_TOO_LARGE` 这类可读错误码。

**② 中文文件名被 multer/busboy 按 latin1 解码 —— 会让中文资料全程乱码**

```
发送 "讲义.pdf"  →  multer 实际收到 "è®²ä¹.pdf"
```

若不修：资料会**以乱码名存进仓库**、`index.json` 里 path/name 是乱码、
**用户下载到的文件名也是乱码**。

修复：`utils/multipartFilename.js` 把 latin1 字节序列按 utf8 重新解释，
并用 **U+FFFD 守卫**保证幂等 —— 本来就是正确 UTF-8 的名字不会被二次破坏；
同时在 `safeFileName()` 内再兜一层（多层调用安全）。

### 17.4 编号修正：M09 → M10
本模块最初误编号为 **M09**，但 `docs/04-Module/README.md` 的权威索引中
**M09 已经是「万能墙」**（`docs/04-Module/M09-万能墙/`、`confessions.test.js` 等都标注 M09）。

已全线更正为 **M10**：目录 `M10-学习资料/`、文档 `Module10-学习资料设计.md`，
以及需求 / 可行性 / 宪法 / 代码注释 / 资料库 `CONTRIBUTING.md` 的引用。
**万能墙的 M09 未受影响**（已 grep 验证）。

### 17.5 设计相对初稿的累计调整

| 初稿 | 现在 | 原因 |
|------|------|------|
| 后端从 CDN 读 `index.json` | **从 GitHub API 读** | CDN 缓存 7 天，读旧副本回写会**回滚他人的条目**（§4.5） |
| `push to main` 后由 Actions 生成 index | **后端在上传 PR 内直接写 index** | 分支保护会拒绝 Actions 直推 main（§8.2） |
| `POST /:id/download` 计数 | `POST /download` + `{path}` | 管理员手工加入的文件没有 DB 行（§4.2 注） |
| 单文件上限 10MB | **20 MiB** | 实测 jsDelivr 上限恰为 20 MiB（§3.4） |
| 目录用课程编码 `G0173/` | **`c<courseId>/<type>/`** | 课程身份 = 名字+讲师，code 可选且可合并改名（grill 结论） |
| 上传重试可「删除分支重建」 | **只能复用同名分支** | ruleset 的 `deletion` 规则（§8.4） |
| 管理员下架 / 课程合并索引可**直推 main** | **必须走 PR** | required checks 也拦截直推，直推返回 409（§8.4 ③） |
| 模块编号 M09 | **M10** | M09 已被万能墙占用（§17.4） |

### 17.6 资料库侧的必要设置（运维清单）

以下四项**必须在资料库仓库的网页端完成**，否则上传链路会在某个环节静默卡住：

| # | 事项 | 不做的后果 |
|---|------|-----------|
| **1** | required checks **只保留 `validate`，删掉 `check`** | 仓库只有 `validate.yml` 一个 workflow，**没有任何东西会产生 `check`** → PR 永远停在「Expected — Waiting for status to be reported」→ auto-merge 永不触发 → 上传永远 `pending` |
| **2** | ruleset 的 exclude 保持 `refs/heads/upload/*` 与 `refs/heads/tmp/*` | ① 上传分支删不掉（`deletion` 规则），永久累积垃圾；② **新建分支本身**会被拒（`422 Reference update failed`），上传第一步就失败 |
| **3** | 给管理员账号加 **ruleset bypass**（或临时关闭规则） | 修 `.github/**` 的 PR 会被校验器**绊线判失败**，而 required check 失败时没有 bypass 就**无法合并** —— 会把 CI 永久锁死 |
| **4** | 开启 **Allow auto-merge** + **Automatically delete head branches** | auto-merge 无法开启；合并后分支靠第 2 条自动清理 |

> 第 1 与第 2 条是本模块实测踩出来的（§8.4 ③④），不是理论风险。
> 第 3 条是「绊线设计」的必要配套：绊线阻止了攻击者，也阻止了管理员自己。

### 17.7 引导脚本的 `--via-pr` 模式

`scripts/materials/bootstrap-materials-repo.js` 新增 `--via-pr`：
分支保护生效后，原「Contents API 直推 main」的写法必然 409，因此改为
`blob → tree（base_tree=main）→ commit → 分支 → PR`。分支前缀为 `tmp/bootstrap-*`
（原因见 §8.4 ④）。

支持 `--only=<相对路径,...>` 精确指定要同步的文件，例如只改 `CONTRIBUTING.md`：

```bash
node scripts/materials/bootstrap-materials-repo.js --apply --via-pr --only=CONTRIBUTING.md
```

**校验器的引导状态修复**：原校验器无条件要求 `index.json` 存在，但该文件是由
**首份资料的上传 PR** 创建的 —— 空仓库的引导 PR 必然失败（鸡生蛋）。
现改为：**无材料文件时缺 `index.json` 只警告不报错**；有材料却缺索引仍报错。
本地三用例验证：空仓库→通过、有材料无索引→失败、生成索引后→通过。

### 17.8 端到端实测（**生产代码 + 真实仓库**）

用 `services/githubMaterials.js` 的**真实生产代码**（仅用假数据替代 DB 那一步）跑了一次完整上传：

```
readIndex → putBlob(材料) → putBlob(index.json) → createTree → createCommit
  → createRef(upload/9001-c7-5c05e3c7) → openPullRequest(#5) → enableAutoMerge
```

| 环节 | 实测结果 |
|------|----------|
| PR 创建 | #5，`mergeable_state=blocked`（等 validate，符合预期） |
| validate | `completed / success` |
| **auto-merge** | ✅ **自动合并成功**（`state=closed, merged=true`） |
| `index.json` | 落 main，`schemaVersion=2`；中文 `path`/`title`/`courseName` **全部完好** |
| 材料文件 | 落在 `c7/notes/2025-09-第三课时-链表与树.md` |
| **jsDelivr 分发** | ✅ 200 `text/markdown`，**内容 sha256 与仓库逐字节一致** |
| raw 兜底 | ✅ 200 `text/plain` |
| 分支清理 | ✅ `upload/9001-*` 合并后**自动删除** |

> **结论：写链路（后端 → GitHub PR → CI → auto-merge）与读链路（后端列表 → jsDelivr 字节）
> 均已端到端跑通，中文路径全程无损。**

**遗留**：仓库里保留了一份描述标为「端到端连通性测试（可删除）」的示例资料，
作用是前端开发时列表不为空；随时可走站点下架流程移除（顺带验证下架链路）。

**仍未完成的一步**：`bypass_actors` 为空，因此**修改 `.github/**` 的 PR 无法合并**
（校验器绊线判失败 + 无绕过权限）。运维清单第 3 条（§17.6）必须先做，
否则 CI 配置一旦需要更新就会被永久锁死。

### 17.9 上线后发现并修复的第三个真实 bug：`LIMIT ?` 让两个接口线上 500

**发现方式**：生产迁移完成后直接打线上接口探活，`GET /api/materials/courses` 返回 **500**。

```
GET https://xmumdorm-200-lyzz-production.up.railway.app/api/materials/courses
→ HTTP 500
```

**根因**（本地对同一台库逐项二分后确认）：

`database.js` 的 `query()` 用的是 `pool.execute()`，也就是 mysql2 的**二进制预处理协议**。
在 Railway 托管的那台 MySQL（9.7.2）上，把 JS **number** 绑到 `LIMIT` 占位符会抛：

```
ER_WRONG_ARGUMENTS (1210) Incorrect arguments to mysqld_stmt_execute
```

二分结果（同一台库、同一连接）：

| 写法 | 结果 |
|------|------|
| `LIMIT ?` + number `200` | ❌ errno 1210 |
| `LIMIT ?` + string `'200'` | ✅ 通过（靠服务端隐式转换，不可依赖） |
| `LIMIT 200`（内联字面量） | ✅ 通过 |

**这不是本模块新引入的坑**：`routes/canteen.js` 早已踩过同一个坑并在原处留了注释
（`// LIMIT 使用内联整数：部分托管 MySQL + mysql2 对 LIMIT ? 预处理偶发异常`），
**唯一没被遵守的就是本模块**。共 3 处：

| 位置 | 受影响接口 | 线上表现 |
|------|-----------|---------|
| `services/courseCatalog.js` `listCourses()`（带计数） | `GET /api/materials/courses` | **实测 500** |
| `services/courseCatalog.js` `listCourses({withCounts:false})` | 内部/预留调用 | 500 |
| `routes/materials.js` `/me/uploads` | `GET /api/materials/me/uploads` | 500 |

**为什么 31 个路由用例全绿却没抓到**：那些用例 **mock 掉了 `query()`**，
SQL 从未真正打到 MySQL。这是一个结构性盲区 —— 见 §17.10。

**修复**：
1. 新增 `utils/sqlLimit.js`（`inlineLimit` / `inlineOffset`）：先把值收敛成有界整数，
   再内联进 SQL 文本。结果一定只有十进制数字，不引入注入面。
2. 3 处全部改为内联。顺带修掉 `Number(null) === 0` / `Number('') === 0` 的坑：
   `?limit=` 现在回退到默认值，而不是静默变成 1 条。
3. 新增守卫测试 `__tests__/utils/sqlLimit.test.js`：扫描后端源码里的
   `LIMIT ?` / `OFFSET ?`（剥注释后再扫，所以 `canteen.js` 的说明性注释不会误伤），
   并带**阳性对照**——先造一个违规文件，确认守卫真的会红。
   确实是文本协议的地方可用行内 `sql-limit-placeholder-ok` 显式豁免。

**对着生产库的验证**（不是 mock）：

```
PASS  listCourses()                                    → 1 行（伪课程）
PASS  listCourses({withCounts:false})                  → 1 行
PASS  listCourses 带搜索词（LIKE ? 分支）              → 1 行
PASS  /me/uploads 那条（LIMIT/OFFSET 内联）            → 0 行，不报错
PASS  对照：旧写法 LIMIT ? 仍然 errno=1210（根因确认）  → 如预期失败
```

### 17.10 结构性教训：mock 掉 DB 的集成测试看不见 SQL 方言问题

§17.9 那个 bug 能穿过 31 个用例，原因不是断言写得不够，而是**根本没执行 SQL**。
本模块的集成测试用 mock 替换 `query()`，因此：

- ✅ 能覆盖：路由顺序、鉴权、参数校验、错误映射、响应结构
- ❌ 覆盖不到：SQL 语法/方言、占位符协议、索引是否命中、真实约束冲突

**结论**：涉及真实 SQL 的改动，除了 mock 用例，**必须**有一道能打到真库的验证。
本次采用的补法是一道**静态守卫**（不依赖 DB，能长期拦住同一类错误）+
一次**对生产库的手工验证**（一次性，但结论落在本节）。
后续若要把这道防线做成自动化的，需要引入一个可丢弃的测试库（当前无此设施）。

### 17.11 敏感词误伤事故：把短贴词表套到长文档上

**现象**：用户上传学习资料被拒 —— 「内容包含违规词汇，请修改后重新上传」，
但**没说是哪个词**，用户无从下手。

**排查**（拉生产库 `sensitive_words`）：

```
fk | fuck | sb | shit | 傻逼 | 操 | 曹你妈 | 草你妈 | 草尼玛 | 草泥马      （共 10 个，全部启用）
```

匹配方式是最朴素的子串（`middleware/sensitiveWordFilter.js`）：

```js
const lower = text.toLowerCase();
if (lower.includes(w.toLowerCase())) return { hit: true, word: w };
```

而本模块把扫描范围设成了：`title` + `description` + `lessonTitle` + **所有 tags**
+ **`.md`/`.markdown`/`.txt` 正文的前 1MB**。

**`fk` 与 `sb` 是两个字母。** 于是在长文档里，误伤是必然的：

| 场景 | 现状（子串） | 加词边界后 | 该不该拦 |
|------|------------|-----------|---------|
| `FOREIGN KEY (FK) 用于建立表间关联` | ❌ 命中 `fk` | ❌ 命中 `fk` | 不该 |
| `南桥 SB 与北桥 NB 的分工` | ❌ 命中 `sb` | ❌ 命中 `sb` | 不该 |
| `USB 3.0 的传输速率` | ❌ 命中 `sb` | ✅ 通过 | 不该 |
| `ISBN 978-7-111-12345-6` | ❌ 命中 `sb` | ✅ 通过 | 不该 |
| `data:image/png;base64,iVBORw0K…gsb` | ❌ 命中 `sb` | ✅ 通过 | 不该 |
| `你这个傻逼` | ❌ 命中 `傻逼` | ❌ 命中 `傻逼` | **该拦** |

**7 个正常场景，5 个被误杀。**

**根因**：这套词表是给树洞/广场那种**几十字短贴**调的 —— 在短贴里「sb」几乎必然是骂人；
把它原样套到**最长 1MB 的课件正文**上，就变成了误报机器。
**词表与文本长度不匹配，是本模块的设计错误**，不是「门禁太严」。

**修复（用户裁定：正文完全不扫）**：

1. **正文不再参与敏感词检查**。`extractTextForScan()` 与 `MAX_SCAN_BYTES` 一并删除，
   避免日后再被顺手用起来。扫描范围只剩元数据四项。
2. **拒绝时回传命中的词与字段**：`meta: { word, field }`，消息形如
   `标题包含违规词汇「fk」，请修改后重新上传`。
   （`fail()` 本来就支持 `err.meta`，是 `assertNoSensitive` 没带。）
3. **ASCII 词改用词边界**（`middleware/sensitiveWordFilter.js` 的 `checkText`）：
   纯 ASCII 词走 `\bsb\b`，中文等非 ASCII 词仍走子串 ——
   中文没有词边界概念，而 `\b` 在中文旁仍然成立（「你sb」照样命中），拦截能力不降级。
   这是**全局中间件**的改动，树洞/广场等短贴场景同时受益（`USB` 不再误伤）。

**内容风险的兜底**（正文不扫之后靠什么）：① 每次上传都会开一个 GitHub PR，
仓库侧 diff 人工可见；② admin 有下架能力（`DELETE /api/materials/:id`）。

**测试锁定**：
- `__tests__/middleware/sensitiveWordFilter.test.js`：词边界正/反例（USB/ISBN/base64 不误伤；
  独立 `sb`、贴着中文的 `你sb` 仍拦）、大小写、元字符按字面量处理。
- `__tests__/routes/materials.test.js`：政策锁 —— `.md` 正文含敏感词仍可上传，
  且断言 `checkText` **拿不到正文**；元数据命中时校验 `meta.word` / `meta.field`。

**遗留给运维的一条**：`fk` / `sb` 仍在词表里，因此**标题/简介/标签**里出现独立的
`FK`、`SB` 仍会被拒（如标题「数据库外键（FK）」）。词表是 DB 驱动的，
可在管理端 `sensitive_words` 里停用这两个词 —— **这是内容策略决定，交管理员判断**。

---

## 18. 前端实施记录

### 18.1 路由（已挂在 `layoutRoutes.jsx`，全部懒加载 + 错误边界）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/materials` | `MaterialsHome` | **课程为中心**：课程搜索 + 课程卡片 + 最新上传 |
| `/materials/course/:id` | `MaterialsCourse` | 课程页：6 个 tab（全部 + 五类）+ 考试节点/课时二次筛选 + 分页 |
| `/materials/file?path=` | `MaterialDetail` | 按 `kind` 分发渲染（markdown / pdf / image / 其他） |
| `/materials/upload` | `MaterialsUpload` | 三层 details + **真实状态机** |
| `/materials/me` | `MaterialsMine` | 我上传的：状态、改元数据、下架 |
| `/admin/materials` | `AdminMaterials` | 看板 + 资料管理（下架）+ 课程合并 |

导航：`siteShellNav.js` 新增「学习资料」（`Library` 图标，`matchPrefixes: ['/materials']`）。

> 详情页用 `?path=` 而非路径参数：资料路径含 `/` 与中文，塞进路径段会牵扯转义与路由匹配，
> 查询参数更稳（`/materials/file?path=c7%2Fnotes%2F...`）。

### 18.2 组件

| 文件 | 说明 |
|------|------|
| `components/materials/MarkdownViewer.jsx` | MD 渲染 + 目录 + 相对资源解析；**不渲染 raw HTML** |
| `components/materials/PdfViewer.jsx` | 三级降级 + 8s `onLoad` 超时探测 |
| `components/materials/MaterialCard.jsx` | 列表项（含下载） |
| `components/materials/CoursePicker.jsx` | 课程自动补全 + 自注册（防抖 300ms，点击外部关闭） |
| `components/materials/TaxonomyFields.jsx` | 三层 details 级联；**`source` 仅当类型=试题时才出现** |
| `components/materials/UploadStatusTracker.jsx` | 状态机展示（上传→提交→校验→上线） |
| `components/materials/downloadMaterial.js` | blob 下载（见 18.3①） |
| `pages/Materials/Materials.css` | 模块共用样式（液态玻璃） |

### 18.3 三个前端上的关键决定

**① 下载必须走 blob，不能只用 `<a download>`**

`download` 属性在**跨域**资源上会被浏览器忽略（jsDelivr 与站点不同源），
结果是「打开 PDF」而不是「另存为原文件名」——直接违反 FR-04「下载文件名必须是原始名」。

做法：先 `fetch` 成 blob（jsDelivr 实测返回 `Access-Control-Allow-Origin: *`，可取），
再用 object URL + `download` 保存。**服务器全程不参与传输**，符合零服务器带宽目标。

**② PDF 预览用 `onLoad` 超时探测，而不是 `onError`**

跨域 iframe 的 `error` 事件不可靠，所以 8 秒未 `onLoad` 即提示并允许切到 pdf.js 备用源。
超过 20 MiB 的文件**直接不给预览**（那是 jsDelivr 的实测硬上限），只给下载 —— 不让用户干等。

**③ Markdown 正文优先走 CDN，失败才走后端兜底**

零服务器带宽是设计目标；`/api/materials/file/*` 只是 CDN 不可达时的兜底路径。

### 18.4 新增共享纯逻辑（可单测）

| 文件 | 内容 |
|------|------|
| `shared/utils/materialMarkdown.js` | `slugify` / `extractHeadings` / `tocHeadings` / `resolveRepoUrl` / `dirOf` |
| `shared/utils/materialDisplay.js` | `humanSize` / `formatDate` / `courseLabel` / `parseTagInput` |

抽到 `shared/` 的原因：目录锚点与**相对链接逐段编码**（中文要编码、`/` 必须保留）
属于「写错了在界面上很难发现」的逻辑，必须能单测。
`__tests__/shared/materialHelpers.test.js` 覆盖 **15 个用例**。

### 18.5 被既有守卫测试抓到并修掉的两个真问题

前端写完后跑全量测试，**两条既有守卫立刻变红**，都是我的真 bug：

| 守卫 | 报错 | 原因 | 处置 |
|------|------|------|------|
| `frontendSourceLint`（no-undef） | `AdminMaterials.jsx: 'process' is not defined` | 在浏览器代码里用了 `process.env`（而且那行两个分支写得一模一样，纯废话） | 后端 `/admin/stats` 返回 `repoLabel`，前端改读它 |
| `contactChannelOnly` | 命中禁用字面量 `mailto:` | `MarkdownViewer` 的 scheme 正则写成 `/^(https?:|data:|mailto:|tel:)/i`；**注释里也写了** `mailto:` | 正则改为 `/^(https?|data|mailto|tel):/i`（冒号移到分组外），注释同步改写 |

> 这正说明那两条守卫的价值：它们不依赖「刚改过哪些文件」，所以能挡住新页面引入的老问题。
> 第一处若流入生产，会让 `/admin/materials` 整条路由崩溃（React 渲染期 ReferenceError）。

### 18.6 前端验证结果

```
npx jest                                 → 45 suites / 652 tests 全绿（新增 15 用例）
node scripts/check-frontend-no-undef.js  → OK（frontend/src 257 个文件）
cd frontend && npm run build             → ✓ built in 8.40s
产物 chunk：MaterialsHome / MaterialsCourse / MaterialDetail / MaterialsUpload /
            MaterialsMine / AdminMaterials / MaterialCard / downloadMaterial / Materials.css
```

### 18.7 尚未完成的验证

- **真实浏览器端到端**：点一遍「上传 → 状态机 → 课程页 → 预览 → 下载」，
  目前只验证了构建与纯逻辑单测，没有跑过真实渲染。
- ~~**生产迁移**~~：✅ **已于 2026-09-29 在 Railway 生产库执行**（`railway` 库，80 表，216 用户）。
  5/5 表建成、伪课程 `#1 通用 / 其他` 就绪；`init-db.sql` 已同步。
- **⚠️ 生产环境变量未配置（会阻断整个模块）**：
  线上后端**没有** `GITHUB_MATERIALS_OWNER` / `_REPO` / `_TOKEN`，
  实探 `GET /api/materials` 返回 `{"configured":false,"items":[],"total":0}`。
  本机 `.env` 有这 5 个变量，但 `.env` 被 gitignore，**不会**随代码上服务器 ——
  Railway 的环境变量必须在 Railway 控制台单独设置。未配置时的可观测行为：
  | 接口 | 表现 |
  |------|------|
  | `GET /api/materials` | 200，但 `configured:false`、列表恒空（**不读本地快照**，设计如此） |
  | `GET /api/materials/courses` | 正常（只读本库课程字典，与 GitHub 无关） |
  | `POST /api/materials/upload` | 503 `MATERIALS_NOT_CONFIGURED` |
  | 前端首页 | 显示「尚未配置」横幅 |
- **移动端**：本期只做 Web；RN 端按设计文档 §16.2 N2 用 `expo-web-browser` 打开 CDN 地址。

