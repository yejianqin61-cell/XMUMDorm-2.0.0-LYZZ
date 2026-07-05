# Task 035: Mailbox 工作台代表页

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#7-task-55--mailbox--myposts--myreviews)
- **优先级**: 🟡 我的次级高频入口
- **预计工作量**: 1h

## 背景

Mailbox 当前为单列全宽通知列表。桌面化：`ListPageLayout` + 右侧筛选/统计。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/Mailbox.jsx` | 套 ListPageLayout，aside 放筛选+统计，删设计注释文案 |

## 执行步骤

### Step 1: 套 ListPageLayout

```jsx
<ListPageLayout
  header={<PageHeader title={isZh ? '信箱' : 'Mailbox'} />}
  filterBar={/* 通知类型筛选 */}
  list={/* 通知列表 */}
  aside={isWide ? <AsideStack>
    <UnreadStats />
    <QuickActions />  {/* 全部已读 / 清空 */}
  </AsideStack> : null}
  asideSticky
/>
```

### Step 2: 文案清理

```diff
- description: "让个人工作台之后的消息页在桌面主壳下保持连续节奏，快速筛选、阅读和清空。"
+ (删除，或替换为简短描述)
```

## 验收

- [ ] 桌面端 Mailbox 双栏：通知列表 + 右侧统计/操作
- [ ] 无设计注释暴露
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过

## 提交信息

```
feat(web): desktop layout for Mailbox with ListPageLayout template

Co-Authored-By: Claude <noreply@anthropic.com>
```
