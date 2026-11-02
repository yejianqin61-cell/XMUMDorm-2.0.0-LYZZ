# 数据库迁移说明

> 01 至 05 功能交付请先阅读 [集中交接文档](../docs/07-Implement/01-05交付与数据库迁移交接.md)，
> 使用 `delivery-01-05/` 及专用执行器核对旧库。下文为历史机制说明，不能以“已存在即跳过”代替兼容检查，
> 也不要对未知旧库直接运行 `migrate:all`、`init-db.sql` 或本地空库 Stage2 工具。

本目录下的 SQL 文件需要**按顺序**在 MySQL 中执行，用于给表增加新字段或新表。

---

## 「在正式库执行 003、004」是什么意思？

- **正式库**：你线上用户访问时连接的那套 MySQL（例如 Railway 提供的 `DATABASE_URL`），不是只有你电脑上的测试库。
- **迁移（migration）**：一段 SQL，用来给已有表**加列、建新表**。例如 **003** 给 `products` 增加 `review_count`、`comprehensive_score` 等；**004** 增加 `price`。
- **为什么要做**：若线上库从没跑过 003，表里就没有这些列，后端查「分区商品榜」或跑回填脚本时会报错（例如之前的 500）。
- **怎么执行**：在项目根目录配置好指向**该数据库**的 `.env`（或 Railway Shell 里同样配置），然后执行下面脚本即可；**已执行过的迁移再跑一遍一般会提示「列已存在」并跳过，是安全的。**

### 执行 003：排行榜统计字段（建议与 004 一起做）

```bash
node scripts/run-migration-003.js
```

### 执行 004：商品价格

```bash
node scripts/run-migration-004.js
```

### 一键从空库/补全结构（含 init-db + 002～008）

```bash
node scripts/run-migrations-all.js
```

或 `npm run migrate:all`。

---

## 执行 004：商品价格（必做）

**004_product_price.sql** 会给 `products` 表增加 `price` 字段，这样商家设置的菜品价格才能保存和显示。

### 方法一：用 Node 脚本执行（推荐，简单）

在项目**根目录**（和 `package.json` 同级）打开终端，执行：

```bash
node scripts/run-migration-004.js
```

- 脚本会使用项目当前的数据库配置（和启动后端时一样）。
- 若已存在 `price` 列，会提示“已存在，跳过”，不会报错。
- 若执行成功，会看到 `004 迁移执行成功`。

### 方法二：用 MySQL 命令行执行

1. **确认 MySQL 已安装并已启动**
   - Windows：在“服务”里看是否有 MySQL 服务在运行，或用 XAMPP/其他工具启动 MySQL。
   - 若未安装：可安装 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) 或 XAMPP（自带 MySQL）。

2. **打开终端（PowerShell 或 CMD）**

3. **进入项目根目录**，例如：
   ```bash
   cd C:\Users\叶健钦\Desktop\Jack
   ```

4. **执行迁移**（按你的实际配置改下面参数）：
   ```bash
   mysql -u root -p jack_campus < migrations/004_product_price.sql
   ```
   - `-u root`：用户名，若不是 root 请改成你的 MySQL 用户名。
   - `-p`：会提示输入密码（若没有密码可直接回车）。
   - `jack_campus`：数据库名，若你改过 `DB_NAME` 或数据库名，请改成实际名称。

5. **输入 MySQL 密码**后回车，无报错即表示执行成功。

### 方法三：用图形化工具（如 Navicat、MySQL Workbench、DBeaver）

1. 用工具连接到你的 MySQL，并选中数据库 `jack_campus`。
2. 打开“查询”或“SQL 编辑器”。
3. 复制并执行下面这段 SQL：

```sql
USE jack_campus;
ALTER TABLE products
  ADD COLUMN price DECIMAL(10,2) NULL DEFAULT NULL COMMENT '价格 RM' AFTER description;
```

