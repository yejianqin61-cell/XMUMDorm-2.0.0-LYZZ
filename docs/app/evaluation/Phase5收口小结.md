# Phase 5 收口小结

窗口：2026-10-09。基线：`docs/app/evaluation/Phase4收口小结.md` 与 Phase 5 改进工程计划。

## 1. 本轮改变

**本轮：3 个施工主题完成，完整自动化 verify 已连续两次自然退出；lint 告警债务仍在。**

| # | 改变 | 位置 | 类型 | 状态 | 对读者意味着什么 |
|---|---|---|---|---|---|
| C-1 | 建立 Phase 5 三个 task brief，并按 task 独立收口 | `docs/app/task/phase-5/phase-5/` | 新增 | 完成 | 本轮施工边界、前置关系和证据口径可追踪 |
| C-2 | 三个 feed 页面为 `QueryCache.subscribe` 增加卸载清理 | `app/src/features/{campus,errand,marketplace}/` | 修复 | 完成 | 页面离开后不会继续持有这些页面级订阅 |
| C-3 | 在 Jest suite 边界清理 App `QueryClient`，并修正发布选项测试的卸载顺序 | `app/jest.lifecycle.setup.js`、`app/src/__tests__/publish-options.test.tsx` | 修复 | 完成 | TanStack Query 的 GC timer 不再阻止完整测试进程自然退出 |
| C-4 | 用两次独立出口回归确认 typecheck、Jest 和四把 rulers | `docs/app/evaluation/Phase5-Task03-出口回归与剩余告警记录.md` | 改变 | 完成 | 当前自动化验证边界已有稳定、可重复的 exit 0 证据 |

例行部分：新增红探针、完整测试诊断和每个 task 的 conventional commit 已分别记录在提交历史中。

## 2. 这些改变意味着什么

Phase 5 把 Phase 4 的“测试主体完成但进程挂起”推进为稳定的自动化出口。根因是页面订阅缺少 cleanup，以及 TanStack Query 为 inactive query 安排的 GC timer；两处生命周期都已有对应清理和回归证据。

这证明了当前代码验证链可以连续通过，但它只覆盖本地自动化边界，不改变真机、开发构建、线上部署或真实账号证据的状态。

## 3. 仍开放

- lint 仍为 `309 warnings / 0 errors`，`TD-70` 尚未清偿，因此告警债务仍会影响代码质量判断。
- Phase 3 的真实 development build、设备矩阵、触控、横屏、最大字号、reduced-motion 和返回路径证据仍缺失，因此自动化通过不能代替设备验收。
- 正式中文/英文隐私政策与服务条款正文仍等待所有者提供，合规文本的最终状态没有改变。
- Phase 1 的真实部署、真实账号、真实后端与线上链路证据仍未形成，当前不能推出线上可用结论。
