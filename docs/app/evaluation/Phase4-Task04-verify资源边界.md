# Phase 4 Task 04 · verify 资源边界记录

日期：2026-10-09  
结论：**默认 verify 已明确使用 Jest 串行 worker，测试主体可完成且不再出现本轮 OOM；但 Jest 完成后仍未退出，故完整 verify 未到 rulers，Task 05 的成功出口判据尚未满足。**

## 1. 变更

`app/package.json` 的脚本现在为：

```json
"verify": "npm run typecheck && npm run test:ci -- --runInBand && npm run rulers",
"verify:serial": "npm run typecheck && npm run test:ci -- --runInBand && npm run rulers"
```

这项变更只限制 Jest worker 数量，不改变测试断言，也不使用 `--forceExit`。`verify:serial` 保留为受限环境下的显式入口；当前两条命令的执行边界相同，是有意的保守回退。

## 2. 本次验证

命令：

```text
cd app
npm.cmd run verify
```

阶段结果：

| 阶段 | 结果 |
|---|---|
| typecheck | 通过；随后进入 Jest |
| Jest `--ci --runInBand` | 87 suites passed，2 suites skipped；1332 tests passed，16 tests skipped |
| Jest 进程退出 | 未通过；测试完成后提示仍有未关闭的异步操作，并持续挂起 |
| rulers | 未执行，因为 Jest 未返回成功退出码 |
| 最终命令 | 手动中止挂起进程，退出码 1；不是成功出口 |

同时观察到的 Reanimated `.value` 和 React `act(...)` 输出属于既有测试噪音/测试环境提示；本记录不把它们误判为业务断言失败，也不据此修改生产组件。

## 3. 对原始问题的判断

- 与 Phase 2 记录的“并行 Jest 可能 OOM”相比，本次串行 worker 运行未出现 OOM，说明 worker 边界降低了内存压力。
- 串行 worker 没有解决全量测试完成后的异步句柄问题；因此不能声称 verify 已稳定完成。
- Task 03 的缩小组自然退出证据仍然成立，但不足以定位全量句柄归属。

## 4. 未关闭项

- 仍需定位并清理全量 Jest 的未关闭异步资源，或在不掩盖问题的前提下形成经验证的生命周期边界。
- 未到 rulers 阶段，因此没有完整 `verify` 绿跑。
- Task 05 不得把本次结果记为成功运行；后续应记录第二次 fresh process 的可比结果，并明确出口失败阶段。
