# Stage 2 Batch 01C / 01C-E — 候选迁移与实施审批基线

日期：2026-10-28。分支：dev-gjl。当前结论：**READY FOR MIGRATION APPROVAL**。

含义：代码、候选结构和无数据库写入的验证已达到提交用户审核的状态；尚未批准执行。
本轮未连接数据库、未执行真实 DDL/DML、未写迁移账本、未创建账号、未导入学院/词库/制裁记录、未上传文件，也未启动或停止服务。

## 1. 修复前问题与本轮修复

| 已确认问题 | 本轮处理 | 可复核位置 |
| --- | --- | --- |
| 完整 applied 账本与实际结构可能不一致，执行器误报成功 | 核对完整元数据；跳过前、每条 DDL 后、最终成功前验证累计结构 | scripts/stage2-db/migrate.cjs、schema.cjs |
| started → applied 更新未检查影响行数 | INSERT/UPDATE 均要求 affectedRows=1；UPDATE 限定原状态与语句哈希 | migrate.cjs |
| 旧校园制裁/敏感词查询失败后放行 | 校园专用严格中间件返回503；有效空结果与失败分开；严格词库每次查询，不复用故障时的旧缓存 | middleware/checkSanction.js、sensitiveWordFilter.js |
| 旧组织 multipart 文本在解析前过滤 | 校园文本过滤移到内存解析之后、业务写入之前 | routes/square.js |
| 旧带图上传可能先插入再失败 | 隔离模式在内存解析后、INSERT及远程上传前拒绝带图请求 | http-boundary.cjs、routes/square.js |
| 本地通知/举报/其他后台缺表后失败或降级 | 本地 API 入口白名单在认证和业务处理前阻断未就绪功能，返回503 | server.js、http-boundary.cjs |

没有重新设计快讯业务、重写管理员前端或增加角色/授权体系。

## 2. 修改文件与影响范围

- scripts/stage2-db/migrate.cjs：迁移协议、结构验证时机、累计账本前缀检查、影响行数、批准哈希。
- scripts/stage2-db/schema.cjs（新增）：受限 DDL 编译、累计结构契约、information_schema 读取与校验。
- migrations/stage2/003_campus_safety.sql（新增）：两张最小安全依赖表，无数据种子。
- middleware/checkSanction.js：新增 checkCampusSanction；原 checkBan/checkMute/checkSanction 调用方式保留。
- middleware/sensitiveWordFilter.js：新增 strict 入口；原默认入口及 refreshCache/getSensitiveWords/checkText 保留。
- routes/square.js：仅校园发布、评论/回复改用严格检查；组织成员、等级、组织类型与 legacy/published 写入规则保留。
- scripts/stage2-local/http-boundary.cjs（新增）：本地功能白名单和旧带图发布拒绝门禁。
- server.js：仅 STAGE2_LOCAL_ISOLATED=1 时安装本地门禁；先前禁用后台任务等改动保留。
- tests/campus-news.test.cjs：候选数量更新，移除不能证明实表存在的旧 no-op 测试。
- tests/stage2-migration.test.cjs（新增）：28项迁移/结构测试。
- tests/campus-safety.test.cjs（新增）：29项安全检查、实际旧路由、隔离入口测试。
- 本报告：更新审批范围、哈希、测试证据和运行边界。

本轮没有修改前端业务页面、Stage 1 的23个暂存文件、现有两份SQL、共享数据库连接配置、凭证文件、Vite代理、网络封锁或原对象存储禁用逻辑。

严格检查只在校园写入口显式使用。树洞、社团、食堂、跑腿、资料等复用者的原策略未在本轮全面修改；其原有失败放行行为仍属于独立技术债。
在隔离环境中，这些非目标业务API由入口白名单阻断，不能据此宣称生产全站安全策略已统一。

## 3. 实际数据库事实与本轮验证边界

上轮只读实测：127.0.0.1:3306，xmumdorm_stage2_dev，xmumdorm_dev@localhost，MySQL 8.0.46，服务器 enchanted；库为空。
授权为全局USAGE及仅开发库上的ALL PRIVILEGES。本轮没有重新连接数据库；执行前必须再次只读确认。

