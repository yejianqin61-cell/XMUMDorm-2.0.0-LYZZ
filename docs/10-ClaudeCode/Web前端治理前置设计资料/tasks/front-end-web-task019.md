# Task 019: 删除 5 个 mock 数据文件

- **Phase**: 4 — 目录职责清理
- **关联审计问题**: H-9
- **优先级**: 🟠 高危（死代码）
- **预计工作量**: 5 分钟

## 背景

`frontend/src/data/` 中的 5 个 mock 文件（mockCanteen.js, mockComments.js, mockNotifications.js, mockPosts.js, mockRankings.js）在整个 `frontend/src/` 中零引用，是早期开发遗留的死代码。

## 涉及文件（待删除）

- `frontend/src/data/mockCanteen.js`
- `frontend/src/data/mockComments.js`
- `frontend/src/data/mockNotifications.js`
- `frontend/src/data/mockPosts.js`
- `frontend/src/data/mockRankings.js`

## 执行步骤

### Step 1: 确认零引用

```bash
grep -rln "mockCanteen\|mockComments\|mockNotifications\|mockPosts\|mockRankings" frontend/src/ --include="*.jsx" --include="*.js"
```

### Step 2: 删除

确认零引用后直接删除 5 个文件。

## 验收标准

- [ ] `npm run build:web` 通过

## 提交信息

```
chore(web): remove 5 unused mock data files

Co-Authored-By: Claude <noreply@anthropic.com>
```
