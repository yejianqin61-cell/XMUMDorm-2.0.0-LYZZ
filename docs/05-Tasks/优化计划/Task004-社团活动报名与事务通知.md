# Task004 社团活动报名与事务通知

日期：2026-06-21  
优先级：P0  
状态：待开发  
任务类型：前后端联动任务  
依据文档：

- `docs/05-Tasks/优化计划/校园社交平台体验升级任务清单.md`
- `docs/05-Tasks/优化计划/校园社交平台体验升级技术开发文档.md`

---

## 1. 任务目标

完成活动闭环第一阶段建设：

1. 用户可报名与取消报名
2. 活动详情可展示报名状态与人数
3. 报名成功后可写入事务型通知
4. 通知中心可区分互动通知与事务通知

---

## 2. 建议负责人

- 后端：1 人主负责
- 前端：1 人配合联调

---

## 3. 数据库任务

新增表：

- `club_activity_registrations`

建议字段：

```sql
id
activity_id
user_id
status
created_at
updated_at
cancelled_at
```

约束建议：

- 唯一键 `(activity_id, user_id)`

---

## 4. 后端开发任务

涉及文件：

- `routes/clubs.js`
- `routes/notifications.js`
- `services/*`（如需）
- `migrations/*`

接口任务：

1. `POST /api/clubs/activities/:id/register`
2. `DELETE /api/clubs/activities/:id/register`
3. `GET /api/clubs/activities/:id/registration-status`

通知扩展：

- `activity_register_success`
- `activity_start_reminder`
- `activity_deadline_reminder`

开发内容：

1. 报名、取消报名逻辑
2. 并发与重复报名保护
3. 活动详情接口附带报名状态与人数
4. 报名成功后的事务通知写入

---

## 5. 前端开发任务

涉及文件：

- `frontend/src/pages/Clubs/ActivityDetail.jsx`
- `frontend/src/components/clubs/ActivityRegisterBar.jsx`
- `frontend/src/pages/Mailbox.jsx`
- `frontend/src/api/notifications.js`

开发内容：

1. 活动详情页展示报名状态、人数、截止时间
2. 增加报名 / 取消报名操作条
3. 通知中心增加“事务”分类
4. 点击事务通知可回流到活动详情

---

## 6. 依赖关系

- 依赖数据库迁移
- 建议在 `Task001` 首页上线前后并行开发

---

## 7. 交付物

- 报名数据表
- 报名相关接口
- 活动详情报名 UI
- 通知事务分类基础版

---

## 8. 验收标准

- 用户可稳定报名和取消报名
- 报名人数能正确更新
- 报名状态可在详情页稳定显示
- 事务通知不再混在点赞评论中
- 点击通知可正确跳回活动详情

---

## 9. 风险与注意事项

- 并发报名与重复提交是重点风险
- 建议错误返回结构统一，方便前端 toast 提示
- P0 阶段先写数据库通知，不做复杂调度后台
