# App 页面清单与结构盘点

**日期**：2026-10-02　**版本**：**v3.0**（按所有者第三轮裁决改骨架；v2.0 按第二轮 IA 重排；v1.0 建立在已作废的首轮 IA 上）
**性质**：设计阶段**第 4 件交付物**（见[设计阶段工作计划与验收门 §三](../task/设计阶段工作计划与验收门.md)）。本文件回答"**有哪些页、命中哪个原型、深链与返回栈语义**"，验收门是"**全部页面命中原型，无『自造样式』页**"。
**⚠️ 本版的冻结边界（所有者 2026-10-02 裁决）**：**骨架已定死；页面级布局不在本版冻结范围内** —— 见 §1.3 与[骨架规范 §7](../design/App页面骨架与布局规范.md)。
**上游**：
- [App 设计宪法](../constitution/App设计宪法.md) 第 4 条（**五格 = 广场/工具/校园里/我的/发布** + 顶栏信箱；**4.8 二级导航＝顶部 Tab**、**4.9 发布入口**、4.1.1 校园里合并边界、4.1.2 校方系统边界）、第 1.4 条（全局组件化）、第 9.14 条（禁止嵌套套壳）、第 10.4/10.5 条（错误三要素与文案字数）、第 16 条（两层图标）、**第 17 条（安全区）**
- [App 页面骨架与布局规范](../design/App页面骨架与布局规范.md)（**五格骨架图 / 二级 Tab 六条硬规则 / 安全区八条铁律 / 冻结边界**）
- [App 设计令牌规范](../design/App设计令牌规范.md)、[App 前端风格体系](../design/App前端风格体系.md)
- [调研-03 能力面与 IA](../research/App设计调研-03-Dorm能力面与使用场景盘点.md)（21 能力域 / 273 端点 / 17 原型库 / Q1–Q14；**其 IA 结论已被多次取代，只引能力面与端点事实**）
**下游**：[App 组件类型定义](../design/App组件类型定义.md)、设计阶段第 5 件（任务拆解）
**待确认入口**：[TO-CONFIRM.md](../TO-CONFIRM.md) —— 本文件 §9.1 只登记编号引用，**不另维护一份问题清单**

**端点数据来源**：本次对 20 个路由文件做了**逐文件全量重读**，5 份端点清单落在 `.scratch/app-page-inventory/`。**逐文件核对与基线完全一致：273 个端点，无差异。**

```
admin 29 · canteen 40 · handbook 36 · clubs 31 · square 26 · marketplace 15
posts 15 · materials 15 · confessions 9 · organizations 9 · advertisements 7
notifications 6 · errands 6 · todos 6 · users 6 · auth 5 · diary 4 · push 4
schedule 3 · reports 1                                  = 273
```

> **数值与范围约定**：`【已定】`＝所有者裁决或宪法给定；`【建议】`＝本文提出、**须确认后才可作为排期依据**；`【待核实】`＝脚手架期必须实测，**不得当已成立**。

---

## 0. 一页速览

| 指标 | 结果 |
|---|---|
| 后端端点总数 | **273**（20 个路由文件） |
| **App 侧页面总数** | **88**（⚠️ **这是 v2.0 的四格口径**；五格 + 二级顶部 Tab 会改变"哪些算一页"的切分 → **本版不重切**，登记为 §2.6 的 **D-1…D-6**，开发期定） |
| **v1.0 首发范围** | **81 页**（P0 必做 **55** + P1 应做 **26**）；**是否压缩见 [TO-CONFIRM](../TO-CONFIRM.md) C-10** |
| v1.1 顺延 | **7 页** |
| **明确不做（✗）** | 学习资料/笔记全部页面、管理后台全部页面、商家端全部页面、**地图**、**推荐**、运营投放管理 |
| 导航骨架 | **5 格底栏** = 4 个导航 Tab（广场/工具/校园里/我的）+ **1 个动作型格位（发布）**；另有 **1 个全局顶栏动作（信箱）** |
| **二级导航** | **顶部 Tab 条**（广场 / 工具 / 校园里 内的子栏目）；⛔ **不做宫格入口页**（宪法 4.8） |
| 收纳结构 | **三处**：广场（服务与内容入口）/ 工具（学生事务与校方系统）/ 我的（身份、个人内容、私信）。**不得新增第四处**；**信箱与发布属于两类全局入口，都不占收纳处** |
| 用到原型 | **14 个**（P1–P7、P9–P11、P13–P16）；**P12 地图本版无使用者**、**P8 后台表格随管理后台一并出局**；**P17 纯转发已废除**；**建议新增 P18 内嵌网页容器（待评审）** |
| App 独有、Web 完全没有的能力 | **1 项**：校方系统快速打开与会话记忆（T-03/T-04/T-05，**所有者指定为本 App 最主要功能**） |
| 后端改造前置项 | **7 项**（§7），其中 3 项是商店合规红线、1 项是推送通道、1 项是校方系统会话边界 |

### 0.1 与 v2.0 的差异（**本版改骨架，不重切页面**）

| 变更 | 原因 |
|---|---|
| 底栏由**四格**改为**五格**：新增第 5 格 = **发布（动作型 Tab）**，**取代原发布 FAB** | 宪法 4.1／4.9（所有者第三轮裁决） |
| **一级 Tab 内的子栏目改由顶部 Tab 条承载**，不再做"宫格入口页 + 点进去" | 宪法 4.8（所有者第三轮裁决） |
| **S-01 广场首页 / S-17 社团主页 / C-01 校园里 上的发布 FAB 删除**（保留"今天吃什么"等非发布悬浮按钮） | 宪法 4.9.3：**发布入口唯一** |
| **四个 Tab 图标名不变**，但**「我的」的内容新增"私信"**（归属建议见 TO-CONFIRM C-07） | 私聊不占格（4.9.4 的推论） |
| 「**不做笔记**」写入 ✗ 名单（原来只写"学习资料"） | 宪法 4.2.2-5（所有者第三轮） |
| **§3 页面总表本轮不重切** | 所有者第三轮：页面级布局开发期再定（宪法 15.4）。**变更点登记为 §2.6 的 D-1…D-6**，不假装已经改完 |

### 0.2 与 v1.0 的差异（历史，记录 v2.0 的重排原因）

| 变更 | 原因 |
|---|---|
| 一级导航由「广场/树洞/食堂/我的」改为「**广场/工具/校园里/我的**」 | 宪法 4.1（所有者第二轮裁决，明确取代首轮） |
| **新增「工具」为一整个一级 Tab**，课表/待办/放假日从"我的工具区"上提 | 宪法 4.1／4.1.2；所有者把工具定为**最主要功能入口** |
| **新增校方系统模块**（T-03/T-04/T-05） | 宪法 4.1.2；**Web 完全没有的新能力** |
| 树洞与万能墙**合并进「校园里」一个 Tab**，但为**两个互斥子视图** | 宪法 4.1.1（只允许导航层合并） |
| **学习资料全部页面移出范围** | 宪法 4.2.2-1（M10 不对齐，将来单独立项） |
| **管理后台与商家端全部页面移出范围** | 宪法 4.2.2-2/3；所有者本轮再次确认"手机不做管理员后台" |
| **地图页面移出范围**（食堂贴图地图、校园导览图） | 所有者第三轮指令"app 先不做地图" |
| **推荐页面移出范围**（为你推荐） | 所有者第三轮指令"先不做推荐" |
| 课表导入**改为 App 内登录校方系统抓取** | 所有者第三轮指令（原"粘贴文本"降为兜底路径） |
| 原 J-01/J-02（管理员举报应急）**整块删除** | 所有者本轮确认手机不做管理员后台 |

---

## 1. 口径与计数规则

| 规则 | 说明 |
|---|---|
| R1 | 一个**路由级目的地**算一页；同一页带不同参数不重复计数 |
| R2 | 同构页**合并计数**（"我的点评"只计 1 页） |
| R3 | 纯转发页（P17）**不计**，其目标页计入 |
| R4 | 4 个一级 Tab 的首页各计 1 页 |
| R5 | **子视图不算页**：「校园里」下的"树洞/万能墙"是**同一页内的两个互斥子视图**（宪法 4.1.1），因此**只计 1 页（C-01）**，但**各自独立维护分页与滚动位置** |
| R6 | 模态式呈现的表单，若具备草稿/校验/离开确认/深链恢复四项语义，**计 1 页**并标注 `模态式` |
| R7 | **不是页的**：模态、Toast / AlertDialog / ActionSheet / BottomSheet、Popover、表格行内展开、**举报组件**、**评论区** |
| R8 | 运营与管理侧**不再单独分区**——本轮已整体移出范围，仅在 §6 覆盖表里逐条登记 ✗ |

### 1.1 范围分层

| 层 | 含义 |
|---|---|
| **P0** | 首发**必做**：缺了 App 不可用，或属宪法第 12 条合规红线 |
| **P1** | 首发**应做**：不做会显著降低完整度，但不阻断上架 |
| **P2** | **v1.1 顺延** |
| **✗** | **不做**（见 §6 逐条登记） |

### 1.2 宪法 4.2.1 的 8 个「待归位项」——**已降为机械落位**

宪法 4.2.1 原登记这 8 项**阻塞页面清单定稿**。**所有者第三轮"子栏目做成顶部 tab"的裁决使它们不再需要逐项裁决**：属于"某一级 Tab 的一个子栏目"的，直接成为该 Tab 的**二级 Tab**；属于"个人内容"的，留在「我的」用**列表入口**。
**待所有者复核编号**：[TO-CONFIRM](../TO-CONFIRM.md) **C-09**。

| 能力 | 落位 | 页 |
|---|---|---|
| 热搜 / 校园此刻 | **广场**的二级 Tab 或内容条（**集合待定** → C-03） | S-02 / S-03 / S-04 / S-05 / S-06 |
| 活动 | **广场 → 社团** 内的入口 | S-20 |
| 排行榜 | **广场**（食堂榜），二级 Tab 或内容区 | S-12 / S-13 |
| 课程评价 | **工具**的二级 Tab（与课表同域） | T-09 / T-10 / P-09 |
| 日记 | **工具**的二级 Tab（**边界待裁**：是否属"笔记" → C-06） | T-08 |
| 收藏 / 我的帖子 / 我的点评 | **我的**（列表入口，非二级 Tab） | M-04 / M-05 / M-06 |
| 等级系统（M04） | **我的**（列表入口） | M-16 |
| 广告 / 轮播位 | **广场**与食堂位的**内容区**（不是导航项） | S-32 |

### 1.3 ⚠️ 本版**不冻结**页面级布局（所有者 2026-10-02 裁决）

> 所有者原话：**"当前由于页面太多，功能太多，不适合一次性全部规定好。具体页面布局，可以等到开发时再进一步确认和调整。"**

| **冻结**（宪法 15.4-1） | **不冻结**（宪法 15.4-2） |
|---|---|
| 五格骨架 · 二级导航＝顶部 Tab · 发布入口唯一 · 安全区铁律 · 令牌/组件/文案/错误纪律 · 图标两层 | **每个页面的内部布局** · 信息顺序 · 卡片形态 · 栅格与留白 · 一级 Tab 首屏放什么 · 二级 Tab 的视觉取值 · **§3 页面总表的重新切分** |

**因此本文的读法变了**：§3 的页面清单是**当前口径下的方向性清单**（回答"哪些能力必须有归宿、命中哪个原型"），**不是逐页施工图**；§4 原型覆盖与 §6 端点覆盖**仍然有效**（它们不随布局变化）。开发期的调整**不得违反左列**，且**必须回写本文**（宪法 15.4-3）。

