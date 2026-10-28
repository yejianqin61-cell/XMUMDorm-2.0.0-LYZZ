# App Stage 2：统一口径与接口契约

| 属性 | 当前值 |
| --- | --- |
| 类型 | 团队实施规格 |
| 日期 | 2026-10-28（Asia/Singapore） |
| 状态 | 团队领导已于 2026-10-28 确认为统一执行标准；产品裁决见[登记册](Stage2待裁决登记册.md) |
| 范围 | App 第二轮改进；必要的 Web、后端和设备接线 |

## 现在能统一下发哪些决定？

所有者已裁决：广场四入口、五个顶部 Tab；树洞和社团动态为单列；交易只列二手私聊；课程测评覆盖学生与管理员；课前提醒默认开启。
甲乙丙丁戊的 Agent 使用 `yejianqin61-cell/easy-workflow`，成员自行安装。
接口字段和路由映射依据现有代码拟定，已获团队领导确认。实施者须先核对现行代码；发现与契约冲突时登记差异并由对应负责人协调，不自行改变已裁决的产品口径。
每项施工以[验收矩阵](../test/Stage2验收矩阵.md)的可观察结果收口。

## 哪些文档和代码是依据？

- [第二轮需求草案](App首包体验第二轮改进需求草案-2026-10-28.md)定义 14 组目标；本文件补跨域接口与验收口径。
- [广场参考截图](../design/assets/广场首包参考-2026-10-28.jpg)显示品牌头、四入口、校园助手、五 Tab 的初始层级。
- [`SQUARE_MODULES`](../../../app/src/features/square/squareModules.tsx)和[`SQUARE_TABS`](../../../app/src/features/navigation/secondaryTabs.ts)是现有入口与 Tab 集合的代码真源。
- 后端实际字段以[`routes/notifications.js`](../../../routes/notifications.js)、[`routes/marketplace.js`](../../../routes/marketplace.js)和[`routes/handbook.js`](../../../routes/handbook.js)为准。
- 通用协作规则以[`docs/team`](../../team/)为主版本；Stage 2 的补充规则见[`team/README.md`](../team/README.md)。

## 广场状态如何跨五个 Tab 传递？

**已裁决的显示结果**：首屏显示上部四入口与校园助手。向下浏览内容时上部离开视野，五 Tab 停在顶部安全区下。只有返回内容顶部并继续下拉，上部才展开；中途反向轻滚不展开。点击或横滑切 Tab 均保留每个 Tab 的滚动位置。横滑避让系统边缘返回手势。

**接口建议**：甲维护广场唯一的 `headerCollapsed` 状态和五个 Tab 的选中状态。各内容域只上报垂直滚动位置、刷新状态、内容顶部位置；不得各自渲染第二条五 Tab 导航。各 Tab 的位置、分页和筛选状态沿用 `SecondaryTabStore`。四入口沿用 `SQUARE_MODULES`，五 Tab 沿用 `SQUARE_TABS`。

**效果指标**：首屏、完全收起、返回顶部三种状态各有稳定截图；五个 Tab 均能触达。Tab 条不越过顶部安全区，底部内容不被一级导航挡住。连续三次慢滚、快速甩动、横滑切 Tab 后无反向跳位；“减少动态效果”开启时仍能完成同样的切换。

## 互动消息的来源与跳转如何表示？

**代码现状**：`GET /api/notifications` 已返回 `id`、`type`、`post_id`、`comment_id`、`extra`、`target`、`from_user`、`created_at` 和分类。
`target.path` 多为 Web 路径。App 目前只将三种社团目标映射为原生路由；其他通知点击常只标已读。
[服务端组装](../../../routes/notifications.js)与[App 路由映射](../../../app/src/features/mailbox/MailboxScreen.tsx)分别是改动入口。

**接口建议**：沿用现有 `target.type/id/path/available`。响应增加三个可空字段：

- `source_excerpt`：来源正文摘要。
- `reply_to_excerpt`：被回复评论摘要。
- `target.comment_id`：目标评论定位 ID。

`extra.content` 若是新评论内容，不可误当作被回复的原评论。字段缺失时，App 按目标类型与 `target.title` 兜底。
服务端按当前查看者权限生成摘要；匿名域不返回真实作者身份。
目标删除、隐藏或无权限时，响应设 `target.available=false` 并清空两段原文，只显示类型和“内容不可查看”。
App 已显示的列表在重新聚焦时刷新，避免展示旧摘要。目标失效行可进入说明状态，不跳失效 Web 路径。

