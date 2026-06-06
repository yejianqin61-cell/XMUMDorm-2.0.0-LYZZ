# 帖子系统 2.0.0 运行说明

## 1. 数据库（无本地库 / 上线后在 Railway 配置）

- **本地**：可以不装 MySQL，直接开发前端或等上线后再联调。
- **上线 Railway**：
  1. 在 Railway 项目中添加 **MySQL** 服务（Plugin 或 Add Database）。
  2. 在应用服务里配置环境变量，指向该 MySQL：  
     - 若 Railway 提供 **单连接串**（如 `MYSQL_URL` 或 `DATABASE_URL`，形如 `mysql://user:pass@host:port/database`），只需在应用里设置 **`DATABASE_URL` 或 `MYSQL_URL`**，本项目已支持（见 `database.js`）。  
     - 若只有分散变量（如 `MYSQLHOST`、`MYSQLUSER`、`MYSQLPASSWORD`、`MYSQLDATABASE`），则在应用里配置为本项目使用的 **`DB_HOST`**、**`DB_USER`**、**`DB_PASSWORD`**、**`DB_NAME`**。
  3. 数据库创建好后，在 Railway 的 MySQL 上执行 **建表脚本**：
     - **全新库**：执行根目录下的 `init-db.sql`（已包含 users 及帖子/评论/点赞/通知表）。
     - **已有旧库**：执行 `migrations/001_posts_system_2.0.0.sql` 做扩展与建表。  
  Railway 控制台通常支持「在数据库上执行 SQL」或通过 CLI/本地用 Railway 提供的连接串执行：  
  `mysql -h <host> -u <user> -p <database> < init-db.sql`

## 2. 默认头像

- 接口约定：用户无头像时前端使用 `/uploads/default-avatar.png`。
- 请自行在项目根目录下放置 `uploads/default-avatar.png`（或任意默认图），否则该路径 404 时前端需做占位图兜底。

## 3. 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录（学号或邮箱 + 密码） |
| POST | /api/posts | 发帖（需登录；multipart: content, type?, images 最多3张） |
| GET | /api/posts | 帖子列表（?page=&pageSize=） |
| GET | /api/posts/:id | 帖子详情 |
| DELETE | /api/posts/:id | 逻辑删除（本人或 admin） |
| PATCH | /api/posts/:id/hide | 隐藏帖子（仅 admin） |
| POST | /api/posts/:id/like | 点赞/取消点赞（需登录） |
| GET | /api/posts/:id/comments | 评论列表 |
| POST | /api/posts/:id/comments | 发表评论（body: content, parent_id?） |
| DELETE | /api/posts/:id/comments/:commentId | 逻辑删除评论（本人或 admin） |
| GET | /api/notifications | 通知列表（?type=&is_read=&page=&pageSize=） |
| GET | /api/notifications/unread-announcements | 未读公告（弹窗用） |
| PATCH | /api/notifications/:id/read | 标记已读 |
| PATCH | /api/notifications/read-batch | 批量已读（body: { ids: [] }） |
| GET | /api/users/me | 当前用户资料 |
| GET | /api/users/:id/profile | 个人空间（资料+帖子+统计） |
| PATCH | /api/users/me/avatar | 上传头像（multipart: avatar） |

## 4. 管理员

- 将某用户的 `role` 改为 `admin` 即成为官方号/管理员（可发公告、隐藏帖子、删任意内容）。
- 在数据库中执行：`UPDATE users SET role = 'admin' WHERE id = ?;`
