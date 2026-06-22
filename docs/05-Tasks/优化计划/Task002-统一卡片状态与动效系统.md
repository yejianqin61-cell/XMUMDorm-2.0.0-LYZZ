# Task002 统一卡片状态与动效系统

日期：2026-06-21  
优先级：P0  
状态：待开发  
任务类型：前端基础能力任务  
依据文档：

- `docs/05-Tasks/优化计划/校园社交平台体验升级任务清单.md`
- `docs/05-Tasks/优化计划/校园社交平台体验升级技术开发文档.md`

---

## 1. 任务目标

建立 P0 通用 UI 基线：

1. 统一卡片系统
2. 统一空态、错误态、Skeleton
3. 建立轻量动效基线
4. 为后续首页、通知、个人主页优化提供可复用底层组件

---

## 2. 建议负责人

- 前端：1 人主负责
- 设计联动：如有 UI 设计同学，建议同步 review

---

## 3. 开发范围

### 3.1 公共卡片与状态组件

建议新增：

- `frontend/src/components/ui/AppCard.jsx`
- `frontend/src/components/ui/InfoCard.jsx`
- `frontend/src/components/ui/ActionCard.jsx`
- `frontend/src/components/ui/MetricCard.jsx`
- `frontend/src/components/ui/MediaCard.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/ErrorState.jsx`
- `frontend/src/components/ui/PageSkeleton.jsx`

样式基线：

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/card.css`
- `frontend/src/styles/state.css`

### 3.2 首批替换页面

- `frontend/src/pages/SquareHome.jsx`
- `frontend/src/pages/TreeHole.jsx`
- `frontend/src/pages/CanteenHome.jsx`
- `frontend/src/pages/Mailbox.jsx`
- `frontend/src/pages/UserZone.jsx`

### 3.3 动效基础层

建议新增：

- `frontend/src/utils/motion.js`
- `frontend/src/components/ui/FadeInSection.jsx`
- `frontend/src/components/ui/RouteTransition.jsx`

动效范围：

1. 页面区块进入
2. 卡片分批进入
3. 点赞、收藏等微反馈
4. 发布成功 Toast 与列表高亮
5. Skeleton 到内容切换过渡

---

## 4. 具体开发要求

1. 组件不是纯样式复制，必须具备复用边界
2. Skeleton 结构要与真实内容形态对应
3. Web 与 Capacitor 共用同一套视觉基线
4. 继续沿用现有 `framer-motion`，不引入新动画库
5. 动画时长控制在 `120ms ~ 260ms`

---

## 5. 依赖关系

- 建议与 `Task001` 并行，但需优先支持首页改造使用

---

## 6. 交付物

- 通用卡片组件集
- 通用状态组件集
- 通用样式 token
- 基础动效封装
- P0 页面首批替换结果

---

## 7. 验收标准

- P0 页面卡片结构、留白、标题层级统一
- 空态、错误态、Skeleton 不再各写各的
- 高频交互有克制但明确的反馈
- 无明显掉帧、布局抖动、样式割裂

---

## 8. 风险与注意事项

- 不要一次性替换全站，先覆盖 P0 页面
- 动效需注意 Capacitor 性能降级
- 组件抽象要避免过度设计
