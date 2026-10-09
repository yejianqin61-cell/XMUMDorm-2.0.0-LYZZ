# Phase 5 Task 01 · 全量句柄边界最小复现

日期：2026-10-09  
结论：**全量测试完成后的挂起可以稳定复现；三个页面 feed 的订阅 cleanup 缺失是已确认的生命周期缺陷，但当前工具没有给出唯一 open-handle 栈。**

## 1. 全量证据

命令：

```text
npm.cmd test -- --runInBand --detectOpenHandles --silent
```

结果：

- `87` suites passed，`2` suites skipped。
- `1332` tests passed，`16` tests skipped。
- Jest 完成汇总后持续挂起。
- `--detectOpenHandles` 没有输出可归属的句柄栈。
- 进程最终手动中止，exit 1。

## 2. 候选边界

命令：

```text
npm.cmd test -- --runInBand --detectOpenHandles --silent \
  src/__tests__/p2x-bing-campus.test.tsx \
  src/__tests__/p2x-bing-market-errand-market-ui.test.tsx \
  src/__tests__/p2x-bing-market-errand-errand-ui.test.tsx
```

结果：3 suites、76 tests 通过，进程自然退出，exit 0。

代码检查确认以下 effect 没有返回 `QueryCache.subscribe` 的 unsubscribe：

- `CampusFeed`：`app/src/features/campus/CampusScreens.tsx`
- `ErrandFeed`：`app/src/features/errand/ErrandScreens.tsx`
- `MarketFeed`：`app/src/features/marketplace/MarketScreens.tsx`

这三个缺口会让卸载后的页面继续持有订阅，并允许晚到事件触发旧组件的刷新回调。它们是 Task 02 的修复对象；本 task 不声称它们已经解释全部句柄。

## 3. 排除和边界

- `ChatScreen` 的 AppState 和轮询 effect 已有 cleanup。
- `Screen` 的键盘监听已有 cleanup。
- `ThemeProvider` 的 reduced-motion 监听已有 cleanup。
- Task 03 仍需以完整 verify 证明修复是否足够。

## 4. 验收判断

- [x] 全量挂起可复现。
- [x] 候选 suite 组有自然退出对照。
- [x] 已确认三处具体生命周期缺口。
- [ ] 唯一 open-handle 栈已获得。
- [ ] 完整 verify 已恢复成功退出。

本 task 关闭“没有可执行诊断边界”的问题，不关闭 R-8。
