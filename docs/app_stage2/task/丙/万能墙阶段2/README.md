# 万能墙阶段 2 · 自由帖发布与文字自动排版（节点 A）

2026-11-02｜所有者任务书《XMUMDorm 万能墙重构 — 阶段 2》｜基线 `dev-gjl` = `ef1ebb41`（阶段 1 已验收）

## 1. 本阶段只做什么

| 节点 | 内容 | 状态 |
| --- | --- | --- |
| **A** | 五种文字海报模板 + 基础自动排版 + 可实机预览 | **本轮交付，等待视觉确认** |
| B | 编辑 / 预览 / 发布 / 真实持久化 / 信息流读取 / 详情 / 作者编辑删除 | 未开工（需 A 确认） |
| C | 稳定性与最终验收（极端文本、权限、重复发布、样式稳定） | 未开工 |

节点 A **不接数据库、不发请求**：示例帖与预览页全部是静态样本，真实发布留给节点 B。

## 2. 允许改动的路径（本轮实际落点）

- `app/src/features/campus/wallPosterTemplates.ts`（模板配置）
- `app/src/features/campus/wallPosterLayout.ts`（文字分析 / 约束 / 评分 / 候选 / 回退）
- `app/src/features/campus/WallPosterBody.tsx`（唯一渲染器）
- `app/src/features/campus/WallFreePostBody.tsx`（信息流 / 详情入口）
- `app/src/features/campus/WallPostCard.tsx`、`wallPost.ts`、`wallSamplePosts.ts`、`WallSampleBand.tsx`
- `app/src/features/campus/WallPosterLab.tsx`、`wallPosterLabCases.ts`、`app/src/app/dev/wall-poster.tsx`（节点 A 临时预览，节点 B 删除）
- `app/src/components/ui/Text.tsx`（只增加 `onTextLayout` 只读测量通道）
- `app/src/i18n/{zh,en}.ts`、对应测试与本文档

⛔ 未改：`WallCardShell`（公共外壳）、底部互动栏、广场导航、`CampusScreens` 的匿名 / 评论 / 举报流程、后端与数据库、`shared/`。

## 3. 明确不做（留到后续阶段）

评论 / 回复 / 评论点赞 / 热度 / 投票 / 招募真实发布 / 私聊 / 推荐 / 海报导出 / 顶部收起动画 / 字体选择器。
