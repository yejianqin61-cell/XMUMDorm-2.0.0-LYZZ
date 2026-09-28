# 部署换血后「点开渲染失败、刷新一次就好」的全站白屏

> 一次真实事故的复盘（2026-09-26）。适用于任何 **SPA + 按内容哈希切 chunk + 懒加载路由** 的部署方式。

## 症状

- 站点刚发过新版本后，**已经打开的标签页**里点开任意页面（如 `/eat/food/2648`）：**白屏**，
  `document.body.innerText.length === 0`、`#root.innerHTML.length === 0`，但**地址栏已经变了**。
- **刷新一次就完全正常**，同一页面、同一账号、同一网络。
- 「全站挺多地方会这样」——因为**每一个懒加载路由**都受同一个机制影响（`layoutRoutes.jsx` 里 90+ 条）。
- 现场三条控制台报错（本次实测原文）：

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server
  responded with a MIME type of "text/html". Strict MIME type checking is enforced for
  module scripts per HTML spec. @ /assets/FoodDetail-0qV9N_xu.js:0
Failed to load module script: ... @ /assets/FoodDetailView-CVt234iS.js:0
Failed to fetch dynamically imported module: /assets/FoodDetail-0qV9N_xu.js
```

## 时间线（本次事故）

| 时刻（UTC） | 事件 |
|---|---|
| 13:44:44 | PR 合并进 `main` → 触发前端构建 |
| 13:54:20 | 新构建上线（`Last-Modified`），**所有 chunk 换了新文件名** |
| ~13:57 | 用户报「点开渲染失败，刷新就好」 |

用户在部署**前**就打开了站点 → 标签页内存里是**旧 `index.html`** → 部署把它引用的 chunk 文件删了。

## 复现（确定性，约 10 秒）

不需要等下一次部署：**连续构建两次**即可让「已打开的标签页」处于换血状态。

```bash
cd frontend
npx vite build                      # 构建 A
npx vite preview --port 4173        # preview 继承 server.proxy
# 浏览器打开 http://127.0.0.1:4173/eat/rankings（此时内存里是 index A）
# 改动 FoodDetail.jsx 里任意会进产物的常量，再构建一次 → 构建 B，chunk 换名、旧文件被删除
# 回到那个标签页，点开任意 /eat/food/:id
```

对照数据（1440×900）：

| | `path` | `body` 文本长度 | `#root` 内部长度 |
|---|---|---|---|
| 修复前：旧标签页点击 | `/eat/food/2648` | **0** | **0**（整棵树被卸载） |
| 修复前：刷新后再点 | `/eat/food/2648` | 410 | 19814 |

线上侧的关键证据（`curl` 直击，说明「旧 chunk 名」在服务端是什么响应）：

```
$ curl -o /dev/null -w "%{http_code} %{content_type}" https://www.xmumdorm.com/assets/FoodDetail-C8UKFIVU.js
200 application/javascript; charset=utf-8      # 当前构建里存在的 chunk

$ curl -o /dev/null -w "%{http_code} %{content_type}" https://www.xmumdorm.com/assets/FoodDetail-0qV9N_xu.js
200 text/html; charset=utf-8                   # 已经不存在的老 chunk → SPA 重写把它当成了前端路由
```

**注意这里是 `200`，不是 `404`**：Vercel 的 SPA 重写会把任何未命中的路径都吐回 `index.html`。
所以浏览器拿到的是一份 HTML 去当 JS 模块解析 → 直接 MIME 报错 → `import()` 失败。

## 根因链

1. SPA 路由跳转**不会重新请求 `index.html`**，页面内存里始终是启动时那一份。
2. 构建产物按**内容哈希**命名（`FoodDetail-<hash>.js`），每次发版**文件名都会变**。
3. 旧标签页按旧名字去取 → 服务端已经没这个文件（被 SPA 重写兜成 `200 text/html`）。
4. `React.lazy` 的动态 `import()` 因此被 reject → **在渲染期抛出**。
5. 仓库里**没有任何 `ErrorBoundary`**（`App.jsx` 只有 `Routes`）→ React 卸载整棵组件树 → 全站白屏。
6. 刷新 → 重新取 `index.html`（`Cache-Control: public, max-age=0, must-revalidate`，这一步配置是对的）
   → 拿到新文件名 → 一切正常。

## 为什么 dev server 与「刚打开的线上页面」都复现不了

