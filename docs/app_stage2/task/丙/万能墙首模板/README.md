# 万能墙首模板任务批次

2026-10-30｜丙｜Phase 3 首批：公告卡从列表、详情到发布模块一致。
当前人类授权覆盖模块实现、验证、独立审查及后续计划内独立任务；旧计划的阶段停点以本次授权为准。
沿用easy-workflow已安装提交 `2d501095d919d2e1960ae7caf860b8cafd6c7686`，不安装或升级。

1. [公告卡共用呈现](Task-万能墙-共用呈现.md)：先建立同一正文与类型标识。
2. [列表详情贯通](Task-万能墙-列表详情.md)：消费共用呈现，保留匿名与已有互动链路。
3. [发布预览与交付](Task-万能墙-发布预览交付.md)：交业务预览接缝，验证并交甲。

允许修改：`app/src/features/campus/wallTemplates.tsx`、`WallFeed.tsx`、`CampusScreens.tsx`、`campusModel.ts`、`publishFields.ts`。
允许新增：同目录`WallPostRow.tsx`、`WallPublishPreview.tsx`。
测试允许：`app/src/__tests__/p2x-bing-campus.test.tsx`、`p2x-bing-wall-publish.test.ts`及新增`p2x-bing-wall-template.test.tsx`。
回归发现后补登记：`p2x-treehole-phase-two-contract.test.ts`仅更新墙独立列表/匿名的结构断言，旧ListItem快照已被完整模板替换。
文档允许：本目录、丙当前接续/索引/实施计划、丙交甲材料及丙审查目录。
公共路由/UI/词条/发布宿主/共享配置、shared及后端仅阅读；缺能力交具体接线，不声称集成。

状态矩阵：正常/长文公告完整呈现；模板未知沿用默认；空列表可刷新；读取失败可重试；匿名无头像/真实身份。
详情继续使用已有点赞、评论、本人删除权限与失败状态；本批列表动作进入详情，不新增并发写入逻辑。
发布切换保留输入并按模板字数校验；预览不发请求、不另存草稿，公共宿主接线待甲。

验证：针对性Jest → 最终`npm run verify:serial`及`npm run lint` → 固定提交只读独立审查 → 必要限定返工。
真实接口、设备截图/手势、键盘及非实现者体验未验证；已知无设备不重复探测。
要求源：[实施计划](../实施计划.md)、[统一契约](../../../requirements/Stage2统一口径与接口契约.md)、[验收矩阵](../../../test/Stage2验收矩阵.md)。

当前证据见[执行记录](执行记录.md)，阶段简报见[阶段交付](阶段交付.md)。