数据库凭证仅由隔离连接程序在未来获批连接时消费，不进入源码、计划或日志；不读取原有dotenv文件。
不把应用层网络限制描述为操作系统防火墙。

## 4. 最终候选 SQL 清单

| 文件 | 结构语句 | 创建/修改对象 |
| --- | --- | --- |
| migrations/stage2/001_local_foundation.sql | 11条CREATE | users、audit_logs、exp_logs、user_exp_daily、user_terms_acceptances、organizations、organization_memberships、campus_posts、campus_post_images、campus_post_likes、campus_post_comments |
| migrations/stage2/002_campus_news.sql | 1条ALTER + 7条CREATE | 扩展campus_posts；创建colleges、campus_post_audiences、campus_news_assets、campus_news_images、campus_news_versions、campus_news_version_assets、campus_news_audit |
| migrations/stage2/003_campus_safety.sql | 2条CREATE | user_sanctions、sensitive_words |

合计：21条业务结构语句，创建20张业务/依赖表，修改campus_posts一次。
再加执行器账本：共21张表；首次成功空库执行共22条DDL（21条CREATE、1条ALTER）。

003字段来自现有056迁移的两张安全表，保持原接口契约，没有复制reports、system_configs或任何INSERT种子语句。

- user_sanctions：BIGINT UNSIGNED主键及用户/操作人标识；ban/mute；时长、原因、起止时间、撤销人及时间；用户、活跃状态、操作人索引。
- sensitive_words：BIGINT UNSIGNED主键；VARCHAR(128)唯一词；分类默认general、enabled默认1、创建人及创建时间。
- 两张表均InnoDB、utf8mb4、utf8mb4_unicode_ci；均不新增FK，保持原删除语义。
- 成功查询空制裁表或空词库是有效业务状态；缺表、连接失败和无效查询结果在严格校园入口返回503。
- 不导入任何真实制裁记录、敏感词、用户、学院或历史帖子。

### 保留的字段与产品规则

- campus_posts保留原有有符号INT ID、author_user_id、组织、原始创建时间、隐藏和删除字段。
- organization_id、feed_tab在002中改为可空；新管理员快讯无须伪造组织。
- content升为MEDIUMTEXT，服务端和前端均最多50000个JavaScript字符；标题VARCHAR(200)。
- source_kind默认legacy、lifecycle_status默认published仅用于兼容；旧/新入口必须显式写来源和状态，默认值不授予权限。
- category、audience_scope默认NULL；未人工补录的历史记录不会进入新快讯流。
- revision默认0；新建快讯显式写1；历史首次补录在同一事务保留baseline r0及新r1。
- 现有管理员共同管理，无新增权限表/编辑角色/审批流程。每个管理请求复查数据库角色和状态，写事务再次持锁复查。
- 保存已发布修改立即生效；撤回编辑保持撤回；重新发布保留ID；软删除没有恢复入口。
- 业务、版本、历史图片引用、可靠审计在同一事务提交。审计失败回滚。
- 学院只用于相关性筛选；所有正常发布内容可供有效登录学生阅读，受众不作为阅读权限。
- 历史人工补录只修改分类及受众，不改作者/组织、图片、创建时间或隐藏/撤回状态；软删除记录拒绝修改。
- 历史排序采用COALESCE(published_at,created_at)、id，不用补录时间排序。

## 5. 外键审批与删除语义

003不新增FK。全部业务FK仍为18条：基础11条CASCADE、快讯新增7条；未修改原作者和组织FK。
所有ON UPDATE均未显式指定，采用MySQL默认NO ACTION（InnoDB下与RESTRICT等价）。

