# Task 034: FoodDetail + MerchantFoodDetail 详情页 aside 补全

- **阶段**: Step 5 — 高频页面桌面化迁移
- **方案依据**: [Step5 设计方案](../Step5-高频页面桌面化详细设计方案.md#6-task-54--fooddetail--merchantfooddetail)
- **优先级**: 🟡 详情页已有 DetailPageLayout 模板，只需补 aside 内容 + 文案清理
- **预计工作量**: 1h

## 背景

FoodDetail 和 PostDetail 已接入 `DetailPageLayout`（Codex 前置工作），但 aside 可能为空或只占位。本轮补全右侧内容：商家信息 + 相关推荐。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `pages/FoodDetail.jsx` | 补 aside 内容，删设计注释文案 |
| `pages/MerchantFoodDetail.jsx` | 同上 |
| `pages/FoodDetail.css` | 主列宽度约束 |
| `pages/PostDetail.jsx` | 删 2 处设计注释文案 (line 621, 641) |

## 执行步骤

### Step 1: FoodDetail aside

```jsx
<DetailPageLayout
  header={...}
  hero={...}
  content={...}
  comments={...}
  aside={
    <AsideStack>
      <MerchantInfoCard shopId={shopId} />
      <RelatedFoods area={area} shopId={shopId} />
    </AsideStack>
  }
/>
```

### Step 2: 文案清理

```diff
PostDetail.jsx:
- "把最可能继续发生的操作集中放在正文卡片下方，桌面阅读时路径更稳定。"
+ (删除)

- "评论树结构和交互逻辑保持不变，本次只把页面节奏整理进共享详情模板里。"
+ (删除)
```

### Step 3: 正文宽度约束

```css
@media (min-width: 1080px) {
  .detail-page-layout__main {
    max-width: 780px;
  }
}
```

## 验收

- [ ] 桌面端详情页右侧有商家信息和相关推荐
- [ ] 无设计注释暴露在 UI 上
- [ ] 正文 ≤ 780px 舒适阅读宽度
- [ ] 移动端行为和当前一致
- [ ] `npm run build:web` 通过

## 提交信息

```
feat(web): populate detail page aside, remove design commentary

Co-Authored-By: Claude <noreply@anthropic.com>
```
