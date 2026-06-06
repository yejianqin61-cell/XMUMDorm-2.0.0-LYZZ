# 上线后如何执行 init-db.sql

## 这句话是什么意思？

**「执行 init-db.sql」** = 把你的数据库**建表脚本**在 Railway 的 MySQL 里**跑一遍**。

- 脚本里写好了要建哪些表（用户表、帖子表、评论表、点赞表、通知表等）。
- 跑完以后，数据库里就有这些空表，你的后端才能正常读写数据。
- **只做一次**：第一次在 Railway 建好 MySQL 之后执行即可；以后不用再执行。

---

## 什么时候做？

在 **Railway 上已经添加了 MySQL 服务**，并且应用已经能连上这个数据库之后。  
（如果还没连上，先按「帖子系统2.0.0_运行说明」把 `DATABASE_URL` / `MYSQL_URL` 配好。）

---

## 怎么做？（任选一种）

### 方法一：Railway 网页里执行（推荐，不用装软件）

1. 打开 **Railway 控制台** → 进入你的项目 → 点开 **MySQL 服务**。
2. 看有没有 **「Data」/「Query」/「Console」** 这类入口（不同版本名字可能不一样），点进去。
3. 会有一个可以输入或粘贴 **SQL** 的框。
4. 打开你项目里的 **`init-db.sql`** 文件，**全选、复制**里面的全部内容。
5. 粘贴到 Railway 的 SQL 框里，点 **执行 / Run**。
6. 没有报错就表示执行成功，表已经建好了。

如果没有「Query」入口，就用下面的方法二。

---

### 方法二：用本机 MySQL 客户端连 Railway 的库再执行

1. **拿到连接信息**  
   在 Railway 的 MySQL 服务里，会有 **连接信息**（或 Variables），例如：
   - Host（主机）
   - User（用户名）
   - Password（密码）
   - Database（数据库名）  
   有的会直接给一条 **连接串**（如 `mysql://user:pass@host:port/database`）。

2. **选一个客户端**（任选其一）：
   - **命令行**：本机已安装 MySQL 时，用：
     ```bash
     mysql -h <Railway给的Host> -P <端口> -u <用户名> -p<密码> <数据库名> < init-db.sql
     ```
     把 `<Railway给的Host>` 等替换成 Railway 里显示的值；`init-db.sql` 写你电脑上这个文件的路径。
   - **图形工具**：用 **MySQL Workbench**、**DBeaver**、**Navicat** 等，新建连接，填 Railway 的 Host / 用户 / 密码 / 数据库，连上后：
     - 打开「执行 SQL 文件」或「运行脚本」；
     - 选择项目里的 **`init-db.sql`**；
     - 执行。

3. 执行完没有报错，就说明 **init-db.sql 已经执行好了**。

---

## 怎么确认成功了？

- 在 Railway 的 MySQL 里看 **表列表**，应该能看到：  
  `users`、`posts`、`post_images`、`post_likes`、`comments`、`notifications`。
- 或者让你的后端跑一下（例如访问一个会查数据库的接口），不报「表不存在」就说明表已经建好。

---

## 总结

| 你要做的 | 说明 |
|----------|------|
| **执行 init-db.sql** | 在 Railway 的 MySQL 里运行一次项目里的 `init-db.sql`，把需要的表建出来。 |
| **什么时候做** | Railway 已添加 MySQL、并配好 `DATABASE_URL`/`MYSQL_URL` 之后。 |
| **做几次** | 只做一次；以后除非你删库重建，否则不用再执行。 |

到时候你按上面「方法一」或「方法二」操作即可；如果某一步界面和我说的不一样，把 Railway 的截图或报错发给我，我可以按你的界面一步步教你。
