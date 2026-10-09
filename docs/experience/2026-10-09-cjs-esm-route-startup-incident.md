# 复盘：CommonJS 路由混入 ESM 导入导致 Railway 启动失败

> 文档类型：事故复盘（Lessons Learned）  
> 日期：2026-10-09（Asia/Singapore）  
> 状态：已复盘；`marketplace` 热修已合并，`errands` 热修待合并  
> 决策：后端 `routes/**` 保持 CommonJS。在未提供明确 CommonJS 出口前，路由不得静态导入 `shared/**` 的 ESM 模块。

## 结论：以后该怎么做？

后端启动路径必须与 App/Web 的 ESM 共享层隔离。小而稳定的后端校验枚举可以在路由内保留副本；副本变化时必须与 `shared/` 同步。这个重复的成本低于服务无法启动的风险。

本次直接影响是 Railway 在启动阶段退出，健康检查无法注册。主风险仍是枚举副本与 `shared/` 漂移。短期用注释和发布检查控制它；长期只有在需要时再设计经过测试的 CommonJS 兼容出口。团队需要采纳本文件的模块边界和发布门禁。

## 什么发生了？

根后端通过 `node server.js` 启动。`server.js` 使用 CommonJS 的 `require()` 加载每个路由。

提交 `1f6b5c0` 新增了 ESM 共享枚举 `shared/constants/serviceEnums.js`，并在两个 CommonJS 路由中加入静态 `import`：

| 路由 | 引入的枚举 | 结果 |
| --- | --- | --- |
| `routes/marketplace.js` | 宿舍区、交付方式 | 首先阻断 Railway 启动；已由 PR #75 修复 |
| `routes/errands.js` | 跑腿类型 | `marketplace` 修复后成为下一处阻断；由 PR #76 修复 |

静态 `import` 会使整个 `.js` 文件按 ESM 处理。路由前部既有的 `require('express')` 随即失效：

```text
server.js require(route)
  → route 含静态 import，Node 按 ESM 处理
  → route 内 require('express') 不存在
  → 进程在 listen 前退出
  → Railway 重启容器
```

Railway 的核心错误是：

```text
ReferenceError: require is not defined in ES module scope
```

日志中的 `npm warn config production` 只是 npm 警告，不是事故原因。

## 协作中哪几个判断出了问题？

| 判断 | 为什么错误 | 正确做法 |
| --- | --- | --- |
| “共享枚举可以被所有端直接 `import`” | `shared/` 当前是 App/Web 的 ESM 共享层；后端路由是 CommonJS | 先确认调用方的模块体系；CJS 路由不得写静态 ESM `import` |
| “去掉两处枚举重复值得做” | 复用发生在不兼容的模块边界，代价是启动失败 | 小型稳定白名单可在后端本地保存；只在存在兼容出口时复用 |
| “功能测试通过即可发布” | 此故障发生在进程启动、HTTP 服务建立之前 | 发布前必须执行 Node 22 的路由加载或服务启动检查 |
| “修好第一处即可恢复服务” | 同一提交同时修改了两个启动时加载的路由 | 修复时必须扫描同一提交、同类语法和全部启动依赖 |

这不是 `app/` 目录自动进入 Railway 的问题。事故来自 App 功能提交直接修改根后端路由，并把 ESM 导入写进该路由。

## 各层现在的边界是什么？

```text
app/src/**       App 私有代码；不进入 Web 构建或 node server.js 启动图
frontend/src/**  Web 私有代码；不进入 Expo/Metro 构建
shared/**        App + Web 的明确 ESM 契约；修改时按双端改动处理
routes/**        后端 CommonJS 启动路径；不得静态 import 前端 ESM 模块
```

Node 22 在受限条件下支持 CommonJS 的 `require()` 同步读取 ESM。该能力不等于允许在 CommonJS 路由源码中写静态 `import`。两者必须区分。

## 发布前必须检查什么？

### 1. 检查路由模块语法

在提交涉及 `routes/**` 或 `shared/**` 的变更前，运行：

```powershell
rg --files routes -g '*.js' | ForEach-Object {
  Get-Content -Raw $_ | node --input-type=commonjs --check -
  if ($LASTEXITCODE -ne 0) { exit 1 }
}
```

预期：命令无输出并以退出码 `0` 结束。任何静态 `import` 或 `export` 都必须先说明为什么该路由不再是 CommonJS；否则不得合并。

### 2. 用生产 Node 版本加载全部路由

CI 或发布前脚本必须使用 Railway 当前 Node 版本加载 `server.js` 的全部路由。当前证据基线是 Node `v22.23.3`。该检查应在数据库连接前完成，并在路由解析失败时返回非零退出码。

### 3. 合并后检查服务

确认 Railway 启动日志没有模块解析错误，再验证：

```powershell
curl.exe --fail --show-error --max-time 15 `
  https://xmumdorm-200-lyzz-production.up.railway.app/health
```

预期响应：

```text
ok
```

## 还要做什么？

| 优先级 | 动作 | 完成条件 |
| --- | --- | --- |
| P0 | 合并 PR #76 | Railway 日志不再出现 ESM/CJS 错误，`/health` 返回 `ok` |
| P1 | 将“路由必须可按 CommonJS 解析”的检查加入 CI | 含静态 ESM 导入的路由会在合并前失败 |
| P1 | 在代码评审清单加入模块边界项 | 涉及 `shared/**` 时，评审明确记录 App、Web、后端消费者 |
| P2 | 评估是否真的需要三端共享枚举 | 只有存在多个稳定后端消费者时，才设计 CJS/ESM 双入口 |

## 本文不处理什么？

- 不把整个后端迁移到 ESM。
- 不重构 App、Web 或现有 `shared/` 目录。
- 不在本次事故中引入新的共享层依赖或构建工具。
- 不假定仅修改 `app/**` 就不会触发 Railway 重建；该行为取决于 Railway 控制台的 watch-path、Root Directory 和构建设置。

## 假设和待确认项

- **假设：** Railway 继续使用 Node `v22.23.3`。若版本变化，发布负责人必须重新运行路由加载检查。
- **待确认：** App-only 提交是否会触发 Railway 生产重建。到 Railway 服务设置检查 watch-path、Root Directory、Build Command 和 Start Command，并记录结果。
