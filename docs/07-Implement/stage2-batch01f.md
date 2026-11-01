# Stage 2 Batch 01F — 学生端真实数据接入与管理员收尾

结论：**STAGE 2 VERIFIED（本轮本地隔离环境验收范围）**。

学生广场已经读取真实 MySQL 对应的公开 API，不再用 Mock 帖子作为首页内容。保留原轮播、公共布局、分类头像、三行预览、横向图片、大图预览和独立详情结构。管理员端补齐学院筛选，没有重写已验收的发布流程。

## 1. 学生端实现与文件

| 文件 | 本轮职责 |
| --- | --- |
| [SquareHome.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/pages/SquareHome.jsx) | 将首页 `campusNewsDemo` 数据入口替换为真实数据容器；原轮播组件与数据模式不变 |
| [CampusNewsRemote.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNewsRemote.jsx)（新增） | 分类、全部/相关、分页、加载、空数据、错误和重试 |
| [campusNewsApi.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/campusNewsApi.js)（新增） | 复用 shared requestRaw；只调用学生公开接口及旧校园只读详情，不使用管理员接口 |
| [campusNewsModel.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/campusNewsModel.js) | 独立真实数据适配：数字 ID、稳定学院 ID、目录名称、真实图片 URL、发布时间；拒绝隐藏/删除/非发布及未补录受众 |
| [CampusNewsFeed.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNewsFeed.jsx) | 使用正式详情路径；还有后续分页时不显示“没有更多” |
| [CampusNewsCard.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNewsCard.jsx) | 目录标签显示；真实帖子不使用临时模拟互动和假计数 |
| [CampusNewsDetail.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNewsDetail.jsx) | 真实详情加载、错误、完整正文和图片；不显示模拟评论；开发预览保持隔离，生产不展示 Mock 详情 |
| [CampusNewsRoute.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNewsRoute.jsx)（新增） | 原 `/about/campus/:id` 的来源分流：旧组织帖仍使用原详情及互动 UI，新管理员快讯使用新版详情 |
| [layoutRoutes.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/routes/layoutRoutes.jsx) | 保持正式 URL，只将其组件接到兼容分流层 |
| [CampusNews.css](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/campus-news/CampusNews.css) | 仅新增快讯筛选、分页和错误控件样式，不修改公共响应式规则 |

原图片组件、图片查看器、Mock 数据文件、顶栏、左导航、右侧栏及树洞未修改。首页仍保留本地 Banner 演示/原 API 切换；该标识仅指轮播来源，**下方帖子始终来自真实 API**。

## 2. API、学院与排序契约

学生请求：

- `GET /api/campus-news?category=&related=0|1&page=&pageSize=`：默认全部可见内容；学生 UI 每页 10 条。
- `GET /api/campus-news/context`：统一学院目录及服务端确认的当前学生匹配学院 ID。不会返回原始资料文本。
- `GET /api/campus-news/:id`：登录、有效账号、发布且未隐藏/删除的内容。
- 原 `GET /api/square/campus-posts/:id`：用于兼容分流和旧详情；新增非破坏性来源元数据，继续经过可见性门禁。

后台列表新增 `collegeId` 参数，与 search/category/status/page 组合。它筛选“指定该学院”的受众，包含多学院帖子，不将全体通知混入选定学院结果。未选择学院时不限制受众。

后端调整文件：

- [domain.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/services/campusNews/domain.js)：筛选参数校验。
- [repository.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/services/campusNews/repository.js)：参数化学院查询、相关性过滤、稳定排序。
- [service.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/services/campusNews/service.js)：当前用户校验、公开目录上下文、服务端相关性判定。
- [collegeIdentity.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/services/campusNews/collegeIdentity.js)（新增）：显式资料别名到稳定 ID 的边界。正式映射为空；只有隔离模式启用明确的测试别名。
- [campusNews.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/routes/campusNews.js)：新增学生 context 路由，放在动态 ID 前。
- [square.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/routes/square.js)：旧详情返回 source_kind/category 元数据；不改变旧组织发布权限。

“与我相关”在 SQL 中采用 `audience_scope='all' OR audience关联匹配`。学院来源由数据库当前资料及显式映射决定，学生不能提交 collegeId 冒充所属学院。学院未知、未映射或目录已停用时，相关筛选只显示全体通知。全部列表与详情不限制学院阅读。

正式学院目录尚未确认，没有导入猜测数据。`[STAGE2 TEST] college-a/b` 只在 Stage 2 隔离标志开启时映射到现有两个测试学院；普通中文名称、显示名称、原始数据库 ID 均不自动转为可信学院身份。正式环境不会使用该测试映射。

排序：历史 `source_kind=legacy` 始终使用原 created_at；新快讯使用 published_at，缺失时明确回退 created_at；同时间按 id DESC。真实测试将历史帖16的 created_at 设为2020年、published_at设为2025年，补录后仍按2020年排在最后。SQL及前端展示时间一致，未根据 feed_tab 推断分类或受众。

## 3. 可见性与历史兼容结果