**路由映射建议**：以目标类型和 ID 映射，不能直接把 Web `target.path` 传入 Expo Router。甲维护唯一映射函数；丙丁戊交付目标类型和失效样例。

| 服务端目标 | App 目标 | 现状 |
| --- | --- | --- |
| `post` | `/campus/[id]` | 路由存在，通知尚未映射 |
| `campus_post` | 待丙核对对应 App 内容页 | 当前 `/campus/wall/[id]` 读取匿名万能墙，不可直接套用 |
| `club`、`club_activity`、`club_post` | `/clubs/[id]`、`/clubs/activity/[id]`、`/clubs/post/[id]` | 已映射 |
| `marketplace_item` | `/market/[id]` | 路由存在，通知尚未映射 |
| `marketplace_thread` | `/me/chat/[threadId]` | 路由存在，通知尚未映射 |
| `handbook_article` | `/guides/[id]` | 路由存在，通知尚未映射 |
| `course_review` | `/course-reviews/[id]` | App 路由待甲创建 |

`trending_post`、食堂 `product`、公告和评论目标必须由对应模块给出已存在的 App 落点；找不到落点时，标记不可跳转并记录缺口，不能猜一个 Web 路由。`campus_post` 与匿名万能墙是不同实体，丙须先核对服务端数据与 App 页面。

**交接**：丙交付树洞与万能墙目标，戊交付社团及课程测评目标，丁交付二手商品与会话目标。甲拥有通知响应适配和统一路由映射。若现有 `extra` 已含等价信息，优先复用，不重复造字段。隐私与失效快照策略见 D2-03 失效来源摘要。

**字段界限**：`id/type/is_read/created_at` 保持现有含义。服务端限制摘要长度；App 按可见行数截断展示，不保存敏感原文快照。

## 交易列表和私聊的接口由谁提供？

**代码现状**：`GET /api/marketplace/chat/threads` 返回买卖双方会话，含商品、对方、最新内容和 `unread_count`；聊天详情有消息游标与已读接口。[会话规则](../../../app/src/features/mailbox/conversations.ts)已经消费这组字段。消息页当前“交易”分类读取交易通知，尚未以会话列表为主。

**接口建议**：每条会话用 `thread_id` 作稳定键，保留 `item.id/title/available`、`peer`、`role`、`last_content/last_message_at` 和 `unread_count`。
丁负责商品详情发起私聊、会话数据与失效商品状态；甲负责交易页接线与全局未读展示。
进入会话后调用现有 `read` 端点，并重新取服务端未读汇总。
从商品进入时携带商品 ID；从交易页进入时以线程 ID 加载，不依赖本地临时状态。

**已裁决的分类**：交易 Tab 仅列二手私聊会话。`marketplace_chat` 通知只用于推送与角标，打开会话后同步标已读。
`marketplace_want` 归互动；活动报名与提醒归系统。后端 `CATEGORY_TYPES` 与 App 分类角标须一起改，避免“有角标但列表空”。
具体类型映射：`marketplace_want → interaction`；`marketplace_chat → transaction`；`activity_register_success`、`activity_start_reminder`、`activity_deadline_reminder → system`。历史泛型 `marketplace` 在现有代码中仍列入模块类型，但没有找到当前写入方；甲须用存量样例判定其含义，不能仅凭名称算作聊天未读。
交易 Tab 不调用通知列表的“全部已读”或“清空分类”：这两个动作不能代替读会话，也不能删除聊天记录。若保留“全部已读”，须逐会话调用服务端已读接口并刷新汇总；否则交易 Tab 不显示该动作。`MODULE_TYPES.marketplace` 仍可保留模块筛选语义，分类以 `CATEGORY_TYPES` 为准。
现有会话列表一次最多 100 条；超出 100 条时需要服务端分页，不能把“到底了”当作完整列表。

**未读契约**：底栏总角标与分类角标读取 `GET /api/notifications/unread-summary`。
会话行的未读数读取 `GET /api/marketplace/chat/threads` 的 `unread_count`。
进入会话后同时刷新两者，不能在客户端手动各减一。
`marketplace_chat` 对应通知的已读写入须随会话已读动作完成；接口测试要覆盖两者一致。
**当前缺口**：`POST /api/marketplace/chat/threads/:threadId/read` 只更新线程已读时间，尚未标记对应 `marketplace_chat` 通知；App 刷新汇总也不能消掉旧角标。丁须在服务端已读接口补齐这一动作，甲验收 App 角标。

