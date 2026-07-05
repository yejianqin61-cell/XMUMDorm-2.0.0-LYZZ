# Task 014: 修复 FoodList.css 硬编码移动端 chrome 高度

- **Phase**: 3 — 消除硬编码
- **关联审计问题**: H-8
- **优先级**: 🟠 高危
- **预计工作量**: 10 分钟

## 背景

`FoodList.css` 第 5 行使用 `height: calc(100dvh - 44px - 50px - env(...))`，44px 和 50px 是移动端浏览器 chrome 的硬编码偏移。桌面端这些偏移无意义，导致页面内容区凭空缩短 94px。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `frontend/src/pages/FoodList.css` | 添加桌面端 `@media (min-width: 768px)` 覆盖 |

## 执行步骤

### Step 1: 在文件末尾新增桌面端断点

```css
@media (min-width: 768px) {
  .food-list-page {
    height: auto;
    min-height: 60vh;
    background: var(--color-bg-page);
  }
  .food-list-layout {
    max-width: var(--layout-max-width);
    margin: 0 auto;
  }
}
```

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] 桌面端 FoodList 页面高度正常（不再凭空短 94px）
- [ ] 移动端行为不变

## 提交信息

```
fix(web): remove hardcoded mobile chrome offsets from FoodList.css

Co-Authored-By: Claude <noreply@anthropic.com>
```