4. 若提示“列已存在”，说明 004 已经执行过，可忽略。

---

## 执行 005：店铺 Logo 与营业时间（可选）

若需要商家上传店铺 logo、填写营业时间，请执行 **005_shops_logo_opening_hours.sql**。

用 Node 脚本（若已提供）或 MySQL 命令行：

```bash
mysql -u root -p jack_campus < migrations/005_shops_logo_opening_hours.sql
```

或在图形化工具中执行该文件中的 SQL。

---

## 迁移文件顺序

| 文件 | 说明 |
|------|------|
| 001 | 帖子系统 2.0 |
| 002 | 食堂系统（区域、店铺、分类、商品等） |
| 003 | 排行榜等 |
| **004** | **商品价格 price**（未执行则菜品价格无法保存） |
| 005 | 店铺 logo、营业时间 |
| **056** | **管理员后台**（`reports`、`user_sanctions`、`sensitive_words`、`system_configs`） |
| **057** | **用户状态**（`users.status`、`banned_until`、`muted_until`、`last_login_at` 等） |

若你是从零建库，建议按 001 → 002 → 003 → 004 → 005 顺序执行；若库已存在，只需补执行 004（和可选的 005）。

### 执行 056 + 057：管理员后台（必做，否则后台全部「加载失败」）

管理员后台 API 依赖上述表与字段。未执行时 Dashboard / 用户列表 / 举报中心等会返回 500，前端显示 Failed to load。

在项目根目录（`.env` 指向**目标库**，本地或 Railway 均可）：

```bash
node scripts/apply-sql-file.js migrations/056_admin_system.sql
node scripts/apply-sql-file.js migrations/057_user_status.sql
```

或使用专用脚本：

```bash
node scripts/run-migration-056-admin.js
node scripts/run-migration-057-user-status.js
```

管理员账号（若尚未创建）：

```bash
node scripts/createAdmin.js
```

默认账号 `admin` / 密码见脚本注释；登录后从「我的 → 管理员后台」进入。

- `071_campus_shop.sql`：校园商城六张表；运行 `node scripts/run-migration-071-shop.js`；参见 [商城实施说明](../docs/07-Implement/校园商城/本地商城说明.md)。
`072_shop_merchants.sql`：独立商户、账号归属、按店铺隔离商品/时段/订单、付款方式与配送费用配置、私有付款截图；支持重复执行。
`073_daily_delivery_schedule.sql`：历史迁移，曾用于每日重复配送时段。表结构为兼容既有数据库而保留；当前商城已改为商家指定日期开放下单，不再读取每日计划或接受非指定日期时段。
`075_shop_store_soft_delete.sql`：为店铺增加逻辑删除时间和查询索引；商家可下架自己的店铺，管理员可下架任意店铺，历史订单与付款截图保留。使用 `npm run migrate:shop` 或 `node scripts/run-incremental-migrations.js` 执行；不会自动迁移生产数据库。

`076_post_attribution.sql`：树洞原创/转载声明及简单来源，旧帖保留 NULL，不回填原创。
核实目标库与备份后，使用 `node scripts/apply-sql-file.js migrations/076_post_attribution.sql` 执行单个迁移。
先迁移，再部署接口和网站；本功能无需重跑其他历史迁移或 init-db.sql。

`078_user_follows.sql`：创建用户关注关系表，供主页展示关注/粉丝数量与名单。
部署用户关注功能前，先确认目标数据库并执行 `node scripts/apply-sql-file.js migrations/078_user_follows.sql`；也可使用 `node scripts/run-incremental-migrations.js` 执行增量迁移。

`079_dorm_ids.sql`：为所有账号分配独立且唯一的 DORM ID，并要求后续新账号写入该编号。
部署前确认目标数据库并执行 `node scripts/apply-sql-file.js migrations/079_dorm_ids.sql`；也可使用 `node scripts/run-incremental-migrations.js` 执行增量迁移。
