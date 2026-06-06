# Backend Development Rules

## Tech Stack
- **Runtime**: Node.js + Express
- **Database**: MySQL via `database.js` (`query()` method)
- **Auth**: JWT via `middleware/auth.js` (`authenticateToken`)
- **Upload**: Multer via `middleware/upload.js`

## Route Pattern

Every route file follows this structure:

```js
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

// Public endpoint
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const rows = await query('SELECT ... LIMIT ? OFFSET ?', [pageSize, offset]);
    res.json({ data: rows, page, pageSize });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authenticated endpoint
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const result = await query('INSERT INTO ... VALUES (?, ?)', [userId, content]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## Naming Conventions
- Route files: lowercase, module name (`posts.js`, `canteen.js`)
- API paths: `/api/<resource>` (plural)
- SQL tables: lowercase + underscore (`post_likes`, `product_comments`)
- SQL columns: lowercase + underscore (`user_id`, `created_at`)

## Database Rules
- **Always** use parameterized queries: `query('SELECT ... WHERE id = ?', [id])`
- **Never** string concatenation for SQL: `` query(`SELECT ... WHERE id = ${id}`) `` ❌
- **Always** use `deleted_at` for logical deletion
- **Always** include `created_at` and `updated_at` timestamps
- **Always** validate input before SQL

## Error Handling
1. Return proper HTTP status codes (400/401/403/404/500)
2. Log errors with `console.error()` but don't expose internals to client
3. Use try/catch in every route handler
4. Validation errors → 400, Auth errors → 401, Permission → 403, Not found → 404

## Security
- All authenticated routes MUST use `authenticateToken` middleware
- Admin routes MUST also use `requireAdmin` middleware
- Sanitize user input with `sanitize-html` before storage
- Validate file uploads (type: jpg/png/webp/gif, size: ≤ 5MB)
- Never log passwords or tokens