---

## 2. 导航骨架（IA）

### 2.1 骨架（`【已定】`：宪法 4.1 / 4.8 / 4.9 / 4.2 / 4.7）

```
┌───────────────────────────────────────────────────┐
│ 顶栏：标题          ＋信箱动作（未读角标常驻）        │  ← 四屏完全一致
├───────────────────────────────────────────────────┤
│ 二级顶部 Tab 条（仅"有子栏目"的一级 Tab 显示）        │  ← 横向可滚 · 吸顶
│  食堂 │ 社团 │ 二手 │ 跑腿 │ 新生指南 ←── 指示器    │
├───────────────────────────────────────────────────┤
│                                                   │
│            当前二级 Tab 的内容（可滚动）             │  ← 滚动/分页各自独立
│                                                   │
├───────────────────────────────────────────────────┤
│  广场   │   工具   │  校园里  │   我的   │   ＋     │  5 格
└───────────────────────────────────────────────────┘
          ↑ 一级导航（4 个目的地）        ↑ 动作型 Tab（发布，非目的地）
```

| 格 | 内容（`【已定】`） | 定位 | 格图标（**第 2 层：平台原生**，宪法 16.1） | 二级 Tab |
|---|---|---|---|---|
| **广场** | 食堂 · 社团 · 二手 · 跑腿 · 新生指南 | 服务聚合 | Android/Web `grid_view`；iOS `square.grid.2x2`【提案】 | ✅ **有**（集合待定 → C-03） |
| **工具** | 课程表 · 待办 · 放假日 · **校方系统快速打开** | **本 App 最主要功能入口** | Android/Web `construction`；iOS `wrench.and.screwdriver`【提案】 | ✅ **有**（集合待定 → C-04） |
| **校园里** | 万能墙 + 树洞（**仅导航层合并**） | 内容社区 | Android/Web `school`；iOS `building.columns`【提案】 | ✅ **就是这两项**（宪法 4.1.1） |
| **我的** | 个人身份、个人内容、**私信**、设置 | 个人 | Android/Web `account_circle`；iOS `person.crop.circle`【提案】 | ⏳ **待确认**（→ C-05，倾向**不用**） |
| **＋ 发布** | **全部发布动作**：万能墙 / 树洞 / 社团活动 / 二手 / 跑腿（+ 预告的 拼车 / 问答） | **动作，不是目的地**（宪法 4.9） | Android `add`；iOS `plus` | —（打开发布中心 **P-01**） |

> **Tab 栏内不得出现任何 Lucide 图标**（宪法 16.1；Tab 栏由系统绘制）—— **第 5 格也一样**，用平台 `add`/`plus`（宪法 4.9.6；这里最容易被顺手写成 Lucide `plus`）。
> **Tab 图标名以[图标方案调研](../research/App图标方案-Lucide与平台图标.md)的实测名单为准** —— Material Symbols 四个名已逐个核实存在；**SF Symbol 四个名属【提案】，须用 Apple SF Symbols app 核对（[TODO TD-34](../TODO.md)）**。
> **第 5 格无文字标签**（所有者原话"一个加号按钮"）→ 三条补偿要求见宪法 6.3 与 4.9.7。

### 2.1.1 二级 Tab 的骨架位置

二级 Tab 条位于**顶栏之下、内容之上**；**只有存在子栏目的一级 Tab 才渲染它**（没有就不占位）。
**六条硬规则（R1–R6）见宪法 4.8.1**，此处不复述；要点是：切换**零转场**、各自**保持滚动与分页**、**导航 Tab ≠ 筛选 Chips**、溢出**横向滚动而不是"更多 ▾"**。

### 2.2 五格的职责边界

| 格 | 承担 | 明确不承担 |
|---|---|---|
| **广场** | 五类服务发现 + 校园动态（热搜/校园此刻，**归位见 C-03**）+ 食堂四级链路 + 榜单 + 轮播位 | 不做个人事务、不做万能墙的"一屏一篇"、**不做地图**（本轮） |
| **工具** | 课表 / 待办 / 放假日 / 校方系统 / 课评 / 日记 —— **学生事务与校方系统的一切** | 不承载社区内容、不承载个人身份；⛔ **除三个校方系统外全部原生，不做 WebView**（宪法 4.1.2-1） |
| **校园里** | 树洞（实名社区信息流）与万能墙（强制匿名，一屏一篇）**两个互斥子视图** | ⛔ 不混排进同一条流；⛔ 不为"统一"给万能墙加作者、也不把树洞匿名化（宪法 4.1.1） |
| **我的** | 个人身份、个人内容四件套、**私信（会话列表 + 未读）**、设置、合规与法律入口 | 不承载内容发现、不承载学生事务（已上提到工具） |
| **＋ 发布** | **全部发布动作**的收束入口（打开发布中心 P-01） | ⛔ 不是目的地：**没有自己的内容区**、不参与选中态、不进返回栈；⛔ **不得成为第二个发布入口的补充**（它本身就是唯一的那个） |

### 2.3 三处收纳（穷举，**不得新增第四处**）＋ 两类全局入口

| 收纳处 | 条目 | 对应页 |
|---|---|---|
| **广场** | 热搜 / 校园此刻 / 食堂 / 社团 / 二手 / 跑腿 / 新生指南 / 榜单 / 美食文章 | S-02…S-31 |
| **工具** | 课程表 / 校方系统 / 待办 / 放假日 / 日记 / 课评 | T-02…T-10 |
| **我的** | 我的帖子 / 点评 / 收藏 / 想要 / 社团 / 稿件 / 我的课评 / 私信 / 设置 / 通知与推送 / 屏蔽用户 / 账号注销 / 等级 / 关于与法律 | M-04…M-23 |

**两类全局入口（都不属于任何收纳处，各自只此一处）**：
1. **信箱** —— 全局**顶栏动作**（宪法 4.7）；
2. **发布** —— 底栏**第 5 格（动作型 Tab）**（宪法 4.9），打开发布中心 **P-01**。

> ⛔ **顶栏只允许一个动作**（信箱），不得变成图标收纳区。
> ⛔ **发布入口唯一**：S-01 / S-17 / C-01 上的发布 FAB **一律删除**（宪法 4.9.3）。

### 2.4 三条不可协商的边界

**(1) 万能墙匿名不变量（宪法 4.1.1）**

后端 `confessions.js` 有 5 重机制保证**永不泄露作者身份**（逐字段白名单投影、硬编码匿名名、对外 SELECT 不含身份列、不 JOIN users、评论"投影后再嵌套"）；而 `posts.js` **确实返回** `author{id,username,nickname,avatar,level,badge}` 且顶层暴露 `user_id`。因此：

1. 两个子视图**使用两套作者呈现组件**，不得共用；
2. 万能墙只允许渲染 `author.display_name` / `display_name_en`（"匿名 / Anonymous"），**禁止**头像、昵称、等级徽章、主页跳转；
3. `viewer_is_mine` **仅用于控制删除入口显隐**，不得用于任何身份暗示；
4. **两个子视图各自的返回栈与滚动位置独立**（R5）。

**(2) 校方系统凭据边界（宪法 4.1.2，安全红线）**

| # | 规则 |
|---|---|
| 1 | 凭据**不出设备、不上传**：本项目后端**不得**接收、存储或转发校方系统凭据 |
| 2 | ⛔ **不得自动化"签到"或任何代替用户完成的校方动作** —— 只提供"打开 + 保持会话"，不做自动打卡、模拟点击、批量提交 |
| 3 | 会话由**平台 WebView 的 cookie 存储**持有；**App 代码不读取、不落盘、不上传** |
| 4 | ⚠️ **商店合规风险（须知情）**：App Store 审核指南 **4.2（Minimum Functionality）** 会拒"只是网页封装的 App" → ① 工具 Tab **不得在感知上等同于浏览器**；② 该能力必须与**原生**课表/待办/放假日**同屏同层**呈现；③ 上架前做一次专项自评 |
| 5 | ⚠️ **一处措辞待裁**：宪法 4.1.2-2 写"token / cookie 走 `expo-secure-store`"。**我们自己的登录态（JWT）走 `expo-secure-store`**；而**校方系统凭据根本不进我们的代码**，由平台 cookie 存储持有——**这比"取出来存 secure-store"更严格**。本文按此读法执行，**请所有者确认**（登记为 [TO-CONFIRM](../TO-CONFIRM.md) **D-06**） |

**(3) 工具 Tab 的 web / native 边界（所有者 2026-10-02 澄清）**

> 所有者原话：**"工具 tab，只有学校 ac 系统，moodle，签到系统是网页"。**

| 工具 Tab 内的项 | 实现形态 |
|---|---|
| **AC 系统 / Moodle / 签到系统** | **网页** —— T-05 内嵌 WebView（打开 + 保持会话），T-04 是会话状态列表 |
| 课程表（T-02）、课表导入（T-03） | **原生** —— 导入只是在 WebView 里"**读取本页课表**"，后续解析/预览/落库全在原生侧 |
| 待办（T-06）· 放假日（T-07）· 课程评价（T-09 / T-10）· 日记（T-08） | **原生** |

三条推论（都要在 review 时能当场判）：
1. ⛔ **不得把工具 Tab 的任何其他部分做成 WebView** —— 连"用 WebView 渲染长文"这种省事做法也不行（法律文本走原生 `MarkdownReader`，且**必须离线可读**）。
2. **这条同时是 App Store 4.2（Minimum Functionality）的第一道防线**：工具 Tab 的原生部分必须与校方系统**同屏同层**呈现，"网页"永远只占一格（宪法 4.1.2-5）。
3. **仍缺的只有 URL 与登录机制** —— 清单本身已由所有者给出（三项）：[TO-CONFIRM C-04](../TO-CONFIRM.md)。

### 2.5 本次变更对 §3 页面总表的影响（**登记为 D-1…D-6，本版不逐条改表**）

> **为什么不在本版直接改**：所有者已裁决"页面级布局开发期再确认"（§1.3）。**把 88 行表格按新骨架重写一遍，等于用一个下午的猜测替换另一个下午的猜测**。因此这里**只登记已知的失效点**，逐条列出，避免"看起来改完了其实没想清"。

| # | 失效点 | 处置（开发期） |
|---|---|---|
| **D-1** | **S-01 广场首页的定位变了**：v2.0 是"仪表盘 + 五类服务入口宫格"；v3.0 下它是广场格的容器（顶部 Tab 承载子栏目），宫格**不再承担子栏目导航** | 决定 S-01 是否仍是独立"首页"，还是由顶部 Tab 的首格（如"动态"）取代 |
| **D-2** | **S-07 / S-15 / S-22 / S-24 / S-26 的"入口"列失效**（原写"S-01 服务入口"） | 改为"广场的二级 Tab" |
| **D-3** | **T-01 工具首页同理**（原"仪表盘 + `QuickActionGrid`"）；T-02…T-10 的入口列原写"T-01" | 改为"工具的二级 Tab" |
| **D-4** | **C-01 校园里**原本就是"一页两个互斥子视图"，方向不变；但形态从 `SegmentedTabs` 收紧为**顶部 Tab 条**（宪法 4.8） | 确认组件名与规格（`SegmentedTabs` 是否改名/改规格，需与[组件类型定义](../design/App组件类型定义.md)同步） |
| **D-5** | **FAB 的删除**：S-01 / S-17 / C-01 行内的 `Fab` 若语义是"发布"则**删除**；S-07 的"今天吃什么"**保留** | 按宪法 4.9.3 执行 |
| **D-6** | **P-01 发布中心**：入口由"发布 FAB（全局常驻）"改为"**底栏第 5 格**"；条目 = P-02…P-09 里的**发布类**（P-03/P-04/P-07/P-08 是上下文入口，需决定是否也进注册表），并**预留拼车/问答两条**（后端未建前**不出现**） | 注册表驱动，见宪法 4.9.5 |

