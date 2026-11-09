# 万能墙阶段 3 · 自由帖讨论系统与共用互动

2026-11-09｜所有者任务书《XMUMDorm 万能墙第三阶段》｜本地分支 `dev-gjl`
基线：阶段 2 本地 checkpoint `feeb3f42`（未 push；`origin/dev-gjl` 仍为 `630c7774`）
阶段 3 本地提交：`80432873`（未 push）；已按所有者指令本地合并 `origin/main`（merge `4452e1c4`），墙体迁移因编号冲突重编号为 **080 / 081**。

## 1. 范围

| 组 | 内容 | 状态 |
| --- | --- | --- |
| **A 共用互动** | 帖子点赞（信息流接线）、收藏（接口 + 信息流 + 详情）、分享深链、举报核对、作者编辑/删除、管理员管理、匿名 + 登录权限 | 已实现 |
| **B 自由帖讨论** | 发表评论、多级回复（数据任意深度 / 视觉两层）、评论点赞、最新/最热排序、展开折叠、楼主精选、评论举报/删除 | 已实现 |
| **C 不做** | 投票、招募发布/留言、招募私聊、个性化推荐、通用私聊/好友、海报导出、顶部收起动画、我的收藏/发布页面 | 未做（刻意） |

“我的发布/收藏/互动”只保留保存接口（`POST /:id/favorite`），页面留待后续阶段。

## 2. 已确认的产品口径

1. 使用 `-LYZZ-app` 工作区；阶段 2 已有本地 checkpoint 提交（`feeb3f42`），不 push。
2. 评论区视觉：无头像、无楼层号、一级评论左对齐；二级回复集中在低对比度容器，**最多一层缩进**；沿用 App 现有主题与间距。
3. 匿名身份：**同帖固定、跨帖独立**；楼主固定 `匿名01`（未评论也保留），其他参与者按首次参与顺序 `匿名02…`；编号属于“人”而不是“评论”，删除不重排；后端保留真实 `user_id`，前端只拿编号与 `楼主/我` 布尔标识。
4. 楼主精选：每帖最多 3 条、置顶、带轻量“精选”文字徽标；仅帖子作者可操作。
5. 分享：App 深链 `xmumdorm://campus/wall/:id`，入口在详情右上 ActionSheet。
6. 删除带回复的评论：本条与全部下级回复一起不再显示（服务端级联逻辑删除）。

## 3. 数据与接口增量（additive）

迁移 `migrations/081_confession_interactions.sql`（依赖 080，可重复执行）。

> 编号说明：`origin/main` 已使用 `078_user_follows.sql`、`079_dorm_ids.sql`，墙体阶段 2/3 的迁移已由 078/079 重编号为 **080/081**；旧文档里的 078/079 指的是这两个墙体迁移。

- `confession_favorites (user_id, confession_id, created_at)`，主键 `(user_id, confession_id)`；
- `confession_comment_likes (user_id, comment_id, created_at)`，主键 `(user_id, comment_id)`；
- `confession_comments.featured_at TIMESTAMP NULL` + `(confession_id, featured_at)` 索引。

API（Web 旧字段与默认顺序保持不变）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/confessions/:id/favorite` | 收藏切换，返回 `{confession_id, favorited}`；`projectConfession` 增加 `favorited` |
| GET | `/api/confessions/:id/comments?sort=latest\|hot` | 缺省仍是 `created_at ASC`；App 显式传 `hot/latest`；二级回复始终按时间升序 |
| POST | `/api/confessions/:id/comments/:commentId/like` | 评论点赞切换 |
| PATCH | `/api/confessions/:id/comments/:commentId/feature` | `{featured: boolean}`；仅帖子作者、仅一级评论、最多 3 条；超限 409 `CONFESSION_FEATURE_LIMIT` |
| POST | `/api/confessions/:id/comments` | `parent_id` 允许同帖任意评论（不再拒绝“回复的回复”） |
| POST | `/api/reports` | 评论举报复用 `target_type=confession_comment`，无新增路由 |

投影新增字段：`anonymous_no`、`is_author`、`featured`、`featured_at`、`liked`、`like_count`、`reply_to_id`、`reply_to_excerpt`、`root_id`（replies 内）。**不新增任何身份字段**。

## 4. 排序与置顶规则

- 一级评论：
  - `hot` = `点赞数 × 2 + 全部后代回复数`，同分按时间升序、id 升序；
  - `latest` = 发布时间降序、id 降序；
  - 缺省 = 发布时间升序（Web 旧口径）。
- 二级及更深回复：始终按时间升序，不参与热度重排。
- 楼主精选评论始终置顶（按精选时间先后），与当前排序无关。

## 5. 改动落点

后端：`routes/confessions.js`、`shared/utils/nestComments.js`、`shared/api/confessions.js`、`migrations/081_confession_interactions.sql`。

App：

- `app/src/features/campus/WallCardShell.tsx`、`WallPostCard.tsx`、`WallPostRow.tsx`、`WallFeed.tsx`、`wallPost.ts`、`campusModel.ts`、`CampusScreens.tsx`、`useCampusActions.tsx`、`useCampusReport.ts`、`TreeholePostParts.tsx`、`TreeholePostDetail.tsx`；
- `app/src/components/ui/CommentItem.tsx`、`CommentThread.tsx`、`app/src/features/reports/useReport.ts`；
- `app/src/i18n/{zh,en}.ts`。

未改：阶段 2 的 3 种布局 × 6 种颜色、卡片外壳结构、底部互动栏位置、广场导航、匿名权限模型、Web 页面。

## 5.1 交接文件

交给后端同事的完整说明见：[后端交接-万能墙阶段1至3-2026-11-09.md](后端交接-万能墙阶段1至3-2026-11-09.md)。其中包含 080/081 执行顺序、API 契约、smoke 清单和回执模板。

## 6. 部署顺序（重要）

已登录用户的 `GET /window`、`GET /:id` 会读取 `confession_favorites`。因此**必须先对目标库执行 080、081，再部署带本轮代码的服务端**；否则旧库上登录读详情/信息流会 500。未登录读取不受新表影响。

## 7. 明确未验收

- 080 / 081 未在主库或生产库执行；本轮只在一次性本地 MySQL（127.0.0.1:33479）验证。
- 未部署 Railway、未 push / merge / 建 PR。
- 本地 arm64 Release APK 已生成（debug 测试签名，`XMUMDorm-wall-p3-20261109-arm64.apk`），并已于 2026-11-09 20:36 通过 `adb install -r` 覆盖安装到所有者手机（数据保留）；但当时手机锁屏，未完成目视 UI 验收。
- x86_64 模拟器联调包因 Gradle lint-vital 过慢中止，模拟器 UI 未验。
- 真实设备上的输入法、分享面板、返回手势仍需机主解锁后确认。
