# Task 030: shared 层补充基础测试

- **Phase**: 6 — 共享层规范化
- **关联审计问题**: M-15
- **优先级**: 🟡 中危
- **预计工作量**: 30 分钟

## 背景

`shared/` 是 Web 和 App 双端的依赖基础，但零测试覆盖。需要为核心工具函数补充基础单元测试。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `__tests__/shared/formatTime.test.js` | **新建** |
| `__tests__/shared/nestComments.test.js` | **新建** |
| `__tests__/shared/formatTodoDue.test.js` | **新建** |
| `__tests__/shared/apiError.test.js` | **新建** |

## 执行步骤

### Step 1: 创建测试目录

```bash
mkdir -p __tests__/shared
```

### Step 2: 编写测试

**formatTime.test.js**：
- 测试 `formatPostTime` 中文输出
- 测试 `formatPostTime` 英文输出
- 测试边界情况（null/undefined/未来时间）

**nestComments.test.js**：
- 测试评论嵌套展平逻辑
- 测试空数组输入

**formatTodoDue.test.js**：
- 测试各种日期格式解析
- 测试边界值

**apiError.test.js**：
- 测试标准 API 错误格式解析
- 测试网络错误 fallback

### Step 3: 运行测试

```bash
npx jest __tests__/shared/ --coverage
```

目标：核心工具函数 ≥ 80% 语句覆盖率。

## 验收标准

- [ ] 所有新建测试通过
- [ ] `npx jest __tests__/shared/` 全绿

## 提交信息

```
test(shared): add unit tests for core utility functions

Co-Authored-By: Claude <noreply@anthropic.com>
```
