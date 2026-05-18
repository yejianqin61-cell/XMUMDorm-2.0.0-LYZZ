/**
 * ============================================
 * V3.0 组织系统路由
 * ============================================
 * 组织 CRUD、成员管理、当前用户所属组织
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { logAudit } = require('../services/auditLog');
const sanitizeHtml = require('sanitize-html');
const { assetUrl } = require('../utils/assets');

function cleanText(input) {
  const raw = input == null ? '' : String(input);
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// ---------- 当前用户所属组织 ----------
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT o.id, o.type, o.name, o.avatar, o.description,
              om.title, om.permission_level
       FROM organization_memberships om
       JOIN organizations o ON om.organization_id = o.id
       WHERE om.user_id = ? AND o.is_active = 1
       ORDER BY o.type, o.name`,
      [req.user.id]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      avatar: assetUrl(r.avatar),
      description: r.description || '',
      title: r.title || '',
      permission_level: r.permission_level,
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取我的组织错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 公开组织列表 ----------
router.get('/', async (req, res) => {
  try {
    const type = (req.query.type || '').trim();
    let sql = 'SELECT id, type, name, avatar, description, is_active, created_at FROM organizations WHERE 1=1';
    const params = [];
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY type, name';
    const rows = await query(sql, params);
    const list = (rows || []).map((r) => ({
      ...r,
      avatar: assetUrl(r.avatar),
      description: r.description || '',
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取组织列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员创建组织 ----------
router.post('/', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可创建组织' });
  try {
    const type = ['SchoolDepartment', 'College', 'Official'].includes(req.body.type) ? req.body.type : null;
    const name = cleanText(req.body.name);
    if (!type || !name) return res.status(200).json({ status: -1, message: '请填写组织类型和名称' });
    const description = cleanText(req.body.description);
    const avatar = req.body.avatar || null;

    const result = await query(
      'INSERT INTO organizations (type, name, avatar, description) VALUES (?, ?, ?, ?)',
      [type, name, avatar, description]
    );
    await logAudit({
      user_id: req.user.id,
      action: 'create_organization',
      target_type: 'organization',
      target_id: result.insertId,
      detail: JSON.stringify({ type, name }),
    });
    res.status(200).json({ status: 0, message: '组织创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建组织错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员编辑组织 ----------
router.patch('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可编辑组织' });
  try {
    const orgId = parseInt(req.params.id, 10);
    const name = cleanText(req.body.name);
    const type = req.body.type;
    const description = cleanText(req.body.description);
    const isActive = req.body.is_active != null ? (req.body.is_active ? 1 : 0) : undefined;

    const sets = [];
    const params = [];
    if (name) { sets.push('name = ?'); params.push(name); }
    if (type) { sets.push('type = ?'); params.push(type); }
    if (req.body.description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (isActive !== undefined) { sets.push('is_active = ?'); params.push(isActive); }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });

    params.push(orgId);
    await query(`UPDATE organizations SET ${sets.join(', ')} WHERE id = ?`, params);
    await logAudit({
      user_id: req.user.id,
      action: 'update_organization',
      target_type: 'organization',
      target_id: orgId,
    });
    res.status(200).json({ status: 0, message: '组织更新成功' });
  } catch (e) {
    console.error('编辑组织错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员添加成员（按邮箱搜索用户） ----------
router.post('/:id/members', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员可管理成员' });
  try {
    const orgId = parseInt(req.params.id, 10);
    const email = (req.body.email || '').trim();
    const title = cleanText(req.body.title);
    const permissionLevel = parseInt(req.body.permission_level, 10) || 1;

    if (!email) return res.status(200).json({ status: -1, message: '请输入用户邮箱' });

    // 按邮箱查找用户
    const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (!users || users.length === 0) {
      return res.status(200).json({ status: -1, message: '未找到该邮箱对应的用户，请确认邮箱正确或提示用户先注册' });
    }
    const userId = users[0].id;

    // 插入成员关系（唯一索引防止重复）
    try {
      await query(
        'INSERT INTO organization_memberships (organization_id, user_id, title, permission_level) VALUES (?, ?, ?, ?)',
        [orgId, userId, title, permissionLevel]
      );
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(200).json({ status: -1, message: '该用户已是此组织成员' });
      }
      throw e;
    }
    await logAudit({
      user_id: req.user.id,
      action: 'add_org_member',
      target_type: 'organization',
      target_id: orgId,
      detail: JSON.stringify({ email, user_id: userId, title }),
    });
    res.status(200).json({ status: 0, message: '成员添加成功' });
  } catch (e) {
    console.error('添加成员错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员编辑成员 ----------
router.patch('/:id/members/:mid', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const mid = parseInt(req.params.mid, 10);
    const title = cleanText(req.body.title);
    const permissionLevel = parseInt(req.body.permission_level, 10);

    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (req.body.permission_level !== undefined) { sets.push('permission_level = ?'); params.push(permissionLevel); }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });

    params.push(mid);
    await query(`UPDATE organization_memberships SET ${sets.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ status: 0, message: '成员更新成功' });
  } catch (e) {
    console.error('编辑成员错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员移除成员 ----------
router.delete('/:id/members/:mid', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const mid = parseInt(req.params.mid, 10);
    await query('DELETE FROM organization_memberships WHERE id = ?', [mid]);
    res.status(200).json({ status: 0, message: '成员已移除' });
  } catch (e) {
    console.error('移除成员错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 按邮箱搜索用户（供管理员添加成员时使用） ----------
router.get('/users/search', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const email = (req.query.email || '').trim();
    if (!email || email.length < 2) return res.status(200).json({ status: 0, data: [] });
    const rows = await query(
      'SELECT id, username, nickname, email, avatar FROM users WHERE email LIKE ? LIMIT 10',
      [`%${email}%`]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      username: r.username,
      nickname: r.nickname,
      email: r.email,
      avatar: assetUrl(r.avatar),
    }));
    res.status(200).json({ status: 0, message: '搜索成功', data: list });
  } catch (e) {
    console.error('搜索用户错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 获取组织成员列表 ----------
router.get('/:id/members', async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT om.id, om.title, om.permission_level, om.created_at,
              u.id AS user_id, u.username, u.nickname, u.email, u.avatar
       FROM organization_memberships om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = ?
       ORDER BY om.id`,
      [orgId]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      title: r.title || '',
      permission_level: r.permission_level,
      created_at: r.created_at,
      user: {
        id: r.user_id,
        username: r.username,
        nickname: r.nickname,
        email: r.email,
        avatar: assetUrl(r.avatar),
      },
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取成员列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

module.exports = router;
