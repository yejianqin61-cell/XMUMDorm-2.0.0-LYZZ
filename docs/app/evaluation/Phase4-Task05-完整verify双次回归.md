# Phase 4 Task 05 · 完整 verify 双次回归

日期：2026-10-09  
结论：**两次 fresh process 的测试主体结果一致，typecheck 与四把尺子单独通过；但两次 verify 都在 Jest 完成后因未关闭异步操作挂起，未取得成功退出码，因此 Phase 4 出口不通过。**

## 1. 两次完整出口对照

| 项目 | 第一次 `npm.cmd run verify` | 第二次 `npm.cmd run verify:serial` |
|---|---|---|
| typecheck | 通过 | 通过 |
| Jest suites | 87 passed，2 skipped | 87 passed，2 skipped |
| Jest tests | 1332 passed，16 skipped | 1332 passed，16 skipped |
| OOM | 未出现 | 未出现 |
| Jest 退出 | 未退出；出现异步操作提示 | 未退出；出现异步操作提示 |
| rulers | 未到达 | 未到达 |
| 进程结果 | 挂起后手动中止，exit 1 | 挂起后手动中止，exit 1 |

两次测试均使用独立进程和 `--runInBand`，结果一致，故问题可复现；两次都不是成功 verify。

## 2. 独立阶段验证

在两次完整出口均未到达 rulers 后，单独执行：

```text
cd app
npm.cmd run typecheck
npm.cmd run rulers
```

结果：

- typecheck：exit 0。
- 设计债尺：无宪法级违规；硬编码色值与 `fontSize` 字面量均为 0。
- 对比度尺：22 组，正文不达标 0 组。
- 品牌色色阶尺：1 个候选，全部通过全部门。
- 令牌自校验尺：22 个 textSafe 令牌全部达标。
- rulers：exit 0。

这证明 rulers 本身通过，但不能替代 verify 的顺序出口证明。

## 3. lint 状态

Task 01 基线为 311 warnings、0 errors；Task 02 合并一次重复 import 后为 **309 warnings、0 errors**。当前规则聚合仍以 `no-require-imports`、`react-hooks/refs`、`react-hooks/set-state-in-effect`、`no-unused-vars`、导入顺序/重复导入和 exhaustive-deps 为主。

本期没有关闭 lint 规则，也没有把 warning 改成 error。309 warnings 仍是 TD-70 开放项。

## 4. 验收判断

- [x] 两次 fresh process 的测试计数一致。
- [x] 本轮串行边界未复现 OOM。
- [x] typecheck 独立通过。
- [x] rulers 独立通过。
- [ ] `npm run verify` 连续两次退出 0。
- [ ] verify 不再出现 Jest 一秒后未退出提示。
- [ ] lint warning 清偿完成。

因此 Task 05 记录完成了“回归与边界取证”，但 Phase 4 的改进目标仍未完成。后续必须优先定位全量异步句柄，并继续按规则清偿 lint warning。
