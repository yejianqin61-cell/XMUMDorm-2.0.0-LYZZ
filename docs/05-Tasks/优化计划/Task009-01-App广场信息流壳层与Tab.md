# Task009-01: App 广场信息流壳层与 Tab

**Status:** completed

**Blocked by:** None - can start immediately

## What to build

把 Capacitor App 广场首页收敛为“广场标题 + 操作区 + 校园/热搜 Tab + 内容区域”的单列壳层。移除 Hero 和解释性首页模块，但保留现有发布、刷新、返回和路由行为。

## Acceptance criteria

- [x] 首屏显示明确的“广场”标题，不显示 eyebrow、产品介绍或功能解释段落。
- [x] “校园”和“热搜”是可切换的真实内容 Tab，选中态使用底部指示线。
- [x] Tab 状态在离开并返回广场后按既定策略恢复。
- [ ] 发布、刷新、详情跳转和错误重试行为保持可用。
- [x] 页面不再依赖 Hero、渐变背景、玻璃效果或外层大卡片。
