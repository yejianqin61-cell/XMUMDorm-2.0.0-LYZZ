# Task 002: 合并 `index.css` 旧颜色体系到 `tokens.css`

- **Phase**: 1 — 解除桌面端全局阻塞
- **关联审计问题**: F-2
- **优先级**: 🔴 致命
- **预计工作量**: 20 分钟

## 背景

`index.css` 中定义 `--accent: #10b981`(绿)、`--brand-1/2/3`，与 `tokens.css` 的 `--color-brand-primary: #4DA7FF`(蓝) 完全矛盾。两套变量同时加载到 `:root`，后者覆盖前者，导致依赖旧变量的组件颜色不可预测。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/index.css` | 标记旧变量为 deprecated，添加注释 |
| `frontend/src/styles/tokens.css` | 新增 legacy bridge 节 |

## 执行步骤

### Step 1: 在 `tokens.css` 末尾新增 Legacy Bridge

在 `tokens.css` 文件末尾（`--ui-success` 之后）新增一节：

```css
/* ===== Legacy bridge from index.css ===== */
/* @deprecated — 旧代码引用这些变量时通过此桥接层取值。
   新代码请直接使用上方的 semantic token。 */
:root {
  --accent: var(--color-brand-primary);
  --accent-strong: var(--color-brand-primary);
  --accent-soft: var(--color-bg-brand-soft);
  --brand-1: var(--color-brand-primary);
  --brand-2: var(--accent-treehole);
  --brand-3: var(--accent-club);
  --app-bg: var(--color-bg-page);
  --app-surface: var(--color-bg-surface-muted);
  --app-surface-strong: var(--color-bg-surface-strong);
  --app-border: var(--color-border-default);
  --text-1: var(--color-text-primary);
  --text-2: var(--color-text-secondary);
  --text-3: var(--color-text-tertiary);
  --shadow-1: var(--shadow-soft);
  --shadow-2: var(--shadow-card);
}
```

### Step 2: 在 `index.css` 中标记旧变量

在 `index.css` 的 `:root` 块中旧颜色变量上方添加注释：

```css
/* @deprecated — 以下变量由 tokens.css 的 Legacy bridge 统一接管。
   请在新代码中使用 --color-brand-primary, --color-text-primary 等 semantic token。
   此处保留仅为向后兼容。 */
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -r "var(--accent)" frontend/src/ --include="*.css" --include="*.jsx"` 确认引用的变量都有定义来源（bridge 或 tokens）
- [ ] 视觉回归 — 使用旧变量的组件颜色无变化

## 提交信息

```
refactor(web): bridge legacy index.css variables to tokens.css

Add a legacy bridge section in tokens.css that maps the old color
variables (--accent, --brand-*, --text-*, --app-*, --shadow-*) to
the new semantic design tokens. Mark the old definitions in index.css
as @deprecated.

This ensures the two conflicting color systems resolve consistently.

Co-Authored-By: Claude <noreply@anthropic.com>
```