| FK范围 | ON DELETE | 影响 |
| --- | --- | --- |
| exp_logs/user_exp_daily/user_terms_acceptances → users | CASCADE | 保留原经验/条款关联删除 |
| organization_memberships → organizations/users | CASCADE | 保留原组织成员关系删除 |
| campus_posts → organizations/users | CASCADE | 保留原当前文章删除；不改为RESTRICT |
| campus_post_images/campus_post_likes → campus_posts | CASCADE | 删除当前旧关系，不自动删除文件 |
| campus_post_comments → campus_posts/父评论 | CASCADE | 删除当前评论及回复 |
| campus_post_audiences → campus_posts | CASCADE | 只清除当前受众关系 |
| campus_post_audiences → colleges | RESTRICT | 阻止删除被引用学院，需单独批准 |
| campus_news_images → campus_posts | CASCADE | 只清除当前图片关系 |
| campus_news_images → campus_news_assets | RESTRICT | 保护当前资产引用，需单独批准 |
| campus_news_version_assets → versions/assets | RESTRICT | 保护历史版本及图片，需单独批准 |
| campus_news_audit → versions | RESTRICT | 保护审计对应版本，需单独批准 |

版本对当前文章、作者、组织不设FK；操作人和上传人ID也不设用户FK，避免旧CASCADE抹除历史证据。
原账号或组织物理删除仍可能删除当前校园行及当前关系；版本、资产和新审计不随之级联删除。
保护当前文章不受原级联删除影响需要单独批准全站删除策略，本轮没有改变该决策。
历史版本不可变由只追加业务接口及引用保护保证，不是对具有ALL权限的人工SQL提供防篡改保证。

## 6. 批准计划哈希与账本范围

新的SHA-256：

`868c8889fd742f70797436ce431fc6f45b57aac58a9a37d5ec5b7103ee230e0d`

旧19条计划哈希已作废，不能用于本次执行。
新哈希绑定三份SQL及顺序、逐条语句哈希、完整结构契约、账本CREATE/INSERT/UPDATE模板、执行器/结构验证器/连接守卫/网络守卫源码哈希。
账本结构及写入不再游离在计划哈希之外。后续这些候选内容任一变化均须重新计算并审批。

账本名称：stage2_schema_migrations。独立DDL包含：

- file_name VARCHAR(100) NOT NULL。
- statement_index INT NOT NULL（文件内0起始编号）。
- sha256 CHAR(64) NOT NULL。
- state ENUM('started','applied') NOT NULL。
- applied_at DATETIME NULL。
- 联合主键(file_name,statement_index)。
- InnoDB、utf8mb4、utf8mb4_unicode_ci；无FK。

首次完整成功执行预计账本DML：21次INSERT started，21次UPDATE applied；不写其他业务数据。
UPDATE限定文件、编号、语句哈希和原started状态，必须affectedRows=1；INSERT也必须affectedRows=1。
已完成结构及账本完全一致时重复执行为只读核对，不重建表或新增账本行。

## 7. 执行器结构后置条件与失败恢复

默认命令只生成离线计划，不读取凭证或连接数据库；--apply与精确--approved-plan仅能在用户单独批准后使用。
本轮没有运行真实执行路径。普通server/dev/独立前后端启动不调用迁移。

执行器先校验固定TCP目标127.0.0.1:3306、库xmumdorm_stage2_dev、用户xmumdorm_dev。
拒绝高优先级连接串、错误目标、socket/stream、数据库集群和多语句连接；不加载dotenv。
连接后核对DATABASE、CURRENT_USER、端口及MySQL8；要求会话foreign_key_checks=1、explicit_defaults_for_timestamp=1。
会话条件不满足时拒绝，不自动SET变量；空库才允许首次执行，已有结构必须有可信连续账本。
GET_LOCK仅提供执行器互斥，不能替代结构验证；关闭连接前释放。

### 校验内容

- 表集合、BASE TABLE类型、InnoDB、表排序规则；拒绝未知表或视图。
- 全部声明列的存在、类型、unsigned、可空性、默认值、自增、ON UPDATE、字符集和排序规则；拒绝未知列或未批准的生成/隐藏列。
- 全部声明索引、唯一约束、列顺序、BTREE、可见性、完整索引而非前缀索引。
- FK子列、父库/父表/父列、列顺序、ON DELETE/ON UPDATE；拒绝跨库FK和额外FK。
- 新十图CHECK及其ENFORCED状态；只接受已支持的简单CHECK语法。
- 拒绝候选之外的数据库触发器、存储例程和事件。
- 外键所需自动生成索引按功能核对，允许引擎生成名称；显式命名索引必须匹配，额外非FK支持索引拒绝。
- 数字显示宽度、CURRENT_TIMESTAMP()元数据格式及InnoDB等价NO ACTION/RESTRICT会规范化比较；枚举值大小写保留。

