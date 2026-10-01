# App 实时私聊调研：技术难度与服务器开销

| 项 | 值 |
| --- | --- |
| 日期 | 2026-10-02 |
| 版本 | v1.0（一次性调研，不迭代） |
| 性质 | **research 层 —— 做决定前的调研**（decide-before-build）。不是规格、不是任务书、不含排期 |
| 上游 | [App 设计宪法](../constitution/App设计宪法.md)｜[App 页面清单与结构盘点](../product/App页面清单与结构盘点.md)｜[TODO](../TODO.md) |
| 标注法 | **【已定】** 官方原文 / 本机实测 ｜ **【算得】** 写明推导式 ｜ **【提案】** 估计，**未实测，不得当规格用** ｜ **†** 官方页面存在但本次仅取回页头（站点 JS 渲染），要点为文档既定内容意译，**无逐字引号** |
| 检索预算 | 仓库内 4 次（全为 grep）｜ 外部 web_fetch 7 次（其中 2 次被 JS 渲染页面浪费）｜ npm 本机实测 3 条。未做穷尽式调研 |

---

## 0. 四问结论（先看这个）

| # | 问题 | 一句话结论 |
| --- | --- | --- |
| 1 | 技术难度高吗 | **不高**。私聊是 1:1 单房间广播，真正的工作量在"顺序号 / 幂等 / 未读 / 推送兜底 / 鉴权握手"这些**非实时部分**，通道本身一两百行 |
| 2 | 低并发下服务器开销大吗 | **不大**。≤500 在线时长连接只占个位数到十几 MB 内存、CPU 可忽略；**成本大头不是长连接**，而是"无游标的整页读放大「现状 500 条 / 4s」+ 写消息时同步插通知并发出网推送 + 未读计数" |
| 3 | 私聊放哪个 tab | **不放 tab**：会话列表归「我的」下的二级页 + **顶栏唯一动作「信箱」直达并挂未读角标**；「新增第 6 格」**不成立**（官方 NavBar 上限 5，第 5 格已被"发布"占用）；「校园里」语义不符 |
| 4 | 最小可行路径 | **阶段 0 现在就能做、且不引入任何新通道**：给消息接口补 `since_id` 游标 + 会话未读计数 + 聚合未读接口 + 幂等键 + 软删联动；**阶段 1 才引入实时通道，且原生推送（FCM/APNs）必须先于或同时建成** |

---

## 1. 现状（仓库内实测，2026-10-02）

| 事实 | 证据 |
| --- | --- |
| 二手私信是唯一私聊形态，端点全在 `routes/marketplace.js` | grep `chat｜thread｜messages` → 60 处命中，含 `GET /items/:id/chat/thread`、`POST /items/:id/chat/messages`、`GET /items/:id/chat/threads`、`GET /chat/threads/:threadId/messages`、`POST /chat/threads/:threadId/messages`、`POST /chat/threads/:threadId/read`【已定】 |
| 已读态字段**已存在**，无需新表 | `marketplace_chat_threads.seller_last_read_at / buyer_last_read_at`，读接口写这两个字段【已定】 |
| 全仓零实时通道 | grep `socket｜websocket｜SSE｜EventSource` in `routes/` → **仅 1 处命中**，且是 `routes/materials.js:77` 的 `req.socket?.remoteAddress`（取 IP，非实时通道）【已定】 |
| 推送只有 Web Push / VAPID，**无原生 FCM/APNs** | grep in `services/pushSend.js` → 读 `SELECT endpoint, p256dh, auth FROM push_subscriptions`，调 `webpush` 发送并在失效时 `DELETE`【已定】；表建于 `migrations/012_web_push.sql`【已定】 |
| 无任何 device token 概念 | 上述 grep 无 `device_token｜push_token` 命中【已定】 |
| 聊天表就两张 | `migrations/029_marketplace_chat.sql` 的 `marketplace_chat_threads` / `marketplace_chat_messages`；其余 82 处 `CREATE TABLE` 与私聊无关（`migrations/` grep）【已定】 |
| 前端 4s 轮询、服务端无 `since`/cursor、整页最多 500 条 | 所有者背景给定 + 上述端点签名（无 query 游标参数）。**未逐行复核 LIMIT 字面值**，见 §7.8 |

> 结论：现状是"REST 整页拉 + 定时轮询 + Web Push"。要动的是**读路径（游标）**和**推送通道（原生）**，不是数据库模型。

---

