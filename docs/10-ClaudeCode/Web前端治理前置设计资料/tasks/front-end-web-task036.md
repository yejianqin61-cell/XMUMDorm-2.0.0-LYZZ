# Task 036: MyPosts + MyReviews 工作台同类扩散

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#7-task-55--mailbox--myposts--myreviews)
- **优先级**: 🟡 Mailbox 验证通过后，同类页面批量套用
- **预计工作量**: 45min

## 背景

MyPosts 和 MyReviews 是"我的"次级高频页面。复用 Mailbox 的 `ListPageLayout + aside` 模式。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/MyPosts.jsx` | 套 ListPageLayout，aside 放筛选/统计 |
| `pages/MyReviews.jsx` | 同上 |

## 执行步骤

```jsx
<ListPageLayout
  header={<PageHeader title={...} />}
  filterBar={/* 帖子类型筛选 / 点评类型筛选 */}
  list={/* 帖子列表 / 点评列表 */}
  aside={isWide ? <AsideStack>统计 + 快捷入口</AsideStack> : null}
  asideSticky
/>
```

## 验收

- [ ] 桌面端两个页面均为双栏布局
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过

## 提交信息

```
feat(web): desktop layout for MyPosts and MyReviews

Co-Authored-By: Claude <noreply@anthropic.com>
```
