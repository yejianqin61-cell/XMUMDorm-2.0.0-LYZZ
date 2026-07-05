# Task 015: 高频页面 CSS 接入 tokens.css（第一批）

- **Phase**: 3 — 消除硬编码
- **关联审计问题**: M-2
- **优先级**: 🟡 中危
- **预计工作量**: 30 分钟

## 背景

核心页面的 CSS 文件中使用了大量硬编码颜色值，而 `tokens.css` 已定义完整 token 体系。需要将高频页面的硬编码值替换为 token 引用。

## 涉及文件

| 文件 | 硬编码示例 | 替换为 |
|------|-----------|--------|
| `TreeHole.css` | `#fbfcfe` | `var(--color-bg-page)` |
| `CanteenHome.css` | `#f2f2f7`, `#9a5a13`, `#10233b` | `var(--color-bg-page)`, `var(--accent-canteen)`, `var(--color-text-primary)` |
| `PostDetail.css` | `#fbfcfe` | `var(--color-bg-page)` |
| `Layout.css` | `#f2f2f7` | `var(--color-bg-page)` |

## 执行步骤

### Step 1: TreeHole.css

- `#fbfcfe` → `var(--color-bg-page)`（`treehole-page--light` 和 `post-detail-page` 的背景色）
- `rgba(15, 23, 42, 0.92)` → `var(--color-text-primary)`（多处文字颜色）

### Step 2: CanteenHome.css

- `#f2f2f7` → `var(--color-bg-page)`
- `#9a5a13` → `var(--accent-canteen)` 或 `var(--color-canteen-text)`
- `#10233b` → `var(--color-text-primary)`

### Step 3: PostDetail.css

- `#fbfcfe` → `var(--color-bg-page)`

### Step 4: Layout.css

- `#f2f2f7` → `var(--color-bg-page)`
- `rgba(0, 0, 0, 0.45)` → `rgba(0, 0, 0, 0.45)`（保留，backdrop 颜色无需 token 化）

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 页面背景色视觉无变化

## 提交信息

```
refactor(web): migrate high-traffic page CSS colors to design tokens

Co-Authored-By: Claude <noreply@anthropic.com>
```
