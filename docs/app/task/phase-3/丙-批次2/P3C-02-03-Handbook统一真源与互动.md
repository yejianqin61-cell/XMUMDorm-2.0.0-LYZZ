## 1. Where this task sits

- **批次 2 服务列表完成**：Handbook 必须以既有文章真源支持分类、搜索、点赞与评论。
- 本任务实现 FR-04，不能创建第二套“指南”数据。
- **开始前**：批次 0 完成。**后续依赖**：甲接词条和入口；后端现有文章契约。

## 2. What the developer needs to know

**Read first**

- `app/src/features/guides/GuidesScreens.tsx` — 当前文章列表/详情及空错状态。
- `shared/api/handbook.js` — 文章列表、点赞、评论契约。
- `routes/handbook.js` — 分类/搜索参数、权限与评论约束。
- `app/src/components/ui/SearchField.tsx` 与 `CommentThread.tsx` — 复用入口与二级评论限制。

**Settled**

- 分类与搜索均使用同一个 Handbook 文章真源。
- 互动失败须说明真实原因；不能以本地状态伪造成功。
- 不新增第二套评论组件、请求基座或公共词条。

**Edges and seam**

- 触及 `features/guides` 及 Handbook 域 API 适配；不改公共组件与 i18n 文件。
- Seam：`GuidesListScreen`、`GuideDetailScreen` 与 `shared/api/handbook.js`。

**Run**

- `cd app && npm test -- --runInBand p2x-bing-campus p2x-bing-market-errand`
- `cd app && npm run typecheck`

**Unknowns**

- 如果文章列表接口缺分类/搜索真实参数，停止客户端筛选假实现，登记后端契约缺口。

## 3. The workflow

1. 读取入口并确认文章列表、详情、点赞和评论的响应形状。
2. 为分类、搜索和单一真源写失败测试。
3. 复用 `TopTabStrip` 与 `SearchField` 完成列表查询状态。
4. 接入真实点赞、评论、二级回复/删除能力；严格处理登录和权限失败。
5. 补四态、无障碍及详情返回回归。
6. 运行测试、typecheck，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 分类加搜索 | 同一文章 API 收到完整条件 | `GuidesListScreen` |
| 2 | 搜索无结果 | 显示业务空态，不显示网络错误 | 查询错误映射 |
| 3 | 未登录点赞/评论 | 显示登录引导，不改本地互动状态 | `GuideDetailScreen` |
| 4 | 一级评论回复 | 最多两层，不能回复回复 | `CommentThread` 适配 |
| 5 | 权限拒绝/网络失败 | 分别显示可理解状态并支持重试 | Handbook API |
