# Phase 3 收口验收记录

日期：2026-10-09  
范围：Phase 3 设备证据与发布材料收口 Task 01–06。  
结论：**文档、自动规则和代码入口已收口；设备构建与正式法务文本仍未满足，因此 Phase 3 不结案。**

## 1. Task 结果

| Task | 结果 | 证据 |
|---|---|---|
| 01 development build 记录 | 阻塞 | 无 EAS CLI、project id、Dev Client、Android/iOS 工具；已记录，不填构建号 |
| 02 设备矩阵 | 已建立记录 | 10 种形态、10 条清单均显式为 `⏳ 未跑` |
| 03 大屏复测 | 规则通过，设备未验 | `resolveInsets` / `Screen` 接缝存在；44 项相关测试通过 |
| 04 缺陷总账 | 已复核 | 未创建第二总账；D-1、U-1～U-6 保持开放 |
| 05 法务正文 | 阻塞 | 所有者未提供批准的中英文正式文本；占位正文保留 |
| 06 静态页与索引回归 | 自动通过 | 法律页、i18n、逐页索引、缺陷账本回归通过 |

## 2. 验证命令

```text
npm.cmd test -- --runInBand --silent src/__tests__/p2c-05-settings-legal.test.tsx src/__tests__/p2d-03-per-page-131.test.ts src/__tests__/p2d-04-defect-ledger.test.ts src/__tests__/p0-03-i18n.test.ts
npm.cmd run typecheck
```

结果：4 suites / 57 tests 通过；typecheck 通过。

另有大屏接缝回归：2 suites / 44 tests 通过，记录见 [Phase3-Task03-大屏复测记录.md](Phase3-Task03-大屏复测记录.md)。

## 3. 外部证据边界

以下项目不能由当前自动化结果关闭：

- 可安装 development build、构建号和可复现构建 URL。
- 真实设备的触控、横屏、最大字号、reduced-motion 和返回行为。
- 平板、折叠屏、分屏和 iPad Stage Manager 的实际布局。
- 所有者批准的中文和英文隐私政策、服务条款正文。

Phase 3 的下一步不是改写通过的规则测试，而是补齐 Task 01 与 Task 05 所需的外部输入，再重跑 Task 02、03、06。