## 3. 页面总表（88 页）

> ⚠️ **本表按 §1.3 属于"不冻结"范围**：它是**方向性清单**（哪些能力必须有归宿、命中哪个原型），**不是施工图**。上面 D-1…D-6 是已知需要重切的地方；开发期逐页确认后**回写本表**。

**读法**：`层` 列见 §1.1；`原型` 列见 §4；`关键组件` 列使用[组件类型定义](../design/App组件类型定义.md)里**登记在册的代码名**；`模态式`＝R6。
**名字约定（§8.2 双向核对门的前提）**：反引号内**一律必须是注册表里登记过的名字**（原子 `A*` / 控件 `C*` / 组合 `K*` / 四态 `T*` / 覆盖层 `O*` / 域专用 `D*` / 原型 `P*`）。**页面上要的组件必须已登记；注册表里的组件必须有页面消费。**
> **非自研组件的写法**：由**平台或导航壳提供**的部件（Header、长按菜单、键盘避让…）与**页面级概念**（会话徽标、预览列表、工具栏…）**不写成组件代码名**，一律收在 §3.0 的清单里，以免与自研组件混淆。

### 3.0 非自研部件清单（页面会提到，但**不进组件注册表**）

这些名字在 §3 的表格里出现，但它们**不是自研组件**——分别是"导航壳/平台提供"或"页面级概念"，因此**不得**写进 `关键组件` 列。登记在此是为了让双向核对门有唯一的事实源。

| 名字 | 性质 | 来源 / 归属 |
|---|---|---|
| `AppHeader`（顶栏） | **导航壳提供** | 宪法 4.3：Header 一律原生容器；顶栏内只放一个动作（信箱） |
| `SwipeActions`（左滑动作） | **平台提供** | 原生容器；`@expo/ui` 有等价物 |
| `KeyboardAvoiding`（键盘避让） | **平台行为** | 由 `O08 InputSheet` / `O11 FullScreenModal` 内部实现，不是独立组件 |
| `CategorySidebar`（分类侧栏） | **页面级布局** | S-09 的页内布局（`FlatList` 双栏），非组件 |
| `ActivityRegisterBar`（报名底栏） | **页面级布局** | S-20 的粘性底栏（`C01 Button` + `A01 Surface`） |
| `FollowButton`（关注按钮） | **`C01 Button` 的配置** | S-17 用 `Button` 的 `secondary` 态，不新建组件 |
| `ContactActions`（联系方式动作组） | **页面级布局** | S-25：`C02 IconButton`×2（复制/拨号） |
| `SessionBadge`（会话状态徽标） | **已内联** | 属 `D27 SchoolSystemCard` 内部（宪法 9.14-③：1 处使用就地写） |
| `ImportPreviewList`（导入预览列表） | **页面级布局** | T-03：`K06 ListItem` × N |
| `SchoolSystemToolbar`（校方系统工具栏） | **属 `P18` 骨架** | 与 `WebViewContainer` 同属 `P18 内嵌网页容器`，不进组件层 |
| `TodayCard`（当前/下一节课卡） | **页面级布局** | T-01 / T-02：`K08 Card` + `A02 Text` |
| `NotificationItem` / `NotificationGroup` | **`K06 ListItem` 的域用法** | F-01：普通行 = `ListItem`；同帖互动组 = `ListItem` 原位展开 |
| `LinkCard`（外链卡） | **`K17 EntityCard(article)` 的用法** | S-27 的 `external_link` 卡 |
| `Toolbar`（文章工具条） | **页面级布局** | S-27：`C02 IconButton`×3（赞/藏/享） |
| `DraftGuard`（离开确认） | **`K01 Form` 的能力** | 不是独立组件（宪法 9.14-①：它就是 `Form` 的一个状态） |
| `PreviewList`（解析预览） | 同 `ImportPreviewList` | T-03 |

> **本表是"不得写成组件代码名"的清单**：若将来其中某一项**真的出现了第 2 个消费者**，才按宪法 9.14-③ 抽成组件，并**同时**把它从本表移入注册表。**反过来，注册表里的名字不得在页面上被当作"平台部件"使用。**

> **每页都必须同时满足**（宪法 13.1）：令牌无字面量 · 对比度达标 · 双语词条齐全（无内联三元）· **四态齐全** · 触控达标（iOS ≥44pt / Android ≥48dp）· reduced-motion 降级 · 深链可直达 · 返回栈语义正确 · 大屏自适应 · **顶栏信箱入口存在且角标口径一致** · **无渐变** · **无 Emoji 图标且图标归属符合两层规则** · **无嵌套套壳组件** · **文案字数达标**（按钮/标签 ≤6 汉字、标题 ≤12、正文说明 ≤30 且仅限错误与合规）· **错误提示满足「可感知/可理解/可改正」**。

### 3-A 启动 / 认证 / 合规（7 页）

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **A-01** | 启动与会话恢复 / Splash | App 冷启动 | 启动流程（非原型） | `GET /api/users/me` | `Surface` `T03 LoadingState` `FullScreenModal` | P0 |
| **A-02** | 登录 / Sign In | A-01、任意鉴权拦截 | P15 | `POST /api/auth/login` | `Form` `Input` `Button` `InlineNotice`（封禁/禁言） | P0 |
| **A-03** | 注册（学生）/ Sign Up | A-02 | P15 | `POST /api/auth/send-verification-code`、`POST /api/auth/register` | `Form` `Input` `OtpInput` `CountdownButton` | P0 |
| **A-04** | 找回密码 / Reset Password | A-02 | P15 | `POST /api/auth/send-reset-code`、`POST /api/auth/reset-password` | `Form` `Input` `OtpInput` | P0 |
| **A-05** | 合规门禁 / Terms Gate | **任意发布动作前拦截** | P16 | 待后端新增（§7-1） | `FullScreenNotice` `Checkbox` `Button` | **P0（红线）** |
| **A-06** | 通知权限引导 / Notification Permission | 首次登录后、M-14 | 系统契约页 | 系统 API + 待后端新增设备令牌端点（§7-4） | `PermissionPrompt` `FullScreenNotice` | **P0（推送前提）** |
| **A-07** | 账号受限说明 / Account Restricted | A-02 失败、任意 `checkSanction` 拦截 | P16 | `POST /api/auth/login`、`middleware/checkSanction` | `FullScreenNotice` `InlineNotice` | P1 |

**要点**
- **邮箱硬门槛**：注册必须 `@xmu.edu.my`（前后端同判）→ 字段级给可读原因，**不得只报"格式错误"**（宪法 10.4「可理解」）。
- **商家注册默认隐藏**（邀请码制），不做角色切换器。
- **A-05 是红线不是优化**：Play 要求"**发布 UGC 前**必须已接受"，**不是注册弹窗** → 它是**发布链路上的拦截点**。
- **A-07 的存在理由**：`checkSanction` 是 15+ 端点的写前置 → 必须有**统一解释面**。

### 3-S 广场 Tab（32 页）

> **Tab 图标属第 2 层（平台原生）**。本 Tab 内的**服务入口图标属第 1 层（Lucide）**，按[图标方案调研](../research/App图标方案-Lucide与平台图标.md) §3.3 逐个指定：食堂 `utensils` · 社团 `users` · 二手 `shopping-bag` · 跑腿 `bike`（备选 `package`，须二选一）· 新生指南 `compass`（备选 `book-open`，须二选一）。`flag` 已被「举报」占用，故社团不用它。

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **S-01** | 广场首页 / Square | **Tab 1** | P7 | `GET /api/square/home-summary`、`/banners`、`GET /api/advertisements/:id` | `BannerSlot` `StatTile` `QuickActionGrid`（五类服务）`SectionHeader` `EntityCard` `C02 IconButton` `A06 Icon(mail)` `A08 Badge` | P0 |
| **S-02** | 热搜榜 / Trending | S-01 顶部内容条 | P9 | `GET /api/square/trending`（固定 LIMIT 20） | `RankingRow` `SegmentedTabs` | P0 |
| **S-03** | 话题详情 / Topic | S-02、话题 chip | P2 | `GET /api/square/trending/:id`、`/trending/:id/posts`（`pageSize ≤ 20`） | `EntityCard` `ListFooter` | P0 |
| **S-04** | 热搜帖详情 / Trending Post | S-03 | P3 | `GET /api/square/trending/posts/:id`、`POST .../comments`、`POST .../like` | `EntityCard` `AuthorRow` `MediaGrid` `CommentThread` `CommentComposer` `ReportSheet` | P0 |
| **S-05** | 校园此刻 / Campus Now | S-01 顶部内容条 | P1 | `GET /api/square/campus?tab=school|college`（`pageSize ≤ 20`） | `SegmentedTabs` `EntityCard` `A08 Badge(status)` | P0 |
| **S-06** | 校园帖详情 / Campus Post | S-05 | P3 | `GET /api/square/campus/:id`、`POST .../comments`、`POST .../like` | 同 S-04 + `A08 Badge(status)` | P0 |
| **S-07** | 食堂首页 / Canteen | S-01 服务入口 | P7 | `GET /api/canteen/regions`、`/banners`、`/pick-random`、`/rankings/*` | `BannerSlot` `QuickActionGrid` `SectionHeader` `RankingRow` `Fab`（今天吃什么） | P0 |
| **S-08** | 区域店铺 / Shops in Area | S-07 区域网格 | P2 | `GET /api/canteen/regions/:id/shops`、`/regions/:id/ranking` | `ListItem` `Card` `RankingRow` | P0 |
| **S-09** | 店铺菜品 / Shop Menu | S-08、S-14 | P2 | `GET /api/canteen/shops/:id`、`/categories`、`/products`、`/shops/:id/hot` | `CategorySidebar` `EntityCard(food)` `ListItem` | P0 |
| **S-10** | 菜品详情 / Dish | S-09 | P3 | `GET /api/canteen/products/:id`、`/products/:id/reviews`（≤50/页）、`/products/:id/favorite` | `MediaGrid` `StarRating` `EntityCard(review)` `CommentComposer` `ActionSheet` | P0 |
| **S-11** | 发点评 / Write Review | S-10 | P4 `模态式` | `POST /api/canteen/products/:id/reviews`（正文 ≤300 字、图 ≤3） | `Form` `RatingScale`（**5 档非星级**）`MediaPicker` | P1 |
| **S-12** | 榜单中心 / Rankings | S-01、S-07 | P9 | `GET /api/canteen/rankings/*`（热销菜品 5 / 最忙店铺 5 / 顶流店铺 5 / 新晋爆款 3 / 活跃用户 5） | `SegmentedTabs`（5 类）`RankingRow` `EmptyState`（周榜重置说明） | P0 |
| **S-13** | 分区榜 / Area Ranking | S-12、S-08 | P9 | `GET /api/canteen/regions/:id/ranking`（`limit` 1–50，默认 20） | `RankingRow` `SegmentedTabs` | P1 |
| **S-14** | 食堂搜索 / Search Canteen | S-07 | P14 | `GET /api/canteen/search?q=&type=all|products|articles`（`q ≤ 50`） | `SearchField` `SegmentedTabs` `EntityCard(food)` `ListItem` | P0 |
| **S-15** | 社团广场 / Clubs | S-01 服务入口 | P1 | `GET /api/clubs`（分类 5）、feed、推荐 | `SegmentedTabs` `EntityCard(club)` `EntityCard` `SearchField` | P0 |
| **S-16** | 社团列表 / All Clubs | S-15 | P2 | `GET /api/clubs?category=` | `ListItem` `SearchField` `EmptyState` | P1 |
| **S-17** | 社团主页 / Club Profile | S-15、S-16、F-01 | P7 | `GET /api/clubs/:id`（含 `viewer.canManage`） | `Avatar` `StatTile` `SegmentedTabs`（活动/帖子/成员）`FollowButton` `Fab` | P0 |
| **S-18** | 社团成员 / Members | S-17 | P2 | `GET /api/clubs/:id/members` | `ListItem` `Avatar` `ActionSheet`（仅 `canManage`） | P1 |
| **S-19** | 创建社团 / Create Club | S-15 | P4 `模态式` | `POST /api/clubs`（图 ≤4） | `Form` `MediaPicker` `Select`（分类） | P1 |
| **S-20** | 活动详情 / Activity | S-15、S-17、F-01 | P3 | `GET /api/clubs/activities/:id`、报名/取消、`/register-status` | `MediaGrid` `StatTile` `Button`（状态 3：`upcoming/ongoing/ended`）`ActivityRegisterBar` | P0 |
| **S-21** | 社团帖详情 / Club Post | S-17 | P3 | `GET /api/clubs/posts/:id`、评论、点赞 | `EntityCard` `CommentThread` `ReportSheet` | P0 |
| **S-22** | 二手首页 / Marketplace | S-01 服务入口 | P2 | `GET /api/marketplace/categories`、`/items`（分类 6、状态 2、配送 2） | `SegmentedTabs` `FilterChips` `EntityCard`（`listing`） | P0 |
| **S-23** | 二手详情 / Listing | S-22、F-01 | P3 | `GET /api/marketplace/items/:id`、`POST .../want`、`PATCH .../status`、线程列表 | `MediaGrid` `Avatar` `Button`（想要/联系卖家）`ActionSheet`（编辑/标记已售/删除，由 `actions.markSold` 驱动） | P0 |
| **S-24** | 跑腿首页 / Errands | S-01 服务入口 | P2 | `GET /api/errands`（`type ∈ delivery/purchase/urgent`、`status ∈ open/taken/done`；排序 deadline 升序、无 deadline 在后） | `SegmentedTabs`×2 `EntityCard(errand)` `EmptyState` | P0 |
| **S-25** | 跑腿详情 / Errand | S-24、F-01 | P3 | `GET /api/errands/:id`（**唯一返回 `contactInfo` 的地方**）、`POST .../take`、`POST .../done`、`DELETE` | `Card` `ContactActions`（复制/拨号）`Button` `ConfirmDialog` | P0 |
| **S-26** | 新生指南 / Handbook | S-01 服务入口 | P1 | `GET /api/handbook/tabs`、`/tags`、`/articles`（排序 `new/hot`） | `SegmentedTabs` `SearchField` `EntityCard` `FilterChips` | P0 |
| **S-27** | 指南文章详情 / Article | S-26、F-01 | P10 | `GET /api/handbook/articles/:id`、like/save/share、评论、`/me/saved` | `D18 MarkdownReader`（**含 TOC**）`CommentThread` `Toolbar` `LinkCard`（`external_link` 跳浏览器） | P0 |
| **S-28** | 清单列表 / Checklists | S-26 | P2 | `GET /api/handbook/checklists` | `ListItem` `EmptyState` | P2 |
| **S-29** | 清单详情 / Checklist | S-28 | P2 | `PATCH /api/handbook/checklists/items/:id`（`is_done`）、条目 CRUD、`sort_order` | `ChecklistItem` `InputSheet` `SwipeActions` | P2 |
| **S-30** | 美食文章列表 / Food Articles | S-07 | P2 | `GET /api/canteen/articles`（≤20/页） | `EntityCard`（`article`）`ListFooter` | P2 |
| **S-31** | 美食文章详情 / Food Article | S-30 | P10 | `GET /api/canteen/articles/:id` | `MarkdownReader` | P2 |
| **S-32** | 广告 / 轮播落地 / Advert Landing | S-01、S-07 轮播 | P3 | `GET /api/advertisements/:id` + 点击上报 | `Card` `MediaGrid` `Button`（按 CTA 6 种分发） | P1 |

