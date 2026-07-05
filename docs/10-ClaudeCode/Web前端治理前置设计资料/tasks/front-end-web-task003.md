# Task 003: 定义 `--wx-*` 变量到 token 映射

- **Phase**: 1 — 解除桌面端全局阻塞
- **关联审计问题**: F-3
- **优先级**: 🔴 致命 — 20+ 文件使用未定义变量
- **预计工作量**: 25 分钟

## 背景

`--wx-green`, `--wx-text`, `--wx-text-secondary`, `--wx-text-tertiary`, `--wx-bar-bg`, `--wx-border`, `--wx-bg-secondary`, `--wx-red` 在 20+ CSS 文件中被引用但从未在任何文件中定义。网站能工作仅因为每个引用处都提供了 fallback 值（如 `var(--wx-green, #07c160)`）。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/styles/legacy-wx-bridge.css` | **新建** |
| `frontend/src/App.jsx` | 新增 import |

## 执行步骤

### Step 1: 新建 `legacy-wx-bridge.css`

```css
/**
 * Legacy --wx-* CSS variable bridge
 *
 * 20+ old component/page CSS files reference --wx-* variables that were never
 * defined anywhere, relying entirely on fallback values.  This file maps them
 * to the tokens.css semantic token system so that theme changes propagate.
 *
 * @deprecated — New code should use tokens.css semantic tokens directly.
 *   Imported in App.jsx after tokens.css to ensure the cascade order is correct.
 */

:root {
  --wx-green: var(--color-brand-primary);
  --wx-text: var(--color-text-primary);
  --wx-text-secondary: var(--color-text-secondary);
  --wx-text-tertiary: var(--color-text-tertiary);
  --wx-bar-bg: var(--color-bg-surface-muted);
  --wx-border: var(--color-border-default);
  --wx-bg-secondary: var(--color-bg-page);
  --wx-red: var(--color-danger);
}
```

### Step 2: 在 `App.jsx` 中导入

在 tokens.css 导入之后、card.css 导入之前添加：

```js
import './styles/legacy-wx-bridge.css';
```

插入位置（在 `import './styles/tokens.css';` 之后）。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -rn "\-\-wx-" frontend/src/ --include="*.css" | grep -v "legacy-wx-bridge"` 确认所有引用现在都有了定义来源
- [ ] 视觉回归 — 使用 `--wx-*` 的组件（Card, FoodCard, ReviewCard, Skeleton 等）颜色无变化

## 提交信息

```
fix(web): define --wx-* CSS variables via tokens bridge

Add legacy-wx-bridge.css that maps the undefined --wx-* variable family
(--wx-green, --wx-text, --wx-bar-bg, etc.) to tokens.css semantic tokens.
Import it in App.jsx after tokens.css.

20+ CSS files previously relied on per-property fallback values that were
untethered from the design token system. This bridge makes theme changes
propagate to the old component layer.

Co-Authored-By: Claude <noreply@anthropic.com>
```
