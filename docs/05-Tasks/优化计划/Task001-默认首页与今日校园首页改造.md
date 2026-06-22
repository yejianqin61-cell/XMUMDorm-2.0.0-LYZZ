# Task001 默认首页与今日校园首页改造

日期：2026-06-21  
优先级：P0  
状态：待开发  
任务类型：前后端联动任务  
依据文档：

- `docs/05-Tasks/优化计划/校园社交平台体验升级任务清单.md`
- `docs/05-Tasks/优化计划/校园社交平台体验升级技术开发文档.md`

---

## 1. 任务目标

完成首页体验的第一阶段改造：

1. 默认首页从树洞切换为广场
2. 底部 Tab 顺序调整为“广场”第一位
3. `SquareHome` 升级为“今日校园”首页
4. 首屏采用聚合接口返回摘要数据，减少首屏碎片请求

---

## 2. 建议负责人

- 前端：1 人
- 后端：1 人
- 联调：前后端共同完成

---

## 3. 前端开发任务

### 3.1 默认首页与 Tab 调整

涉及文件：

- `frontend/src/routes/layoutRoutes.jsx`
- `frontend/src/components/TabBar*`
- `frontend/src/pages/SquareHome.jsx`
- 可能涉及 `App.jsx` / Layout 默认 route

开发内容：

1. 将 layout index route 从树洞切到广场
2. 调整底部 Tab 顺序，广场放第一位
3. 保留树洞独立入口，但不再作为默认首页
4. 检查默认高亮、返回栈、深链进入逻辑

### 3.2 “今日校园”首页组件化改造

建议新增组件：

- `frontend/src/components/square/TodayCampusHero.jsx`
- `frontend/src/components/square/TodayCampusSummary.jsx`
- `frontend/src/components/square/TodayCampusQuickActions.jsx`
- `frontend/src/components/square/TodayCampusHotActivities.jsx`
- `frontend/src/components/square/TodayCampusHotTopics.jsx`
- `frontend/src/components/square/TodayCampusModuleGrid.jsx`

建议样式文件：

- `frontend/src/pages/SquareHome.css`
- 或 `frontend/src/components/square/*.css`

开发内容：

1. 重组 `SquareHome` 页面结构
2. 完成首页摘要区、快捷操作区、热点活动区、热点话题区、模块网格区
3. 处理 Web 与 Capacitor 双形态下的首屏布局
4. 处理移动端顶部安全区，避免状态栏遮挡

---

## 4. 后端开发任务

涉及文件：

- `routes/square.js`
- `services/squareHomeService.js`（如需）

接口任务：

- `GET /api/square/home-summary`

建议返回结构：

```json
{
  "status": 0,
  "data": {
    "unread_count": 3,
    "hot_treeholes": [],
    "hot_topics": [],
    "hot_activities": [],
    "food_rankings": [],
    "quick_stats": {
      "events_today": 2,
      "unread_notifications": 3
    }
  }
}
```

开发内容：

1. 整合首页首屏需要的摘要数据
2. 优先在 service 层聚合，避免路由层过重
3. 明确接口失败时的降级结构，避免前端整页崩溃

---

## 5. 依赖关系

- 本任务可作为 P0 第一批任务率先执行
- 与 `Task002` 的卡片系统可并行推进

---

## 6. 交付物

- 默认首页切换后的路由结构
- 新版 `SquareHome`
- 聚合接口 `GET /api/square/home-summary`
- 首屏联调完成版本

---

## 7. 验收标准

- 登录态与游客态默认进入广场页
- Tab 顺序与高亮逻辑正确
- 首页首屏不再只是入口拼接
- 关键首屏数据可由单接口返回
- Web 与 Capacitor 均能稳定显示顶部内容

---

## 8. 风险与注意事项

- 需重点检查首页切换后返回逻辑是否异常
- 首页聚合接口失败时，前端要支持局部降级
- Capacitor 顶部安全区必须实机验证
