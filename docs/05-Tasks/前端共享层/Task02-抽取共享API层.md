# Task02-抽取共享API层

## 目标

将两套前端完全一致的 API 层抽取到 `shared/api/`，统一接口访问实现。

## 范围

- 迁移 `api/*.js`
- 保持 API 语义与行为不变
- `frontend/` 与 `frontend-app/` 改为从共享层导入 API

## 文件范围

- `admin.js`
- `auth.js`
- `canteen.js`
- `clubs.js`
- `config.js`
- `diary.js`
- `errands.js`
- `handbook.js`
- `marketplace.js`
- `notifications.js`
- `organizations.js`
- `posts.js`
- `push.js`
- `rankings.js`
- `request.js`
- `schedule.js`
- `square.js`
- `tags.js`
- `todos.js`
- `users.js`

## 关键约束

- 不改后端接口协议
- 不改变 token 获取逻辑
- 不改变错误处理格式
- 不引入 Web/App 行为差异

## 验证

- `npm run build:web`
- `npm run build:app`
- `npm run build:capacitor`

## 提交规范

建议 commit：

```text
refactor(shared): extract shared api layer
```
