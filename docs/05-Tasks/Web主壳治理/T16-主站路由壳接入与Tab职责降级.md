# T16-主站路由壳接入与Tab职责降级

## 1. 任务目标

让主站根路由接入新的桌面 Web 壳，并把旧 `TabBar` 的职责降级为移动兼容方案，不再承担桌面主导航。

## 2. 影响范围

- `frontend/src/App.jsx`
- `frontend/src/components/Layout.jsx`
- `frontend/src/components/TabBar.jsx`
- 路由壳接入相关文件

## 3. 不可触碰边界

- 不批量重写页面内容
- 不重构共享数据层
- 不删除移动端兼容逻辑

## 4. 实施步骤

1. 让主站根路由进入新的 Web 壳容器。
2. 调整 `Layout` 中的桌面与移动职责分层。
3. 降低 `TabBar` 在桌面端的主导航职责。
4. 保证刷新、深链和主路由切换不回归。

## 5. 验收方式

- 桌面端主路由进入 Web 壳
- 底部 `TabBar` 不再作为桌面主导航
- 移动端兼容策略保留
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-shell): connect root routes to desktop shell`
