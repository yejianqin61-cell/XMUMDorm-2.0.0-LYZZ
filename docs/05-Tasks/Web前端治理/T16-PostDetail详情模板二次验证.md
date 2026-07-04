# T16 PostDetail 详情模板二次验证

## 1. 任务目标

继续用 `PostDetail.jsx` 对 `DetailPageLayout` 做第二轮验证，重点确认帖子详情这种评论密集型页面，是否也能稳定落在统一详情模板节奏下。

## 2. 影响范围

- `frontend/src/pages/PostDetail.jsx`
- `frontend/src/pages/PostDetail.css`
- 如有必要，少量详情模板样式

## 3. 不可触碰边界

- 不改评论接口
- 不改点赞、发评论、删评论、删帖子业务规则
- 不改图片预览和轮播组件内部逻辑

## 4. 实施步骤

1. 把页面头部、正文区、评论区、次级操作区映射到 `DetailPageLayout`。
2. 保持帖子主体、交互行为、评论树结构不变。
3. 优先整理结构，不优先做细枝末节视觉重画。
4. 完成后执行 `npm run build:web`。

## 5. 验收方式

- 页面具备统一详情模板结构
- 正文主轴、评论区、次级区块节奏更清晰
- 交互能力无回归
- `npm run build:web` 通过

## 6. 推荐提交信息

`refactor(web-template): validate post detail with shared detail layout`

## 7. 前置依赖

- `T12-详情页模板落地.md`
- `docs/09-Deploy/Step3-页面模板层实施级详细设计文档.md`

## 8. 后置影响

- 为 `FoodDetail` 之外的第二类详情页提供验证样本
- 降低后续 `MarketplaceDetail`、`ClubProfile` 接模板的风险
