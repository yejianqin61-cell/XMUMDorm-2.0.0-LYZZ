# Database Rules

## Core Principle

> **All schema changes go through `migrations/NNN_*.sql`. Never ALTER TABLE manually.**

## Migration Discipline

### Creating a Migration
1. Pick the next available 3-digit number (check `migrations/` for highest)
2. Name: `NNN_<action>_<object>.sql` (e.g., `058_add_user_preferences.sql`)
3. Use `IF NOT EXISTS` / `IF EXISTS` guards
4. Write a JS runner script: `scripts/run-migration-NNN-<name>.js`
5. Test locally first, then commit

### Migration Content Standard
```sql
-- migration: 058_add_user_preferences.sql
-- description: User preference key-value store
-- depends: 001 (users table must exist)
-- reversible: DROP TABLE IF EXISTS user_preferences;

CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    pref_key VARCHAR(64) NOT NULL,
    pref_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_user_pref (user_id, pref_key)
);
```

### Execution
```bash
# All migrations
npm run migrate:all

# Single
node scripts/run-migration-NNN-name.js

# Incremental (only unrun)
node scripts/run-incremental-migrations.js
```

## Query Patterns

### Always Parameterized
```js
// ✅ CORRECT
const rows = await query('SELECT * FROM posts WHERE user_id = ? AND type = ?', [userId, type]);

// ❌ WRONG — SQL injection risk
const rows = await query(`SELECT * FROM posts WHERE user_id = ${userId}`);
```

### Pagination Standard
```js
const { page = 1, pageSize = 20 } = req.query;
const offset = (parseInt(page) - 1) * parseInt(pageSize);
const rows = await query(
  'SELECT * FROM posts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?',
  [parseInt(pageSize), offset]
);
```

### Logical Deletion
```js
// Always use deleted_at, never DELETE FROM
await query('UPDATE posts SET deleted_at = NOW() WHERE id = ?', [postId]);

// All queries filter out deleted records
// WHERE deleted_at IS NULL
```

## Table Design
- All tables: `id INT AUTO_INCREMENT PRIMARY KEY`
- All tables: `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
- All tables: `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
- Soft-deletable tables: `deleted_at DATETIME DEFAULT NULL`
- Foreign keys on relationship columns
- Indexes on frequently queried columns and foreign keys

## Forbidden
- ❌ Manual `ALTER TABLE` or `DROP TABLE` on any environment
- ❌ String concatenation for SQL values
- ❌ `DELETE FROM` instead of `UPDATE ... SET deleted_at`
- ❌ Skipping migration runner scripts (no direct `mysql` CLI)
- ❌ Modifying deployed migrations (add a new one instead)
