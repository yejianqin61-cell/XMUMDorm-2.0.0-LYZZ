/**
 * 待办事项路由
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const sanitizeHtml = require('sanitize-html');

function cleanText(input) {
  const raw = input == null ? '' : String(input);
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function localTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapTodoRow(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    priority: r.priority,
    due_date: r.due_date ?? null,
    due_time: r.due_time ?? null,
    is_completed: !!r.is_completed,
    completed_at: r.completed_at,
    list_type: r.list_type,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

const TODO_SELECT_FIELDS = `
  id, user_id, title, description, priority,
  DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
  TIME_FORMAT(due_time, '%H:%i') AS due_time,
  is_completed, completed_at, list_type, created_at, updated_at
`;

// 获取待办列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, status, list_type } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    let where = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (date) {
      where += ' AND due_date = ?';
      params.push(date);
    }
    if (status === 'completed') {
      where += ' AND is_completed = 1';
    } else if (status === 'active') {
      where += ' AND is_completed = 0';
    }
    if (list_type && ['personal', 'course', 'club', 'other'].includes(list_type)) {
      where += ' AND list_type = ?';
      params.push(list_type);
    }

    const countRows = await query(`SELECT COUNT(*) AS total FROM todos ${where}`, params);
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    const rows = await query(
      `SELECT ${TODO_SELECT_FIELDS} FROM todos ${where}
       ORDER BY
         is_completed ASC,
         CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
         due_date ASC,
         CASE WHEN due_time IS NULL THEN 1 ELSE 0 END ASC,
         due_time ASC,
         priority DESC,
         created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    const hasMore = offset + pageSize < total;
    const list = (rows || []).map(mapTodoRow);

    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('待办列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 今日待办摘要
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = localTodayDateStr();

    const allRows = await query(
      `SELECT ${TODO_SELECT_FIELDS} FROM todos
       WHERE user_id = ? AND (due_date = ? OR due_date IS NULL)
       ORDER BY
         is_completed ASC,
         CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
         due_date ASC,
         CASE WHEN due_time IS NULL THEN 1 ELSE 0 END ASC,
         due_time ASC,
         priority DESC,
         created_at ASC`,
      [req.user.id, today]
    );

    const total = allRows.length;
    const completed = allRows.filter((r) => r.is_completed).length;
    const active = allRows.filter((r) => !r.is_completed);
    const topItems = active.slice(0, 3).map((r) => {
      const row = mapTodoRow(r);
      return {
        id: row.id,
        title: row.title,
        priority: row.priority,
        due_date: row.due_date,
        due_time: row.due_time,
        list_type: row.list_type,
      };
    });

    res.status(200).json({
      status: 0, message: '获取成功',
      data: { total, completed, active: active.length, topItems },
    });
  } catch (e) {
    console.error('今日待办错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 创建待办
router.post('/', authenticateToken, async (req, res) => {
  try {
    const title = cleanText(req.body.title).slice(0, 500);
    if (!title) return res.status(200).json({ status: -1, message: '请输入标题' });
    const description = cleanText(req.body.description);
    const priority = Math.min(3, Math.max(0, parseInt(req.body.priority, 10) || 0));
    const due_date = req.body.due_date || null;
    const due_time = req.body.due_time || null;
    const list_type = ['personal', 'course', 'club', 'other'].includes(req.body.list_type)
      ? req.body.list_type : 'personal';

    const result = await query(
      'INSERT INTO todos (user_id, title, description, priority, due_date, due_time, list_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, priority, due_date, due_time, list_type]
    );
    res.status(200).json({ status: 0, message: '创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建待办错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 编辑待办
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT id FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '待办不存在' });

    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(cleanText(req.body.title).slice(0, 500)); }
    if (req.body.description !== undefined) { sets.push('description = ?'); params.push(cleanText(req.body.description)); }
    if (req.body.priority !== undefined) { sets.push('priority = ?'); params.push(Math.min(3, Math.max(0, parseInt(req.body.priority, 10) || 0))); }
    if (req.body.due_date !== undefined) { sets.push('due_date = ?'); params.push(req.body.due_date || null); }
    if (req.body.due_time !== undefined) { sets.push('due_time = ?'); params.push(req.body.due_time || null); }
    if (req.body.list_type !== undefined) {
      sets.push('list_type = ?');
      params.push(['personal', 'course', 'club', 'other'].includes(req.body.list_type) ? req.body.list_type : 'personal');
    }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });
    params.push(id);
    await query(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ status: 0, message: '更新成功' });
  } catch (e) {
    console.error('编辑待办错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 切换完成状态
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT is_completed FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '待办不存在' });

    const nowComplete = !rows[0].is_completed;
    await query(
      'UPDATE todos SET is_completed = ?, completed_at = ? WHERE id = ?',
      [nowComplete ? 1 : 0, nowComplete ? new Date() : null, id]
    );
    res.status(200).json({ status: 0, message: nowComplete ? '已完成' : '已取消完成', data: { is_completed: nowComplete } });
  } catch (e) {
    console.error('切换待办状态错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// 删除待办
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(200).json({ status: 0, message: '已删除' });
  } catch (e) {
    console.error('删除待办错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

module.exports = router;
