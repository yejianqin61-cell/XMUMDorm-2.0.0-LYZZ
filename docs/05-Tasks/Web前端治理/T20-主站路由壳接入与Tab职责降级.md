# T20 主站路由壳接入与Tab职责降级

## 1. 任务目标

在 `T19-主站桌面壳骨架搭建.md` 的基础上，把主站路由接入新的桌面壳，并降低旧 `TabBar` 在桌面端的主导航职责。

本任务的重点不是删除移动兼容，而是建立“桌面走新壳、移动保留兼容”的接线关系。

## 2. 影响范围

- `frontend/src/App.jsx`
- `frontend/src/components/Layout.jsx`
- `frontend/src/components/TabBar.jsx`
- 主壳路由接线相关文件

## 3. 不可触碰边界

- 不重写业务路由语义
- 不一次性删除移动端兼容结构
- 不在本任务中顺手改多个代表页页面内容

## 4. 实施步骤

1. 确认主站页面的壳接入边界。
2. 让桌面端优先进入新主壳。
3. 保留移动端 `TabBar` 的兼容角色，但不再承担桌面主导航职责。
4. 完成后执行 `npm run build:web`。

## 5. 验收方式

- 主站主路由已能进入新桌面壳
- 桌面端主导航职责不再依赖旧底部 Tab
- 移动兼容未被粗暴移除
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-shell): wire site routes into desktop shell`

## 7. 前置依赖

- `T19-主站桌面壳骨架搭建.md`

## 8. 后置影响

- 为 `T21` 到 `T23` 的壳细化和 `T24` 首页验证提供实际运行入口
