## 1. 任务位置

- Phase 3 万能墙视觉：R-4 万能墙列表详情与业务表单的阅读链路。
- 公告在列表完整可读，详情同标识同正文；保留匿名及现有交互权限。
- 前置：共用呈现；后继：发布模块与交付验证。

## 2. 开发所需

**先读**
- `app/src/features/campus/WallFeed.tsx`：如何保留窗口和返回状态？
- `app/src/features/campus/CampusScreens.tsx`：详情正文在哪里注入？
- `routes/confessions.js`：哪些公开字段可保留？
- `app/src/__tests__/p2x-bing-campus.test.tsx`：匿名与互动如何验证？

**已定**：不改游标/删除/账号隔离；匿名不保留真实身份和媒体；见统一契约。
**边界**：README列明的模块及测试；复用模板块，不动公共UI及路由。
**运行**：app下`npm run test:ci -- --runInBand --testPathPattern=p2x-bing-campus`；`npm run typecheck`。
**未知**：时间只消费服务端公开时间；缺失不伪造；不扩大互动写入范围。

## 3. 工作流

1. 读第2节，复述为列表详情完整同源阅读。
2. 在真实Feed/Detail组合添加公告和匿名失败测试。
3. 用共用模板替换两行摘要，保留导航入口。
4. 在详情插入同一模板标识，保留现有动作。
5. 验证匿名、分页、删除及返回；本地提交。

## 4. 测试场景

| 场景 | 输入 | 预期 | 接缝 |
| --- | --- | --- | --- |
| 公告长文 | 多行200字 | 列表详情完整同标识 | Feed/Detail |
| 点开 | 公告40 | 原wall/40路由 | Feed |
| 身份污染 | author/title/images | 无身份标题图片 | Feed/Detail |
| 服务端时间 | created_at | 保留公开时间 | asWall |
| 删除失败 | 已有错误响应 | 不假删，提示可重试 | Detail |
