# Task 032: PostSearch + PostTagFeed 内容流同类扩散

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#4-task-52--postsearch--posttagfeed)
- **优先级**: 🟠 Task 5.1 验证通过后，同类页面批量套用
- **预计工作量**: 1h

## 背景

PostSearch 和 PostTagFeed 与 TreeHole 共用帖子卡片和瀑布流组件。Task 031 验证通过后，两个页面直接复用同样的 `ListPageLayout + aside` 模式。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/PostSearch.jsx` | 套 ListPageLayout，aside 放热门标签 + 推荐话题 |
| `pages/PostTagFeed.jsx` | 同上 |
| `pages/PostSearch.css` | 桌面端呼吸间距 |
| `pages/PostTagFeed.css` | 桌面端呼吸间距 |

## 执行步骤

### 对两个文件执行相同模式

```jsx
<ListPageLayout
  header={<PageHeader title={...} />}
  filterBar={/* 搜索框 / 标签标题 */}
  list={/* 搜索结果 / 话题帖子列表 */}
  aside={isWide ? <AsideStack>热门标签 + 推荐话题</AsideStack> : null}
  asideSticky
/>
```

## 验收

- [ ] 桌面端两个页面均为双栏布局
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过

## 提交信息

```
feat(web): desktop layout for PostSearch and PostTagFeed

Co-Authored-By: Claude <noreply@anthropic.com>
```