- **dev**：Vite dev 不切 chunk 哈希、模块按 URL 实时提供，不存在「文件名失效」。
- **刚打开的线上页面**：它的 `index.html` 就是当前部署的，chunk 名自然对得上。

**唯一触发条件 = 「页面启动时刻」与「当前部署」不是同一版。** 所以这类缺陷只在**发版后的旧标签页**里出现。

## 修复（三层，缺一不可）

1. **自愈**：`main.jsx` 监听 Vite 的 `vite:preloadError`，先于 React 接管，**自动重载一次**取回新版本：

   ```js
   window.addEventListener('vite:preloadError', (event) => {
     const result = recoverFromChunkLoadError(event.payload, { storage, reload: () => window.location.reload() });
     if (result === 'reloaded') event.preventDefault();   // 已在重载，别让 Vite 再抛一遍
   });
   ```

   > Vite 只对「带依赖（如 CSS）的懒加载 chunk」走 `__vitePreload` 派发该事件；没有依赖的裸动态
   > import 不会派发，所以第 2 层兜底不能省。

2. **兜底 UI**：新增路由级 `RouteErrorBoundary`，在 `renderLazyRoute` 里包在 `<Suspense>` **外面**
   （懒加载的 reject 会冒泡到最近的边界）。自愈用尽后显示「页面资源已更新，需要重新加载 + 重新加载按钮」，
   **保留侧边导航**，不再是白屏。同时它也顺手兜住了所有「渲染期抛错」的页面。
   路由变化时用 `resetKey={pathname}` 清错误态，避免同位置换参数（`/eat/food/1 → /eat/food/2`）后卡住。

3. **防死循环闸门**（`shared/utils/chunkLoadRecovery.js`，纯逻辑、可单测）：
   - 判定：**只认** `Failed to fetch dynamically imported module` / `Failed to load module script` /
     `Importing a module script failed` / `ChunkLoadError` 等文案，普通业务报错**绝不**触发自动刷新
     （否则用户会遇到「页面自己乱刷」）。
   - 闸门 key = **失败的 chunk 文件名**（从错误信息里正则抽出）。同一文件名每会话只自动重载一次；
     **下一次部署会换新文件名 → 又允许自愈一次**，不会「本会话重载过了就永久失效」。
   - `sessionStorage` 不可用（隐私模式）时不阻断恢复：宁可多刷一次，也不要白屏。
   - 用户手动点「重新加载」走 `force`，跳过闸门。

## 验证

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 旧标签页点开路由（chunk 已换名） | `body` 长度 **0**、`#root` **0**、白屏 | 自动重载 → `body` **410**、`#root` **19814**，控制台 0 错误 |
| 自愈用尽（同文件名再次失败） | 白屏 | 兜底 UI：`hasFallback=true`，文案 + 「重新加载」，侧栏仍在 |
| 手动点「重新加载」 | — | 恢复渲染（`body` 410），控制台 0 错误 |
| sessionStorage 闸门标记 | — | `dorm:chunk-reload:FoodDetail-Bl2UfViY.js = 1`（按文件名记录，符合设计） |

单测：`__tests__/frontend/chunkLoadRecovery.test.js`（20 例，含上面三条真实报错文案的判定、闸门、接线断言）。

## 规约

1. **新增页面必须挂在 `layoutRoutes` 的懒加载路由下**（走 `renderLazyRoute`），从而自动获得
   自愈 + 兜底；不要新建裸 `<Route element={<Page/>}>`。
2. **任何组件级错误边界都不得让整棵树白屏**：兜底 UI 必须给出「重新加载」入口。
3. 排障口诀：**「刷新就好」+「地址栏变了但页面空白」= 部署换血**，先看控制台是否有 chunk/MIME 报错，
   不要往 React 状态里查。
4. 发版后如需自查，直接对旧 chunk 名发一次请求：

   ```bash
   curl -o /dev/null -w "%{http_code} %{content_type}\n" https://<host>/assets/<某个已不存在的chunk>.js
   # 200 text/html = SPA 重写兜底（不是 404）
   ```

## 建议（未实施，另行决策）

- **让 `/assets/*` 未命中时返回真正的 `404`**（Vercel 侧排除该路径的重写）。现在的 `200 text/html`
  会让 CDN 监控、Sentry 的「资源 404」告警全部失效，只能靠前端报错发现。
- `.playwright-cli/` 没有被 `.gitignore`（仓库里已有 23 个被跟踪的产物文件），建议加一行，
  避免调试产物混进提交。
