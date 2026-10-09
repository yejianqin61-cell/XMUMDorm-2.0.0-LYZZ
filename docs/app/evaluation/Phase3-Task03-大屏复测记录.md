# Phase 3 Task 03 · 大屏复测记录

日期：2026-10-09  
结论：**共享大屏计算与渲染接缝存在且自动测试通过；真实大屏观察仍未完成。**

## 1. 当前实现

- `app/src/design-system/safe-area.ts` 定义 `sw ≥ 600dp` 的大屏阈值。
- 同一文件将内容宽度收敛到 `MAX_CONTENT_WIDTH = 560`。
- `app/src/components/ui/Screen.tsx` 将 `maxContentWidth` 应用于统一内容容器。
- `app/src/__tests__/p0-04-safe-area.test.ts` 覆盖小屏、大屏和横屏 inset 组合。

## 2. 自动验证

命令：

```text
npm.cmd test -- --runInBand --silent src/__tests__/p0-04-safe-area.test.ts src/__tests__/p0-04-screen.test.tsx
```

结果：2 suites / 44 tests 通过。

自动证据证明：

- 小于 600dp 时不强制最大宽度。
- 大于等于 600dp 时最大宽度为正且不超过可用宽度。
- 横屏左右 inset 会从可用宽度中扣除。
- `Screen` 会消费解析后的最大宽度。

## 3. 未关闭的设备判断

自动测试不能证明平板、折叠屏或分屏上的视觉结果。以下项目继续保持 `⏳ 未跑`：

- 内容是否出现过窄、过宽或不自然的空白。
- 15 个甲域页面在大屏上的实际布局。
- Android 分屏、折叠屏展开和 iPad Stage Manager。
- 横屏与最大字号同时启用时的实际可用性。

因此没有新增断点代码，也没有把 D-1 / U-2 写成 CLOSED。后续设备证据应填写 [Phase3-设备矩阵-2026-10-09.md](../test/Phase3-设备矩阵-2026-10-09.md)。