受限DDL编译器从审核SQL生成每个累计步骤的结构契约，不使用简单表名白名单替代元数据验证。
它只支持当前明确语法；无法识别的列/约束/DDL在生成计划时就失败，不静默忽略。
后续ALTER合法覆盖早期CREATE定义，所以已执行步骤按累计前缀验证，不拿最终结构错误地校验尚未ALTER的表。

### 停止与恢复

1. 先验证账本自身结构，再读取账本；账本必须是无重复、无缺口、哈希匹配且带applied_at的连续applied前缀。
2. 任何started、未知账本行、哈希变化或实际结构漂移都在继续DDL/DML之前停止。
3. 每条DDL前写started；DDL成功后先检查累计实际结构，再写applied。
4. 最终重新检查完整账本和全部目标结构，通过后才允许报告成功。
5. 缺表/缺列/类型/默认值/索引/FK/CHECK等不一致返回SCHEMA_MISMATCH，明确要求人工核对；不自动补建、DROP或修账本。
6. MySQL DDL隐式提交；DDL成功而进程中断或账本更新失败时，结构可能已经存在，账本保留started并禁止盲目重跑。
7. 先以SHOW/SELECT确认实际结构，再单独批准结构或账本修复；不把started直接改成applied当作通用恢复方法。

## 8. 本地隔离功能边界

server.js只在STAGE2_LOCAL_ISOLATED=1时，在认证/正文解析/业务路由之前安装本地门禁。普通运行模式不安装。
入口仅开放新快讯API、必要登录和个人身份/条款接口、组织成员查询及受限旧校园读取/无图发布。
其他API明确返回HTTP503、status=-1和STAGE2_FUNCTION_UNAVAILABLE，不伪造空结果或成功。

| 功能 | 当前本地行为 |
| --- | --- |
| 新快讯管理与专属图片 | 获批结构及测试数据之后才可真实联调；保留当前管理员数据库校验 |
| GET /api/users/me、条款查询/接受 | 结构清单已覆盖，仍需真实有效账号和JWT |
| POST /api/auth/login | 复用原认证，仍需用户单独批准本地测试数据；不自动创建账号 |
| GET /api/organizations/me | 可读取已有组织成员；本轮无种子数据 |
| 旧校园列表、详情、评论列表 | 可读路径保留；仍执行生命周期和隐藏/删除门禁 |
| 旧组织无图发布 | 原组织权限不变；安全表必须真实可查询；multipart字段解析后执行文本过滤 |
| 旧组织带图发布 | 503，在Multer内存解析之后、文章INSERT和对象上传之前拒绝；无图记录不会因此残留 |
| 旧评论/回复、点赞写入 | 本地入口503，业务处理前拒绝；通知依赖尚未具备，不做部分互动后再吞通知失败 |
| 旧校园举报及举报管理 | 本地入口503，避开缺表和旧校园错表映射；没有自动修复历史举报 |
| 通知接口及依赖通知的旧互动写入口 | 本地入口503；没有把通知失败表述为成功，也没有新增学院群发 |
| 原管理员Dashboard、用户/举报/公告等其他后台API | 本地入口503；侧栏保留，但不宣称整套后台具备运行数据 |
| 树洞、商城、资料同步等非目标API | 本地入口503；不扩建全站表，不启用远程服务 |

现有notificationService没有改变全站语义。本地当前开放的业务调用链不触发通知写入；若以后扩大白名单，必须重新核对其依赖。
旧评论/回复在普通运行模式仍复用原业务逻辑，但改用校园严格安全检查；其他业务中间件消费者原行为不变。
旧组织带图发布在普通模式的原上传及非事务失败流程没有在本轮全面重构，不宣称已解决生产上传生命周期问题。

注册、忘记密码、邮箱服务、公共举报/通知、Dashboard、其他业务表、学院目录种子、生产对象存储及孤立资源清理仍未具备本地完整运行条件。
不得为消除这些限制而运行全部历史迁移或恢复远程凭证。