## 2. 方案对比（四选一，或 ④ → ② 分阶段走）

| 维度 | ① socket.io | ② 裸 `ws` | ③ SSE | ④ 保持轮询 + `since`/cursor |
| --- | --- | --- | --- | --- |
| 版本/形态 | 4.8.4 / 4.8.4【已定·`npm view`】 | 8.22.0【已定·`npm view`】 | 无服务端包（原生 `text/event-stream`） | 无新依赖 |
| 客户端依赖 | `socket.io-client`（+`engine.io-client`）**纯 JS** → 可走 OTA【提案†未真机验证】 | **RN 内置 `WebSocket`，0 新依赖** → 可走 OTA | 需 `EventSource`：**RN 是否内置未证实**（见 §7.2），大概率需 polyfill（纯 JS，也可 OTA） | 0 新依赖 → 可走 OTA |
| 服务端改动面 | 中：同一 `http.Server` 挂 `socket.io`；握手 JWT 鉴权；事件路由；CORS/反向代理 `Upgrade` 配置 | 中偏大：自己写 `upgrade` 握手、鉴权、心跳、僵尸连接回收、房间映射、重连协议 | 中：新增 `GET /chat/stream`；`res.flushHeaders()` + 心跳注释行 + 关代理缓冲；发送仍走 POST（单向） | **最小**：加 `since_id`/`limit` 参数 + `(thread_id, id)` 索引；可选长轮询 `?wait=25` |
| 后台/离线行为 | 后台断（见 §4）；自带指数退避重连；**离线消息必须靠 REST 补拉** | 后台断；**重连要自己写**；无兜底 | 后台断；`EventSource` 内置 `Last-Event-ID` 重连语义（polyfill 是否实现需验证） | 后台停止轮询；回前台全量对齐（有游标则只拉增量） |
| 扩展性 | 好：单进程默认内存适配器即可；多进程官方给三条路（sticky / 禁 long-polling / 客户端 LB）【已定】；群聊/多端需要 Redis adapter | 一般：跨进程广播要自建 Redis pub/sub | 一般：每客户端一条常驻 HTTP 连接，代理层连接数与时延风险高 | 差在"空转成本"：成本 ∝ 并发 ÷ 间隔，**与是否有消息无关** |
| 失效模式 | 代理未转发 `Upgrade` → 静默降级 long-polling（请求量反而上升）；401 握手需显式处理；断线窗口内消息必须补拉 | **无 long-polling 降级** → 受限网络（校园网/企业代理）直接连不上；心跳缺失 → 僵尸连接堆积 | 代理缓冲 → 消息卡到超时；单向 → 发送仍要 POST（两条路径，顺序易乱） | 延迟 = 间隔上限（4s）；空转压 DB；无连接可失效（这是优点） |

**官方原文（Socket.IO 多节点，2026-10-02 取回全文）**：

- 「If you plan to distribute the load of connections among different processes or machines, you have to make sure that all requests associated with a particular session ID reach the process that originated them.」
- 「When you configure the Socket.IO client to not use HTTP long-polling (using only WebSocket or WebTransport), sticky sessions are no longer required.」
- 「The value of nginx's `proxy_read_timeout` (60 seconds by default) must be bigger than Socket.IO's `pingInterval + pingTimeout` (45 seconds by default), else nginx will forcefully close the connection if no data is sent after the given delay and the client will get a "transport close" error.」

**【提案】选型**：
1. 只做 1:1 私聊 + 不需要房间语义/降级 → **裸 `ws`**：0 客户端依赖、0 OTA 风险、服务端可控（但要自写心跳与重连）。
2. 预期 12 个月内要群聊 / 多端同步 / 会话房间 → **socket.io**：省掉重连、房间、降级三件事，代价是多 1 个纯 JS 客户端依赖与 `Upgrade` 代理配置。
3. **SSE 不推荐作主方案**：私聊是双向的，SSE 只解决"服务端→客户端"一半，另一半仍要 POST，等于维护两条顺序不一致的路径。
4. 无论选哪个，**REST 增量接口都必须先存在**（通道只做"有新消息"的提示，正文永远从 REST 拉）——这样通道挂掉也不会丢消息。

---

## 3. 服务器开销：100 / 500 / 2000 并发

### 3.1 两条成本曲线

