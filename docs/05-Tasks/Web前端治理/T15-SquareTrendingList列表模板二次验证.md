# T15 SquareTrendingList 列表模板二次验证

## 1. 任务目标

在 `T11-列表页模板落地.md` 已完成首轮代表页验证的基础上，继续用 `SquareTrendingList.jsx` 做第二轮列表页模板验证。

本任务的目标不是重做热搜业务，而是确认：

- `SquareTrendingList` 不再依赖首页式页面壳结构
- 页面能以 `ListPageLayout` 的结构语义独立成立
- 热搜榜列表页在桌面 Web 下更像独立网页，而不是从 `SquareHome` 放大出来的派生页

## 2. 影响范围

- `frontend/src/pages/SquareTrendingList.jsx`
- `frontend/src/pages/SquareTrendingList.css`
- 如有必要，少量关联模板样式

## 3. 不可触碰边界

- 不改热搜接口
- 不改删除热搜逻辑
- 不改 App 端
- 不把首页 `SquareHome` 的业务逻辑搬进来
- 不在本任务里顺手改 `PostDetail`、`ProfileEdit` 等其他页面

## 4. 实施步骤

1. 让 `SquareTrendingList` 接入 `ListPageLayout`。
2. 为页面补齐独立 `PageHeader` / 区块头 / 可选侧栏结构。
3. 把当前对 `SquareHome.css` 的结构耦合降下来，改为页面自有样式。
4. 保留现有数据请求、删除管理、跳转逻辑不变。
5. 完成后执行 `npm run build:web`。

## 5. 验收方式

- 页面结构语义清晰，能看出是独立列表页
- 主列表与辅助信息区节奏清楚
- 不再依赖首页壳布局类名才能成立
- 业务逻辑无回归
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-template): validate square trending list with shared list layout`

## 7. 前置依赖

- `T11-列表页模板落地.md`
- `docs/09-Deploy/Step3-页面模板层实施级详细设计文档.md`

## 8. 后置影响

- 为 `MyPosts`、`MyReviews`、`SquareCampusFeed` 等列表页继续扩散提供参考
- 证明列表页模板不是只够支撑 `MerchantList`