## 9. 图片与历史保护保留

新快讯每张JPEG/PNG/WebP不超过8MiB；Sharp验证实际格式、单帧和4000万像素上限，规范化为WebP。
仅固定隔离环境可写.local/stage2/news-assets；新UUID Key、磁盘wx创建，不覆盖旧对象。
资产先pending、写文件后ready；失败保留failed/pending供只读孤立检查，不自动删除。
当前/历史引用的资产受FK及关系检查保护；删除缩略图只改变当前关联。
图片短期签名限定用户和单图片、15分钟；读取仍复查数据库当前身份和公开状态。
完整版本只存稳定Key及逻辑引用，不保存短期访问签名；历史显示时重签。
这些真实文件写入、数据库失败补偿及浏览器访问尚未进行本轮运行验证。

## 10. 验证结果

| 验证类型 | 本轮结果 |
| --- | --- |
| 静态 | 新增/修改CommonJS语法检查通过；git diff --check通过；原组织权限与隔离条件已核对 |
| 迁移Mock | 28项通过；覆盖缺表、删列、类型/默认值/可空性漂移、索引/唯一、FK、CHECK、触发器、账本影响行数、最终核对、完整重复执行及中断 |
| 校园安全/路由Mock | 29项通过；实际中间件和Express router.handle，无服务监听；验证空词库/失败、缓存故障、multipart顺序、组织权限、旧带图及本地门禁 |
| 原快讯后端与前后端契约 | 26项通过；管理员当前身份、撤权、旧组织成员隔离、生命周期、并发、审计、图片引用等 |
| 管理员前端与Stage 1回归 | 21项通过；未修改前端业务文件 |
| 合计 | 104项测试通过，无数据库/对象存储/HTTP网络访问 |
| 真实数据库只读 | 本轮未执行；沿用上一轮的实测空库信息，执行前必须重新预检 |
| 真实数据库写入 | 未执行 |
| 真实上传/浏览器/持久化 | 未执行，不宣称真实联调成功 |

测试只是候选代码和Mock行为证据，不能证明MySQL已接受DDL、真实锁竞争或磁盘补偿已经通过。
生成计划和测试不读取用户本地配置。Mock只使用内存元数据、虚构账号和测试签名密钥，不使用真实用户数据。

## 11. 下一轮需要用户批准的精确操作

本轮停止在批准门槛。下一轮需单独批准：

1. 先只读核对本地固定数据库身份、授权、版本、会话条件、空库或可信账本状态，禁止切换目标库。
2. 使用本报告哈希对应的三文件、21条业务结构语句；其中原18条FK保持已列行为。
3. 创建stage2_schema_migrations账本（额外1条DDL）；允许每步started INSERT及applied UPDATE，首次完整执行各21次。
4. 执行中和执行后只读检查全部列、类型、默认值、索引、唯一约束、FK、CHECK、表引擎/排序规则及账本。
5. 遇到任何不一致立即停止，不自动修改计划、不自动清库、不修账本、不执行历史迁移。

以上批准不包含账号创建、学院/词库/制裁记录/历史帖子种子或回填、真实业务CRUD、图片上传、远程服务、部署或Git提交。
通过结构验证后，再另行批准安全本地测试数据及真实持久化联调。

预检命令（只读、需本机权限）：

```powershell
node scripts/stage2-db/preflight.cjs
```

只有用户明确批准上述写入范围后，才允许执行：

```powershell
node scripts/stage2-db/migrate.cjs --apply --approved-plan 868c8889fd742f70797436ce431fc6f45b57aac58a9a37d5ec5b7103ee230e0d
```

本轮没有执行该命令。任何候选SQL、验证器、执行器、连接/网络守卫变化都会改变哈希，必须重新审核。

## 12. Git 与停止状态

工作分支dev-gjl，HEAD未变。Stage 1仍为23个暂存文件，完整暂存差异已逐字对比不变。
本轮修改均未暂存；原有前端改动、server隔离修改、未跟踪文件均保留。
没有执行git add/commit/push/merge/rebase/reset/stash、迁移、账号创建、导入或部署。
已停止，等待审核。
