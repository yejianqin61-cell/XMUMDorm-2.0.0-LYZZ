/**
 * 管理员后台路由
 * 全部接口需要 authenticateToken + requireAdmin 双中间件
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');
const { logAudit } = require('../services/auditLog');
const { createNotification, createNotificationBatch } = require('../services/notificationService');
const sensitiveWordFilter = require('../middleware/sensitiveWordFilter');

// 所有路由都需要登录 + 管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// Dashboard 数据面板
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const adminId = req.user.id;

    const results = await Promise.all([
      query('SELECT COUNT(*) AS c FROM users WHERE status != \'deactivated\''),
      query('SELECT COUNT(*) AS c FROM users WHERE role = \'student\' AND status != \'deactivated\''),
      query('SELECT COUNT(*) AS c FROM users WHERE role = \'merchant\' AND status != \'deactivated\''),
      query('SELECT COUNT(*) AS c FROM users WHERE DATE(created_at) = CURDATE()'),
      query('SELECT COUNT(*) AS c FROM users WHERE DATE(last_login_at) = CURDATE()'),
      query('SELECT COUNT(*) AS c FROM posts WHERE deleted_at IS NULL AND hidden_by_admin = 0'),
      query('SELECT COUNT(*) AS c FROM comments WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS c FROM reports WHERE status IN (\'pending\', \'processing\')'),
      query('SELECT COUNT(*) AS c FROM users WHERE status = \'banned\''),
      query('SELECT COUNT(*) AS c FROM posts WHERE deleted_at IS NULL AND type != \'announcement\''),
      query('SELECT COUNT(*) AS c FROM product_comments WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS c FROM trending_posts WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS c FROM course_reviews WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS c FROM club_activities'),
      query('SELECT COUNT(*) AS c FROM marketplace_items WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS c FROM errands'),
      query('SELECT COUNT(*) AS c FROM handbook_articles WHERE status != \'hidden\''),
      query(
        `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.status,
                r.created_at, u1.username AS reporter_name, u2.username AS reported_name
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         ORDER BY r.created_at DESC
         LIMIT 10`
      ),
    ]);

    const count = (i) => results[i]?.[0]?.c ?? 0;
    const recentReports = results[17] || [];

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_VIEW_DASHBOARD',
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({
      status: 0,
      data: {
        totalUsers: count(0),
        studentCount: count(1),
        merchantCount: count(2),
        newUsersToday: count(3),
        activeUsersToday: count(4),
        totalPosts: count(5),
        totalComments: count(6),
        pendingReports: count(7),
        bannedUsers: count(8),
        contentStats: {
          treeholePosts: count(9),
          canteenReviews: count(10),
          trendingPosts: count(11),
          courseReviews: count(12),
          clubActivities: count(13),
          marketplaceItems: count(14),
          errandPosts: count(15),
          handbookArticles: count(16),
        },
        recentReports,
      },
    });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    res.status(500).json({ status: -1, message: '获取 Dashboard 数据失败' });
  }
});

// ============================================
// 用户管理
// ============================================

// 用户列表
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const userStatus = req.query.status || '';

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (userStatus) {
      where += ' AND u.status = ?';
      params.push(userStatus);
    }

    const [countResult, rows] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM users u ${where}`, params),
      query(
        `SELECT u.id, u.student_id, u.username, u.email, u.college, u.role, u.status,
                u.level, u.exp, u.badge, u.avatar, u.nickname,
                u.banned_until, u.muted_until, u.created_at, u.last_login_at
         FROM users u ${where}
         ORDER BY u.created_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total },
    });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ status: -1, message: '获取用户列表失败' });
  }
});

// 用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    const userRows = await query(
      `SELECT id, student_id, username, email, college, role, status, level, exp, badge,
              avatar, nickname, banned_until, muted_until, created_at, last_login_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!userRows || userRows.length === 0) return res.status(404).json({ status: -1, message: '用户不存在' });
    const user = userRows[0];

    const [postCount, commentCount, reportCount, sanctions] = await Promise.all([
      query('SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND deleted_at IS NULL', [userId]),
      query('SELECT COUNT(*) AS c FROM comments WHERE user_id = ? AND deleted_at IS NULL', [userId]),
      query('SELECT COUNT(*) AS c FROM reports WHERE reported_user_id = ?', [userId]),
      query(
        `SELECT id, type, duration_days, reason, operator_id, starts_at, ends_at, revoked_at, revoked_by
         FROM user_sanctions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
        [userId]
      ),
    ]);

    res.json({
      status: 0,
      data: {
        ...user,
        postCount: postCount[0]?.c || 0,
        commentCount: commentCount[0]?.c || 0,
        reportCount: reportCount[0]?.c || 0,
        sanctions,
      },
    });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    res.status(500).json({ status: -1, message: '获取用户详情失败' });
  }
});

// 封禁用户
router.post('/users/:id/ban', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;
    const { duration, reason } = req.body;

    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    const userRows = await query('SELECT id, username, role, status FROM users WHERE id = ?', [userId]);
    if (!userRows || userRows.length === 0) return res.status(404).json({ status: -1, message: '用户不存在' });
    if (userRows[0].role === 'admin') return res.status(403).json({ status: -1, message: '不能封禁管理员' });

    const durationDays = duration ? parseInt(duration, 10) : null;
    const endsAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO user_sanctions (user_id, type, duration_days, reason, operator_id, ends_at)
       VALUES (?, 'ban', ?, ?, ?, ?)`,
      [userId, durationDays, reason || null, adminId, endsAt]
    );

    await query(
      `UPDATE users SET status = 'banned', banned_until = ? WHERE id = ?`,
      [endsAt, userId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_BAN_USER',
      targetType: 'user',
      targetId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
      meta: { duration, reason },
    }).catch(() => {});

    // 通知被封用户（fire-and-forget，失败不影响封禁操作）
    try {
      const banMsg = durationDays ? `你的账号已被封禁 ${durationDays} 天` : '你的账号已被永久封禁';
      const extraMsg = reason ? `${banMsg}，原因：${reason}` : banMsg;
      createNotification({
        userId, type: 'system_ban', fromUserId: adminId,
        extra: { message: extraMsg, duration: durationDays, reason },
      }).catch(() => {});
    } catch (_) { /* 通知失败不阻断封禁 */ }

    res.json({ status: 0, message: '封禁成功' });
  } catch (err) {
    console.error('[admin/users/:id/ban]', err);
    res.status(500).json({ status: -1, message: '封禁操作失败' });
  }
});