**广场 Tab 的要点**
- **S-01 必须消费后端聚合，不得逐块拼装**：`home-summary` 已返回未读数 + 今日活动数 + 校园公告数 + 热搜 Top4 + 热门活动 Top4 + 热门树洞 Top3 + 校园亮点 Top3。
- **S-01 廉价可挂载**（哲学 §6.1）：聚合**一次**完成、不做 N+1；轮播图与内容条延后到可视区。
- ⛔ **本条不做"为你推荐"**（所有者第三轮指令）：`/personalized-summary` 与 `/recommendations` **不接入**，S-01 **不得**出现推荐区。
- ⛔ **本条不做地图**：食堂贴图地图页**删除**；`GET /api/canteen/regions` 仍服务 S-07 的区域网格。
- **S-11 的评级不是 1–5 星**：后端 `RATING_ENUM = 夯爆了 / 顶级 / 人上人 / NPC / 拉完了`（权重 10/7/4/1/−1）→ 必须用 `RatingScale`，**不得用 `StarRating` 代替**（语义与权重都不是线性的）。
- **S-14 的"空/超长"是业务失败不是网络失败**：`q` 超长或为空返回 **HTTP 200 但 `status:-1`** + 空结果 → **不得渲染为网络错误态**。
- **S-07 现状是 5 段纵向堆叠**（Web `CanteenHome`）→ App 重排为"**3 次点击到菜品**"：随机选餐与榜单前置。
- 缓存口径由后端给定：`banners` 5min / `regions` 10min / `rankings` 30s → 客户端 TTL 不得与之相悖。
- **S-25 明确不做站内聊天**（源文件头 `No private chat core`）：沟通靠详情页的 `contactInfo`（**列表不返回**）→ 提供复制/拨号，⛔ **不得给聊天输入框**；`take` 会把 `taken_by_user_id` 置 `NULL` → **详情"接单人"不可依赖**。
- **S-17 / S-23 的角色化动作由后端布尔字段驱动**（`viewer.canManage`、`viewer.canEdit`、`actions.markSold`）→ **UI 不得自行推断权限**。
- **S-27 的 `external_link` 直接跳浏览器**；`MarkdownReader` 的 TOC **由客户端自建**（后端只存原文）。

### 3-T 工具 Tab（10 页，**本 App 最主要功能入口**）

> **Tab 图标属第 2 层**。本 Tab 的第 1 层图标按[图标方案调研](../research/App图标方案-Lucide与平台图标.md) §3.4：课程表 `calendar-days` · 待办 `list-checks` · 放假日 `calendar-heart`（备选 `party-popper`，须二选一）· AC 系统 `app-window` · Moodle `graduation-cap` · 签到 `qr-code`（备选 `scan-line`）· 校方系统总入口 `external-link`（⚠️ 会强化"跳出去"观感，**不在 Tab 层级放大**，只用于子项）。

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 / 数据源 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **T-01** | 工具首页 / Tools | **Tab 2** | P7 | `GET /api/schedule/week`、`GET /api/todos/today`、本地节假日数据、校方系统清单（本地配置） | `MetricRow` `QuickActionGrid` `TodayCard`（当前/下一节课）`ListItem` `SchoolSystemCard` | P0 |
| **T-02** | 课程表 / Timetable | T-01 | **P11** | `GET /api/schedule/week?week=N` | `P11 课表网格`（原型骨架） `SegmentedControl`（周切换）`TodayCard` | P0 |
| **T-03** | 课表导入（校方系统抓取）/ Import from School System | T-02、T-05 | P4 `模态式` | 客户端抓取（无后端）→ `POST /api/schedule/import/preview` → `POST /api/schedule/import` | `ImportPreviewList` `Form` `TextArea`（兜底）`AlertDialog`（**整表覆盖**） | **P0** |
| **T-04** | 校方系统与会话 / School Systems | T-01 | P2 | **无后端**（本地配置 + 平台 cookie 存储状态） | `ListItem` `SessionBadge` `Button`（清除会话）`InlineNotice` | **P0** |
| **T-05** | 校方系统内嵌浏览器 / School System Browser | T-04 | **P18（建议新增，待评审）** | **无后端**（`react-native-webview`；凭据不出设备） | `WebViewContainer` `SchoolSystemToolbar` `Button`（读取本页课表）`InlineNotice` | **P0** |
| **T-06** | 待办 / Todos | T-01 | P2 | `GET /api/todos`、`/today`、`POST /todos`、`PATCH /todos/:id`、`PATCH /todos/:id/toggle`、`DELETE /todos/:id` | `Checkbox` `ListItem` `A02 Text`（状态色令牌 + 文案） `DatePicker` `TimePicker` `SegmentedTabs`（优先级 0–3） | P0 |
| **T-07** | 放假日 / Holidays | T-01、T-02 | P13 | **无后端**（Web 用本地 `data/holidays.js`） | `CalendarHeatmap` `ListItem` | P1 |
| **T-08** | 日记 / Diary | T-01 | P13 | `GET /api/diary?date=`、`POST /api/diary`（覆盖式 upsert）、`/overview`、`/month` | `CalendarHeatmap` `TextArea` `DatePicker` `InlineNotice`（一天一篇 · 覆盖） | P1 |
| **T-09** | 课程评价 / Course Reviews | T-01 | P2 | `GET /api/handbook/course-reviews`（标签白名单 ≤8 + 关键词 + 仅 `02/04/09` 月份） | `FilterChips` `SegmentedTabs` `EntityCard(review)`（**匿名卡：无头像无昵称**）`SearchField` | P1 |
| **T-10** | 课评详情 / Course Review | T-09 | P3 | `GET /api/handbook/course-reviews/:id`、`POST .../rating`、评论（≤800 字） | `EntityCard(review)` `StarRating`（匿名评分）`CommentThread`（**匿名**）`InlineNotice`（"你已经评分过了"） | P1 |

#### 3-T.1 校方系统与课程表抓取（**App 独有，Web 完全没有**）

**这是本 App 被所有者定位为"最主要功能"的能力，因此把边界与机制写清。**

**(1) 端到端流程**

```
T-01 工具首页
  └─ T-04 校方系统列表        → 选 AC 系统 → 显示会话状态（已登录 / 未登录 / 已过期）
       └─ T-05 内嵌浏览器      → 登录（凭据由平台 cookie 存储持有，我们不经手）
            ├─ 导航到课表页
            └─「读取本页课表」→ 注入 JS 读渲染后的 <table>
                 └─ 逐行 join('\t') 得到制表符文本
                      └─ T-03 导入预览 → POST /api/schedule/import/preview
                           └─ 确认（AlertDialog：整表覆盖）→ POST /api/schedule/import
                                └─ T-02 课程表（本地优先，再刷新）
兜底路径：T-03 内的"粘贴文本"手输（原实现，保留为降级）
```

**(2) 为什么这条路可行 —— 三条已核对的事实**

| # | 事实 | 证据 |
|---|---|---|
| 1 | **后端解析器本来就接受制表符文本**：`splitColumns()` **优先按 `\t` 拆**，没有 tab 才退化为"2+ 空格"；输入要求去空白后 ≥10 字符且解析出 ≥1 门课 | `utils/scheduleParser.js:39-44`、`routes/schedule.js` |
| 2 | **真实的教务课表 HTML 是一个标准表格**：仓库根目录 `202609 Semester Timetable.html` 实测 **单 `<table>` / 15 `<tr>` / 102 `<td>` / 0 `<script>` / 0 `<iframe>` / 4573 字节** | 本次实测 |
| 3 | 因此 **DOM → `\t` 文本 → 既有两段式导入** 即可闭环，**不需要后端新增解析端点** | 事实 1 + 2 |