实际连接始终为 `127.0.0.1:3306 / xmumdorm_stage2_dev / xmumdorm_dev@localhost`，MySQL 8.0.46。执行前后均核对身份、21条 applied 账本及完整批准结构契约。

| 验证 | 实际结果 |
| --- | --- |
| 全部公开列表、三种分类 | HTTP 200，分类结果全部匹配；不同学院内容在全部列表仍可读 |
| 学院未知、直接填写原始学院 ID | 相关列表只包含全体通知 |
| 明确测试映射学院 A | 相关列表包含 A 及多学院通知，排除仅 B 通知 |
| 管理列表学院 A + lecture + published | HTTP 200，结果均同时符合三项条件 |
| 分页 | 两个真实分页无重复；浏览器实际进入第二页并读取历史帖 |
| 已发布编辑 | HTTP 200；ID保留，学生刷新读取新标题 |
| 撤回、隐藏 | 管理操作200；学生新详情和旧API均404，列表移除；浏览器刷新不显示正文 |
| 重新发布、解除隐藏 | 原ID保留、生命周期按规则处理；学生重试恢复读取 |
| 软删除 | 新详情和旧API均404，浏览器直接打开正式URL亦不可读；未恢复 |
| 未登录读取新快讯 | 新API与旧API均401；浏览器进入登录页，不展示正文 |
| 未分类历史帖 | 补录前不在新流；最终保留未补录帖18供后续回归 |
| 历史人工补录 | 帖16、17仍为legacy，ID/作者/组织/时间/原URL不变；保留baseline r0及补录r1 |
| 原图片、点赞、评论 | 帖17保留1条旧图片关系、1次点赞、评论ID1；旧详情API返回对应图片与计数 |
| 旧组织发布 | 真实使用既有组织成员账号调用原API成功；浏览器原发布表单、组织选择、school/college入口及三图提示保留 |

新增测试内容ID：8–15为管理员快讯；16为回溯时间测试历史帖；17为旧图片互动兼容帖；18为保留未补录历史帖。14、15作为软删除用例保留；8最终重新发布且解除隐藏；3通过本轮浏览器发布后为published/r5。没有删除测试数据、版本、审计或图片。

最终只读快照：3个测试用户、2个测试学院、17条校园帖子、60个版本、60条快讯审计、13条新图片资产、12条当前新图片关系、1条旧图片关系、1条旧点赞、1条旧评论。测试管理员1和3均恢复admin，两个学院均启用。学生2保留明确的测试学院A资料标记用于后续联调。

补录过程中没有改变feed_tab、组织、作者或互动关联，也没有新DDL、历史生产回填或迁移账本写入。

## 4. 管理员收尾文件与结果

修改：[CampusNewsList.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/admin-campus-news/CampusNewsList.jsx)、[CampusNewsEditor.jsx](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/admin-campus-news/CampusNewsEditor.jsx)、[apiClient.js](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/admin-campus-news/apiClient.js)、[contracts.d.ts](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/frontend/src/features/admin-campus-news/contracts.d.ts)。分别用于学院筛选与目录失败重试、校正已接入提示、保留后端明确的失败原因、补充筛选类型。没有重写编辑器或后台外壳。

| 浏览器验收 | 结果与边界 |
| --- | --- |
| 学院/分类/状态组合 | PASS，结果为真实对应快讯 |
| 空数据 | PASS，使用不存在的标题搜索显示空状态 |
| 请求失败 | PASS，短暂停止经进程路径核验的隔离后端，页面显示请求失败500并阻断编辑；原入口恢复后焦点重新查询恢复页面 |
| 403 | PASS，暂时撤销测试管理员1角色，页面显示当前管理员权限失效；测试后恢复 |
| 401 | PASS，另一页正常退出会话后，旧编辑页保存显示管理员身份失效，没有成功提示 |
| 409及恢复 | PASS，两页持有r3，第一次保存到r4，第二次冲突并禁用写入；重试读取胜出标题与r4 |
| 图片上传失败 | PASS，真实伪装PNG被服务端拒绝，显示失败并仍为未上传；没有新增资产 |
| 发布失败 | PASS，临时停用测试学院B，前端识别失效学院阻止发布，r3未改变，没有发送成功提示；学院已恢复。这项是前端阻止，并非浏览器发出的400发布请求 |
| 浏览器实际发布 | PASS，恢复学院及有效会话后，从现有后台发布帖3，r4→r5 |

没有将离线时未发出的写入请求当作服务端事务失败测试；故障时身份复核门禁先阻断操作。数据库事务回滚的真实验证继承01E，本轮未新增故障触发器或数据库结构。

## 5. 真实浏览器学生闭环与响应式

使用现有登录页面、现有测试账号和正常退出，不注入会话令牌：

1. 管理员在原编辑器发布帖3。
2. 退出管理员，用学生2正常登录。
3. 广场真实列表出现刚发布标题，点击进入 `/about/campus/3`。
4. 刷新后标题、完整正文、受众仍存在。