// 解除封禁
router.post('/users/:id/unban', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    await query(
      `UPDATE user_sanctions SET revoked_at = NOW(), revoked_by = ?
       WHERE user_id = ? AND type = 'ban' AND revoked_at IS NULL
         AND (ends_at IS NULL OR ends_at > NOW())`,
      [adminId, userId]
    );

    await query(
      `UPDATE users SET status = 'active', banned_until = NULL WHERE id = ?`,
      [userId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_UNBAN_USER',
      targetType: 'user',
      targetId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({ status: 0, message: '已解除封禁' });
  } catch (err) {
    console.error('[admin/users/:id/unban]', err);
    res.status(500).json({ status: -1, message: '解除封禁失败' });
  }
});

// 禁言用户
router.post('/users/:id/mute', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;
    const { duration, reason } = req.body;

    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    const userRows = await query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    if (!userRows || userRows.length === 0) return res.status(404).json({ status: -1, message: '用户不存在' });
    if (userRows[0].role === 'admin') return res.status(403).json({ status: -1, message: '不能禁言管理员' });

    const durationDays = duration ? parseInt(duration, 10) : null;
    const endsAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO user_sanctions (user_id, type, duration_days, reason, operator_id, ends_at)
       VALUES (?, 'mute', ?, ?, ?, ?)`,
      [userId, durationDays, reason || null, adminId, endsAt]
    );

    await query('UPDATE users SET muted_until = ? WHERE id = ?', [endsAt, userId]);

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_MUTE_USER',
      targetType: 'user',
      targetId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
      meta: { duration, reason },
    }).catch(() => {});

    res.json({ status: 0, message: '禁言成功' });
  } catch (err) {
    console.error('[admin/users/:id/mute]', err);
    res.status(500).json({ status: -1, message: '禁言操作失败' });
  }
});

// 解除禁言
router.post('/users/:id/unmute', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    await query(
      `UPDATE user_sanctions SET revoked_at = NOW(), revoked_by = ?
       WHERE user_id = ? AND type = 'mute' AND revoked_at IS NULL
         AND (ends_at IS NULL OR ends_at > NOW())`,
      [adminId, userId]
    );

    await query('UPDATE users SET muted_until = NULL WHERE id = ?', [userId]);

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_UNMUTE_USER',
      targetType: 'user',
      targetId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({ status: 0, message: '已解除禁言' });
  } catch (err) {
    console.error('[admin/users/:id/unmute]', err);
    res.status(500).json({ status: -1, message: '解除禁言失败' });
  }
});

// 删除账号
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (!userId) return res.status(400).json({ status: -1, message: '无效的用户ID' });

    const userRows = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!userRows || userRows.length === 0) return res.status(404).json({ status: -1, message: '用户不存在' });
    if (userRows[0].role === 'admin') return res.status(403).json({ status: -1, message: '不能删除管理员账号' });

    await query("UPDATE users SET status = 'deactivated' WHERE id = ?", [userId]);

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_DELETE_USER',
      targetType: 'user',
      targetId: userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({ status: 0, message: '账号已注销' });
  } catch (err) {
    console.error('[admin/users/:id/delete]', err);
    res.status(500).json({ status: -1, message: '删除账号失败' });
  }
});

// ============================================
// 举报中心
// ============================================

// 举报列表
router.get('/reports', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const reportStatus = req.query.status || '';

    let where = 'WHERE 1=1';
    const params = [];

    if (reportStatus) {
      where += ' AND r.status = ?';
      params.push(reportStatus);
    }

    const [countResult, rows] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM reports r ${where}`, params),
      query(
        `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.detail,
                r.status, r.handler_id, r.handler_note, r.handled_at, r.created_at,
                u1.username AS reporter_name, u2.username AS reported_name
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         ${where}
         ORDER BY FIELD(r.status, 'pending', 'processing', 'resolved', 'dismissed'), r.created_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total },
    });
  } catch (err) {
    console.error('[admin/reports]', err);
    res.status(500).json({ status: -1, message: '获取举报列表失败' });
  }
});

// 举报详情（含被举报内容的跳转链接）
router.get('/reports/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ status: -1, message: '无效的举报ID' });

    const rows = await query(
      `SELECT r.*, u1.username AS reporter_name, u2.username AS reported_name
       FROM reports r
       LEFT JOIN users u1 ON r.reporter_id = u1.id
       LEFT JOIN users u2 ON r.reported_user_id = u2.id
       WHERE r.id = ?`,
      [reportId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '举报不存在' });

    const report = rows[0];

    // 解析被举报内容的跳转链接
    const contentInfo = await resolveContentUrl(report.target_type, report.target_id);
    report.content_url = contentInfo.url;
    report.content_label = contentInfo.label;

    res.json({ status: 0, data: report });
  } catch (err) {
    console.error('[admin/reports/:id]', err);
    res.status(500).json({ status: -1, message: '获取举报详情失败' });
  }
});

// 处理举报
router.patch('/reports/:id/process', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const adminId = req.user.id;
    const { action, note } = req.body;

    if (!reportId || !action) {
      return res.status(400).json({ status: -1, message: '缺少必要参数' });
    }

    const reportRows = await query('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!reportRows || reportRows.length === 0) return res.status(404).json({ status: -1, message: '举报不存在' });

    let newStatus = 'resolved';
    if (action === 'dismiss') newStatus = 'dismissed';

    await query(
      `UPDATE reports SET status = ?, handler_id = ?, handler_note = ?, handled_at = NOW()
       WHERE id = ?`,
      [newStatus, adminId, note || null, reportId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_PROCESS_REPORT',
      targetType: 'report',
      targetId: reportId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
      meta: { action, note },
    }).catch(() => {});

    res.json({ status: 0, message: '处理完成' });
  } catch (err) {
    console.error('[admin/reports/:id/process]', err);
    res.status(500).json({ status: -1, message: '处理举报失败' });
  }
});

// ============================================
// 公告管理
// ============================================

// 公告列表
router.get('/announcements', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const [countResult, rows] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM posts WHERE type = \'announcement\''),
      query(
        `SELECT p.id, p.title, p.content, p.created_at, u.username AS author
         FROM posts p LEFT JOIN users u ON p.user_id = u.id
         WHERE p.type = 'announcement' AND p.deleted_at IS NULL
         ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total },
    });
  } catch (err) {
    console.error('[admin/announcements]', err);
    res.status(500).json({ status: -1, message: '获取公告列表失败' });
  }
});