> ⚠️ **这条对调研-03 Q8 是一处更正**：Q8 曾建议"要做 HTML 文件导入需后端加一个『文件 → 文本』的预处理端点"。**实测后不需要** —— 抓取发生在客户端，且产出直接就是后端已支持的制表符文本。**§7 里因此不含该端点**。

**(3) 抓取机制（首选 + 兜底）**

| 机制 | 做法 | 代价 | 结论 |
|---|---|---|---|
| **(a) 注入 JS 读 DOM** 【首选】 | `react-native-webview` 的 `injectedJavaScript` 取 `<table>` → `onMessage` 回传文本 | 纯 JS，**无自写原生模块** | **采用** |
| (b) 拦截导航响应体 | Android `shouldInterceptRequest` / iOS 需自写原生模块 | **iOS 要写原生**（宪法 11.7：须放 `modules/`，不得改 `ios/`） | 兜底，需 ADR |
| (c) 带 cookie 直连复现请求 | RN 侧 `fetch` 复现课表请求 | 需读出 cookie → **违反 2.4(2)-3「App 代码不读取凭据」** | ⛔ **禁止** |

**(4) 依赖与合规**

- **`react-native-webview` 是宪法 9.9 第①层清单之外的新增原生依赖** → 引入前**必须走宪法 3.4 依赖准入五项**（许可证 / 是否含原生 / OTA 影响 / **最后发布时间**〔9.13：读版本自身时间戳，**不得用 `time.modified`**〕/ 是否强加视觉身份），并登记到 OTA 台账（11.4）。
- ⛔ **不得自动化签到**、不得模拟点击、不得批量提交（宪法 4.1.2-4）。
- ⚠️ **App Store 4.2（Minimum Functionality）风险**：① T-01 **必须把校方系统与原生课表/待办/放假日同屏同层呈现**，不得让工具 Tab 在感知上等于浏览器；② 上架前做一次专项自评（宪法 4.1.2-5）。
- ⚠️ **会话真实的持久化点**：凭据由**平台 WebView 的 cookie 存储**持有（iOS `WKWebsiteDataStore.default()` / Android `CookieManager`），**我们既不读取也不落盘**。这与宪法 4.1.2-2 的字面表述有一处措辞待裁（§2.4(2)-5、§9.1-5）。

**(5) `【待核实】` 清单（脚手架首周真机实测，不得当已成立）**

| # | 待核实 | 失败时的后果 |
|---|---|---|
| 1 | 目标 AC 系统**是否允许被 WebView 内嵌**（有无 `X-Frame-Options` / 反调试 / UA 白名单） | T-05 主路径不可行 → 只能退回"外部浏览器 + 手工复制"（能力大幅缩水） |
| 2 | 登录是否含 **SSO / 二次验证 / 图形验证码** | 若含，需在 T-05 内正常走完（不自动化），并确认 WebView 能承载 |
| 3 | **iOS `WKWebView` 第三方 cookie 持久化**（跨 WebView 重启是否保持） | 会话记忆失效 → T-04 的"已登录"状态不可承诺 |
| 4 | **Android `CookieManager` 跨会话保持**（含 `thirdPartyCookiesEnabled`） | 同上 |
| 5 | 课表页**渲染完成时机**（是否异步 / 是否需要点进二级页） | 注入 JS 需改为轮询或事件驱动 |
| 6 | 课表 `<table>` 的**列语义是否稳定**（星期 × 节次 vs 课程列表） | 抓取文本需按列语义重排，而非直接逐行 |
| 7 | 校方系统的**使用条款**是否允许第三方 App 内嵌访问 | 若不允许，本能力需整块重新决策 |

> ⚠️ **宪法 §15.1-12 把"校方系统清单与各系统登录/会话机制"登记为**阻塞工具 Tab 设计**。本文**只给结构，不给清单** —— T-04 的条目（AC 系统 / Moodle / 签到 的 URL 与登录方式）**必须由所有者提供**。

### 3-C 校园里 Tab（6 页）

> **Tab 图标属第 2 层**；第 1 层按[图标方案调研](../research/App图标方案-Lucide与平台图标.md) §3.5：树洞 `tree-pine`（备选 `ghost`）· 万能墙 `brick-wall`（⚠️ Lucide 1.x **没有 `wall`**；`brick-wall` 已核实存在）。

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **C-01** | 校园里 / Campus | **Tab 3** | P1 + **P6** | 树洞子视图：`GET /api/posts`（`pageSize ≤ 50`、`q ≤ 200`）、`/posts/hot-tags`；万能墙子视图：`GET /api/confessions/window`（`limit` 1–10，默认 5）、`/confessions/meta` | `SegmentedTabs`（**两个互斥子视图**）`EntityCard` `AuthorRow` `P6 翻页`（原型骨架：一屏一篇）`AnonAuthorLabel` `CommentThread` `Fab` | P0 |
| **C-02** | 帖子详情 / Post | C-01 树洞子视图、C-04、F-01 | P3 | `GET /api/posts/:id`、`POST .../like`、`GET/POST .../comments`、`DELETE .../comments/:id`、`DELETE /api/posts/:id`（本人） | `EntityCard` `AuthorRow` `LevelBadge` `MediaGrid` `ImageViewer` `CommentThread` `CommentComposer` `InputSheet` `ReportSheet` | P0 |
| **C-03** | 帖子搜索 / Search Posts | C-01 | P14 | `GET /api/posts?q=` | `SearchField` `FilterChips` `EmptyState`（无结果给放宽条件） | P1 |
| **C-04** | 标签流 / Tag Feed | C-01、C-02 | P1 | `GET /api/posts?tagSlug=` | `EntityCard` `FilterChips` | P1 |
| **C-05** | 万能墙投稿 / Compose Confession | C-01 万能墙子视图 FAB | P4 `模态式` | `POST /api/confessions` | `Form` `C14 SegmentedControl`（大字卡 60 / 信笺卡 1000 / 便签卡 300）`TextArea` `CharCounter` | P0 |
| **C-06** | 标签可见性 / Tag Visibility | M-13 设置 | P2 | `GET /api/posts/tags/visible`、`POST /api/posts/tags/:tagId/visible` | `ListItem` `Switch` `SectionHeader` | P2 |

**校园里 Tab 的要点**
- **C-01 是"一页两个互斥子视图"，不是两页**（R5）。两个子视图**各自的返回栈、分页状态与滚动位置独立**（宪法 4.1.1）。
- **两套作者组件**：树洞用 `AuthorRow`（头像 + 昵称 + 等级徽章 + 主页跳转）；万能墙用 `AnonAuthorLabel`（**只渲染"匿名 / Anonymous"**）。⛔ 不得互换、不得混用。
- **C-01 万能墙子视图是一屏一篇的独立节奏**（宪法 9.3）：纵向吸附翻页 + 边界回弹 + 预取 + "第 n 篇 / 共 m 篇"位置指示，**不得降级为瀑布流里的卡片**。
- **C-05 的三版式有硬字数上限**（60 / 1000 / 300，默认 `bigtype`），上限随版式**实时切换**。
- **C-02 的作者信息是半实名**（`posts.js` 返回 `author{...}` 且顶层有 `user_id`）。
- **C-01 性能**：Web 的 `TreeHole.jsx` 用"虚拟窗口 + 缩略图 + webp + sessionStorage 缓存"；App 改为 `FlashList/LegendList`（零原生、可 OTA）。

### 3-M 我的 Tab（23 页）

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **M-01** | 我的 / Me | **Tab 4** | P7 | `GET /api/users/me`、`/users/me/level`、`GET /api/todos/today`、`GET /api/schedule/week` | `MetricRow` `ExpBar` `LevelBadge` `Avatar` `QuickActionGrid` `ListItem` | P0 |
| **M-02** | 资料编辑 / Edit Profile | M-01、M-03 | P4 `模态式` | `PUT /api/users/me`、`POST /api/users/me/avatar` | `Form` `Input` `TextArea` `MediaPicker`（头像 ≤8MB，gif 允许） | P0 |
| **M-03** | 他人主页 / User Profile | 任意作者行、评论 | P7 | `GET /api/users/:id` | `Avatar` `LevelBadge` `StatTile` `EntityCard` `ActionSheet`（举报用户 / 屏蔽用户） | P0 |
| **M-04** | 我的帖子 / My Posts | M-01 | P2 | `GET /api/posts?mine` | `EntityCard` `ConfirmDialog` `EmptyState`（首次无数据 → 引导发布） | P0 |
| **M-05** | 我的点评 / My Reviews | M-01 | P2 | `GET /api/canteen/me/reviews`（≤30/页）、`DELETE /reviews/:id` | `EntityCard(review)` `ConfirmDialog` | P1 |
| **M-06** | 我的收藏 / My Favorites | M-01 | P2 | `GET /api/canteen/me/favorites`（≤50/页） | `ListItem` `EntityCard(food)` `EmptyState` | P1 |
| **M-07** | 我的想要 / My Wants | M-01 | P2 | `GET /api/marketplace/me/wants` | `ListItem` `EmptyState` | P1 |
| **M-08** | 我的社团 / My Clubs | M-01 | P2 | `GET /api/clubs/me/clubs` | `Card` `ListItem` `EmptyState` | P1 |
| **M-09** | 我的稿件 / My Articles | M-01 | P2 | `GET /api/handbook/articles?includeMine=1` | `ListItem` `Badge`（草稿态）`EmptyState` | P2 |
| **M-10** | 我的课评 / My Course Reviews | M-01 | P2 | `GET /api/handbook/course-reviews/mine` | `ListItem` `ActionSheet`（由 `viewer.canEdit` 驱动） | P2 |
| **M-11** | 私信会话列表 / Conversations | M-01、S-23 | P2 | `GET /api/marketplace/items/:id/chat/threads`（汇总） | `ListItem` `A08 Badge(count)` `EmptyState` | P0 |
| **M-12** | 二手私信会话 / Chat | M-11、S-23、F-01 | **P5** | `GET /api/marketplace/items/:id/chat/thread`、`/threads`、`GET/POST .../messages`、已读回执（消息 ≤1200 字） | `ChatBubble` `ChatComposer` `ChatBubble`（read 态） `KeyboardAvoiding`；**轮询 4s** | P0 |
| **M-13** | 设置 / Settings | M-01 | P2 | 语言为本地状态；其余为入口聚合 | `ListItem` `SectionHeader` `SegmentedControl`（语言）`Switch` | P0 |
| **M-14** | 通知与推送设置 / Notification Settings | M-13、A-06 | P2 | **待后端新增**（§7-5） | `Switch`（按 category/module）`ListItem` `PermissionPrompt` | P0 |
| **M-15** | 屏蔽用户管理 / Blocked Users | M-13 | P2 | **待后端新增**（§7-2） | `ListItem` `ConfirmDialog` `EmptyState` | **P0（红线）** |
| **M-16** | 账号注销 / Delete Account | M-13 | P4 `模态式` + P16 | `DELETE /api/users/me`，**级联删除待后端补**（§7-3） | `FullScreenNotice` `ConfirmDialog`（输入确认）`InlineNotice` | **P0（红线）** |
| **M-17** | 等级与经验 / Levels | M-01 | P16 | `GET /api/users/me/level`、`constants/levelThresholds.js`（6 级） | `ExpBar` `LevelBadge` `ListItem` | P1 |
| **M-18** | 关于与法律 / About & Legal | M-01 | P16 | 无 | `ListItem` `SectionHeader` | P0 |
| **M-19** | 隐私政策 / Privacy Policy | M-18、A-03、A-05 | P16 | 无（静态；**离线可读**） | `MarkdownReader` | **P0（红线）** |
| **M-20** | 服务条款 / Terms of Service | M-18、A-05 | P16 | 无 | `MarkdownReader` | **P0（红线）** |
| **M-21** | 免责声明 / Disclaimer | M-18 | P16 | 无 | `MarkdownReader` | P1 |
| **M-22** | 加入我们 / Join Us | M-18 | P16 | 无 | `MarkdownReader` `Button` | P1 |
| **M-23** | 评分与算法说明 / Algorithm Notes | M-18 | P16 | 无 | `MarkdownReader` | P1 |

