## 1. 任务位置

- Phase 3 万能墙视觉：让R-4 万能墙列表详情与业务表单共享公告版式。
- 本任务建立模板标识和完整正文；沿用六模板白名单及匿名投影。
- 前置：真实资产已核对；后继：列表详情消费同一组件。

## 2. 开发所需

**先读**
- `app/src/features/campus/wallTemplates.tsx`：现有六模板如何呈现？
- `shared/constants/confessionTemplates.js`：键与上限来自哪里？
- `app/src/components/ui/Text.tsx`：怎样保留动态字号？

**已定**：公告200字；未知模板回落默认；同一类型标识来自既有词条；见共享常量与统一契约。
**边界**：只改wallTemplates及新增专项测试；模块共用正文是接缝。
**运行**：app下`npm run test:ci -- --runInBand --testPathPattern=p2x-bing-wall-template`；`npm run typecheck`。
**未知**：无新增产品决策；若必须改公共UI则交甲而不越界。

## 3. 工作流

1. 读第2节，将任务复述为共享公告标识和正文。
2. 添加公告完整正文和语言标识的失败测试。
3. 实现共享模板块及自然高度正文，运行测试。
4. 覆盖未知模板和逐行模板，保持同一接缝。
5. 运行类型检查，显式暂存并本地提交。

## 4. 测试场景

| 场景 | 输入 | 预期 | 接缝 |
| --- | --- | --- | --- |
| 公告 | 200字多行 | 完整保留，不限行 | 模板块 |
| 中英 | announcement | 公告卡/Announcement | 模板块 |
| 未知 | unknown | 默认海报卡 | 模板块 |
| 清单 | 两行 | 两项正文与图标 | 模板块 |
