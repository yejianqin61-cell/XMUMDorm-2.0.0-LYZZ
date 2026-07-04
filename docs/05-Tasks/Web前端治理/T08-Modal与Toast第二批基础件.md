# T08 Modal 与 Toast 第二批基础件

## 1. 任务目标

在第一批核心基础件稳定后，补齐 `Modal` 与 `Toast` 两个高频反馈组件。

## 2. 影响范围

- `frontend/src/components/ui/Modal.jsx`
- `frontend/src/components/ui/Toast.jsx`
- 相关样式文件

## 3. 不可触碰边界

- 不做全站弹层逻辑重构
- 不在本任务里重写路由过渡或页面壳

## 4. 实施步骤

1. 设计 `Modal` 的结构：
   - title
   - content
   - actions
   - close behavior
2. 设计 `Toast` 的结构：
   - variant
   - message
   - dismiss
3. 接入 token 体系和 z-index 规则。
4. 选取已有弹层或提示场景做接入验证。

## 5. 验收方式

- `Modal`、`Toast` 可以被多场景复用
- 层级、动效、视觉统一
- `npm run build:web` 通过

## 6. 推荐提交信息

`feat(web-ui): add shared modal and toast primitives`

## 7. 前置依赖

- `T01-Token基础盘点与命名落地.md`
- `T02-Token兼容映射与样式接管.md`
- `T04-Button基础件统一.md`
- `T07-空态错误态骨架屏统一.md`

## 8. 后置影响

- 为确认弹窗、系统提示、统一反馈机制提供标准基础件