**我的 Tab 的要点**
- **M-01 是"留存锚点"**：一屏给出"当前/下一节课 + 今日待办 + 未读 + 等级进度"。
- **M-12 没有实时通道**：全仓 **0 处 WebSocket / SSE**，Web 是 4s 轮询且服务端**无 `since`/游标增量参数**（整页最多 500 条）→ 离线可达**依赖系统推送**（§7-4），否则"用户看不到消息 = 私信价值为负"。
- **M-15 的"屏蔽"图标是 `user-x`，与内容屏蔽 `shield-ban` 语义分叉**（宪法 16.8，**一个图标不得承载两个含义**）——两者都要时必须补一个图标，登记为待裁项。
- **M-19/M-20 必须离线可读**（商店要求隐私政策 URL 可用且可无错加载）。

### 3-F 信箱（1 页，全局动作）

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **F-01** | 信箱 / Mailbox | **四个 Tab 顶栏右上角常驻动作** | P2 | `GET /api/notifications`（≤50/页）、`/unread-summary`、`/announcements`、`POST /api/notifications/:id/read`、`/read-batch`（`ids ≤ 100`）、`/clear` | `AppHeader` `C02 IconButton` `A06 Icon(mail)` `A08 Badge` `A08 Badge(count)` `SegmentedTabs`（互动/交易/系统）`NotificationItem` `NotificationGroup`（同帖互动组原位展开）`ListFooter` `ConfirmDialog` | P0 |

**要点（每条都是防"Web 缺陷复发"）**
1. **形态铁律**（宪法 4.7）：推入式**全屏目的地**，进入后隐藏 Tab 栏；**不是模态**、**不是 Tab**、**不进收纳处**。
2. **四屏一致、常态可见、角标常驻** —— **不允许"只在某一屏才有信箱入口"**。这是本页验收核心。
3. **角标口径与"我的"里的次要入口必须同源**，不得两套计数。
4. **返回语义**：从任一 Tab 进入 → 返回回到进入前的 Tab 与滚动位置；从信箱点进内容再返回应回到信箱，**不得跳过**。
5. **深链**：从系统推送进 `/mailbox` 时**栈底必须回退到广场**，不得空栈。
6. **公告不可清空**（`announcement` / `system_announcement`）：清空确认文案必须写明；`clear` 支持 `category/module/scope` 三口径。
7. **`target.available === false` 的通知必须置灰不可点**。
8. **`read-batch` 需按 100 条分批**（前端循环）。
9. **不做阻塞式公告弹窗**（Q9）：降级为**信箱置顶 + 角标**。
10. **`handbook_comment` / `course_review_comment` 不在任何 module 分组内** → 若提供 module 筛选，必须能解释这两类为何不在任何 module 里。

### 3-P 发布与表单（9 页，全部为独立目的地）

| ID | 页面（中 / 英） | 入口 | 原型 | 关键端点与限额 | 关键组件 | 层 |
|---|---|---|---|---|---|---|
| **P-01** | 发布中心 / Publish | **底栏第 5 格「＋」（动作型 Tab，全局常驻）** | P7 | 无（入口聚合） | **注册表驱动**的条目列表（宪法 4.9.5）；**按角色/权限过滤**（后端布尔字段驱动）；⛔ 不得硬编码按钮列表；预留拼车/问答条目（后端未建前**不出现**） | P0 |
| **P-02** | 发树洞帖 / New Post | P-01、C-01 FAB | P4 `模态式` | `POST /api/posts`：`title ≤ 120`（普通帖必填）、`images ≤ 3`（≤8MB，jpg/png/webp/gif）、`tag_ids ≤ 3` | `Form` `Input` `TextArea` `MediaPicker` `TagPicker` `DraftGuard` | P0 |
| **P-03** | 发热搜帖 / New Trending Post | S-03 | P4 `模态式` | `POST /api/square/trending/:id/posts` | 同 P-02 | P1 |
| **P-04** | 发校园帖 / New Campus Post | S-05 | P4 `模态式` | `POST /api/square/campus`（**组织身份**：成员资格 + `permission_level ≥ 1` + 组织类型与 tab 匹配） | `Form` `C07 Select`（成员资格校验） `InlineNotice`（权限失败原样提示） | P1 |
| **P-05** | 发二手 / New Listing | P-01 | P4 `模态式` | `POST /api/marketplace/items`：分类 6、状态 2、配送 2、宿舍区 13、`images ≤ 4`（**仅 jpg/png/webp，无 gif**）、标签 ≤10×20 字 | `Form` `Select` `MultiSelect` `MediaPicker` `TagPicker` | P0 |
| **P-06** | 发跑腿 / New Errand | P-01 | P4 `模态式` | `POST /api/errands`：`type ∈ {delivery,purchase,urgent}`、`contactInfo` **必填**、`title ≤ 120`、`description ≤ 5000` | `Form` `SegmentedControl` `DatePicker` `Input` `InlineNotice`（**详情页公开，列表不返回**） | P0 |
| **P-07** | 发社团帖 / New Club Post | S-17 | P4 `模态式` | `POST /api/clubs/.../posts` | 同 P-02 | P1 |
| **P-08** | 发活动 / New Activity | S-15、S-17 | P4 `模态式` | `POST /api/clubs/activities` | `Form` `DatePicker` `TimePicker` `MediaPicker` | P1 |
| **P-09** | 发课评 / New Course Review | T-09 | P4 `模态式` | `POST /api/handbook/course-reviews`：标签白名单 `MPU/GE/ME/required/final/no final` ≤8、`rating/difficulty` 1–5、学期 年份 2016–今 + 月份仅 `02/04/09`、正文 ≤3000 | `Form` `TagPicker`（白名单）`StarRating`×2 `C17 MonthPicker` `InlineNotice`（**全程匿名**） | P1 |

**通用表单纪律**
- **P-02…P-09 全部走同一个参数化 `Form` 框架**（字段描述符 + 校验 + 提交语义）—— 表单是最大桶，**不得逐页手写**（宪法 9.2）。
- **每页必须定义四态**；错误要说清"发生了什么 + 怎么修"，字段级错误就近显示，摘要置顶。
- **离开确认只在有未保存内容时出现**；提交按钮的 loading 态不得用 Toast 代替。
- **A-05 合规门禁必须在这 9 个页面的提交链路上生效**，不是在其中某一页里。
- **图片上限由页面注入**（帖子 ≤3 / 二手 ≤4 / 商品 ≤5 / 评论 ≤3；**二手不接受 gif**）—— 同一控件在不同业务下限额不同，**不得把限额写进控件**。

## 4. 原型覆盖（88 页）

**全部 88 页命中原型或已登记的"非原型/建议新增"，无"自造样式"页**（本文件即该验收门的证据）。

| 原型 | 骨架 | 页数 | 占比 | 代表页 | 备注 |
|---|---|---|---|---|---|
| **P2 列表** | 单列等宽行 + 可选 tab/筛选头 | **26** | 29.5% | F-01 信箱、T-06 待办、S-22 二手、M-11 私信会话 | |
| **P4 表单/发布** | 分节表单 + 媒体 + 草稿 | **14** | 15.9% | P-02 发树洞帖、P-05 发二手、P-09 发课评 | |
| **P3 详情** | 头图 + 正文 + 互动条 + 评论区 | **10** | 11.4% | C-02 帖子详情、S-10 菜品、T-10 课评 | |
| **P16 静态说明** | 标题 + 富文本 | **9** | 10.2% | M-19 隐私政策、A-05 合规门禁、M-17 等级 | |
| **P7 仪表盘** | 摘要卡 + 统计块 + 入口网格 | **7** | 8.0% | S-01 广场、**T-01 工具**、M-01 我的 | |
| **P1 信息流** | 卡片流/瀑布流 + 无限加载 | **5** | 5.7% | C-01 树洞子视图、S-05 校园此刻、S-26 指南 | |
| **P9 榜单** | 名次 + 主体 + 指标 | **3** | 3.4% | S-02 热搜榜、S-12 榜单中心 | |
| **P15 鉴权** | 品牌头 + 表单卡 | **3** | 3.4% | A-02 登录、A-03 注册、A-04 找回密码 | |
| **P10 阅读器** | 文档渲染 + 目录 + 操作条 | **2** | 2.3% | S-27 指南文章、S-31 美食文章 | |
| **P13 日历/时间轴** | 月历 + 当日详情 | **2** | 2.3% | T-07 放假日、T-08 日记 | |
| **P14 检索** | 搜索框 + 结果列表 | **2** | 2.3% | S-14 食堂搜索、C-03 帖子搜索 | |
| **P5 对话** | 气泡列表 + 输入条 | **1** | 1.1% | M-12 二手私信 | |
| **P11 课表网格** | 星期 × 节次 | **1** | 1.1% | T-02 课程表 | |
| **P18 内嵌网页容器**（**建议新增，待评审**） | 原生导航栏 + 平台 WebView + 页面动作 | **1** | 1.1% | T-05 校方系统内嵌浏览器 | **Web 完全没有的新骨架**；按宪法 9.1 走"先评审是否新增原型" |
| 非原型（启动 / 系统契约） | — | **2** | 2.3% | A-01 启动、A-06 通知权限 | |
| **P6 翻页** | 一屏一篇 · 纵向吸附 | **0**（**同页子视图**） | — | C-01 的万能墙子视图 | **不重复计页**：C-01 主原型记 P1，第二子视图由 `Pager` 承载（宪法 9.3 要求单独立原型） |
| ~~P8 后台表格~~ | — | **0** | — | — | **随管理后台一并出局**（宪法 4.2.2-2） |
| ~~P12 地图贴图~~ | — | **0** | — | — | **本轮不做地图**（所有者第三轮指令） |
| ~~P17 转发~~ | — | **0** | — | — | **已废除，禁止新增**（宪法 9.4） |
| **合计** | | **88** | **100%** | | |

**核心 8 原型（P1–P8）＝ 63 页 / 71.6%**；扩展原型（P9–P18）＝ 23 页 / 26.1%；非原型 2 页 / 2.3%。

> **与 v1.0 对照**：v1.0 的 P2 占比 26.5%，本版 29.5%。原因是"工具"成为一级后，课表/待办/放假日/课评/校方系统这一整块**以列表与仪表盘为主**，P2/P7 的权重上升。**P2 + P4 = 40 页 / 45.5%**，正是宪法 9.2 要求"优先做成参数化框架"的两桶 —— 收益比上一版更大。

### 4.1 三条原型纪律的落地情况

