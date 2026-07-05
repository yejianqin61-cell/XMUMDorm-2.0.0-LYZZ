# Task 022: Modal 焦点捕获

- **Phase**: 5 — 可访问性
- **关联审计问题**: M-9
- **优先级**: 🟡 中危
- **预计工作量**: 20 分钟

## 背景

`components/ui/Modal.jsx` 有 `aria-modal="true"` 但不捕获键盘 Tab 焦点。键盘用户可以通过 Tab 键导航到模态框后面的元素。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/ui/Modal.jsx` | 添加焦点捕获逻辑 |

## 执行步骤

### Step 1: 添加焦点捕获 Hook

在 Modal.jsx 中添加：

```js
// 打开时保存触发元素
const previousActiveElement = useRef(null);

useEffect(() => {
  if (!open) return;
  previousActiveElement.current = document.activeElement;
  // 聚焦到模态框容器
  modalRef.current?.focus();

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    // 恢复焦点
    previousActiveElement.current?.focus();
  };
}, [open]);
```

### Step 2: 模态框容器添加 tabIndex

```jsx
<div ref={modalRef} tabIndex={-1} ...>
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 模态框打开后 Tab 键在框内循环，不逃逸到背景
- [ ] 关闭模态框后焦点回到触发元素

## 提交信息

```
feat(web): add keyboard focus trapping to Modal component

Co-Authored-By: Claude <noreply@anthropic.com>
```