## 课程测评如何复用 Web 且覆盖管理员？

**已裁决**：学生和管理员现有 Web 功能都进入本轮范围。App 与 Web 使用相同课程测评记录、评分、评论和服务端权限。普通用户只能编辑或删除自己的测评；管理员可按服务端既有权限管理内容。

**代码现状**：`shared/api/handbook.js` 已有课程测评的列表、详情、发布、编辑、删除、评分、评论及“我的”接口。`routes/handbook.js` 对编辑和删除允许本人或管理员。`routes/admin.js` 另有后台内容列表、可见性与删除接口，课程测评列在管理模块中。App 目前没有课程测评原生路由。

**阻断缺口**：管理后台的 `course-review` 配置读取 `cr.title` 与 `cr.content`，而测评表字段是 `course_name` 与 `comment`。
现有管理列表过滤 `deleted_at`，软删后的“恢复”无法在列表中找到目标。
[Web 管理详情](../../../frontend/src/pages/Admin/ContentDetail.jsx)把“隐藏”和“删除”呈现为两个动作；[后端管理接口](../../../routes/admin.js)对该模块都写 `deleted_at`，数据效果相同，仅审计动作不同。Stage 2 保持与现有 Web 相同的可恢复软删语义，界面须说明删除后可由管理员恢复，不能暗示永久删除。管理列表须可筛选或查看已隐藏记录，并从详情恢复；用户侧列表继续排除这些记录。
[管理配置](../../../routes/admin.js)、[测评基础表结构](../../../migrations/017_handbook.sql)及[评论字段迁移](../../../migrations/018_course_reviews_comment.sql)已核对。
戊须先修正管理端点并写一条真实结构的接口测试，再接 App 管理页。

**接口建议**：戊先产出 Web/App 能力对照，再复用 `shared/api/handbook.js`。列表使用原服务端分页、搜索与标签；详情以测评 ID 加载。发布表单按服务端的课程名、教师、标签、学期、评分、难度和评论校验。管理员操作调用既有管理端点，不以客户端角色隐藏代替服务端鉴权。403、404、409 分别呈现无权限、内容不存在、已评分或冲突。

**已裁决的管理员入口**：课程测评页内显示“管理”，仅管理员可见。进入后查课程测评、执行审核、显隐与删除；同时保留普通详情页的管理员编辑/删除权。服务端继续负责最终权限校验。甲创建 App 路由，戊先修管理接口、再实现管理页与权限状态。管理列表必须能看到待恢复的记录，且恢复后普通列表可再次找到该记录。

**拟定 App 路由**：`/course-reviews` 列表、`/course-reviews/[id]` 详情、`/course-reviews/new` 发布、`/course-reviews/[id]/edit` 编辑、`/course-reviews/manage` 管理员审核。
甲在 `app/src/app/**` 注册路由，戊实现屏幕。
发布、编辑、删除后刷新列表和“我的”相关缓存；匿名评分与评论的展示规则复用 Web 和服务端。

## 课前提醒、图片保存和权限如何交接？

**课程提醒现状**：`buildClassReminderPlan` 计算开课前 30 分钟触发时间；调度器负责去重、容量、重排及按登录账号清理。
本地通知权限通过 `notificationPermission` 统一读取、请求和跳设置。
[计划](../../../app/src/features/tools/reminders/plan.ts)、[调度](../../../app/src/features/tools/reminders/scheduler.ts)与[权限](../../../app/src/features/notifications/permissions.ts)均已存在。

**课程提醒接口建议**：提醒默认开启；用户首次进入课表时展示用途说明并触发系统通知权限请求。乙向甲交付“从通知打开课程”的稳定目标（学期 ID、课程码、日期及开课时刻）。旧提醒在导入、修改、删除、换学期后取消或重排。拒绝权限后显示未启用和跳转系统设置；不重复弹系统授权。调度失败必须可重试，容量不足须显示“部分课程未安排”。通知文案不含敏感学号。

**图片保存接口建议**：丙复用现有图片预览的远端 URL 与系统能力，返回 `saved`、`permission-denied`、`failed` 三种用户可见结果。保存动作在详情和全屏预览指向同一张图片；权限未取得时按系统要求请求，拒绝后留在原页面。具体图库实现由丙选用已安装平台能力；无需为所有图片另建后端下载接口。

