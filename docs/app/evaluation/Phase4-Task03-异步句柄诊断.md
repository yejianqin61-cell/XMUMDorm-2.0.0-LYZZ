# Phase 4 Task 03 · 测试探针与异步句柄诊断

日期：2026-10-09  
结论：**单独高风险 suite 均能退出；全量串行诊断完成测试后仍未给出可归属的句柄栈。当前不做不安全的生命周期改动。**

## 1. 全量证据

命令：

```text
npm.cmd test -- --runInBand --detectOpenHandles --silent
```

结果：

- 87 suites passed。
- 2 suites skipped。
- 1332 tests passed。
- 16 tests skipped。
- 主体测试完成后进程未立即返回可复核的 open-handle stack。
- 随后的终端会话结束时没有提供明确句柄归属。

## 2. 缩小范围证据

以下两组均使用 `--runInBand --detectOpenHandles --silent`，并自然退出：

| 组 | 结果 |
|---|---|
| overlay、WebView、chat、legal | 4 suites / 102 tests 通过 |
| canteen、schedule、timetable、dish、today summary | 5 suites / 114 tests 通过 |

涉及的候选资源包括 `setInterval`、`setTimeout`、Keyboard/AppState 订阅、ChatScreen 轮询和 QueryCache 订阅；没有一个缩小组重现全量现象。

## 3. 处置决定

- 不添加 `--forceExit`，因为它会掩盖真实清理问题。
- 不删除合法的定时器或订阅，只为让 Jest 退出。
- 不凭 warning 位置推断异步句柄归属。
- 将问题交给 Task 04 做资源边界验证，并保留串行回退。

本 task 关闭的是“已完成针对性诊断”；“全量无句柄”仍未证明。
