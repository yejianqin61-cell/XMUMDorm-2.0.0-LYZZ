# T18 AdminDashboard 后台模板扩散验证

## 1. 任务目标

在 `T14-工作台与后台模板预留.md` 的基础上，继续选一个更标准的后台页做扩散验证，建议优先使用 `pages/Admin/AdminDashboard.jsx`。

目标是确认 `AdminPageLayout` 不是只够承接 `SquareOrgAdmin.jsx`，而是能继续覆盖后台页场景。

## 2. 影响范围

- `frontend/src/pages/Admin/AdminDashboard.jsx`
- 相关后台样式文件
- 如有必要，少量 `AdminPageLayout` 样式

## 3. 不可触碰边界

- 不重写后台业务接口
- 不大改后台权限体系
- 不在本任务里顺手统一所有 `pages/Admin/*`

## 4. 实施步骤

1. 让后台首页接入 `AdminPageLayout`。
2. 梳理标题区、工具区、内容区的映射关系。
3. 保持后台业务功能不变，只整理结构节奏。
4. 完成后执行 `npm run build:web`。

## 5. 验收方式

- `AdminPageLayout` 成功覆盖第二个后台页
- 后台页结构更稳定，工具条与内容区边界更清晰
- 后台业务逻辑无回归
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-template): validate admin dashboard with shared admin layout`

## 7. 前置依赖

- `T14-工作台与后台模板预留.md`
- `docs/09-Deploy/Step3-页面模板层实施级详细设计文档.md`

## 8. 后置影响

- 为 `pages/Admin/*` 后续继续模板化提供落地标准
- 证明后台模板不只停留在预留层
