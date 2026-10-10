# P3C-02-03 交付：Handbook 统一真源与互动

## 已完成

- 列表搜索复用 `SearchField`，键盘提交后以修剪过的 `q` 调用既有 `listHandbookArticles`；查询键包含 `q`，切换关键词会刷新对应缓存，不在客户端二次筛选。
- 详情页接入文章点赞、评论读取、一级评论回复和提交接口；评论节点仅映射为两层，回复目标只允许一级评论。
- 未登录写操作保留登录引导；服务端未返回计数时不在客户端虚构计数。
- 不修改公共组件、请求基座或 i18n 文件。

## 验证

- `npm test -- --runInBand p2x-bing-guides`：23 passed。
- `npm run typecheck`：通过。

## 待甲处理

- `getHandbookTabs()` 已有真实分类数据，但公共 `TopTabStrip` 只接受静态 i18n tab 定义，无法展示 API 动态分类。需要由公共组件／词条负责人扩展该能力；详情与搜索不受此项影响。
