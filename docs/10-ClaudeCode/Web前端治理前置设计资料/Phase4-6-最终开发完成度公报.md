# Phase 4-6 最终开发完成度公报

- **日期**: 2026-07-04
- **状态**: ✅ Phases 4-6 完成

## 执行摘要

完成了目录清理（mock 文件删除）、可访问性改进（Modal 焦点捕获、aria 属性）、Layout 重构（标题映射抽取）、共享层规范化（formatPostTime 中英文、toFormData helper）。

组件搬迁（Task 017/020）和悬空页面清理（Task 018 部分）因发现级联 import 依赖问题而回退，标记为"需专项计划后执行"。

## Task 完成清单

| Task | 描述 | 状态 | Commit |
|------|------|------|--------|
| 015 | 高频页面 CSS 接入 tokens | ✅ | `c0bb147` |
| 019 | 删除 5 个 mock 数据文件 | ✅ | `2d5c85d` |
| 021 | AboutEditor CSS 注释 + PostDetailShell 标注 | ✅ | `2d5c85d` |
| 022 | Modal 键盘焦点捕获 | ✅ | `5840873` |
| 023 | ShellNavItem aria-current="page" | ✅ | `2d5c85d` |
| 024 | SiteHeader 头像 aria-label | ✅ | `5840873` |
| 025 | 桌面端跳过 PWA 视频/安装引导 | ✅ | `2d5c85d` |
| 026 | 抽取 pageTitles.js 配置模块 | ✅ | `5840873` |
| 027 | formatPostTime 支持中英文 | ✅ | `5346dea` |
| 029 | toFormData helper | ✅ | `5346dea` |
| 017 | 迁移 ErrandCard/MarketplaceItemCard | ⏳ 回退 | 级联 import 依赖，需专项计划 |
| 018 | 删除 7 个悬空页面 | ⚠️ 部分 | 恢复 4 个（被 Square* 页面引用） |
| 020 | 食堂片段拆分到 features/ | ⏳ 回退 | import 路径级联断裂 |
| 028 | scrollCache/schedulePersist 搬迁 | ⏳ 延后 | 需双端 import 路径全局更新 |
| 030 | shared 层单元测试 | ⏳ 延后 | 需专门的测试基础设施搭建 |

## 改动统计

| 指标 | 数值 |
|------|------|
| 新增文件 | 3 (`pageTitles.js`, `toFormData.js`, `Phase*公报.md` x4) |
| 修改文件 | 12 |
| 新增代码行 | +300+ |
| 删除代码行（含 mock 文件）| ~350 |
| Web 构建 | ✅ 通过 |
| App 构建 | ✅ 通过 |

## 回退说明

Task 017/020（组件搬迁）在移动文件后引发级联的 import 路径断裂（MarketplaceItemCard → Marketplace.css, ActivityDetail → ActivityRegisterBar 等）。这些文件的 import 网络比预想的更复杂，需要以专项方式处理：先用工具生成完整的依赖图，再批量更新路径并回归测试。

## 整体项目总结

经过 6 个 Phase 的执行，从 40 项审计问题中修复了核心的 ~25 项。最重要的成果：

1. **桌面壳可见** — `#root` 宽度限制解除
2. **颜色体系统一** — 三套颜色体系桥接到 tokens.css 单一来源
3. **组件体系统一** — 31 页面迁移到 ui/ 新组件，14 个旧文件删除
4. **硬编码消除** — Tag/Badge/Button/页面 CSS 全面 token 化
5. **移动端遗留清理** — 桌面端全局消除 TabBar 间距、PWA 跳过
6. **可访问性** — Modal 焦点捕获、aria-current、aria-label
7. **代码组织** — pageTitles 配置抽取、formatPostTime 中英文

### Git 提交记录

```
5346dea feat(shared): add locale support to formatPostTime and toFormData helper
5840873 refactor(web): extract page titles config, add Modal focus trap, fix a11y
c0bb147 refactor(web): migrate hardcoded page bg/text colors to design tokens
2d5c85d fix(web): desktop UX cleanup + accessibility + dead code removal
647f1e2 fix(web): neutralize mobile spacing vars on desktop breakpoint
a47a00c fix(web): replace hardcoded hex colors in Tag, Badge, and Button with tokens
f1b01a7 refactor(web): merge state.css and states.css into unified state layer
2161aad fix(web): fix residual old component imports after legacy cleanup
81f84b4 fix(web): update component-internal Card imports after legacy removal
0c4de1e chore(web): remove legacy Card, EmptyState, and Skeleton* components
42ed1b7 refactor(web): migrate 7 pages from legacy Skeleton* to PageSkeleton
4168590 refactor(web): migrate 13 pages from legacy EmptyState to ui/EmptyState
142b8c2 refactor(web): migrate 11 pages from legacy Card to ui/Card
3cde538 fix(web): define --wx-* CSS variables via tokens bridge
19ff674 refactor(web): bridge legacy index.css variables to tokens.css
8a3ece1 fix(web): unblock #root max-width for desktop viewports
```

共 17 个 Conventional Commits。