// 发布公告
router.post('/announcements', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ status: -1, message: '标题和内容不能为空' });
    }

    const result = await query(
      `INSERT INTO posts (user_id, title, content, type) VALUES (?, ?, ?, 'announcement')`,
      [adminId, title, content]
    );
    const postId = result.insertId;

    await query(
      `INSERT INTO notifications (user_id, type, post_id, from_user_id)
       SELECT u.id, 'system_announcement', ?, ? FROM users u WHERE u.status = 'active'`,
      [postId, adminId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_CREATE_ANNOUNCEMENT',
      targetType: 'post',
      targetId: postId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
      meta: { title },
    }).catch(() => {});

    res.json({ status: 0, data: { id: postId, title }, message: '公告发布成功' });
  } catch (err) {
    console.error('[admin/announcements]', err);
    res.status(500).json({ status: -1, message: '发布公告失败' });
  }
});

// 编辑公告
router.patch('/announcements/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const adminId = req.user.id;
    const { title, content } = req.body;

    if (!postId || (!title && !content)) {
      return res.status(400).json({ status: -1, message: '缺少必要参数' });
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    params.push(postId);
    await query(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND type = 'announcement'`, params);

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_UPDATE_ANNOUNCEMENT',
      targetType: 'post',
      targetId: postId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({ status: 0, message: '公告已更新' });
  } catch (err) {
    console.error('[admin/announcements/:id]', err);
    res.status(500).json({ status: -1, message: '更新公告失败' });
  }
});

// 删除公告
router.delete('/announcements/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    await query(
      'UPDATE posts SET deleted_at = NOW() WHERE id = ? AND type = \'announcement\'',
      [postId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_DELETE_ANNOUNCEMENT',
      targetType: 'post',
      targetId: postId,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    }).catch(() => {});

    res.json({ status: 0, message: '公告已删除' });
  } catch (err) {
    console.error('[admin/announcements/:id]', err);
    res.status(500).json({ status: -1, message: '删除公告失败' });
  }
});

// ============================================
// 操作日志
// ============================================

router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const filterUserId = req.query.userId || '';
    const filterAction = req.query.action || '';

    let where = 'WHERE 1=1';
    const params = [];

    if (filterUserId) {
      where += ' AND a.user_id = ?';
      params.push(filterUserId);
    }
    if (filterAction) {
      where += ' AND a.action = ?';
      params.push(filterAction);
    }

    const [countResult, rows] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params),
      query(
        `SELECT a.id, a.user_id, a.role, a.action, a.target_type, a.target_id,
                a.ip, a.created_at, u.username
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ${where}
         ORDER BY a.created_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total },
    });
  } catch (err) {
    console.error('[admin/audit-logs]', err);
    res.status(500).json({ status: -1, message: '获取操作日志失败' });
  }
});

