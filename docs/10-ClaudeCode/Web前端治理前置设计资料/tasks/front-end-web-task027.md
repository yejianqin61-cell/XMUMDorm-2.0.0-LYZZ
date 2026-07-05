# Task 027: `formatPostTime()` 支持中英文

- **Phase**: 6 — 共享层规范化
- **关联审计问题**: M-13
- **优先级**: 🟡 中危（影响双端）
- **预计工作量**: 15 分钟

## 背景

`shared/utils/formatTime.js` 的 `formatPostTime()` 仅输出英文时间描述（"just now", "min ago"），但应用支持中英文切换。需增加 `locale` 参数。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `shared/utils/formatTime.js` | 修改 — 增加 locale 参数 |
| 所有调用 `formatPostTime` 的 Web 页面 | 修改 — 传入 locale |
| `frontend-app/` 对应页面 | 联动修改 — 传入 locale |

## 执行步骤

### Step 1: 修改 `formatPostTime` 签名

```js
export function formatPostTime(createdAt, locale = 'zh') {
  // ...原有逻辑
  // 根据 locale 返回对应语言
}
```

### Step 2: Web 端调用处传入 locale

在 Web 页面中：
```js
const { lang } = useLanguage();
const isZh = lang !== 'en';
formatPostTime(post.created_at, isZh ? 'zh' : 'en');
```

### Step 3: App 端联动

同样在 App 端的调用处传入 locale。

## 验收标准

- [ ] `npm run build:web && npm run build:app` 通过
- [ ] 中文环境显示"3 分钟前"，英文环境显示"3 min ago"

## 提交信息

```
feat(shared): add locale support to formatPostTime

Co-Authored-By: Claude <noreply@anthropic.com>
```
