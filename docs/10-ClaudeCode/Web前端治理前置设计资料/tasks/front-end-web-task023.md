# Task 023: ShellNavItem 补充 `aria-current`

- **Phase**: 5 — 可访问性
- **关联审计问题**: M-10
- **优先级**: 🟡 中危
- **预计工作量**: 5 分钟

## 背景

`ShellNavItem.jsx` 在激活态添加了 `.site-web-shell__nav-item--active` CSS 类，但没有 `aria-current="page"` 属性。屏幕阅读器无法识别当前页面。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/shell/ShellNavItem.jsx` | `<Link>` 上添加 `aria-current` |

## 执行步骤

### Step 1: 在 Link 上添加条件 aria-current

```jsx
<Link
  ...
  aria-current={active ? 'page' : undefined}
>
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 屏幕阅读器可识别当前页导航项

## 提交信息

```
fix(web): add aria-current="page" to active ShellNavItem

Co-Authored-By: Claude <noreply@anthropic.com>
```
