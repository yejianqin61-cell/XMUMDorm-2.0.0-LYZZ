# 数据库迁移说明

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

（根目录的 `node run-migration-003.js` 仍会转发到 `scripts/`，与旧文档兼容。）

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

若你是从零建库，建议按 001 → 002 → 003 → 004 → 005 顺序执行；若库已存在，只需补执行 004（和可选的 005）。