## 内容流、发布和个人资料共用什么状态口径？

**单列流接口**：树洞和社团动态每条记录有稳定 ID、内容类型、作者显示信息、发布时间、正文、媒体和互动数。页面按服务端分页顺序追加，刷新从第一页重取。返回详情后恢复所选 Tab、列表位置与筛选条件。长文和多图按内容自然增高；不得以固定卡高裁掉正文。社团活动与帖子须有可读的类型标签。

**发布接口**：甲拥有发布公共容器与安全区；丙丁戊只提供各业务表单字段、校验和提交函数。公共容器负责标题、键盘、底部提交位与返回确认；业务模块负责服务端错误转可读提示。提交中仅允许一次请求，成功进入明确的详情或列表落点，失败保留全部输入。每个发布页的最后一项输入和提交按钮须在键盘打开时仍可触达。

**资料接口**：甲用现有 `getMe()` 和用户资料更新接口作为唯一数据真源。冷启动恢复登录态后再加载受保护的资料；切回“我的”或保存成功时刷新该数据。独立区块失败只降级该区块，已成功载入的资料不被其他区块错误清空。保存失败保留表单值；退出登录或换账号必须清除前一账号的资料缓存。

**失败状态**：401 显示登录恢复入口；403 显示无权限；404 显示内容不存在或已失效；409 显示具体冲突；断网保留当前内容并给重试。客户端只决定展示，不自行扩大服务端权限。每个内容入口都应测试“先有权，后失权”的返回路径。

## Moodle 登录阻断与 UI 的交付接口是什么？

乙按“设备型号/系统版本/网络/WebView/系统浏览器/错误码”记录每次登录结果。证书错误、账号错误和会话过期分别映射成不同状态。证书链需要校方修复时，App 显示可理解的说明与可用的合规打开方式；保持 TLS 校验。登录成功后，同步、课程工作台、资源详情和重登继续复用现有 Moodle 模块契约；修复前不得以一张“登录失败”UI 覆盖真实错误原因。

## 五个人具体可写到哪里？

下表是写作归属。跨域改动由文件负责人接收契约后合入；模块内测试跟随对应负责人。实际路径在开工前由每人用 `rg --files` 核对，新增路径须在任务卡登记。

| 成员 | 主责目录 | 公共接线交付 |
| --- | --- | --- |
| 甲 | App 路由、导航、消息、我的、发布公共容器、广场壳；`routes/notifications.js`、`services/notificationService.js` | 路由注册、通知投影、公共 UI 与词条汇总 |
| 乙 | 工具、通知权限、食堂模块；必要的 `routes/canteen.js` | 课表目标、提醒状态、食堂入口 |
| 丙 | 树洞、万能墙模块；必要的 `routes/posts.js` 和内容生产端点 | 内容来源、图片保存、评论定位 |
| 丁 | 二手模块、`shared/api/marketplace.js`、`routes/marketplace.js` | 会话行、商品目标、已读状态 |
| 戊 | 攻略、社团、课程测评模块；必要的 `routes/handbook.js`、`routes/clubs.js` 与 `routes/admin.js` 测评配置 | 测评管理、社团与攻略目标 |

`app/src/features/square/**` 是甲、乙共用目录：甲只写广场壳与入口，乙只写食堂文件。
`app/src/app/**` 由甲统一接线；丁、戊交路由需求与模块屏幕，甲创建路由文件。
`app/src/i18n/**`、`app/src/components/ui/**` 与 `shared/api/handbook.js` 由甲统一合并或指定单写者。
后端通用通知文件由甲单写；丙丁戊提交各自业务通知的字段清单与测试样例给甲。

## Agent 何时可以认定工作完成？

每张任务卡必须有需求编号、负责人、允许路径、前置接口、状态矩阵、自动验证、真机证据和未验证项。Agent 按[Stage 2 协作入口](../team/README.md)调用 `easy-workflow` 中与任务相符的 skill，并记录安装提交。任何“推荐待裁决”在负责人裁决前只允许做事实盘点和不依赖该决策的任务。具体逐项结果见[验收矩阵](../test/Stage2验收矩阵.md)。

## 本轮不包含哪些扩展？

- 不创建第二套课程测评数据库或二手私聊系统。
- 不让客户端绕过服务端权限或关闭 Moodle TLS 校验。
- 不把视觉建议中的示例阈值写成已裁决的硬标准。
- 不把本文当作五人排期或完成声明。
