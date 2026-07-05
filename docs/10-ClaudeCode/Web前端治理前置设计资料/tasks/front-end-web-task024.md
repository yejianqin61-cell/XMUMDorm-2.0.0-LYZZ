# Task 024: SiteHeader 补充头像 link 的 `aria-label`

- **Phase**: 5 — 可访问性
- **关联审计问题**: Shell audit A2
- **优先级**: 🟡 中危
- **预计工作量**: 5 分钟

## 背景

`SiteHeader.jsx` 中用户头像 `<Link to="/myzone">` 没有 `aria-label`，fallback 头像 span 有 `aria-hidden="true"`。屏幕阅读器无法识别这是到个人中心的链接。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/shell/SiteHeader.jsx` | 添加 `aria-label`，修正 fallback 头像 |

## 执行步骤

### Step 1: Link 添加 aria-label

```jsx
<Link to="/myzone" className="..." aria-label="个人中心 My Zone">
```

### Step 2: Fallback 头像移除 aria-hidden

```jsx
<span className="..." role="img" aria-label="用户头像">
  {avatarInitial}
</span>
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 屏幕阅读器可识别头像链接

## 提交信息

```
fix(web): add aria-label to SiteHeader avatar link

Co-Authored-By: Claude <noreply@anthropic.com>
```
