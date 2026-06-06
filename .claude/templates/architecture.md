# <Feature Name> — Architecture Design

**版本**: V1.0
**依据 PRD**: `docs/01-Requirement/<feature>-PRD.md`
**编写日期**: <YYYY-MM-DD>

---

## 一、概述

<One paragraph summary of the architecture approach.>

---

## 二、API 设计

### 新增端点

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/<resource>` | 公开 | 列表分页 |
| POST | `/api/<resource>` | ✅ Auth | 创建 |
| GET | `/api/<resource>/:id` | 公开 | 详情 |
| PATCH | `/api/<resource>/:id` | ✅ Auth | 修改 |
| DELETE | `/api/<resource>/:id` | ✅ Auth | 逻辑删除 |

### 请求/响应示例

```json
// GET /api/<resource>?page=1&pageSize=20
{
  "data": [...],
  "page": 1,
  "pageSize": 20
}

// POST /api/<resource>
// Body: { "content": "...", "type": "..." }
{
  "id": 1
}
```

---

## 三、数据库设计

### 新增表

```sql
-- migration: NNN_<name>.sql
CREATE TABLE IF NOT EXISTS <table_name> (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 迁移计划

| # | 迁移文件 | 说明 |
|---|----------|------|
| 1 | `NNN_<name>.sql` | <说明> |

---

## 四、组件 / 屏幕分解

### Web 端
```
<PageName>
├── <Header>
├── <ContentList>
│   └── <ContentCard> (×N)
└── <CreateButton>
```

### 移动端
```
<ScreenName>
├── <Header />
├── <FlatList>
│   └── <ContentCard /> (renderItem)
└── <FAB />
```

---

## 五、数据流

```
User → Component → api/<module>.js → fetch() → Express Route → database.query() → MySQL
                                                                    ↓
User ← Component ← JSON response   ← res.json() ← rows
```

---

## 六、技术决策

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| <决策点> | A / B / C | <选择> | <理由> |

---

## 七、风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| <风险> | L/M/H | L/M/H | <措施> |