另外实际验证分类、相关性、分页、正式详情、真实图片加载、大图打开关闭且不误跳详情、管理员编辑后学生刷新、撤回/重发/隐藏后的学生读取结果，以及已删除URL与匿名访问门禁。多图横向组件未改写。API操作与浏览器观察分别记录，未将接口结果冒充所有浏览器动作。

| 尺寸 | 实际只读测量 |
| --- | --- |
| 1440px桌面 | 管理页文档宽1440、筛选容器1162，无额外横向溢出；学生保留原公共三栏 |
| 390px移动 | 学生文档宽390、信息流375；详情内容scrollWidth/clientWidth均375；管理文档375、筛选容器341，筛选正常换行 |

临时视口覆盖已复原。公共布局原有“较窄时右栏移动到下方”的行为保持不变。没有进行所有中间断点、真实手机触摸、触控板或所有无障碍组合的穷尽测试；这些不能由两种尺寸结果推断全部通过。

截图和无敏感值的浏览器记录在 `.local/stage2/integration-01f/`，包括 student-final-desktop.png、student-mobile.png、admin-filters-desktop.png、admin-empty-mobile.png、admin-401.png、admin-403.png、admin-offline.png、admin-upload-failed.png、admin-publish-failed.png、browser-results.json。

## 6. 检查、工具与重现边界

- 新增 [campus-news-student.test.cjs](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/tests/campus-news-student.test.cjs)：5项针对可信学院映射、服务端相关性、参数化组合筛选、历史排序和真实展示边界的测试。
- 连同已有测试，**110/110**通过。属于纯内存/静态/路由定向回归，不等同于110个真实MySQL测试。
- 前端目录下定向ESLint通过；管理员contracts.d.ts声明类型检查通过；语法和git diff --check通过。
- [build-check-01f.mjs](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/scripts/stage2-local/build-check-01f.mjs)（新增）：复用隔离Web别名，禁用原Vite配置/env、清除继承VITE变量、禁止网络，在内存进行production模式编译。2874模块、177输出通过，没有写入正式dist、启动服务或部署。现有Shop静态/动态导入分包警告仍存在。
- [integration-01f.cjs](D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ/scripts/stage2-local/integration-01f.cjs)（新增）：仅显式命令执行，固定本地目标与批准schema哈希。包含fixtures、verify、finish、browser-step、legacy-compat写入测试模式和只读snapshot。它不是常规启动依赖，不应随意重复运行写入模式。
- 真实HTTP/数据库结果、测试ID与最终结构记录位于 `.local/stage2/integration-01f/results.json`、fixtures.json、final-snapshot.json。记录不包含密码或会话令牌；秘密仍由既有忽略配置与01E测试凭据提供。
- 测试脚本初次遇到登录响应外层令牌、UTC日期和旧图片URL解析假设问题，均在脚本中校正，没有改动数据库契约来迎合测试。原始通过条件按真实接口和旧解析规则核对。

## 7. 未解决事项与明确限制

1. **正式学院目录及资料映射待团队确认。**没有猜测导入；正式映射未配置时相关筛选安全回退全体通知。测试学院不作为正式目录交付。
2. 新快讯点赞、收藏、评论提交和分享仍未接入。本轮真实页面禁用相应操作，不显示模拟成功或虚构评论；旧组织详情继续保留原互动入口与数据，但隔离环境原有互动写入503边界未解除。
3. 历史测试帖17使用一个特意保留的旧图片路径，旧解析器输出 `/uploads/default-avatar.svg`；本地没有该旧对象。验证的是记录与引用不被补录改写，不宣称其文件可加载。新快讯真实本地图片和放大查看已验证；生产旧对象未访问。信息流现有图片失败降级保留。
4. 轮播仍可使用明确标记的本地演示图片；正式轮播API逻辑未替换，不代表帖子仍为Mock。
5. 不包含全站生产联调、生产旧图片验证、全部慢网/加载动画/触控/无障碍场景或全部浏览器。应用网络限制不是操作系统防火墙。原全站响应式技术债不在此轮修改范围。

## 8. Git完整性与停止位置

开发前后均对原始 `git diff --cached --binary` 字节计算SHA-256：

```
before = c86f64a531f86c11f36cd11323b575deb172c4dc3ce2676f5e384cfab7753894
after  = c86f64a531f86c11f36cd11323b575deb172c4dc3ce2676f5e384cfab7753894
```

- 分支始终为 `dev-gjl`。
- HEAD始终为 `6a8b8d1b4e9d3c63d5e6163493448027e9b5c427`。
- 暂存区仍为原23文件、806新增、73删除，完整差异逐字一致。
- Stage1相关文件显示AM/MM，表示原暂存版本保留、新修改在工作区，并不表示已重新暂存。
- 原有server.js未暂存差异与开工基线逐字一致；原App、导航、中间件等前轮改动、未跟踪文件和Word文档保留。
- 本轮所有修改均未暂存，没有执行任何Git写命令、切换分支、提交、推送或部署。
- 配置、测试凭据、测试结果与图片仍被Git忽略。

新增本报告；不修改上一轮报告。保留本地服务与必要测试数据，已停止在本轮验收处。
