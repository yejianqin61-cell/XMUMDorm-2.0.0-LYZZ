# 丙业务接口契约核对

日期：2026-10-06。核对版本：e10394c，主线基线 fe2e961。
结论：三个模块已有读接口；分页与字段不同，后续丙页面分别适配。原生上传仍需运行验证。
本任务是静态契约核对，没有新增业务代码或测试，没有访问数据库。

## 1. 公共请求接缝

共享 request 返回响应的 data，不要在页面再读取 response.data。
对象正文按 JSON 发送；FormData 原样发送，不自行设置 multipart Content-Type。
App 注入根地址和令牌优先。依据 shared/api/request.js 的 request/getToken。
ListScreen 分页状态消费 hasMore；它不替业务模块请求接口或缓存列表数据。
依据 app/src/components/ui/ListScreen.tsx 的 ListPaginationState/useListPagination。
三个业务都是 page/pageSize 分页，不能直接把 SecondaryTabStore.cursor 当后端游标。

## 2. 二手

- 列表：GET /api/marketplace/items，参数 category/status/q/priceMin/priceMax/page/pageSize。
- 返回 list/hasMore/page/pageSize；页码从 1 起，默认 20 条，最大 50 条。
- 列表字段：id/title/description/price/status/delivery_method/dorm_area/tags/category。
  sellerName/sellerAvatar/cover/created_at 与 wants_count/views_count 用于卡片。
- 详情：GET /api/marketplace/items/:id。图片是 images 中的 url/sort_order。
  卖家名称取 sellerInfo.name，想要状态取 viewer.want，操作可用性取 actions.want。
  当前详情没有卖家联系信息字段，不从列表拼造联系方式。
- 想要：POST /api/marketplace/items/:id/want，正文 {}，登录后调用。
  返回 want 与 wants_count；并发已存在分支可能只返 want，不能强制要求计数存在。
- 发布：POST /api/marketplace/items，multipart，图片字段 images。
  title/description/category/price/delivery_method/dorm_area/tags 对照服务端校验。
  category 使用分类接口的 slug；配送为 pickup/delivery，宿舍区域按后端允许值。
  最多 4 张，每张不超过 8 MiB，仅 JPEG/PNG/WebP。

依据：shared/api/marketplace.js；routes/marketplace.js:26、176、261、369、405、577。
上传对象的 uri/name/type 与实际文件 MIME、原生 multipart 行为尚未运行验证。

## 3. 跑腿

- 列表：GET /api/errands，参数 type/status/page/pageSize，all 不作为筛选值发送。
- 返回 list/page/pageSize/total，没有 hasMore。默认 20 条，服务端范围 5–50。
  页面用返回 page * pageSize < total 计算 hasMore，不能按请求页大小计算。
- 卡片字段：id/title/reward/deadline/location/type/status/createdAt/owner。
  列表不含 contactInfo；详情才取 contactInfo、description、taker、takenAt/doneAt。
- 详情：GET /api/errands/:id。联系方式从 contactInfo 读取，不提前放入列表。
  这是响应字段范围核对，不表示联系方式受登录权限保护。
- 发布：POST /api/errands，JSON。title 和 contactInfo 为后端必填。
  description/reward/location/type/deadline 依服务端归一化处理；不提交 owner_user_id。
  服务端 title 截取 120、description 5000、contactInfo 255；无效日期归为 null。
- 接单/完成：POST /api/errands/:id/take、/:id/done，需登录。
- 缺口：shared API 的 reportErrand 指向 POST /:id/report，当前 routes/errands.js 无对应路由。
  后续不展示已可用的举报动作；若需求要求该动作，再交接口维护方确认。

依据：shared/api/errands.js；routes/errands.js:56、103、136、163、199、237、293。

## 4. 新生指南

- 分类/标签：GET /api/handbook/tabs、/tags。
- 列表：GET /api/handbook/articles，tab/tag/q/sort/page/pageSize。
  默认 10 条，最大 30 条，返回 list/hasMore/page/pageSize。
- 卡片字段：id/title/summary/cover/contentType/externalUrl/tab/author/stats/viewer/status。
  列表没有 content；列表 tags 当前为空数组，不能据此展示文章实际标签。
- 详情：GET /api/handbook/articles/:id。
  Markdown 正文取 content；contentType 为 external_link 时按 externalUrl 处理。
  authorInfo 与列表 author 名称不同；详情 tags 含 id/slug/name_zh/name_en。
  sourceName/sourceLink 可空，统计取 stats，按钮状态取 viewer/actions。
- 本批只核对指南阅读，不扩展文章发布、课程评价与清单。

依据：shared/api/handbook.js；routes/handbook.js:223、295、330、375。

## 5. 验证与交接

静态逐项核对：列表联系字段、详情联系字段、二手想要路径与方法、指南正文类型、上传封装。
app 的 npm run typecheck 通过，退出码 0。纯文档任务没有制造实现镜像测试。
未验证：真实 HTTP、数据库数据、登录处罚分支、设备上传、Markdown/外链实际界面。
校园公共状态缺口按用户 2026-10-06 决定交甲修复，丙不改公共组件。
本记录不表示已经向甲发送消息；修复完成前页面不能宣称完整状态验收通过。
