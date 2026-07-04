# Web 前端治理 Task 总览

## 1. 目标

本目录用于承接 Web 前端治理中可直接执行的 task 文档。

当前这批 task 基于以下已定稿文档拆解：

- `docs/09-Deploy/Step1-设计Token层详细设计文档.md`
- `docs/09-Deploy/Step2-基础UI组件层详细设计文档.md`
- `docs/09-Deploy/Step3-页面模板层详细设计文档.md`

目标是把 Step 1、Step 2 和 Step 3 变成可以逐个执行、逐个提交、逐个验收的实施任务。

## 2. 执行原则

统一执行规则如下：

1. 一次只做一个 task。
2. 完成一个 task 后单独提交一次。
3. 提交信息必须符合 Conventional Commits。
4. 默认优先改 `frontend/`，不主动改 `frontend-app/` 和 `shared/*`。
5. 优先复用现有组件，避免重复造轮子。

## 3. Task 执行顺序

当前建议严格按下面顺序推进：

1. `T01-Token基础盘点与命名落地.md`
2. `T02-Token兼容映射与样式接管.md`
3. `T03-Card基础件统一.md`
4. `T04-Button基础件统一.md`
5. `T05-表单基础件统一.md`
6. `T06-Tag与Badge统一.md`
7. `T07-空态错误态骨架屏统一.md`
8. `T08-Modal与Toast第二批基础件.md`
9. `T09-页面头部与区块头模板统一.md`
10. `T10-筛选条模板统一.md`
11. `T11-列表页模板落地.md`
12. `T12-详情页模板落地.md`
13. `T13-表单页模板落地.md`
14. `T14-工作台与后台模板预留.md`

## 4. 推荐提交规范

推荐提交前缀：

- `docs(web): ...`
- `feat(web-ui): ...`
- `refactor(web-ui): ...`
- `chore(web-ui): ...`

## 5. 阶段边界

这一批 task 只覆盖：

- Step 1：设计 Token 层
- Step 2：基础 UI 组件层
- Step 3 页面模板层

暂不覆盖：

- Step 4 Web 主壳替换
- Step 5 以后模块页面迁移

## 6. 完成标准

当本目录下全部 task 完成后，意味着：

- Web 端有统一 token 体系
- Web 端有第一批可复用基础组件
- Web 端有首批可复用页面模板
- 后续 Web 主壳替换与高频页面迁移具备正式开工条件

## 7. 后续文档

这一批 task 全部完成后，需要补：

- 阶段性开发完成度公报
- Step 4 Web 主壳 task 文档