// ============================================
// 系统配置
// ============================================

// 获取所有系统配置
router.get('/configs', async (req, res) => {
  try {
    const rows = await query('SELECT config_key, config_value, description FROM system_configs ORDER BY config_key');
    const configs = {};
    for (const r of rows) {
      configs[r.config_key] = { value: r.config_value, description: r.description };
    }
    res.json({ status: 0, data: configs });
  } catch (err) {
    console.error('[admin/configs]', err);
    res.status(500).json({ status: -1, message: '获取系统配置失败' });
  }
});

// 更新单个配置
router.patch('/configs/:key', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ status: -1, message: '缺少 config_value' });
    }

    await query(
      `INSERT INTO system_configs (config_key, config_value, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)`,
      [key, String(value), adminId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_CONFIG_UPDATE',
      targetType: 'system_config',
      targetId: null,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
      meta: { key, value: String(value) },
    }).catch(() => {});

    res.json({ status: 0, message: '配置已更新' });
  } catch (err) {
    console.error('[admin/configs]', err);
    res.status(500).json({ status: -1, message: '更新配置失败' });
  }
});

// 获取等级系统配置（聚合三个 key）
router.get('/level-config', async (req, res) => {
  try {
    const rows = await query(
      `SELECT config_key, config_value FROM system_configs
       WHERE config_key IN ('level_thresholds', 'exp_daily_caps', 'exp_action_rewards')`
    );
    const config = {};
    for (const r of rows) {
      try { config[r.config_key] = JSON.parse(r.config_value); } catch (_) { config[r.config_key] = r.config_value; }
    }
    res.json({ status: 0, data: config });
  } catch (err) {
    console.error('[admin/level-config]', err);
    res.status(500).json({ status: -1, message: '获取等级配置失败' });
  }
});

// 更新等级系统配置
router.patch('/level-config', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { level_thresholds, exp_daily_caps, exp_action_rewards } = req.body;

    const updates = { level_thresholds, exp_daily_caps, exp_action_rewards };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        await query(
          `INSERT INTO system_configs (config_key, config_value, updated_by) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)`,
          [key, str, adminId]
        );
      }
    }

    logAudit({
      userId: adminId, role: 'admin', action: 'ADMIN_CONFIG_UPDATE',
      targetType: 'level_config', ip: req.ip,
      meta: { keys: Object.keys(updates).filter((k) => updates[k] !== undefined) },
    }).catch(() => {});

    res.json({ status: 0, message: '等级配置已更新' });
  } catch (err) {
    console.error('[admin/level-config]', err);
    res.status(500).json({ status: -1, message: '更新等级配置失败' });
  }
});

// ============================================
// 敏感词管理
// ============================================