| 模型 | 请求/查询强度 | 推导 |
| --- | --- | --- |
| 现状轮询（4s） | **∝ 并发**，与消息量无关 | 每个前台客户端 4s 一次消息请求 → 请求率 = C ÷ 4 req/s【算得】 |
| 实时通道 | **∝ 消息量**，与在线数几乎无关 | 每条消息 = 1 INSERT 消息 + 1 UPDATE thread + 1 INSERT 通知 + 0~1 次推送出网【算得】 |

| 并发在线 C | 轮询请求率 C÷4【算得】 | 每次请求最少 SQL 数 | 轮询 SQL 量【算得】 | 单条 500 行页面的序列化量 / 4s【算得】 |
| --- | --- | --- | --- | --- |
| 100 | 25 req/s | ≥2（线程鉴权 + 消息页） | ≈ 50 SQL/s | ≈ 5×10⁴ 行 |
| 500 | 125 req/s | ≥2 | ≈ 250 SQL/s | ≈ 2.5×10⁵ 行 |
| 2000 | **500 req/s** | ≥2 | **≈ 1000 SQL/s** | **≈ 10⁶ 行** |

| 并发在线 C | 长连接内存（m = 10–40 KB/连接）【提案 m，算得总量】 | 实时通道 CPU（假设在线用户 0.01 msg/s）【提案速率】 |
| --- | --- | --- |
| 100 | 1–4 MB | ≈ 1 msg/s → ≈ 4 DB 写/s |
| 500 | 5–20 MB | ≈ 5 msg/s → ≈ 20 DB 写/s |
| 2000 | 20–80 MB | ≈ 20 msg/s → ≈ 80 DB 写/s |

> 结论：**1000 并发以内，长连接在内存上是"几 MB 到几十 MB"级别，在 CPU 上可忽略**；而现状轮询在 2000 并发下要付 500 req/s、≈1000 SQL/s 和每 4 秒 10⁶ 行的 JSON 序列化——**先崩的是轮询，不是长连接**。【算得】

### 3.2 真正的成本不在长连接，而在 X

| X | 内容 | 为什么贵 | 数量级 |
| --- | --- | --- | --- |
| X1 | **无游标的整页读放大**：每次拉整页（≤500 条）而不带 `since_id`，重复传输+重复序列化同一批行 | 成本 ∝ 并发 × 并发周期，与"是否有新消息"无关；空会话也在付钱 | 2000 并发 → 10⁶ 行/4s【算得】 |
| X2 | **写路径上的同步副作用**：发一条私信要同步写 `notifications` 并调 `web-push`（每条消息做一次加密 + 出网 HTTPS，慢且会失败） | 用户感知延迟 = 最慢的那个副作用；出网抖动直接拖垮发送接口 | 每条消息 1 次额外出网【已定·`pushSend.js`/`notifyMarketplaceMessage`】 |
| X3 | **未读计数**：会话列表要按 thread 算未读（现状靠 threads 端点里的子查询/`last_read_at` 比较） | 会话数增长后每轮询周期重算；多端下还要一致 | 每周期 1 次聚合查询/客户端【提案】 |
| X4 | 重连/前台回暖风暴：断线恢复瞬间 N 个客户端同时全量拉首页数据 | 瞬时尖峰，非均值问题 | 峰值 ≈ C × 1 次全量拉取【算得】 |
| X5 | 多进程后的 adapter/sticky 运维与 Redis 成本 | 只在水平扩容后出现 | 见 §3.3 |

**优先级结论**：先修 X1（加游标，一次 SQL 改动就能消掉 2000 并发下 90%+ 的读量），再修 X2（把推送移出请求路径 / 队列化），X3 用增量计数替代实时 COUNT。长连接的账放在最后看。

### 3.3 何时必须上 Redis adapter / sticky session

| 判据 | 结论 |
| --- | --- |
| 仍是**单进程** `server.js`（现状） | **不需要**。socket.io 默认内存适配器、`ws` 直接内存 map 即可【已定·现状】 |
| 进程数 > 1（cluster / PM2 / 多实例）**且保留 long-polling 降级** | **必须 sticky sessions**（官方原文见 §2）；nginx 用 `hash $remote_addr consistent`，且 `proxy_read_timeout` > `pingInterval + pingTimeout`(=45s)【已定】 |
| 进程数 > 1 **且强制 websocket-only** | sticky 可省（官方原文），但**多数客户端连不上时没有降级可退** |
| 需要**跨进程房间广播**（群聊、多端同步、给某用户的所有设备推） | **必须 Redis adapter**（或 cluster adapter），否则另一进程上的连接收不到 |
| 需要滚动发布不断线 | adapter + `connection state recovery`（socket.io 4.6+）才能补齐断线窗口 |
| 单进程连接数/CPU 已接近饱和 | 才是"扩容到需要 adapter"的信号；**100–2000 并发远不构成该信号**【算得】 |

