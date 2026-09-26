# 食堂菜品评价示例

数据由远程数据库中未删除的 `shops` 与 `products` 读取生成。

- 每家店按 `product_id` 稳定选取最多 5 道菜。
- 每道菜生成 2 条带 `[示例评价]` 标记的评价。
- 评价从 10 套有人味的美食评论模板中稳定选择；同一道菜的两条评价使用不同模板。
- 评价内容只根据菜品名称和说明推测食材/口味，不代表真实用餐体验。
- 模板研究记录见 `docs/research/food-review-copy-templates.md`。
- 分数范围为 6–10，并映射到现有五档 `product_comments.rating`：
  `6=拉完了`、`7=NPC`、`8=人上人`、`9=顶级`、`10=夯爆了`。
- 由于现有点评表没有数值分数字段，需先执行 `migrations/066_product_comment_score.sql`。

准备数据（只读远程库）：

```bash
node scripts/prepare-canteen-product-reviews.js
```

迁移脚本默认 dry-run，确认后再加 `--apply`：

```bash
node scripts/import-canteen-product-reviews.js --user-id <已有 users.id>
node scripts/import-canteen-product-reviews.js --apply --user-id <已有 users.id>
```
