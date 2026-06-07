# 移动端重构 — 任务总览

**依据**: `docs/06-Analyze/移动端App项目审计报告_V3.0.html`
**编写日期**: 2026-06-07
**总任务数**: 17 个子任务
**总预估工期**: 10-14 天

---

## 任务矩阵

| Task | 名称 | 优先级 | 复杂度 | 预估 | 依赖 |
|------|------|--------|--------|------|------|
| [Task01](Task01-Expo-Router架构迁移.md) | Expo Router 架构迁移 | 🔴 P0 | ⭐⭐⭐⭐ | 4-5 天 | — |
| [Task02](Task02-大型组件拆分与Hooks抽取.md) | 大型组件拆分 + Hooks 抽取 | 🟡 P1 | ⭐⭐⭐ | 3-4 天 | Task01 |
| [Task03](Task03-UI组件库补全.md) | Mobile UI 组件库补全 | 🟡 P1 | ⭐⭐⭐ | 2-3 天 | Task02 |
| [Task04](Task04-API层统一规范化.md) | API 层统一规范化 | 🔵 P2 | ⭐⭐ | 1-2 天 | — |

---

## 执行顺序

```
Step 1 (并行)
├── Task01: Expo Router 迁移      ← P0, 4-5天, 架构基础
└── Task04: API 层统一规范化       ← P2, 1-2天, 独立可并行

Step 2 (依赖 Task01)
└── Task02: 组件拆分 + Hooks      ← P1, 3-4天, 需要路由稳定后拆分

Step 3 (依赖 Task02)
└── Task03: UI 组件库补全          ← P1, 2-3天, 需要组件拆分完成后补全
```

---

## 修复后预期指标

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 路由系统 | 自定义 TabNavigator | Expo Router 文件系统路由 |
| 最大 Screen 行数 | 549 行 | ≤ 200 行 |
| hooks/ 文件数 | 0 | ≥ 10 |
| components/ 文件数 | 9 | ≥ 25 |
| API HTTP 封装 | 2 套 (client.ts + request.js) | 1 套 (utils/http.ts) |
| 审计报告风险等级 | 4 个 (HIGH×1 MEDIUM×2 LOW×1) | 0 个待修复 |

---

## 验收流程

每完成一个 Task 后：
1. `cd mobile && npx jest` — 416+ 测试必须 100% 通过
2. `npx tsc --noEmit` — 无 TypeScript 编译错误
3. 手动冒烟: 登录 → 树洞浏览 → 发帖 → 食堂 → 广场 → 我的
4. 更新 `docs/07-Implement/mobile-refactor-record.md` 实施记录

全部 Task 完成后：
1. 重新运行审计 Skill 生成 V4.0 审计报告
2. 对比 V3.0 → V4.0 风险消除情况
