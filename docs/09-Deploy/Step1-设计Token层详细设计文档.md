# Step 1 设计 Token 层详细设计文档

## 1. 文档目标

本文档用于细化 `Web前端迁移步骤与开发顺序说明.md` 中的 Step 1：

- 建立 Web 端统一设计 Token 层
- 让后续页面、组件、模板都有统一的视觉变量来源
- 避免继续在页面里硬编码颜色、圆角、阴影、间距和动效

这份文档的目标不是直接改页面，而是先把“全站视觉变量系统”设计清楚，方便你先把关。

## 2. 当前现状

### 2.1 已有基础

当前仓库内已经存在：

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/card.css`
- `frontend/src/styles/state.css`
- `frontend/src/styles/states.css`

当前 `tokens.css` 已经有一层较轻量的 UI 变量，例如：

- `--ui-surface`
- `--ui-border-soft`
- `--ui-shadow-soft`
- `--ui-radius-lg`
- `--ui-text-primary`
- `--ui-accent`

### 2.2 当前问题

虽然已经有 token 雏形，但问题也很明显：

- 变量数量还不够，覆盖不全
- 命名更偏“当前局部 UI 实现”，不是完整设计系统命名
- 颜色体系仍偏技术性，不够贴合新校园风方案
- 缺少排版、间距、层级、动效的完整 token
- 缺少模块语义 token
- 部分 token 仍依赖旧变量，例如 `--post-ios-*`

### 2.3 Step 1 的核心任务

Step 1 不是推翻已有 `tokens.css`，而是：

- 梳理现有变量
- 建立完整命名层级
- 统一映射旧变量到新体系
- 让 Step 2 的基础 UI 组件可以直接消费

## 3. Token 层设计目标

Token 层必须同时满足 5 个要求：

1. 可复用：所有基础组件都能直接使用
2. 可扩展：后续不同模块可以基于统一 token 做轻量差异
3. 可维护：看到变量名就知道用途
4. 可迁移：可以逐步替换旧页面，不要求一次重写全站
5. 可约束：页面开发不能随意绕过 token 直接写魔法值

## 4. Token 分层方案

建议把 Web 端 token 分为 4 层：

### 4.1 Foundation Token

最底层原子变量，定义不可再拆的基础值：

- 原始颜色
- 原始字号
- 原始间距
- 原始圆角
- 原始阴影
- 原始动效时间

特点：

- 不直接给业务页面使用
- 主要给语义 token 映射

### 4.2 Semantic Token

把原始值映射成有业务语义的变量：

- `--color-bg-page`
- `--color-text-primary`
- `--color-border-default`
- `--shadow-card-default`
- `--radius-card`

特点：

- 基础组件直接消费这一层
- 这是后续最常用的一层

### 4.3 Component Alias Token

为高频基础组件提供组件级变量别名：

- `--button-primary-bg`
- `--input-border-focus`
- `--card-padding-md`
- `--tag-campus-bg`

特点：

- 用于组件实现层
- 避免组件内部重复拼装多个 semantic token

### 4.4 Module Accent Token

用于模块色差异化，但严格限制作用范围：

- `--accent-square`
- `--accent-treehole`
- `--accent-canteen`
- `--accent-club`

特点：

- 只做模块识别
- 不允许篡改全站基础视觉秩序

## 5. 建议的 Token 类别

建议 Step 1 至少建立以下类别：

### 5.1 颜色 Token

建议分为：

- 背景
- 文字
- 边框
- 品牌色
- 功能色
- 模块色
- 浮层色

建议示例：

```css
:root {
  --color-bg-page: #f7fafc;
  --color-bg-surface: #ffffff;
  --color-bg-surface-soft: #fdfefe;
  --color-text-primary: #20304a;
  --color-text-secondary: #42526b;
  --color-text-tertiary: #6f8097;
  --color-border-default: #d9e4f0;
  --color-border-soft: #eaf0f6;
  --color-brand-primary: #4da7ff;
  --color-brand-primary-soft: #e8f4ff;
  --color-success: #39c58d;
  --color-warning: #ffb547;
  --color-danger: #f36d6d;
}
```

### 5.2 排版 Token

建议分为：

- 字体族
- 字号
- 行高
- 字重
- 字距

建议示例：

```css
:root {
  --font-family-display: "Source Han Serif SC", "Noto Serif SC", serif;
  --font-family-body: "PingFang SC", "Noto Sans SC", sans-serif;
  --font-family-ui: "Inter", "PingFang SC", sans-serif;

  --font-size-display-xl: 56px;
  --font-size-display-lg: 40px;
  --font-size-h1: 32px;
  --font-size-h2: 24px;
  --font-size-h3: 20px;
  --font-size-body-lg: 16px;
  --font-size-body-md: 14px;
  --font-size-caption: 12px;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-reading: 1.7;
}
```

### 5.3 间距 Token

建议不要用散乱像素值，统一定义 spacing scale：

```css
:root {
  --space-2: 4px;
  --space-4: 8px;
  --space-6: 12px;
  --space-8: 16px;
  --space-10: 20px;
  --space-12: 24px;
  --space-14: 28px;
  --space-16: 32px;
  --space-20: 40px;
  --space-24: 48px;
}
```

用途：

- 卡片 padding
- section 间距
- 按钮内边距
- 页面块级间距

### 5.4 圆角 Token

建议按用途分层，而不是随意写 `18px`、`22px`、`24px`：

```css
:root {
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-pill: 999px;
}
```

### 5.5 阴影 Token

建议统一为 4 档：

```css
:root {
  --shadow-none: none;
  --shadow-soft: 0 8px 24px rgba(32, 48, 74, 0.06);
  --shadow-card: 0 14px 32px rgba(32, 48, 74, 0.08);
  --shadow-float: 0 20px 48px rgba(32, 48, 74, 0.12);
}
```

### 5.6 动效 Token

建议统一时长和缓动：

```css
:root {
  --motion-fast: 160ms;
  --motion-base: 240ms;
  --motion-slow: 360ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-soft-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 5.7 布局 Token

虽然页面模板在 Step 3 才主导，但 Step 1 可以先放基础容器变量：

```css
:root {
  --layout-max-width: 1440px;
  --layout-content-width: 960px;
  --layout-sidebar-width: 264px;
  --layout-aside-width: 320px;
  --layout-page-padding: 24px;
}
```

### 5.8 Z-index Token

为了避免后面弹层和导航互相打架，建议提前定义：

```css
:root {
  --z-base: 1;
  --z-header: 20;
  --z-dropdown: 40;
  --z-sticky: 50;
  --z-modal: 80;
  --z-toast: 90;
}
```

## 6. 命名规范

### 6.1 推荐命名方式

统一使用：

```text
--类别-语义-层级
```

例如：

- `--color-text-primary`
- `--space-12`
- `--radius-lg`
- `--shadow-card`
- `--button-primary-bg`

### 6.2 不推荐命名方式

避免：

- `--blue-1`
- `--main-color`
- `--box-shadow-a`
- `--big-radius`

因为这些名字缺少长期维护意义。

## 7. 文件组织建议

当前已有 `frontend/src/styles/tokens.css`，建议不要马上拆太散，但可以规划成下面结构：

### 7.1 Phase 1 最小落地方案

先保留单入口：

- `frontend/src/styles/tokens.css`

但内部按 section 分块：

- colors
- typography
- spacing
- radius
- shadows
- motion
- layout
- z-index
- component aliases

### 7.2 后续可演进方案

等体系稳定后可拆为：

- `tokens/colors.css`
- `tokens/typography.css`
- `tokens/spacing.css`
- `tokens/motion.css`
- `tokens/components.css`

## 8. 与现有代码的兼容策略

### 8.1 不一次性推翻旧 token

建议采取“新 token 覆盖旧 token，旧 token 逐步退役”的方式：

- 保留 `--ui-*` 兼容层
- 新组件使用新语义 token
- 老组件暂时继续吃旧变量
- 迁移过程中逐步替换

### 8.2 建议兼容映射

例如：

```css
:root {
  --color-bg-surface: #ffffff;
  --color-text-primary: #20304a;
  --color-border-default: #d9e4f0;
  --shadow-card: 0 14px 32px rgba(32, 48, 74, 0.08);
  --radius-xl: 24px;

  --ui-surface: var(--color-bg-surface);
  --ui-text-primary: var(--color-text-primary);
  --ui-border-soft: var(--color-border-default);
  --ui-shadow-soft: var(--shadow-card);
  --ui-radius-lg: var(--radius-xl);
}
```

这样能避免一上来把全站打爆。

## 9. Step 1 的具体开发顺序

建议按下面顺序推进：

1. 审核并确认 token 分类方案
2. 确认命名规范
3. 确认浅色校园风的主色板
4. 在 `tokens.css` 中建立新一套 foundation + semantic token
5. 建立对现有 `--ui-*` 的兼容映射
6. 检查 `card.css`、`state.css` 等是否能直接转用新变量
7. 再进入 Step 2 基础组件层

## 10. Step 1 的验收标准

Step 1 完成时，至少应满足：

1. `tokens.css` 能覆盖颜色、排版、间距、圆角、阴影、动效、布局、层级
2. 新组件开发不再需要自己定义主色和圆角
3. 老组件可以通过兼容变量先继续工作
4. Token 命名语义清晰
5. `npm run build:web` 不因 token 调整报错

## 11. 不在 Step 1 内做的事

Step 1 不应该做：

- 批量改业务页面 UI
- 大规模改路由
- 重写所有旧 CSS
- 改 App 端主题
- 直接做复杂页面模板

Step 1 的边界就是“变量系统先统一”。

## 12. 已定稿决议

当前 Step 1 已根据产品方向正式定稿如下：

1. 接受 Web 端采用“标题字体 + 正文字体”双体系。
2. 接受“蓝 + 薄荷绿 + 杏橙 + 淡粉”的校园浅色主色板。
3. 接受保留一层 `--ui-*` 兼容变量，作为过渡期兼容方案。
4. 接受 Step 1 阶段先保持单文件 `frontend/src/styles/tokens.css`，内部按 section 分块管理。
5. 接受后台页面共享同一套基础 token，只在模块 accent 和局部语气上更克制地区分。

### 12.1 关于保留 `--ui-*` 兼容层的正式结论

正式结论：

- 保留兼容层

原因：

- 可以降低一次性替换旧样式带来的回归风险
- 允许新组件先接入新 token，旧组件继续运行
- 更适合当前“逐步迁移”的项目阶段

后续要求：

- `--ui-*` 仅作为过渡层
- 等核心页面和基础组件迁移稳定后，逐步清理旧别名

### 12.2 关于 `tokens.css` 单文件方案的正式结论

正式结论：

- Step 1 阶段先保留单文件 `tokens.css`

原因：

- 当前 token 体系仍在收敛阶段
- 单文件更利于第一轮统一审查和快速迭代
- 避免过早拆分导致结构复杂化

后续要求：

- 单文件内部必须严格按 section 分块
- 等 Step 2 和 Step 3 稳定后，再视情况拆成多文件

## 13. 结论

Step 1 的本质是先把“视觉秩序”固化成变量系统。

只要这一层先稳住，后面的基础组件、页面模板和模块迁移都会更快，也更不容易出现一页一个风格的问题。
