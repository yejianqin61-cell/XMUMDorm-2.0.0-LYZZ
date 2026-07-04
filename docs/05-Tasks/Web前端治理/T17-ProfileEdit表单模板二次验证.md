# T17 ProfileEdit 表单模板二次验证

## 1. 任务目标

继续用 `ProfileEdit.jsx` 对 `FormPageLayout` 做第二轮验证，确认“用户资料编辑页”这类偏设置型表单，也能落在统一表单模板下。

## 2. 影响范围

- `frontend/src/pages/ProfileEdit.jsx`
- `frontend/src/pages/ProfileEdit.css`
- 如有必要，少量表单模板样式

## 3. 不可触碰边界

- 不改资料保存接口
- 不改头像上传逻辑
- 不改登录校验逻辑

## 4. 实施步骤

1. 把资料编辑页接入 `FormPageLayout`。
2. 统一头部说明、表单分区、底部操作区节奏。
3. 保持原有字段、校验、提示逻辑不变。
4. 完成后执行 `npm run build:web`。

## 5. 验收方式

- 页面具备统一表单页结构
- 表单分组与提交区更稳定
- 原有上传与保存行为无回归
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-template): validate profile edit with shared form layout`

## 7. 前置依赖

- `T13-表单页模板落地.md`
- `docs/09-Deploy/Step3-页面模板层实施级详细设计文档.md`

## 8. 后置影响

- 为 `FoodCreate`、`PublishErrand`、`MarketplacePublish` 等页面继续统一表单节奏提供参考
