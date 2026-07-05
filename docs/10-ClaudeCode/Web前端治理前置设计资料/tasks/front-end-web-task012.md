# Task 012: 修复 Button.css 硬编码渐变色

- **Phase**: 3 — 消除硬编码
- **关联审计问题**: M-2（ui 层面）
- **优先级**: 🟡 中危
- **预计工作量**: 5 分钟

## 背景

`components/ui/Button.css` 第 64 行的 Primary 按钮渐变使用了硬编码 `#78c5ff`，应改用 token 派生值。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/ui/Button.css` | `#78c5ff` → `color-mix(...)` |

## 执行步骤

### Step 1: 替换硬编码渐变色

```css
/* 旧 */
background: linear-gradient(135deg, var(--color-brand-primary), #78c5ff);

/* 新 */
background: linear-gradient(135deg, var(--color-brand-primary), color-mix(in srgb, var(--color-brand-primary) 70%, white));
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] Primary Button hover 态渐变色视觉一致

## 提交信息

```
fix(web): replace hardcoded #78c5ff in Button gradient with color-mix

Co-Authored-By: Claude <noreply@anthropic.com>
```