// 敏感词列表
router.get('/sensitive-words', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const offset = (page - 1) * pageSize;
    const search = req.query.search || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND word LIKE ?';
      params.push(`%${search}%`);
    }

    const [countResult, rows] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM sensitive_words ${where}`, params),
      query(`SELECT * FROM sensitive_words ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`, params),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total },
    });
  } catch (err) {
    console.error('[admin/sensitive-words]', err);
    res.status(500).json({ status: -1, message: '获取敏感词列表失败' });
  }
});

// 新增敏感词
router.post('/sensitive-words', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { word, category } = req.body;

    if (!word || !word.trim()) {
      return res.status(400).json({ status: -1, message: '敏感词不能为空' });
    }

    const trimmed = word.trim();
    await query(
      'INSERT INTO sensitive_words (word, category, created_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = 1, category = VALUES(category)',
      [trimmed, category || 'general', adminId]
    );

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_CONFIG_UPDATE',
      targetType: 'sensitive_word',
      ip: req.ip,
      meta: { word: trimmed, action: 'create' },
    }).catch(() => {});

    sensitiveWordFilter.refreshCache().catch(() => {});
    res.json({ status: 0, message: '敏感词已添加' });
  } catch (err) {
    console.error('[admin/sensitive-words]', err);
    res.status(500).json({ status: -1, message: '添加敏感词失败' });
  }
});

// 批量导入敏感词
router.post('/sensitive-words/batch', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { words } = req.body;

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ status: -1, message: '请提供敏感词数组' });
    }

    let added = 0;
    for (const w of words) {
      if (w && String(w).trim()) {
        try {
          await query(
            'INSERT INTO sensitive_words (word, created_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = 1',
            [String(w).trim(), adminId]
          );
          added++;
        } catch (_) { /* 跳过重复 */ }
      }
    }

    sensitiveWordFilter.refreshCache().catch(() => {});
    res.json({ status: 0, message: `成功导入 ${added} 个敏感词`, data: { added } });
  } catch (err) {
    console.error('[admin/sensitive-words/batch]', err);
    res.status(500).json({ status: -1, message: '批量导入失败' });
  }
});

// 删除敏感词
router.delete('/sensitive-words/:id', async (req, res) => {
  try {
    const wordId = parseInt(req.params.id, 10);
    await query('DELETE FROM sensitive_words WHERE id = ?', [wordId]);
    sensitiveWordFilter.refreshCache().catch(() => {});
    res.json({ status: 0, message: '已删除' });
  } catch (err) {
    console.error('[admin/sensitive-words/:id]', err);
    res.status(500).json({ status: -1, message: '删除失败' });
  }
});

// 启用/停用敏感词
router.patch('/sensitive-words/:id/toggle', async (req, res) => {
  try {
    const wordId = parseInt(req.params.id, 10);
    const rows = await query('SELECT enabled FROM sensitive_words WHERE id = ?', [wordId]);
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '敏感词不存在' });

    const newState = rows[0].enabled ? 0 : 1;
    await query('UPDATE sensitive_words SET enabled = ? WHERE id = ?', [newState, wordId]);
    sensitiveWordFilter.refreshCache().catch(() => {});
    res.json({ status: 0, data: { enabled: !!newState }, message: newState ? '已启用' : '已停用' });
  } catch (err) {
    console.error('[admin/sensitive-words/:id/toggle]', err);
    res.status(500).json({ status: -1, message: '操作失败' });
  }
});

// ============================================
// 辅助函数：解析被举报内容的跳转链接
// ============================================

async function resolveContentUrl(targetType, targetId) {
  const id = parseInt(targetId, 10);
  const labels = {
    post: '查看树洞帖子', comment: '查看帖子评论', trending_post: '查看热搜帖子',
    campus_post: '查看校园此刻', product_comment: '查看食堂点评',
    club_activity: '查看社团活动', club_post: '查看社团帖子',
    marketplace: '查看二手商品', errand: '查看跑腿帖子',
    handbook_article: '查看一站通文章', handbook_comment: '查看一站通评论',
    course_review: '查看课程点评',
  };

  try {
    switch (targetType) {
      case 'post':
        return { url: `/post/${id}`, label: labels.post };
      case 'trending_post':
        return { url: `/about/trending/post/${id}`, label: labels.trending_post };
      case 'campus_post':
        return { url: `/about/campus/${id}`, label: labels.campus_post };
      case 'comment': {
        const commentRows = await query('SELECT post_id FROM comments WHERE id = ?', [id]);
        const postId = commentRows[0]?.post_id;
        return { url: postId ? `/post/${postId}` : null, label: postId ? `${labels.comment} → 帖子#${postId}` : labels.comment };
      }
      case 'trending_comment': {
        const tr = await query('SELECT post_id FROM trending_post_comments WHERE id = ?', [id]);
        const postId = tr[0]?.post_id;
        return { url: postId ? `/about/trending/post/${postId}` : null, label: postId ? `热搜评论 → 帖子#${postId}` : '热搜评论' };
      }
      case 'campus_comment': {
        const cr = await query('SELECT post_id FROM campus_post_comments WHERE id = ?', [id]);
        const postId = cr[0]?.post_id;
        return { url: postId ? `/about/campus/${postId}` : null, label: postId ? `校园此刻评论 → 帖子#${postId}` : '校园此刻评论' };
      }
      case 'club_comment': {
        const cc = await query('SELECT target_type, target_id FROM club_comments WHERE id = ?', [id]);
        const t = cc[0];
        if (t?.target_type === 'activity') return { url: `/about/club/activity/${t.target_id}`, label: `社团评论 → 活动#${t.target_id}` };
        if (t?.target_type === 'post') return { url: `/about/club/post/${t.target_id}`, label: `社团评论 → 帖子#${t.target_id}` };
        return { url: null, label: '社团评论' };
      }
      case 'course_review_comment': {
        const crr = await query('SELECT review_id FROM course_review_comments WHERE id = ?', [id]);
        const rid = crr[0]?.review_id;
        return { url: rid ? `/about/freshman-guide/course-review/${rid}` : null, label: rid ? `课程评论 → #${rid}` : '课程评论' };
      }
      case 'product_comment': {
        const pcRows = await query('SELECT product_id FROM product_comments WHERE id = ?', [id]);
        const productId = pcRows[0]?.product_id;
        return { url: productId ? `/eat/food/${productId}` : null, label: productId ? `${labels.product_comment} → 菜品#${productId}` : labels.product_comment };
      }
      case 'club_activity':
        return { url: `/about/club/activity/${id}`, label: labels.club_activity };
      case 'club_post':
        return { url: `/about/club/post/${id}`, label: labels.club_post };
      case 'marketplace':
        return { url: `/about/second-hand/item/${id}`, label: labels.marketplace };
      case 'errand':
        return { url: `/about/errands/${id}`, label: labels.errand };
      case 'handbook_article':
        return { url: `/about/freshman-guide/a/${id}`, label: labels.handbook_article };
      case 'handbook_comment': {
        const hcRows = await query('SELECT article_id FROM handbook_comments WHERE id = ?', [id]);
        const articleId = hcRows[0]?.article_id;
        return { url: articleId ? `/about/freshman-guide/a/${articleId}` : null, label: articleId ? `${labels.handbook_comment} → 文章#${articleId}` : labels.handbook_comment };
      }
      case 'course_review':
        return { url: `/about/freshman-guide/course-review/${id}`, label: labels.course_review };
      default:
        return { url: null, label: null };
    }
  } catch (_) {
    return { url: null, label: null };
  }
}