1. **P4 与 P2 优先参数化**（宪法 9.2）：14 个 P4 页必须共用同一 `Form` 框架；27 个 P2 页必须共用 `ListScreen` 骨架（分页状态机 + 四态 + 筛选持久化）。
2. **P6 与 P5 单独立原型**（宪法 9.3）：万能墙翻页与二手私信各只有 1 处用点，**不允许**被"塞进 P1/P2 降级实现"。
3. **P17 禁止新增**（宪法 9.4）：Web 的 4 个纯转发页在 App 被消灭（`SquareClub→S-15`、`SquareErrands→S-24`、`SquareFreshmanGuide→S-26`、`SquareSecondHand→S-22`）。
4. **新原型必须走评审**（宪法 9.1）：T-05 **不属于任何现有原型** → 本文按流程**提议新增 P18 内嵌网页容器**，`【建议】`**待评审**，而不是直接写一个页面。

---

## 5. 深链与返回栈语义

### 5.1 深链方案

| 项 | 方案 | 状态 |
|---|---|---|
| Scheme | `xmumdorm://<path>`，`path` **复用 Web 的既有路径** | 【建议】 |
| Universal / App Links | `https://<域名>/<path>` 同样映射 | **域名待定**（§9.1-3） |
| 权威来源 | 单一**路由表**（path → 页面 ID + 参数 schema + 栈底），代码与文档同源 | 【建议】 |

**为什么复用 Web 路径**：Web 已有约 100 条可用路径（`layoutRoutes.jsx` + `App.jsx`），后端通知的 `target.path`、广告的 `link_type`、推送的 `url` **已经产出 Web 路径** → **零后端改造**即可让通知/广告/推送的跳转全部生效。

### 5.2 深链可直达页与栈底规则

| 深链来源 | 目标页 | 栈底（back stack root） | 依据 |
|---|---|---|---|
| 系统推送（私信/接单/报名截止/课前提醒） | M-12 / S-25 / S-20 / T-02 | **广场（S-01）** | 宪法 4.4.1、4.7.6 —— **不得空栈** |
| 系统推送（公告/互动） | F-01 信箱 | **广场（S-01）** | 同上 |
| 通知 `target.path` | 对应内容页 | 广场 → F-01 → 内容页（三级） | 宪法 4.7.5：从信箱点进内容，返回应回到信箱 |
| 广告 `link_type` | S-32 → 按 `product/shop/post/region/url` 分发 | 当前 Tab | — |
| 分享链接（站外打开） | 帖子/菜品/二手/指南 详情 | 广场 | 与推送同规则 |
| 校方系统（T-05） | 不接深链 | — | 会话级能力，不进外部分发 |

**三条铁律**
1. **每个 Tab 各自独立维护返回栈**（宪法 4.4.1）；**「校园里」的两个子视图也各自独立**（宪法 4.1.1）；
2. **返回是系统级行为**：使用平台 Back API，**不得劫持** `KEYCODE_BACK`（宪法 4.4.2）；
3. **⚠️ 返回键风险未解**（宪法 4.5）：Android target 36 上存在"RN 收不到返回事件 → 系统判定退出 Activity → **App 直接关闭**"的社区实测（上游 `expo/expo#39092` 仍 open）。**本节全部返回语义都以首周真机 spike 结论为前置**，在结论出来前**不锁定实现方案**。

### 5.3 状态保持（宪法 4.4.3）

| 场景 | 要求 |
|---|---|
| 旋转 / 分屏 / 折叠屏 | UI 状态不丢；**大屏自适应是首发要求**（宪法 5.3） |
| 进程被杀 | 返回后**至少输入不丢** → P-02…P-09、T-03、T-08 为强制落盘项 |
| 模态 | **不同时叠两个模态**；任何时刻**不同时显示两个 alert**；关闭会丢内容的模态必须**先解释再给解决方式** |
| **子视图切换** | C-01 的两个子视图切换**不得丢失对方的滚动位置**（宪法 4.1.1） |

---

## 6. 覆盖核对：273 个端点 → App 表面

**这是本文件的验收证据**：每个端点要么有 App 表面，要么被**逐条登记**为"有意不带进 App"并给出判据。**没有"没人认领"的端点。**

| 路由文件 | 端点 | 有 App 表面 | ✗ | App 表面 | ✗ 的理由 |
|---|---|---|---|---|---|
| `auth.js` | 5 | **5** | 0 | A-02 / A-03 / A-04 | — |
| `users.js` | 6 | **6** | 0 | A-01 / M-01 / M-02 / M-03 / M-16 | — |
| `notifications.js` | 6 | **6** | 0 | F-01（列表/未读汇总/公告/单条已读/批量已读/清空） | — |
| `reports.js` | 1 | **1** | 0 | `ReportSheet` 组件（挂在每个内容详情页 + M-03 举报用户） | — |
| `schedule.js` | 3 | **3** | 0 | T-02（周视图）/ T-03（preview + commit） | — |
| `todos.js` | 6 | **6** | 0 | T-06 | — |
| `diary.js` | 4 | **4** | 0 | T-08 | — |
| `confessions.js` | 9 | **9** | 0 | C-01 万能墙子视图 / C-05 | — |
| `errands.js` | 6 | **6** | 0 | S-24 / S-25 / P-06 | — |
| `marketplace.js` | 15 | **15** | 0 | S-22 / S-23 / M-11 / M-12 / P-05 | — |
| `clubs.js` | 31 | **31** | 0 | S-15…S-21 / P-07 / P-08 | — |
| `posts.js` | 15 | **13** | 2 | C-01 树洞子视图 / C-02…C-04 / C-06 / P-02 | **管理员标签 CRUD 2**：全局配置，手机端无收益 |
| `square.js` | 26 | **16** | 10 | S-01…S-06 / S-32 / P-03 / P-04 | **个性化推荐 2**（`/personalized-summary`、`/recommendations`）——**所有者第三轮"先不做推荐"**；**热搜话题 CRUD 3** + **轮播投放管理 5**——运营形态 |
| `handbook.js` | 36 | **32** | 4 | S-26…S-29 / T-09 / T-10 / P-09 / M-09 / M-10 | **标签 CRUD 4**：运营配置 |
| `canteen.js` | 40 | **26** | 14 | S-07…S-14 / M-05 / M-06 | **商家端 14**（开店/店铺/分类/菜品 CRUD/上传/轮播投放）：宪法 4.2.2-3 不对齐 |
| `materials.js` | 15 | **0** | **15** | — | **⛔ M10 学习资料整体不对齐**（宪法 4.2.2-1，将来单独立项） |
| `advertisements.js` | 7 | **2** | 5 | S-32（展示 + 点击上报） | **投放管理 5**：`requireAdmin` |
| `organizations.js` | 9 | **2** | 7 | P-04（组织选择器，用 `mine` + 公开列表） | **组织 CRUD / 成员管理 7**：除 1、2 外全为站级 `role='admin'` |
| `admin.js` | 29 | **0** | **29** | — | **⛔ M06 管理后台整体不对齐**（宪法 4.2.2-2）；**所有者本轮再次确认"手机不做管理员后台"** |
| `push.js` | 4 | **0** | **4** | — | **Web Push / VAPID 专属通道，原生 App 完全不可用** → 替代方案见 §7-4 |
| **合计** | **273** | **183（67.0%）** | **90** | | 学习资料 15 + 管理后台 29 + 商家端 14 + 运营投放与全局配置 26 + Web 专属通道 4 + 推荐 2 = **90** |

### 6.1 该表的三条含义

1. **183 / 273 = 67.0% 的端点有 App 表面**，且**除 M10 与 M06 外，每个能力域都至少有一条 App 链路**；
2. **90 个无表面的端点里没有一个是"被遗漏"** —— 每一条都能指回宪法 4.2.2 的范围裁决或平台事实；
3. **真正需要"新增后端"的只有 5 项**（§7），且其中 3 项是**商店合规红线**、1 项是**推送通道**（私信/接单/提醒闭环的共同前置）。

> ⚠️ **67.0% 低于 v1.0 的 76.2%，这是范围裁决的结果而非退步**：本版主动放弃了三大块（学习资料 15、管理后台 29、商家端 14）与推荐（2）。**放弃它们正是把"1 个月"从不可行变成勉强可行的手段。**

---

## 7. 后端与前置决策清单（App 开工前必须立项）

### 7.1 五项必修（前 3 项是商店合规红线）

| # | 改造 | 为什么 App 卡在这里 | 性质 |
|---|---|---|---|
| **1** | **发帖前 ToS/用户政策门禁** + 接受状态存取端点 | Play 要求"**发布 UGC 前**必须已接受"，不是注册弹窗 | **合规红线（宪法 12.2）** |
| **2** | **屏蔽用户（block）**：表 + 端点 + 内容过滤 | 社交类明确要求；当前后端**只有管理员 ban/mute** | **合规红线（宪法 12.5）**；⚠️ 需先核对 `POST /api/reports` 的 19 种目标类型里**是否已含 `user`**（宪法 12.4 登记为"缺失"，以宪法为准） |
| **3** | **账号注销级联删除** + **网页版注销入口** | 当前仅 `status='deactivated'` 软注销；要求"应用内 + 网页两条都要" | **合规红线（宪法 12.6/12.7）** |
| **4** | **原生推送通道**：FCM / APNs + **设备令牌端点**（`device_token` + `platform` + `app_version` + `locale` + 轮换）+ 载荷契约（`deep_link` / `badge` / `sound` / `collapse_key`）+ Android 13+ `POST_NOTIFICATIONS` 与 Notification Channel；把 `sendPushToUser` 提升为**多通道分发器** | `push.js` 只有 Web Push/VAPID，表结构只有 `endpoint/p256hd/auth`，**无法表达原生 device token**；而它是**私信（M-12）、接单（S-25）、报名截止（S-20）、课前提醒（T-02）四个闭环的共同前置** | **v1 必做且必须先做（Q12）** |
| **5** | **通知偏好**（按 `category` / `module` 静音）读写端点 | 现有 6 个通知端点**只有读取与已读状态** | M-14 的前置 |

### 7.2 两项前置**决策**（不是后端改造，但同样阻塞）

| # | 事项 | 阻塞什么 | 归属 |
|---|---|---|---|
| 6 | **节假日数据源**：T-07 是**全仓唯一无后端支撑的页**（Web 用本地 `data/holidays.js`）→ 决定 App 内置打包还是后端化 | T-07 的实现方式；**内置会导致每年发版** | 所有者/架构 |
| 7 | **校方系统清单与各系统登录/会话机制**（AC / Moodle / 签到 的 URL、登录方式、是否允许内嵌） | **阻塞工具 Tab 设计**（宪法 §15.1-12） | 所有者 + 脚手架首周实测 |

### 7.3 三项可选（影响体验质量，不阻断上架）

| # | 改造 | 收益 |
|---|---|---|
| 8 | **私信增量参数**（`since` / `cursor`） | 现状服务端**无增量参数，整页最多 500 条**，全仓无 WebSocket/SSE；App 端轮询更费流量与电量 |
| 9 | **`square.js` 轮播排期字段修复** | `parseBannerBody` 不返回 `starts_at/ends_at` 却把两者写进创建/编辑端点（见 §7.4-3）→ 若不修，轮播位**不要展示排期** |
| 10 | ~~课表 HTML → 文本预处理端点~~ | **实测后不需要**（§3-T.1(2)）；**该建议撤销** |

### 7.4 本次盘点中发现的后端事实性缺陷（**登记在册，非本次任务范围**）