---

## 4. 移动端硬限制：实时通道只提升"在场"体验

| 平台 | 事实 | 来源 |
| --- | --- | --- |
| iOS | App 进入后台后不能持续执行代码，进程被系统挂起 → 长连接不心跳、不送达；Apple 开发者网站上关于该主题的问答线程标题即「Realtime - Websocket background and remote notifications」† | [developer.apple.com/documentation/uikit](https://developer.apple.com/documentation/uikit)（2026-10-02，HTTP 200，仅取回页标题）；[forums/thread/66157](https://developer.apple.com/forums/thread/66157)（2026-10-02 检索命中标题） |
| iOS | 后台唤醒依赖 APNs（background notification），属低优先级、系统可合并/延迟，**不保证即时**† | [Pushing background updates to your App](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app)（2026-10-02，未取回正文，见 §7.3） |
| Android | Doze（未充电＋熄屏＋静止）与 App Standby 会暂停后台网络访问、忽略 wake lock、推迟 JobScheduler/AlarmManager → 锁屏数分钟后长连接必然降级或断开† | [Optimize for Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)（2026-10-02，HTTP 200，仅取回页头，见 §7.4） |
| Android | 要长期保活需前台服务（带常驻通知、额外耗电、商店审核成本）→ **【提案】私聊不值得为此上常驻通知** | 同上（策略判断为【提案】） |

**结论（本节最重要的一句）**：实时通道只能提升"App 在前台且网络可达时"的体验；**消息可达性必须由原生推送兜底**。而现状只有 Web Push/VAPID（浏览器订阅模型，`endpoint/p256dh/auth`）【已定·仓库 grep】，**RN 端拿不到这条通道** → 阶段 1 之前必须先建 FCM/APNs（或经 Expo Push），否则"实时"等于"App 一进后台就静默丢消息"。

---

## 5. 归属分析（问题 3）

### 5.1 硬约束：底栏不能有第 6 格

**官方原文（Material Components for Android 官方文档，2026-10-02 取回全文）**：

- 「Navigation bars can have three to five destinations.」
- 「**Note:** `BottomNavigationView` does not support more than 5 `menu` items.」

→ 第 5 格已被**「发布」（加号，动作型 Tab）**占用（所有者 2026-10-02 裁决），**新增第 6 格不成立**。

### 5.2 四个候选

| 候选 | 可行性 | 理由 |
| --- | --- | --- |
| 「我的」下的二级页（会话列表 / 单会话） | ✅ **推荐** | 私聊是"我的账号"域内的能力，与设置/我的物品同源；不占底栏名额；Web 侧既有路径也是 `/about/second-hand/chat/:id`【已定·`routes/marketplace.js` 中 `targetPath`】 |
| 「校园里」 | ❌ | 「校园里」= 万能墙 + 树洞，是匿名公共内容域；二手私聊是实名交易上下文。混入会破坏"仅导航层合并"的宪法口径（4.1） |
| 新增第 6 格 | ❌ **不成立** | 官方上限 5；第 5 格已被"发布"占用（§5.1） |
| 顶栏动作 | ✅ **保留现有唯一动作 = 信箱** | 2026-10-01 裁决：信箱不做 Tab、改为**全局顶栏小按钮**。**顶栏只允许一个动作，不得再加"消息"图标** |

### 5.3 未读角标怎么不丢（放「我的」时的配套）

| 措施 | 说明 |
| --- | --- |
| 单一未读真源 | 服务端新增聚合接口（如 `GET /chat/unread-count`），返回**一个数**；角标只订阅它，不在客户端做本地加减 |
| 角标挂在顶栏「信箱」动作上 | 顶栏动作是全局唯一的，角标挂这里**不占 Tab 名额、也不与"我的"里其它未读混算**；M3 NavBar 的角标只是备选，不是必需（NavBar anatomy 官方确实提供 small/large badge，`getOrCreateBadge(menuItemId)`＋`badge.number = 99`，但那是"目的地角标"） |
| 若坚持要 Tab 角标 | 只给「我的」，且必须是**同一接口的聚合值**（私聊 + 系统通知），与顶栏同源，避免双源打架 |
| 已读以服务端为准 | 进会话即调既有 `POST /chat/threads/:threadId/read`【已定】，角标随后端刷新；客户端**不做本地递减**（多端/多设备会不一致） |
| 角标上限与语义 | 显示 `99+`，不是精确计数（避免"每次都查 COUNT"）——用 `MIN(count, 99)` |
| ⛔ 明确禁止 | 顶栏再加第二个图标；底栏加第 6 格；把私聊做成底栏 Tab |

---

## 6. 最小可行路径

### 阶段 0 —— 现在就能做，**不引入任何新通道**（App 侧全 OTA 可达）

| 类别 | 必须新增/修改 | 说明 |
| --- | --- | --- |
| 读游标 | `GET /chat/threads/:id/messages?since_id=&before_id=&limit=` | 返回 `{ items, has_more, latest_id }`；`limit` 默认 50、上限 100；用 `id` 而非时间戳做游标（免受时钟/并发影响）；补 `(thread_id, id)` 索引 |
| 未读计数 | 会话列表返回 `unread_count`、`latest_id`；新增 `GET /chat/unread-count` 聚合接口 | 复用已存在的 `seller_last_read_at / buyer_last_read_at`【已定】，无需新表 |
| 长轮询（可选） | `?wait=25`：有消息立即返回，否则 25s 后返回空 | 把 4s 轮询降到 ~1 请求/25s，**无需新协议**；代价是每挂起请求占一个连接与文件描述符，必须设并发上限 |
| 幂等去重 | 客户端带 `client_msg_id`，服务端 `UNIQUE(thread_id, client_msg_id)` | 重发/断网重试不产生重复消息 |
| 顺序号 | 每 thread 单调递增 `server_seq`（或直接用自增 `id`） | 乱序检测与"断线补拉"的唯一依据 |
| 推送与写路径解耦 | 把 `notifyMarketplaceMessage` 的出网推送移出请求路径（先入库，异步/队列发送）【已定·现状为同步】 | 消掉 X2，发送接口 P99 立刻变好 |
| 软删 / 举报联动 | 消息表加 `deleted_at`；被举报待审/已删消息不下发、不计未读 | 与既有 `reports` 表、`adminAuth` 流程对接【已定·`migrations/056_admin_system.sql`】 |
| 限流 | 每用户每 thread 发送速率上限 + 每 IP 拉取速率上限 | 防刷；用现有中间件风格实现 |

### 阶段 1 —— 引入实时通道（前提：原生推送已建或同步建）

| 类别 | 必须新增 |
| --- | --- |
| 推送通道（**硬前置**） | 新增 `device_tokens(user_id, platform, token, updated_at)` 迁移；把 `services/pushSend.js` 抽象为 provider 接口，并列 FCM/APNs（或 Expo Push）；Web Push 保留为 Web 端分支 |
| 通道 | 单进程 `http.Server` 上挂 `ws` 或 `socket.io`；事件只发"有新消息/有撤回"提示 |
| 鉴权握手 | 握手期校验 JWT（`auth`/query），失败即拒绝并关闭；**不接受匿名订阅** |
| 房间模型 | `u:{userId}` 一人一房间（多端天然多连接）；会话房间在阶段 2 才需要 |
| 限流与防护 | 每 socket 发送速率、每 IP 握手次数、握手超时；未认证连接 5s 内断开 |
| 顺序与补拉 | 事件携带 `server_seq`；客户端重连后带 `since_seq` 走 REST 补拉，**通道丢包=只丢提示，不丢消息** |
| 客户端 | 纯 JS 客户端（`socket.io-client` 或 RN 内置 `WebSocket`）→ 可 OTA；**推送 SDK 是原生模块 → 必须原生构建，不可 OTA** |

### 阶段 2 —— 群聊 / 已读 / 多端同步

| 类别 | 必须新增 |
| --- | --- |
| 会话模型 | `thread_participants(thread_id, user_id, read_seq, joined_at)`，用于群聊与逐会话已读回执 |
| 已读回执 | 上行 `read` 事件写 `read_seq`，下行广播给对端（"已读"标记）；以 `server_seq` 为界，不用时间戳 |
| 多端同步 | `u:{userId}` 房间内多连接需 per-device ack；发送端的乐观消息用 `client_msg_id` 收敛 |
| 扩展性 | 多进程时按 §3.3 判据上 **Redis adapter**；若保留 long-polling 降级则**必须 sticky** |
| 可靠性 | outbox 表 + 异步推送重试；离线消息队列；消息编辑/撤回事件广播 |
| 治理 | 撤回/删除/封禁要广播 `message:deleted` / `thread:closed`；与 `checkSanction`、举报队列联动 |

---

## 7. 未证实项清单（**不得当事实引用**）

1. **M3「3–5 个目的地」**：已用官方 Material Android 文档原文证实（§5.1）；但 m3.material.io 指南页与 Android Compose 文档页因 JS 渲染**只取回页标题**，未取回该两页正文。
2. **RN 是否内置 `EventSource`**：**未实测**。App 尚未建；社区报告可检索到「Can't find variable: EventSource React Native Expo」。落地前用一行 `typeof EventSource` 在真机验证 —— **不得当规格用**。
3. **iOS 后台挂起 / 推送限流的逐字原文**：Apple 文档站为 JS 渲染，本次仅取回页标题（`/documentation/uikit`）；结论基于文档既定行为 + Apple 网站内论坛线程标题，**无逐字引号**。
4. **Android Doze「网络访问被暂停」的逐字原文**：同上，`doze-standby` 页只取回页头（页标题「Optimize for Doze and App Standby」已实测）。
5. **每连接 10–40 KB 内存、在线用户 0.01 msg/s**：均为【提案】估计，**未实测**；只用于数量级判断，不得用于容量承诺。
6. **`socket.io`/`socket.io-client` 在 Expo SDK 57 + RN 0.86.3 + 新架构上的实际可用性与包体积**：仅确认版本号存在（`npm view`），**未真机验证**；"纯 JS 可 OTA"是基于包结构的判断。
7. **厂商 ROM（MIUI/EMUI/ColorOS 等）后台清理策略**：无统一官方文档，**未证实**。
8. **「4s 轮询 / 整页最多 500 条」**：来自所有者背景给定与端点签名（无游标参数）；本次 grep 未逐行复核 LIMIT 字面值。
9. **顶栏「信箱」在 App 侧的实现**：App 端为 0 代码，属待建；本文对其形态的描述来自 2026-10-01 裁决口径。
10. **长轮询 `?wait=25` 的实际并发承受度**：未做压测，纯【提案】。

---

## 8. 来源与本地实测

| # | 来源 | 访问/执行日期 | 取回情况 |
| --- | --- | --- | --- |
| 1 | [Socket.IO — Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/) | 2026-10-02 | **全文**，含官方原文引号（sticky sessions / 禁 long-polling / pingInterval+pingTimeout=45s / nginx proxy_read_timeout=60s） |
| 2 | [Material Components for Android — Bottom navigation (Navigation bar) 官方文档](https://raw.githubusercontent.com/material-components/material-components-android/refs/heads/master/docs/components/BottomNavigation.md) | 2026-10-02 | **全文**，含「three to five destinations」「does not support more than 5 `menu` items」与 badge API |
| 3 | [Material Design 3 — Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines) | 2026-10-02 | HTTP 200，**仅页标题**（JS 渲染） |
| 4 | [Android — Optimize for Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby) | 2026-10-02 | HTTP 200，**仅页头**（两次抓取均截断） |
| 5 | [Android Compose — Navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar) | 2026-10-02 | HTTP 200，**仅页头** |
| 6 | [Apple Developer — UIKit 文档站](https://developer.apple.com/documentation/uikit)（原链接为已归档的后台执行指南，被重定向至此） | 2026-10-02 | HTTP 200，**仅标题** |
| 7 | [Apple — Pushing background updates to your App](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app)｜[Apple 论坛线程：Realtime - Websocket background and remote notifications](https://developer.apple.com/forums/thread/66157) | 2026-10-02 | 未取回正文 / 仅检索命中标题 |
| 8 | 本机 npm 实测（`npm view socket.io version --json` → `"4.8.4"`；`npm view socket.io-client version --json` → `"4.8.4"`；`npm view ws version --json` → `"8.22.0"`） | 2026-10-02 | **实测通过** |
| 9 | 仓库内 grep 4 次（`routes/marketplace.js`；`routes/` 实时关键字；`services/pushSend.js`；`migrations/` 建表） | 2026-10-02 | **实测通过**（结果见 §1） |

**给下一份文档的一句话**：这份文档只回答"难不难、贵不贵、放哪、先做什么"；一旦决定动工，游标协议（`since_id`/`server_seq` 语义）、未读口径、推送 provider 抽象需要各自出一份 task 文档，**不要把本文当规格落地**。