// ============================================
// 通用内容管理（8 模块统一后台）
// ============================================

const CONTENT_MODULES = {
  treehole: {
    label: '树洞帖子',
    table: 'posts',
    idField: 'id',
    titleField: 'COALESCE(p.title, LEFT(p.content, 60)) AS title',
    contentField: 'p.content',
    userField: 'p.user_id',
    timeField: 'p.created_at',
    deletedField: 'p.deleted_at',
    hiddenField: 'p.hidden_by_admin',
    searchFields: ['p.content'],
    joinUser: true,
    listFields: 'p.id, COALESCE(p.title, LEFT(p.content, 60)) AS title, u.username, p.created_at, p.deleted_at, p.hidden_by_admin',
    listOrder: 'p.created_at DESC',
    hasComments: true,
    commentTable: 'comments',
    commentIdField: 'id',
    commentParentField: 'post_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
  canteen: {
    label: '食堂点评',
    table: 'product_comments',
    idField: 'id',
    titleField: 'LEFT(pc.content, 60) AS title',
    contentField: 'pc.content',
    userField: 'pc.user_id',
    timeField: 'pc.created_at',
    deletedField: 'pc.deleted_at',
    hiddenField: null,
    searchFields: ['pc.content'],
    joinUser: true,
    listFields: 'pc.id, LEFT(pc.content, 60) AS title, u.username, pc.created_at, pc.deleted_at',
    listOrder: 'pc.created_at DESC',
    tableAlias: 'pc',
    hasComments: true,
    commentTable: 'product_comments',
    commentIdField: 'id',
    commentParentField: 'parent_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
    commentParentIsParent: true,
  },
  trending: {
    label: '热搜帖子',
    table: 'trending_posts',
    idField: 'id',
    titleField: 'LEFT(tp.content, 60) AS title',
    contentField: 'tp.content',
    userField: 'tp.user_id',
    timeField: 'tp.created_at',
    deletedField: 'tp.deleted_at',
    hiddenField: 'tp.hidden_by_admin',
    searchFields: ['tp.content'],
    joinUser: true,
    listFields: 'tp.id, LEFT(tp.content, 60) AS title, u.username, tp.created_at, tp.deleted_at, tp.hidden_by_admin',
    listOrder: 'tp.created_at DESC',
    tableAlias: 'tp',
    hasComments: true,
    commentTable: 'trending_post_comments',
    commentIdField: 'id',
    commentParentField: 'post_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
  campus: {
    label: '校园此刻',
    table: 'posts',
    idField: 'id',
    titleField: 'LEFT(p2.content, 60) AS title',
    contentField: 'p2.content',
    userField: 'p2.user_id',
    timeField: 'p2.created_at',
    deletedField: 'p2.deleted_at',
    hiddenField: null,
    searchFields: ['p2.content'],
    joinUser: true,
    listFields: 'p2.id, LEFT(p2.content, 60) AS title, u.username, p2.created_at, p2.deleted_at',
    listOrder: 'p2.created_at DESC',
    tableAlias: 'p2',
    hasComments: true,
    commentTable: 'campus_post_comments',
    commentIdField: 'id',
    commentParentField: 'post_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
  club: {
    label: '社团内容',
    table: 'club_posts',
    idField: 'id',
    titleField: 'COALESCE(cp.title, LEFT(cp.content, 60)) AS title',
    contentField: 'cp.content',
    userField: null,
    timeField: 'cp.created_at',
    deletedField: null,
    hiddenField: null,
    searchFields: ['cp.title', 'cp.content'],
    joinUser: false,
    listFields: 'cp.id, COALESCE(cp.title, LEFT(cp.content, 60)) AS title, cp.created_at',
    listOrder: 'cp.created_at DESC',
    tableAlias: 'cp',
    hasComments: true,
    commentTable: 'club_comments',
    commentIdField: 'id',
    commentParentField: 'target_id',
    commentParentType: 'post',
    commentParentTypeField: 'target_type',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
  marketplace: {
    label: '二手市场',
    table: 'marketplace_items',
    idField: 'id',
    titleField: 'mi.title AS title',
    contentField: 'mi.description',
    userField: 'mi.seller_user_id',
    timeField: 'mi.created_at',
    deletedField: 'mi.deleted_at',
    hiddenField: null,
    statusField: 'mi.status',
    searchFields: ['mi.title', 'mi.description'],
    joinUser: true,
    listFields: 'mi.id, mi.title, u.username, mi.created_at, mi.deleted_at, mi.status',
    listOrder: 'mi.created_at DESC',
    tableAlias: 'mi',
  },
  errand: {
    label: '跑腿帖子',
    table: 'errands',
    idField: 'id',
    titleField: 'e.title AS title',
    contentField: 'e.detail',
    userField: 'e.owner_user_id',
    timeField: 'e.created_at',
    deletedField: null,
    hiddenField: null,
    statusField: 'e.status',
    searchFields: ['e.title', 'e.detail'],
    joinUser: true,
    listFields: 'e.id, e.title, u.username, e.created_at, e.status',
    listOrder: 'e.created_at DESC',
    tableAlias: 'e',
  },
  handbook: {
    label: '一站通文章',
    table: 'handbook_articles',
    idField: 'id',
    titleField: 'ha.title AS title',
    contentField: 'ha.content',
    userField: 'ha.author_user_id',
    timeField: 'ha.created_at',
    deletedField: null,
    hiddenField: null,
    statusField: 'ha.status',
    searchFields: ['ha.title', 'ha.content'],
    joinUser: true,
    listFields: 'ha.id, ha.title, u.username, ha.created_at, ha.status',
    listOrder: 'ha.created_at DESC',
    tableAlias: 'ha',
    hasComments: true,
    commentTable: 'handbook_comments',
    commentIdField: 'id',
    commentParentField: 'article_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
  'course-review': {
    label: '课程点评',
    table: 'course_reviews',
    idField: 'id',
    titleField: 'cr.title AS title',
    contentField: 'cr.content',
    userField: 'cr.created_by',
    timeField: 'cr.created_at',
    deletedField: 'cr.deleted_at',
    hiddenField: null,
    searchFields: ['cr.title', 'cr.content'],
    joinUser: true,
    listFields: 'cr.id, cr.title, u.username, cr.created_at, cr.deleted_at',
    listOrder: 'cr.created_at DESC',
    tableAlias: 'cr',
    hasComments: true,
    commentTable: 'course_review_comments',
    commentIdField: 'id',
    commentParentField: 'review_id',
    commentUserField: 'user_id',
    commentContentField: 'content',
    commentTimeField: 'created_at',
    commentDeletedField: 'deleted_at',
  },
};

// 内容列表
router.get('/contents/:module', async (req, res) => {
  try {
    const mod = CONTENT_MODULES[req.params.module];
    if (!mod) return res.status(400).json({ status: -1, message: '未知模块' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const search = req.query.search || '';
    const alias = mod.tableAlias || mod.table.charAt(0);

    let where = 'WHERE 1=1';
    const params = [];

    if (mod.deletedField) {
      where += ` AND ${mod.deletedField} IS NULL`;
    }
    if (mod.hiddenField) {
      where += ` AND ${mod.hiddenField} = 0`;
    }
    if (search && mod.searchFields.length > 0) {
      const clauses = mod.searchFields.map((f) => `${f} LIKE ?`);
      where += ` AND (${clauses.join(' OR ')})`;
      const like = `%${search}%`;
      mod.searchFields.forEach(() => params.push(like));
    }

    const fromClause = mod.joinUser
      ? `FROM ${mod.table} ${alias} LEFT JOIN users u ON ${mod.userField} = u.id`
      : `FROM ${mod.table} ${alias}`;

    const [countResult, rows] = await Promise.all([
      query(`SELECT COUNT(*) AS total ${fromClause} ${where}`, params),
      query(
        `SELECT ${mod.listFields} ${fromClause} ${where} ORDER BY ${mod.listOrder} LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      status: 0,
      data: { list: rows, total, page, pageSize, hasMore: offset + rows.length < total, moduleLabel: mod.label },
    });
  } catch (err) {
    console.error('[admin/contents]', err);
    res.status(500).json({ status: -1, message: '获取内容列表失败' });
  }
});

// 内容详情（含评论）
router.get('/contents/:module/:id', async (req, res) => {
  try {
    const mod = CONTENT_MODULES[req.params.module];
    if (!mod) return res.status(400).json({ status: -1, message: '未知模块' });

    const contentId = parseInt(req.params.id, 10);
    if (!contentId) return res.status(400).json({ status: -1, message: '无效ID' });

    const alias = mod.tableAlias || mod.table.charAt(0);
    const fromClause = mod.joinUser
      ? `FROM ${mod.table} ${alias} LEFT JOIN users u ON ${mod.userField} = u.id`
      : `FROM ${mod.table} ${alias}`;

    const rows = await query(
      `SELECT ${mod.listFields}, ${mod.contentField || 'NULL'} AS content ${fromClause} WHERE ${alias}.${mod.idField} = ?`,
      [contentId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ status: -1, message: '内容不存在' });

    const item = rows[0];

    // 查评论
    let comments = [];
    if (mod.hasComments) {
      const cAlias = mod.commentTable.charAt(0);
      let commentWhere = `WHERE ${cAlias}.${mod.commentParentField} = ?`;
      const commentParams = [contentId];
      if (mod.commentParentType) {
        commentWhere += ` AND ${cAlias}.${mod.commentParentTypeField} = ?`;
        commentParams.push(mod.commentParentType);
      }
      if (mod.commentDeletedField) {
        commentWhere += ` AND ${cAlias}.${mod.commentDeletedField} IS NULL`;
      }
      if (mod.commentParentIsParent) {
        commentWhere += ` AND ${cAlias}.parent_id IS NULL`;
      }
      comments = await query(
        `SELECT ${cAlias}.${mod.commentIdField} AS id, ${cAlias}.${mod.commentUserField} AS user_id,
                ${cAlias}.${mod.commentContentField} AS content, ${cAlias}.${mod.commentTimeField} AS created_at,
                ${mod.commentDeletedField ? `${cAlias}.${mod.commentDeletedField} AS deleted_at` : 'NULL AS deleted_at'},
                cu.username
         FROM ${mod.commentTable} ${cAlias}
         LEFT JOIN users cu ON ${cAlias}.${mod.commentUserField} = cu.id
         ${commentWhere}
         ORDER BY ${cAlias}.${mod.commentTimeField} DESC
         LIMIT 100`,
        commentParams
      );
    }

    res.json({ status: 0, data: { ...item, comments, moduleLabel: mod.label } });
  } catch (err) {
    console.error('[admin/contents/:id]', err);
    res.status(500).json({ status: -1, message: '获取内容详情失败' });
  }
});

// 隐藏/恢复内容
router.patch('/contents/:module/:id/toggle-visibility', async (req, res) => {
  try {
    const mod = CONTENT_MODULES[req.params.module];
    if (!mod) return res.status(400).json({ status: -1, message: '未知模块' });

    const contentId = parseInt(req.params.id, 10);
    const { hidden } = req.body; // true = hide, false = restore
    const adminId = req.user.id;

    if (!mod.hiddenField && !mod.deletedField) {
      return res.status(400).json({ status: -1, message: '该模块不支持隐藏/恢复操作，请使用删除' });
    }

    if (mod.hiddenField) {
      await query(`UPDATE ${mod.table} SET ${mod.hiddenField} = ? WHERE ${mod.idField} = ?`, [hidden ? 1 : 0, contentId]);
    } else if (mod.deletedField) {
      if (hidden) {
        await query(`UPDATE ${mod.table} SET ${mod.deletedField} = NOW() WHERE ${mod.idField} = ?`, [contentId]);
      } else {
        await query(`UPDATE ${mod.table} SET ${mod.deletedField} = NULL WHERE ${mod.idField} = ?`, [contentId]);
      }
    }

    logAudit({
      userId: adminId,
      role: 'admin',
      action: hidden ? 'ADMIN_HIDE_CONTENT' : 'ADMIN_RESTORE_CONTENT',
      targetType: req.params.module,
      targetId: contentId,
      ip: req.ip,
    }).catch(() => {});

    res.json({ status: 0, message: hidden ? '已隐藏' : '已恢复' });
  } catch (err) {
    console.error('[admin/contents/toggle]', err);
    res.status(500).json({ status: -1, message: '操作失败' });
  }
});

// 删除内容
router.delete('/contents/:module/:id', async (req, res) => {
  try {
    const mod = CONTENT_MODULES[req.params.module];
    if (!mod) return res.status(400).json({ status: -1, message: '未知模块' });

    const contentId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (mod.deletedField) {
      await query(`UPDATE ${mod.table} SET ${mod.deletedField} = NOW() WHERE ${mod.idField} = ?`, [contentId]);
    } else {
      await query(`DELETE FROM ${mod.table} WHERE ${mod.idField} = ?`, [contentId]);
    }

    logAudit({
      userId: adminId,
      role: 'admin',
      action: 'ADMIN_DELETE_CONTENT',
      targetType: req.params.module,
      targetId: contentId,
      ip: req.ip,
    }).catch(() => {});

    res.json({ status: 0, message: '已删除' });
  } catch (err) {
    console.error('[admin/contents/delete]', err);
    res.status(500).json({ status: -1, message: '删除失败' });
  }
});

module.exports = router;
