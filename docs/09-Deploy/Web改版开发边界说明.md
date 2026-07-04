# Web改版开发边界说明

## 目的

明确 `frontend/` 与 `frontend-app/` 已拆分后的开发边界，确保 Web 端可以继续桌面化改版，同时不误伤 App 端与 Capacitor 打包链路。

## 当前结论

- `frontend/`：Web 前端工作区
- `frontend-app/`：App 前端工作区，供 Capacitor 构建使用
- `shared/`：Web 与 App 共用的共享层
- `server.js`、`routes/`、`services/`、`database.js`：仍为共用后端

当前 APK 打包链路仍然是：

```text
frontend-app -> vite build -> frontend-app/dist -> capacitor
```

因此，Web 端页面层改造不会直接影响 App，前提是不要破坏共享层和 App 自己的页面层。

## 可以放心改的范围

以下改动默认只影响 Web：

- `frontend/src/pages/*`
- `frontend/src/components/*`
- `frontend/src/layout/*` 或现有布局组件
- `frontend/src/router` 或路由组织方式
- `frontend/src/styles/*`
- `frontend/src/App.jsx`
- Web 专属导航、侧栏、页头、页脚、容器布局
- Web 专属响应式断点和桌面端交互

适合优先在 Web 端推进的改造方向：

- 桌面化双栏或多栏布局
- 首页信息架构重排
- Web 专属内容导航
- 列表页与详情页的桌面阅读体验优化
- 组件视觉体系升级

## 需要谨慎改的范围

以下改动会同时影响 Web 与 App：

- `shared/api/*`
- `shared/constants/*`
- `shared/query/*`
- `shared/utils/*`

这些目录中的代码已经被两套前端共同引用。任何修改都必须视为“双端联动改动”。

典型高风险改动包括：

- 修改 API 函数名、参数、返回值结构
- 修改 Query key 规则、缓存时间、重试策略
- 修改通用错误处理逻辑
- 修改等级、评分、区域等业务常量
- 修改时间格式、待办格式、滚动缓存等纯工具行为

## 仍应保留在各自前端的内容

以下内容当前不建议抽到 `shared/`：

- 页面布局代码
- 路由层
- 页面级组件
- Web 专属交互
- App 专属交互
- 平台相关工具

当前仍保留在前端本地的典型平台工具有：

- `capacitor.js`
- `fullscreen.js`
- `imagePicker.js`
- `motion.js`

这类文件带有环境或平台耦合，不应在 Web 改版时顺手移入共享层。

## 开发判断规则

遇到一个改动时，可以按下面规则判断：

### 只改 `frontend/`

结论：默认只影响 Web。

验证要求：

- `npm run build:web`

### 改 `frontend-app/`

结论：只影响 App 与 Capacitor。

验证要求：

- `npm run build:app`
- `npm run build:capacitor`

### 改 `shared/`

结论：同时影响 Web 与 App。

验证要求：

- `npm run build:web`
- `npm run build:app`
- `npm run build:capacitor`

## 推荐开发策略

建议按下面方式推进 Web 改版：

1. 优先在 `frontend/` 做页面层、布局层、视觉层重构。
2. 非必要不要修改 `shared/`。
3. 如果 Web 改版确实需要新增通用能力，先在 `frontend/` 内验证，再判断是否值得抽到 `shared/`。
4. 只有在 Web 与 App 都明确要复用时，才移动到共享层。

## 典型错误表征

如果误触边界，常见表征如下：

- Web 构建正常，但 App 构建失败
- `build:web` 正常，但 `build:capacitor` 失败
- 页面白屏，控制台提示 export 不存在
- 某些页面接口请求不再返回预期数据
- 点赞、评论、发布后缓存不刷新
- 登录态、通知数、待办时间显示异常

## 提交建议

为了保持历史清晰，建议按改动性质提交：

- Web 页面改版：`feat(web): ...` / `refactor(web): ...`
- 共享层调整：`refactor(shared): ...`
- 双端验证与目录清理：`chore(shared): ...`

## 结论

当前仓库已经具备以下条件：

- Web 可以开始独立做桌面化改版
- App 可以继续保持现有移动端结构稳定迭代
- 两端通过 `shared/` 复用后端 API、常量、Query 与纯工具

只要 Web 改动控制在 `frontend/` 页面层与布局层内，就不会直接影响 App 前端。
