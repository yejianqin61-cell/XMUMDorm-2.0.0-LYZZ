/**
 * ============================================
 * V3.0 广场系统路由（热搜 + 校园此刻）
 * ============================================
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { logAudit } = require('../services/auditLog');
const { assetUrl } = require('../utils/assets');
const sanitizeHtml = require('sanitize-html');

function cleanText(input) {
  const raw = input == null ? '' : String(input);
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// ============================================
// 热搜话题
// ============================================

// ---------- 热搜列表 ----------
router.get('/trending', async (req, res) => {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.sort_order, t.created_at,
              (SELECT COUNT(*) FROM trending_posts WHERE topic_id = t.id AND deleted_at IS NULL AND hidden_by_admin = 0) AS post_count
       FROM trending_topics t
       WHERE t.is_active = 1
         AND (t.starts_at IS NULL OR t.starts_at <= ?)
         AND (t.ends_at IS NULL OR t.ends_at >= ?)
       ORDER BY t.sort_order ASC, t.id DESC
       LIMIT 20`,
      [now, now]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      post_count: r.post_count || 0,
      sort_order: r.sort_order,
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('热搜列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜详情 ----------
router.get('/trending/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.sort_order, t.created_at,
              (SELECT COUNT(*) FROM trending_posts WHERE topic_id = t.id AND deleted_at IS NULL AND hidden_by_admin = 0) AS post_count
       FROM trending_topics t WHERE t.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '话题不存在' });
    const r = rows[0];
    res.status(200).json({
      status: 0, message: '获取成功',
      data: { id: r.id, title: r.title, description: r.description || '', post_count: r.post_count || 0, sort_order: r.sort_order },
    });
  } catch (e) {
    console.error('热搜详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 热搜帖列表 ----------
router.get('/trending/:id/posts', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    const countRows = await query(
      'SELECT COUNT(*) AS total FROM trending_posts WHERE topic_id = ? AND deleted_at IS NULL AND hidden_by_admin = 0',
      [topicId]
    );
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    const rows = await query(
      `SELECT p.id, p.content, p.created_at,
              u.id AS user_id, u.username, u.nickname, u.avatar
       FROM trending_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.topic_id = ? AND p.deleted_at IS NULL AND p.hidden_by_admin = 0
       ORDER BY p.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [topicId]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      author: {
        id: r.user_id,
        name: r.nickname || r.username || '匿名',
        avatar: assetUrl(r.avatar),
      },
    }));
    const hasMore = offset + pageSize < total;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('热搜帖列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发帖到热搜 ----------
router.post('/trending/:id/posts', authenticateToken, async (req, res) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const content = cleanText(req.body.content);
    if (!content) return res.status(200).json({ status: -1, message: '内容不能为空' });

    // 校验话题存在且生效
    const topics = await query('SELECT id FROM trending_topics WHERE id = ? AND is_active = 1', [topicId]);
    if (!topics || topics.length === 0) return res.status(200).json({ status: -1, message: '话题不存在或已下线' });

    const result = await query(
      'INSERT INTO trending_posts (topic_id, user_id, content) VALUES (?, ?, ?)',
      [topicId, req.user.id, content]
    );
    res.status(200).json({ status: 0, message: '发布成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('热搜发帖错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 管理员 CRUD 热搜话题 ----------
router.post('/trending', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const title = cleanText(req.body.title);
    if (!title) return res.status(200).json({ status: -1, message: '请输入标题' });
    const description = cleanText(req.body.description);
    const sortOrder = parseInt(req.body.sort_order, 10) || 0;

    const result = await query(
      'INSERT INTO trending_topics (title, description, sort_order, created_by) VALUES (?, ?, ?, ?)',
      [title, description, sortOrder, req.user.id]
    );
    res.status(200).json({ status: 0, message: '热搜创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.patch('/trending/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const id = parseInt(req.params.id, 10);
    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(cleanText(req.body.title)); }
    if (req.body.description !== undefined) { sets.push('description = ?'); params.push(cleanText(req.body.description)); }
    if (req.body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(parseInt(req.body.sort_order, 10) || 0); }
    if (req.body.is_active !== undefined) { sets.push('is_active = ?'); params.push(req.body.is_active ? 1 : 0); }
    if (req.body.starts_at !== undefined) { sets.push('starts_at = ?'); params.push(req.body.starts_at || null); }
    if (req.body.ends_at !== undefined) { sets.push('ends_at = ?'); params.push(req.body.ends_at || null); }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });
    params.push(id);
    await query(`UPDATE trending_topics SET ${sets.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ status: 0, message: '热搜更新成功' });
  } catch (e) {
    console.error('更新热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.delete('/trending/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM trending_topics WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '热搜已删除' });
  } catch (e) {
    console.error('删除热搜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ============================================
// 校园此刻
// ============================================

// ---------- 校园动态列表 ----------
router.get('/campus-feed', async (req, res) => {
  try {
    const tab = req.query.tab === 'college' ? 'college' : 'school';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;

    // school tab 允许 SchoolDepartment 和 Official；college tab 仅 College
    const orgTypeCondition = tab === 'college'
      ? "AND o.type = 'College'"
      : "AND o.type IN ('SchoolDepartment', 'Official')";

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       WHERE cp.feed_tab = ? AND cp.deleted_at IS NULL AND cp.hidden_by_admin = 0 ${orgTypeCondition}`,
      [tab]
    );
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    const rows = await query(
      `SELECT cp.id, cp.title, cp.content, cp.feed_tab, cp.created_at,
              o.id AS org_id, o.name AS org_name, o.type AS org_type, o.avatar AS org_avatar,
              u.id AS author_id, u.username, u.nickname
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       JOIN users u ON cp.author_user_id = u.id
       WHERE cp.feed_tab = ? AND cp.deleted_at IS NULL AND cp.hidden_by_admin = 0 ${orgTypeCondition}
       ORDER BY cp.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [tab]
    );
    const list = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      feed_tab: r.feed_tab,
      created_at: r.created_at,
      organization: {
        id: r.org_id,
        name: r.org_name,
        type: r.org_type,
        avatar: assetUrl(r.org_avatar),
      },
      author: {
        id: r.author_id,
        name: r.nickname || r.username || '匿名',
      },
    }));
    const hasMore = offset + pageSize < total;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('校园动态列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 发校园帖（组织身份） ----------
router.post('/campus-posts', authenticateToken, async (req, res) => {
  try {
    const organizationId = parseInt(req.body.organization_id, 10);
    const feedTab = req.body.feed_tab === 'college' ? 'college' : 'school';
    const title = cleanText(req.body.title);
    const content = cleanText(req.body.content);
    if (!organizationId || !title || !content) return res.status(200).json({ status: -1, message: '请填写完整信息' });

    // 校验用户是否为该组织成员
    const members = await query(
      'SELECT om.permission_level, o.type FROM organization_memberships om JOIN organizations o ON om.organization_id = o.id WHERE om.organization_id = ? AND om.user_id = ? AND o.is_active = 1',
      [organizationId, req.user.id]
    );
    if (!members || members.length === 0) {
      return res.status(200).json({ status: -1, message: '你不在该组织中或无发帖权限' });
    }
    const m = members[0];

    // 校验组织类型与 tab 匹配
    if (feedTab === 'college' && m.type !== 'College') {
      return res.status(200).json({ status: -1, message: '学院通知仅限 College 类型组织发布' });
    }
    if (feedTab === 'school' && !['SchoolDepartment', 'Official'].includes(m.type)) {
      return res.status(200).json({ status: -1, message: '学校公告仅限 SchoolDepartment/Official 类型组织发布' });
    }

    const result = await query(
      'INSERT INTO campus_posts (organization_id, author_user_id, feed_tab, title, content) VALUES (?, ?, ?, ?, ?)',
      [organizationId, req.user.id, feedTab, title, content]
    );
    res.status(200).json({ status: 0, message: '发布成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('发校园帖错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ---------- 校园帖详情 ----------
router.get('/campus-posts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query(
      `SELECT cp.id, cp.title, cp.content, cp.feed_tab, cp.created_at,
              o.id AS org_id, o.name AS org_name, o.type AS org_type, o.avatar AS org_avatar,
              u.id AS author_id, u.username, u.nickname
       FROM campus_posts cp
       JOIN organizations o ON cp.organization_id = o.id
       JOIN users u ON cp.author_user_id = u.id
       WHERE cp.id = ? AND cp.deleted_at IS NULL`,
      [id]
    );
    if (!rows || rows.length === 0) return res.status(200).json({ status: -1, message: '帖子不存在' });
    const r = rows[0];
    res.status(200).json({
      status: 0, message: '获取成功',
      data: {
        id: r.id,
        title: r.title,
        content: r.content,
        feed_tab: r.feed_tab,
        created_at: r.created_at,
        organization: { id: r.org_id, name: r.org_name, type: r.org_type, avatar: assetUrl(r.org_avatar) },
        author: { id: r.author_id, name: r.nickname || r.username || '匿名' },
      },
    });
  } catch (e) {
    console.error('校园帖详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

// ============================================
// 广场轮播（与食堂轮播结构一致、数据独立）
// ============================================

router.get('/banners', async (req, res) => {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT id, type, title, subtitle, image_url, link_type, link_target
       FROM square_banners
       WHERE is_active = 1
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (ends_at IS NULL OR ends_at >= ?)
       ORDER BY sort_order ASC, id ASC
       LIMIT 10`,
      [now, now]
    );
    const list = (rows || []).map((r) => ({
      id: r.id, type: r.type, title: r.title, subtitle: r.subtitle || '',
      image_url: assetUrl(r.image_url), link_type: r.link_type, link_target: r.link_target || '',
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('广场轮播获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.post('/banners', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const { type, title, subtitle, image_url, link_type, link_target, sort_order } = req.body;
    if (!title || !image_url) return res.status(200).json({ status: -1, message: '请填写标题和图片URL' });
    const result = await query(
      `INSERT INTO square_banners (type, title, subtitle, image_url, link_type, link_target, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type || 'content', cleanText(title), cleanText(subtitle), image_url, link_type || 'none', link_target || null, parseInt(sort_order, 10) || 0]
    );
    res.status(200).json({ status: 0, message: '轮播创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('广场轮播创建错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.patch('/banners/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    const id = parseInt(req.params.id, 10);
    const sets = []; const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(cleanText(req.body.title)); }
    if (req.body.subtitle !== undefined) { sets.push('subtitle = ?'); params.push(cleanText(req.body.subtitle)); }
    if (req.body.image_url !== undefined) { sets.push('image_url = ?'); params.push(req.body.image_url); }
    if (req.body.type !== undefined) { sets.push('type = ?'); params.push(req.body.type); }
    if (req.body.link_type !== undefined) { sets.push('link_type = ?'); params.push(req.body.link_type); }
    if (req.body.link_target !== undefined) { sets.push('link_target = ?'); params.push(req.body.link_target); }
    if (req.body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(parseInt(req.body.sort_order, 10) || 0); }
    if (req.body.is_active !== undefined) { sets.push('is_active = ?'); params.push(req.body.is_active ? 1 : 0); }
    if (sets.length === 0) return res.status(200).json({ status: -1, message: '无更新内容' });
    params.push(id);
    await query(`UPDATE square_banners SET ${sets.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ status: 0, message: '轮播更新成功' });
  } catch (e) {
    console.error('广场轮播更新错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

router.delete('/banners/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ status: -1, message: '仅管理员' });
  try {
    await query('DELETE FROM square_banners WHERE id = ?', [parseInt(req.params.id, 10)]);
    res.status(200).json({ status: 0, message: '轮播已删除' });
  } catch (e) {
    console.error('广场轮播删除错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误' });
  }
});

module.exports = router;
