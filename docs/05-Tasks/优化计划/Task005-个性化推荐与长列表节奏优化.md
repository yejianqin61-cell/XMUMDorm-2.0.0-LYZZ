# Task005 个性化推荐与长列表节奏优化

日期：2026-06-21  
优先级：P1  
状态：待开发  
任务类型：前后端联动任务  
依据文档：

- `docs/05-Tasks/优化计划/校园社交平台体验升级任务清单.md`
- `docs/05-Tasks/优化计划/校园社交平台体验升级技术开发文档.md`

---

## 1. 任务目标

在 P0 稳定后增强内容分发体验：

1. 广场顶部增加“和我有关”的推荐区
2. 树洞与广场长列表增加节奏变化
3. 建立第一版规则型推荐能力

---

## 2. 建议负责人

- 后端：1 人主负责推荐与数据结构
- 前端：1 人负责推荐区与中插区块

---

## 3. 数据层与接口任务

建议新增表：

- `user_recent_views`
- `user_interest_tags`
- `user_relation_signals`

接口任务：

- `GET /api/square/personalized-summary`
- `GET /api/posts/hot-tags`
- `GET /api/square/recommendations`
- `GET /api/recommend/feed`

规则建议：

1. 同学院优先
2. 同社团优先
3. 热门内容加权
4. 最近浏览标签加权

---

## 4. 前端开发任务

涉及页面：

- `frontend/src/pages/SquareHome.jsx`
- `frontend/src/pages/TreeHole.jsx`

建议新增组件：

- `MyCampusRecommendations`
- `HotTagsStrip`
- `InterestRecommendationBlock`
- `RelatedCampusTopicsBlock`

开发内容：

1. 在广场顶部增加个性化推荐区
2. 在树洞与广场长列表增加中插节奏区块
3. 为空行为用户设计降级展示逻辑

---

## 5. 依赖关系

- 依赖 P0 首页结构稳定
- 依赖用户行为记录的最小化埋点或浏览记录能力

---

## 6. 交付物

- 第一版推荐数据结构
- 个性化推荐接口
- 广场顶部推荐区
- 长列表节奏优化区块

---

## 7. 验收标准

- 广场顶部能展示个性化内容
- 长列表中有合理的节奏变化点
- 滚动性能无明显下降
- 推荐结果不仅只有热门内容

---

## 8. 风险与注意事项

- P1 阶段不做复杂算法，优先规则型推荐
- 推荐解释性要尽量清晰，避免“看不懂为什么推给我”
