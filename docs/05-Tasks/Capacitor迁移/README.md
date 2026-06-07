# Capacitor 迁移 — 任务总览

**依据**: `docs/06-Analyze/Capacitor迁移评估报告.html`
**目标**: 将 Web 前端打包为 iOS/Android 原生 App，UI 100% 一致
**总任务数**: 18 个子任务
**总预估工期**: 7-11 天
**测试基线**: 每 Phase 完成后 `npm run build` + 浏览器移动模式验证

---

## 任务矩阵

| Task | 名称 | 优先级 | 复杂度 | 预估 | 依赖 |
|------|------|--------|--------|------|------|
| [Task01](Task01-Capacitor基础安装与配置.md) | Capacitor 基础安装与配置 | 🔴 P0 | ⭐ | 0.5 天 | — |
| [Task02](Task02-移动端UI适配.md) | 移动端 UI 适配 (Safe Area + Hover + 响应式) | 🔴 P0 | ⭐⭐⭐ | 3-4 天 | Task01 |
| [Task03](Task03-原生插件集成.md) | 原生插件集成 (Push + Camera + StatusBar) | 🟡 P1 | ⭐⭐ | 2-3 天 | Task01 |
| [Task04](Task04-App打包与上架.md) | App 打包与商店上架 | 🔵 P2 | ⭐⭐ | 1-2 天 | Task02, Task03 |

---

## 执行顺序

```
Day 1 morning:  Task01 — Capacitor 安装配置 (并行起点)
Day 1-4:        Task02 — UI 适配 (Safe Area → Hover → 响应式)
Day 5-7:        Task03 — 原生插件 (可与 Task02 末尾并行)
Day 8-11:       Task04 — 打包上架
```

---

## 修复后预期指标

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| Safe Area 覆盖 | ~10 个文件 (部分) | **86 pages + ~60 components** 全覆盖 |
| `--safe-top/bottom` 使用率 | ~30% | **100%** (全局注入) |
| Hover 触摸友好 | 76 处裸 `:hover` | **全部包裹** `@media (hover:hover)` + `:active` |
| 响应式断点 | 420px/520px 为主 | **375/390/430/768px** 四级覆盖 |
| Push 通知 | Web Push API | **Capacitor Push** (双端统一) |
| 图片选择 | `<input type="file">` | **Capacitor Camera** + 降级 `<input>` |
| App 包 | 无 | **iOS .ipa + Android .aab** |

---

## 验收流程

每完成一个 Task 后：
1. `npm run build` — 构建成功
2. `npx cap sync` — Capacitor 同步成功
3. Chrome DevTools → Mobile 模式 (iPhone 14 Pro / Pixel 7) → 逐页面验收
4. 发现 UI 问题 → 在该 Task 内修复 → 记录到 `docs/07-Implement/capacitor-migration-record.md`

全部 Task 完成后：
1. `npx cap open ios` → Xcode → Archive → TestFlight
2. `npx cap open android` → Android Studio → Build AAB → Internal Testing
