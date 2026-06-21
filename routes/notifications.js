/**
 * ============================================
 * 通知相关路由（2.0.0）
 * ============================================
 * 列表、已读、未读公告（弹窗用）
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { assetUrl } = require('../utils/assets');
const { simpleCache } = require('../utils/simpleCache');
const { getModuleTypes } = require('../services/notificationService');

function getUnreadAnnouncementCacheKey(userId) {
  return `notifications:unreadAnn:v1:${userId}`;
}

function invalidateUnreadAnnouncementCache(userId) {
  if (!userId) return;
  simpleCache.delete(getUnreadAnnouncementCacheKey(userId));
}

// 为通知附加帖子/发送者等摘要
async function attachNotificationExtra(rows) {
  if (!rows || rows.length === 0) return [];
  const list = [];
  for (const r of rows) {
    let extra = null;
    if (r.extra) {
      try {
        extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra;
      } catch (_) {
        extra = null;
      }
    }
    const item = {
      id: r.id,
      type: r.type,
      is_read: !!r.is_read,
      post_id: r.post_id,
      post_title: r.post_title || null,
      comment_id: r.comment_id,
      from_user_id: r.from_user_id,
      extra,
      created_at: r.created_at
    };
    if (r.from_username || r.from_nickname) {
      item.from_user = {
        id: r.from_user_id,
        username: r.from_username,
        nickname: r.from_nickname,
        avatar: assetUrl(r.from_avatar)
      };
    }

    // 统一 target（用于前端聚合卡片：key/title/path）
    // - post/announcement：来自 post_id + post_title/extra.title
    // - handbook/courseReview：由 extra.target* 提供
    try {
      if (item.post_id) {
        const isAnn = item.type === 'announcement' || item.type === 'system_announcement';
        const title = item.post_title || (isAnn ? (item.extra && (item.extra.content || item.extra.title)) : null) || null;
        item.target = {
          type: isAnn ? 'announcement' : 'post',
          id: item.post_id,
          key: `${isAnn ? 'announcement' : 'post'}:${item.post_id}`,
          title,
          path: `/post/${item.post_id}`,
        };
      } else if (item.extra && item.extra.targetType && item.extra.targetId) {
        const tType = String(item.extra.targetType);
        const tId = Number(item.extra.targetId);
        item.target = {
          type: tType,
          id: tId,
          key: `${tType}:${tId}`,
          title: item.extra.targetTitle || null,
          path: item.extra.targetPath || '#',
        };
      } else {
        item.target = { type: 'unknown', id: item.id, key: `unknown:${item.id}`, title: null, path: '#' };
      }
    } catch {
      item.target = { type: 'unknown', id: item.id, key: `unknown:${item.id}`, title: null, path: '#' };
    }
    list.push(item);
  }
  return list;
}

// ============================================
// 当前用户通知列表（分页，支持 type / is_read 筛选）
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize) + 1;
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }
    const type = req.query.type; // 单类型筛选（兼容旧版）
    const mod = req.query.module; // 模块筛选（新增）
    const isRead = req.query.is_read; // 0 | 1

    let where = 'n.user_id = ?';
    const params = [req.user.id];
    if (mod) {
      const types = getModuleTypes(mod);
      if (types) {
        const placeholders = types.map(() => '?').join(',');
        where += ` AND n.type IN (${placeholders})`;
        params.push(...types);
      }
    } else if (type) {
      where += ' AND n.type = ?';
      params.push(type);
    }
    if (isRead !== undefined && isRead !== '') {
      where += ' AND n.is_read = ?';
      params.push(isRead === '1' ? 1 : 0);
    }

    let rows;
    try {
      rows = await query(
        `SELECT n.id, n.type, n.is_read, n.post_id, n.comment_id, n.from_user_id, n.extra, n.created_at,
          p.title AS post_title,
          u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar
         FROM notifications n
         LEFT JOIN posts p ON n.post_id = p.id
         LEFT JOIN users u ON n.from_user_id = u.id
         WHERE ${where}
         ORDER BY n.created_at DESC
         LIMIT ${limitNum} OFFSET ${offsetNum}`,
        params
      );
    } catch (e) {
      // 兼容未执行 posts.title 迁移：降级不查 post_title
      if (e && e.code === 'ER_BAD_FIELD_ERROR' && String(e.sqlMessage || '').includes('title')) {
        rows = await query(
          `SELECT n.id, n.type, n.is_read, n.post_id, n.comment_id, n.from_user_id, n.extra, n.created_at,
            u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar
           FROM notifications n
           LEFT JOIN users u ON n.from_user_id = u.id
           WHERE ${where}
           ORDER BY n.created_at DESC
           LIMIT ${limitNum} OFFSET ${offsetNum}`,
          params
        );
      } else {
        throw e;
      }
    }
    const list = await attachNotificationExtra(rows);
    const hasMore = rows.length > pageSize;
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: { list, hasMore, page, pageSize }
    });
  } catch (e) {
    console.error('通知列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 未读汇总（给顶栏铃铛用：social/chat/total）
// ============================================
router.get('/unread-summary', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT type, COUNT(*) AS cnt
       FROM notifications
       WHERE user_id = ? AND is_read = 0
       GROUP BY type`,
      [req.user.id]
    );
    const byType = {};
    for (const r of rows || []) {
      byType[r.type] = Number(r.cnt) || 0;
    }
    // 按模块聚合（从 notificationService 获取模块定义）
    const { MODULE_TYPES: allModuleTypes } = require('../services/notificationService');
    const byModule = {};
    for (const [modName, types] of Object.entries(allModuleTypes)) {
      let sum = 0;
      for (const t of types) sum += byType[t] || 0;
      byModule[modName] = sum;
    }
    const total = Object.values(byType).reduce((a, b) => a + (Number(b) || 0), 0);
    res.status(200).json({ status: 0, message: 'ok', data: { total, byType, byModule } });
  } catch (e) {
    console.error('未读汇总错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 清空通知（仅清非公告；公告无法清除）
// ============================================
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const scope = String(req.query.scope || '').trim();
    const mod = String(req.query.module || '').trim();

    if (mod) {
      const types = getModuleTypes(mod);
      if (!types) return res.status(400).json({ status: -1, message: '未知模块' });
      const placeholders = types.map(() => '?').join(',');
      await query(`DELETE FROM notifications WHERE user_id = ? AND type IN (${placeholders})`, [req.user.id, ...types]);
    } else if (scope === 'marketplace') {
      const types = getModuleTypes('marketplace');
      const placeholders = types.map(() => '?').join(',');
      await query(`DELETE FROM notifications WHERE user_id = ? AND type IN (${placeholders})`, [req.user.id, ...types]);
    } else if (scope === 'social') {
      const systemTypes = getModuleTypes('system');
      const mktTypes = getModuleTypes('marketplace');
      const excludeTypes = [...systemTypes, ...mktTypes];
      const placeholders = excludeTypes.map(() => '?').join(',');
      await query(`DELETE FROM notifications WHERE user_id = ? AND type NOT IN (${placeholders})`, [req.user.id, ...excludeTypes]);
    } else {
      const systemTypes = getModuleTypes('system');
      const placeholders = systemTypes.map(() => '?').join(',');
      await query(`DELETE FROM notifications WHERE user_id = ? AND type NOT IN (${placeholders})`, [req.user.id, ...systemTypes]);
    }
    invalidateUnreadAnnouncementCache(req.user.id);
    res.status(200).json({ status: 0, message: 'ok', data: { cleared: true } });
  } catch (e) {
    console.error('清空通知错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 未读公告（登录后弹窗用）
// ============================================
router.get('/unread-announcements', authenticateToken, async (req, res) => {
  try {
    const ttlMs = Number(process.env.CACHE_UNREAD_ANN_TTL_MS || 20 * 1000); // 20s
    const cacheKey = getUnreadAnnouncementCacheKey(req.user.id);
    const list = await simpleCache.getOrSet(cacheKey, ttlMs, async () => {
      const rows = await query(
        `SELECT n.id, n.type, n.is_read, n.post_id, n.extra, n.created_at, n.from_user_id,
          u.username AS from_username, u.nickname AS from_nickname, u.avatar AS from_avatar
         FROM notifications n
         LEFT JOIN users u ON n.from_user_id = u.id
         WHERE n.user_id = ? AND n.type IN ('announcement', 'system_announcement') AND n.is_read = 0
         ORDER BY n.created_at DESC
         LIMIT 20`,
        [req.user.id]
      );
      return await attachNotificationExtra(rows || []);
    });
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('未读公告错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 标记一条通知已读
// ============================================
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ status: -1, message: '通知 ID 无效' });
    const rows = await query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '通知不存在' });
    }
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    invalidateUnreadAnnouncementCache(req.user.id);
    res.status(200).json({ status: 0, message: '已标记为已读' });
  } catch (e) {
    console.error('标记已读错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 批量标记已读（如弹窗关闭时传 id 列表）
// ============================================
router.patch('/read-batch', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: -1, message: '请提供 ids 数组' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      [req.user.id, ...ids]
    );
    invalidateUnreadAnnouncementCache(req.user.id);
    res.status(200).json({ status: 0, message: '已标记为已读' });
  } catch (e) {
    console.error('批量已读错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
