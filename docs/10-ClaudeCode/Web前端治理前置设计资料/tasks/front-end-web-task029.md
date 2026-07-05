# Task 029: 统一 shared API 函数签名

- **Phase**: 6 — 共享层规范化
- **关联审计问题**: Agent A4
- **优先级**: 🟡 中危
- **预计工作量**: 20 分钟

## 背景

`shared/api/` 中不同的模块使用了不一致的参数命名和函数签名（有的用 `body`，有的用 `options`，有的传 `FormData`，有的传 object）。应统一为标准签名并抽取重复的 FormData 构建逻辑。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `shared/utils/toFormData.js` | **新建** — 统一的 FormData 构建 helper |
| 各 `shared/api/*.js` 调用处 | 逐步迁移 |

## 执行步骤

### Step 1: 创建 `shared/utils/toFormData.js`

```js
/**
 * Build FormData from a body object and optional files array.
 * @param {Object} body - key-value pairs
 * @param {Array<{key: string, value: File|Blob}>} [files]
 * @returns {FormData}
 */
export function toFormData(body = {}, files = []) {
  const fd = new FormData();
  Object.entries(body).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  files.forEach(({ key, value }) => {
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
      fd.append(key, value);
    }
  });
  return fd;
}
```

### Step 2: 制定签名规范（文档约定）

- Create: `createResource(body, files?)`
- Update: `updateResource(id, body, files?)`
- List: `listResources(params?)` 其中 params 是 `{ page, pageSize, ...filters }`
- Delete: `deleteResource(id)`

不要求一次性迁移所有 API 模块。新代码和重构时必须遵守。

## 验收标准

- [ ] `npm run build:web && npm run build:app` 通过
- [ ] `toFormData.js` 单元测试通过

## 提交信息

```
refactor(shared): add toFormData helper, document API signature convention

Co-Authored-By: Claude <noreply@anthropic.com>
```
