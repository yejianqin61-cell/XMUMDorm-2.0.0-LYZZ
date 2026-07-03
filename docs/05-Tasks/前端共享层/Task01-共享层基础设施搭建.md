# Task01-共享层基础设施搭建

## 目标

建立共享目录结构与前端引用基础设施，为后续抽取 API / constants / utils / query 做准备。

## 范围

- 新建 `shared/` 目录
- 新建首批子目录骨架
- 为 `frontend/` 与 `frontend-app/` 增加共享别名
- 不迁移业务逻辑

## 交付物

- `shared/README.md`
- `shared/api/`
- `shared/constants/`
- `shared/utils/`
- `shared/query/`
- `frontend/vite.config.js` 增加共享 alias
- `frontend-app/vite.config.js` 增加共享 alias

## 验证

- `npm run build:web`
- `npm run build:app`

## 提交规范

建议 commit：

```text
chore(shared): add shared workspace scaffolding
```
