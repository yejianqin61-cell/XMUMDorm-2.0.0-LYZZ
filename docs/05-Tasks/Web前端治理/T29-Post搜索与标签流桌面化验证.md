# T29-Post搜索与标签流桌面化验证

## 1. 任务目标

选择 `PostSearch` 与 `PostTagFeed` 作为同类搜索/标签列表页，验证内容流页在桌面壳下的统一迁移方式。

## 2. 影响范围

- `frontend/src/pages/PostSearch.jsx`
- `frontend/src/pages/PostSearch.css`
- `frontend/src/pages/PostTagFeed.jsx`
- `frontend/src/pages/PostTagFeed.css`
- 如有必要，少量搜索/标签页强耦合展示组件

## 3. 不可触碰边界

- 不重写搜索 API
- 不重构标签数据来源
- 不顺手修改 TreeHole 或其它无关页面
- 不改 `shared/*`

## 4. 实施步骤

1. 对齐搜索页与标签流页的桌面页头、筛选区、列表区节奏。
2. 降低这两类页面对移动端整页结构的依赖。
3. 尽量复用已经在 T28 验证过的内容流结构思路。
4. 保持搜索与标签流核心交互不回归。
5. 完成后执行 `npm run build:web`。

## 5. 验收方式

- `PostSearch` 与 `PostTagFeed` 在桌面主壳下结构一致性更高。
- 搜索区、标签区、列表区主次关系更清晰。
- 页面不再明显保留移动端整屏列表假设。
- `npm run build:web` 通过。

## 6. 推荐提交信息

`refactor(web-feed): align post search and tag feeds for desktop`

## 7. 前置依赖

- `T28-TreeHole内容流桌面化验证.md`

## 8. 后置影响

- 为广场内容流类页面批量扩散提供统一样板。
