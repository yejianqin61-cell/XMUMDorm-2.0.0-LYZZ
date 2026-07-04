# T30-CanteenHome门户桌面化验证

## 1. 任务目标

选择 `CanteenHome` 作为门户首页型代表页，验证模块首页在主壳下如何从移动端堆叠页迁移为桌面门户页。

## 2. 影响范围

- `frontend/src/pages/CanteenHome.jsx`
- `frontend/src/pages/CanteenHome.css`
- 如有必要，少量与首页区块布局强耦合的食堂展示组件

## 3. 不可触碰边界

- 不重写食堂首页接口
- 不顺手批量修改所有食堂二级页
- 不改后台管理页
- 不改 `shared/*`

## 4. 实施步骤

1. 拆清 `CanteenHome` 的首屏信息层次。
2. 调整模块入口区、推荐区、榜单区、工具区在桌面壳下的布局关系。
3. 保持原有主要入口能力不回归。
4. 收口移动端页面级留白与整页容器假设。
5. 完成后执行 `npm run build:web`。

## 5. 验收方式

- `CanteenHome` 在桌面主壳下更像网页首页而不是手机模块页。
- 首页区块主次更清晰。
- 食堂高频入口不回归。
- `npm run build:web` 通过。

## 6. 推荐提交信息

`refactor(web-page): validate canteen home as desktop portal`

## 7. 前置依赖

- `T29-Post搜索与标签流桌面化验证.md`

## 8. 后置影响

- 为后续模块首页型页面迁移建立桌面门户模板化参照。
