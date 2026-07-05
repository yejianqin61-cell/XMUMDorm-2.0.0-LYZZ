# Task 005: 迁移旧 Card → 新 ui/Card（11 个页面）

- **Phase**: 2 — 统一组件引用
- **关联审计问题**: H-1
- **优先级**: 🟠 高危
- **预计工作量**: 25 分钟

## 背景

11 个页面引用 `components/Card`（仅添加 `.card` class 的薄 wrapper），而新 `components/ui/Card` 支持 variant/size/interactive。这些页面中部分同时使用了新 `ui/Button` 和新 `ui/Tag`，唯独 Card 停留在旧体系。

## 涉及文件

| # | 文件 | 当前 import |
|---|------|-------------|
| 1 | `pages/PostDetail.jsx:9` | `import Card from '../components/Card'` |
| 2 | `pages/FoodDetail.jsx:6` | `import Card from '../components/Card'` |
| 3 | `pages/MerchantList.jsx:6` | `import Card from '../components/Card'` |
| 4 | `pages/Rankings.jsx:4` | `import Card from '../components/Card'` |
| 5 | `pages/AreaProductRanking.jsx:4` | `import Card from '../components/Card'` |
| 6 | `pages/AboutTeam.jsx:1` | `import Card from '../components/Card'` |
| 7 | `pages/AboutEditor.jsx:1` | `import Card from '../components/Card'` |
| 8 | `pages/AboutEditorNote.jsx:1` | `import Card from '../components/Card'` |
| 9 | `pages/AboutAlgorithm.jsx:1` | `import Card from '../components/Card'` |
| 10 | `pages/AboutLevelAlgorithm.jsx:1` | `import Card from '../components/Card'` |
| 11 | `pages/AboutThanks.jsx:1` | `import Card from '../components/Card'` |

## 执行步骤

### 对所有 11 个文件执行相同操作

将 import 语句：
```js
import Card from '../components/Card';
```
替换为：
```js
import Card from '../components/ui/Card';
```

### 检查兼容性

旧 Card 使用 `className="card"`，新 Card 使用 `className="ui-card"`。迁移后需检查：
- 页面 CSS 中是否有对 `.card` 的样式依赖
- JSX 中是否传了 `as` / `className` 等 props

对于此 11 个页面，旧 Card 的 API (`className`, `as`, `children`) 与新 Card 兼容，因为新 Card 是旧 Card 的超集。

## 验收标准

- [ ] `npm run build:web` 通过
- [ ] `grep -rn "from '\.\./components/Card'" frontend/src/pages/` 返回空
- [ ] 每个页面视觉回归 — 卡片样式无变化

## 提交信息

```
refactor(web): migrate 11 pages from legacy Card to ui/Card

Replace `import Card from '../components/Card'` with
`import Card from '../components/ui/Card'` across all pages
still using the old wrapper.

The new ui/Card is a superset of the old API and supports
variant, size, and interactive props.

Co-Authored-By: Claude <noreply@anthropic.com>
```