| # | 缺陷 | 证据 | 对 App 的影响 |
|---|---|---|---|
| 1 | **被管理员隐藏的热搜帖仍可通过直链读取与互动** | `GET /trending/posts/:id`、`POST .../comments`、`POST .../like` 只判 `deleted_at`，缺 `hidden_by_admin=0`（`square.js:354/425/467` vs `:249`） | App 从通知/分享链进入仍能看内容并互动 → **治理失效** |
| 2 | **举报处置不级联** | `PATCH /admin/reports/:id/process` 不自动封禁/禁言/删内容 | ✗ 不进 App（管理后台整体出局），记录备查 |
| 3 | **轮播排期字段写不进去** | `parseBannerBody` 不返回 `starts_at/ends_at`，但创建/编辑端点读取它（`square.js:123-137` vs `:1009-1011`、`:1056-1057`） | **S-01/S-07 轮播按后端实际行为设计**：不展示排期 |
| 4 | **`PATCH /admin/announcements/:id` 无存在性检查** | 不存在的 id 仍返回 `status:0` | ✗ 不进 App，记录备查 |
| 5 | **`GET /admin/announcements` 的 `total` 含软删行** | `list` 排除软删但计数不排除 | ✗ 不进 App，记录备查 |
| 6 | **`GET /canteen/search` 的空/超长 `q` 返回 HTTP 200 + `status:-1`** | 见 §3-S 要点 | **S-14 不得渲染为网络错误态**，须按"业务无结果"处理 |

---

## 8. 与 Web 103 页的差异（**不做逐页加减**）

Web 的 103 页与 App 的 88 页**粒度不同**，因此**不给"103 减 X 加 Y 等于 88"的等式**。有意义的是下面三类**可逐条核对**的差异。

### 8.1 被消灭（4 页）：P17 纯转发

| Web 页 | 行数 | App 处理 |
|---|---|---|
| `SquareClub.jsx` | 7 行 | 直接路由到 **S-15 社团广场** |
| `SquareErrands.jsx` | 7 行 | 直接路由到 **S-24 跑腿首页** |
| `SquareFreshmanGuide.jsx` | 7 行 | 直接路由到 **S-26 新生指南** |
| `SquareSecondHand.jsx` | 7 行 | 直接路由到 **S-22 二手首页** |

### 8.2 有意不带进 App（范围裁决）

| 组 | 页数 | 判据 |
|---|---|---|
| **M10 学习资料** | 6（`MaterialsHome/Course/Detail/Upload/Mine` + `AdminMaterials`） | 宪法 4.2.2-1：**整体不对齐**，将来单独立项 |
| **M06 管理后台** | 11 | 宪法 4.2.2-2 + 所有者本轮确认：表格/批量/审计日志是桌面形态 |
| **商家端** | 7 | 宪法 4.2.2-3：极低频 + 最重表单与上传，与"学生随手用"的交互预算冲突 |
| **运营投放** | 3（`CanteenBannerManage`、`SquareOrgAdmin`、材料管理） | 展示侧进 App（S-32），**投放管理不进** |
| **地图** | 2（`CanteenArea`、`AboutUs`） | **所有者第三轮"先不做地图"** |

### 8.3 App 新增或提升为独立目的地

| 类型 | 页 | 说明 |
|---|---|---|
| **校方系统（Web 完全没有）** | T-03 / T-04 / T-05 | 所有者指定为本 App 最主要功能 |
| **合规必需（Web 无对应页）** | A-05 合规门禁、A-06 通知权限引导、A-07 账号受限说明、M-14 通知与推送设置、M-15 屏蔽用户管理、M-16 账号注销 | Web 不需要（无推送权限、无注销红线要求） |
| **Web 用页内区块承担、App 提升为独立页** | M-11 私信会话列表（Web 在详情页内）、S-28/S-29 清单（Web 无独立页）、B 类"顶部内容条"提升为 **S-02/S-05 两个独立页** | 提升理由是**返回栈语义**：App 上"从列表点进详情"必须是一次可返回的转场 |
| **Web 多页合并** | M-17 + M-23（Web 是 `AboutProfile` + `AboutAlgorithm` + `AboutLevelAlgorithm` 三页）、M-05（Web `MyReviews` 与食堂"我的点评"两处同构） | 合并理由是**同构页必须参数化**（宪法 9.2） |

---

## 9. 待决事项、风险与验收

### 9.1 仍需所有者拍板（**唯一入口是 [TO-CONFIRM.md](../TO-CONFIRM.md)**）

> **本节只登记索引**：完整的问题、选项、我的建议与"不定下来的后果"在 [TO-CONFIRM](../TO-CONFIRM.md)。⛔ **不在此处另写一份清单**（否则两处必然不同步）。

| # | 待决 | 影响 | TO-CONFIRM |
|---|---|---|---|
| 1 | **宪法 v1.3 草案的批准** | **阻塞开工**（最高优先级） | C-01 |
| 2 | **开发者账号类型**（个人 vs 组织） | 个人账号需 ≥12 名测试者连续 14 天封闭测试 → **决定"1 个月"是否可行** | C-02 |
| 3 | **广场的二级 Tab 集合**（含热搜/校园此刻归宿） | 广场骨架 | C-03 |
| 4 | **工具的二级 Tab 集合** + 校方系统的 URL 与登录机制 | **阻塞工具 Tab 设计**（宪法 15.1-12） | C-04 |
| 5 | **「我的」是否用二级 Tab**；详情页是否保留顶栏信箱动作 | 我的 Tab 结构 / 顶栏口径 | C-05 / C-06 |
| 6 | **实时私聊**的归属与通道 | 私信闭环（M-11/M-12） | C-07 |
| 7 | **拼车 / 问答**是否进 v1.0 | 发布中心条目与后端立项 | C-08 |
| 8 | **宪法 4.2.1 的 8 个「待归位项」** 是否按机械落位规则执行（**已不阻塞**） | 已由 §1.2 落位 | C-09 |
| 9 | **HTTP/Universal Link 域名** | 深链（§5.1）的 `https://` 侧无法定稿 | C-11 |
| 10 | **首发范围是否压缩** | 个人账号 + 零缓冲时，**唯一可压缩项就是首发范围** | C-10 |
| 11 | 图标三处备选二选一 + `shield-ban` / `user-x` 语义分叉（宪法 16.8） | 图标与产品形态、语义分叉 | C-15 |
| 12 | 品牌色是否反向统一 Web；语言集合；无障碍等级；`runtimeVersion`；节假日数据源 | 各项不阻塞，但定得越早越省返工 | C-12…C-17 |

### 9.2 风险（按严重度）

| 风险 | 内容 | 处置 |
|---|---|---|
| **R1（阻塞级）** | Android target 36 上**返回键可能直接退出 App**（宪法 4.5） | **首周真机 spike**；结论出来前**不锁定返回栈实现** |
| **R2（阻塞级）** | **原生 Tab 在 SDK 57 上只有 `unstable-` 入口**（计划 §7.3）；且本轮多了**动作型格位**（第 5 格"点了不切页"）的实现要求（宪法 4.9.9） | 首周三选一定案；**不得退回自绘 Tab 栏**；若做不到"动作型格位"，退路是**四格 + 发布 FAB** 并请所有者重新裁决 |
| **R3（功能级）** | **校方系统 7 项【待核实】**：若不允许 WebView 内嵌或登录含强二次验证，**"本 App 最主要功能"可能立不住** | 首周真机 spike；结论可能触发本文件与工具 Tab 的整体返工 |
| **R4（范围级）** | **81 页首发仍是激进目标**（工具 Tab 带来一整块新能力） | 依赖宪法 9.5"首个纵向切片先消费组件库"；必要时按 TO-CONFIRM C-10 压缩 |
| **R5（闭环级）** | 私信/接单/报名/课前提醒**全部依赖 §7-4 的原生推送** | 推送通道必须**先于**这些页面开工（[实时私聊调研](../research/App实时私聊调研-技术难度与服务器开销.md)：**实时通道只能提升在场体验，可达性靠推送**） |
| **R6（合规级）** | 3 条商店红线**都需后端先动**；另有 **App Store 4.2** 对"网页封装"的拒审风险 | 红线与 §7-4 **与 W2 并行**，不要排 W4；4.2 风险靠 §2.4(3) 的边界与 §3-T.1(4) 的两条设计约束化解 |
| **R7（新增·安全区）** | **不同机型 safe area 处理不当**会在挖孔/三键导航/横屏/键盘机型上直接破版（所有者第三轮点名） | 宪法**第 17 条**（八条铁律）+ [骨架规范 §6](../design/App页面骨架与布局规范.md) 的 **10 项机型矩阵**；[TODO TD-32](../TODO.md) |

### 9.3 验收门（本文件如何被判合格）

| 门 | 判据 | 现状 |
|---|---|---|
| **G1 全部页面命中原型** | 88 页 100% 命中 P1–P18 或"非原型"；**无"自造样式"页** | ✅ §4（P18 为建议新增，待评审） |
| **G2 无孤立端点** | 273 端点全部有 App 表面或 ✗ 理由 | ✅ §6（183 / 90） |
| **G3 深链与返回栈语义明确** | 每个深链来源有栈底规则；**子视图各自独立** | ✅ §5（**受 R1 前置**） |
| **G4 P17 被消灭且禁止新增** | 4 个转发页合并入目标页 | ✅ §8.1 |
| **G5 三处收纳穷举且无第四处 + 两类全局入口各自唯一** | 广场 / 工具 / 我的；**信箱（顶栏）与发布（第 5 格）各自只此一处**；⛔ 无第二个发布入口、顶栏无第二个动作 | ✅ §2.3（FAB 删除登记为 D-5） |
| **G6 三条不变量落地为可判规则** | 万能墙匿名（作者组件分离）；校方系统凭据（不经手、不自动化）；**工具 Tab 的 web/native 边界（只有三个校方系统是网页）** | ✅ §2.4 |
| **G7 每页声明原型与范围层** | `原型` 与 `层` 两列无空缺 | ✅ §3 |
| **G8 骨架符合宪法 v1.3** | 五格底栏 · 二级导航＝顶部 Tab（⛔ 无宫格入口页）· 发布入口唯一 · 安全区铁律未被违反 | ✅ §2.1／§2.5（D-1…D-6 登记为开发期重切） |

### 9.4 下一步

1. **所有者拍板 [TO-CONFIRM](../TO-CONFIRM.md)**（最高优先级：**C-01 批准宪法**、**C-02 账号类型**、**C-03/C-04 二级 Tab 集合与校方系统 URL**）→ 本文件定稿；
2. **首周 spike 闭合 R1/R2/R3/R7**（返回键、原生 Tab 与动作型格位、校方系统内嵌与会话、安全区机型矩阵）；
3. 本文件骨架已定（§2.1），可进入**设计阶段第 5 件（任务拆解）**，按其分区切片，**每片一个写作用域**；
4. 三条合规链路 + §7-4 推送通道 + 校方系统 spike **立即立项**，不要等 W4；
5. **D-1…D-6 与 §3 的重切在开发期逐页确认**，确认一页回写一页（宪法 15.4-3）。

### 9.5 本文件的边界

1. **不做视觉设计**（配色、字阶、圆角、动效在[风格体系](../design/App前端风格体系.md)与[令牌规范](../design/App设计令牌规范.md)）；
2. **不做组件契约**（在[组件类型定义](../design/App组件类型定义.md)）；
3. **不承诺排期**；
4. **不冻结页面级布局**（所有者 2026-10-02；见 §1.3 与[骨架规范 §7](../design/App页面骨架与布局规范.md)）—— §3 是方向性清单，不是施工图；
5. **`【建议】` 一律不等于已批准** —— 第 4 件的验收门是"全部页面命中原型"，**范围裁决权在所有者**。



