# Task 011: 修复 Tag.css 和 Badge.css 硬编码颜色

- **Phase**: 3 — 消除硬编码
- **关联审计问题**: H-5
- **预计工作量**: 20 分钟

## 改动

### Tag.css
- `#b86a12` → `var(--accent-canteen)`（canteen soft 文字色）
- `#d4547d` → 新增 `--color-club-text: #d4547d` 在 tokens.css
- `#268a63` → 新增 `--color-marketplace-text: #268a63` 在 tokens.css

### Badge.css
- `#a55a00` → `var(--color-warning)` darker 映射
- `#236db5` → `var(--color-brand-primary)` darker 映射
- `#247d5c` → `var(--color-success)` darker 映射

### tokens.css 新增强调色暗色变体
```css
--color-canteen-text: #b86a12;
--color-club-text: #d4547d;
--color-marketplace-text: #268a63;
--color-warning-text: #a55a00;
--color-brand-text: #236db5;
--color-success-text: #247d5c;
```

## 提交

```
fix(web): replace hardcoded hex colors in Tag.css and Badge.css with tokens

Co-Authored-By: Claude <noreply@anthropic.com>
```
