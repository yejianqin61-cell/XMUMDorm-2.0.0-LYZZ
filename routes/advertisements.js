const express = require('express');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');
const { postImagesUpload, savePostImages } = require('../middleware/upload');
const { assetUrl } = require('../utils/assets');
const { logAudit } = require('../services/auditLog');

const STATUS_VALUES = new Set(['draft', 'active', 'archived']);
const CTA_VALUES = new Set(['none', 'shop', 'product', 'region', 'internal', 'https']);

function cleanText(value, maxLength = null) {
  const cleaned = sanitizeHtml(value == null ? '' : String(value), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
  return maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function parseStatus(value, fallback = 'draft') {
  const status = String(value || fallback).trim().toLowerCase();
  return STATUS_VALUES.has(status) ? status : null;
}

function parseCtaType(value) {
  const type = String(value || 'none').trim().toLowerCase();
  return CTA_VALUES.has(type) ? type : null;
}

function migrationError(error) {
  return error && error.code === 'ER_NO_SUCH_TABLE' && String(error.sqlMessage || error.message || '').includes('advertisement_posts');
}

async function attachImages(rows) {
  const ids = (rows || []).map((row) => row.post_id).filter(Boolean);
  if (!ids.length) return rows || [];
  const placeholders = ids.map(() => '?').join(',');
  const images = await query(
    `SELECT post_id, file_path, sort_order
     FROM post_images
     WHERE post_id IN (${placeholders})
     ORDER BY post_id ASC, sort_order ASC, id ASC`,
    ids
  );
  const byPost = {};
  for (const image of images || []) {
    if (!byPost[image.post_id]) byPost[image.post_id] = [];
    byPost[image.post_id].push({
      url: assetUrl(image.file_path),
      sort_order: Number(image.sort_order || 0),
    });
  }
  return (rows || []).map((row) => ({ ...row, images: byPost[row.post_id] || [] }));
}

function mapRow(row) {
  return {
    id: row.post_id,
    title: row.title,
    content: row.content,
    status: row.ad_status,
    sponsor_name: row.sponsor_name,
    sponsor_logo: row.sponsor_logo ? assetUrl(row.sponsor_logo) : null,
    cta_label: row.cta_label || '',
    cta_type: row.cta_type,
    cta_target: row.cta_target || '',
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: row.images || [],
    banner_count: Number(row.banner_count || 0),
    click_count: Number(row.click_count || 0),
  };
}

function sendDatabaseError(res, error) {
  if (migrationError(error)) {
    return res.status(503).json({
      status: -1,
      message: '广告功能尚未初始化，请先执行 migrations/062_advertisement_posts.sql',
    });
  }
  return res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
}

function clickMigrationError(error) {
  return error && error.code === 'ER_NO_SUCH_TABLE'
    && String(error.sqlMessage || error.message || '').includes('advertisement_clicks');
}

function sendClickDatabaseError(res, error) {
  if (clickMigrationError(error)) {
    return res.status(503).json({
      status: -1,
      message: '广告统计尚未初始化，请先执行 migrations/063_advertisement_clicks.sql',
    });
  }
  return sendDatabaseError(res, error);
}

function withUpload(handler) {
  return (req, res, next) => {
    postImagesUpload(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          status: -1,
          message: error.message || '图片格式或大小不符合要求',
        });
      }
      return handler(req, res, next);
    });
  };
}

/**
 * Public access is deliberately narrower than admin preview:
 * an advertisement is reachable only while an active, scheduled carousel
 * placement still points at it.
 */
router.get('/public/:postId', async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ status: -1, message: '广告 ID 无效' });
  }
  try {
    const now = new Date();
    const rows = await query(
      `SELECT ap.post_id, p.title, p.content, ap.status AS ad_status,
              ap.sponsor_name, ap.sponsor_logo, ap.cta_label, ap.cta_type,
              ap.cta_target, ap.created_at, ap.updated_at
       FROM advertisement_posts ap
       INNER JOIN posts p ON p.id = ap.post_id
       WHERE ap.post_id = ?
         AND ap.status = 'active'
         AND p.deleted_at IS NULL
         AND (
           EXISTS (
             SELECT 1
             FROM canteen_banners cb
             WHERE cb.type = 'ad'
               AND cb.link_type = 'post'
               AND cb.link_target = CAST(ap.post_id AS CHAR)
               AND cb.is_active = 1
               AND (cb.starts_at IS NULL OR cb.starts_at <= ?)
               AND (cb.ends_at IS NULL OR cb.ends_at >= ?)
           )
           OR EXISTS (
             SELECT 1
             FROM square_banners sb
             WHERE sb.type = 'ad'
               AND sb.link_type = 'post'
               AND sb.link_target = CAST(ap.post_id AS CHAR)
               AND sb.is_active = 1
               AND (sb.starts_at IS NULL OR sb.starts_at <= ?)
               AND (sb.ends_at IS NULL OR sb.ends_at >= ?)
           )
         )
       LIMIT 1`,
      [postId, now, now, now, now]
    );
    if (!rows.length) {
      return res.status(410).json({
        status: -1,
        code: 'ADVERTISEMENT_UNAVAILABLE',
        message: '广告已结束或暂不可用',
      });
    }
    const [row] = await attachImages(rows);
    const data = mapRow(row);
    delete data.created_by;
    delete data.updated_by;
    res.json({ status: 0, data });
  } catch (error) {
    console.error('广告公开详情读取失败:', error);
    sendDatabaseError(res, error);
  }
});

router.post('/public/:postId/click', async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  const clickType = String(req.body?.click_type || 'banner').trim().toLowerCase();
  const placementType = String(req.body?.placement_type || '').trim().toLowerCase();
  const placementId = Number.parseInt(req.body?.placement_id, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ status: -1, message: '广告 ID 无效' });
  }
  if (!['banner', 'cta'].includes(clickType)) {
    return res.status(400).json({ status: -1, message: '点击类型无效' });
  }
  if (placementType && !['canteen', 'square'].includes(placementType)) {
    return res.status(400).json({ status: -1, message: '投放位类型无效' });
  }
  try {
    const now = new Date();
    const rows = await query(
      `SELECT ap.post_id
       FROM advertisement_posts ap
       INNER JOIN posts p ON p.id = ap.post_id
       WHERE ap.post_id = ?
         AND ap.status = 'active'
         AND p.deleted_at IS NULL
         AND (
           (? = 'canteen' AND EXISTS (
             SELECT 1 FROM canteen_banners cb
             WHERE cb.id = ?
               AND cb.type = 'ad' AND cb.link_type = 'post'
               AND cb.link_target = CAST(ap.post_id AS CHAR)
               AND cb.is_active = 1
               AND (cb.starts_at IS NULL OR cb.starts_at <= ?)
               AND (cb.ends_at IS NULL OR cb.ends_at >= ?)
           ))
           OR (? = 'square' AND EXISTS (
             SELECT 1 FROM square_banners sb
             WHERE sb.id = ?
               AND sb.type = 'ad' AND sb.link_type = 'post'
               AND sb.link_target = CAST(ap.post_id AS CHAR)
               AND sb.is_active = 1
               AND (sb.starts_at IS NULL OR sb.starts_at <= ?)
               AND (sb.ends_at IS NULL OR sb.ends_at >= ?)
           ))
           OR (? = '' AND (
             EXISTS (
               SELECT 1 FROM canteen_banners cb
               WHERE cb.type = 'ad' AND cb.link_type = 'post'
                 AND cb.link_target = CAST(ap.post_id AS CHAR)
                 AND cb.is_active = 1
                 AND (cb.starts_at IS NULL OR cb.starts_at <= ?)
                 AND (cb.ends_at IS NULL OR cb.ends_at >= ?)
             )
             OR EXISTS (
               SELECT 1 FROM square_banners sb
               WHERE sb.type = 'ad' AND sb.link_type = 'post'
                 AND sb.link_target = CAST(ap.post_id AS CHAR)
                 AND sb.is_active = 1
                 AND (sb.starts_at IS NULL OR sb.starts_at <= ?)
                 AND (sb.ends_at IS NULL OR sb.ends_at >= ?)
             )
           ))
         )
       LIMIT 1`,
      [
        postId,
        placementType, Number.isInteger(placementId) ? placementId : 0, now, now,
        placementType, Number.isInteger(placementId) ? placementId : 0, now, now,
        placementType, now, now, now, now,
      ]
    );
    if (!rows.length) {
      return res.status(410).json({
        status: -1,
        code: 'ADVERTISEMENT_UNAVAILABLE',
        message: '广告已结束或暂不可用',
      });
    }
    await query(
      `INSERT INTO advertisement_clicks
       (advertisement_post_id, placement_type, placement_id, click_type)
       VALUES (?, ?, ?, ?)`,
      [postId, placementType || null, Number.isInteger(placementId) ? placementId : null, clickType]
    );
    res.status(202).json({ status: 0, data: { recorded: true } });
  } catch (error) {
    console.error('广告点击记录失败:', error);
    sendClickDatabaseError(res, error);
  }
});

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/admin', async (req, res) => {
  try {
    const rows = await query(
      `SELECT ap.post_id, p.title, p.content, ap.status AS ad_status,
              ap.sponsor_name, ap.sponsor_logo, ap.cta_label, ap.cta_type,
              ap.cta_target, ap.created_by, ap.updated_by,
              ap.created_at, ap.updated_at,
              ((SELECT COUNT(*) FROM canteen_banners cb
                WHERE cb.type = 'ad' AND cb.link_type = 'post'
                  AND cb.link_target = CAST(ap.post_id AS CHAR))
               + (SELECT COUNT(*) FROM square_banners sb
                  WHERE sb.type = 'ad' AND sb.link_type = 'post'
                    AND sb.link_target = CAST(ap.post_id AS CHAR))) AS banner_count,
              (SELECT COUNT(*) FROM advertisement_clicks ac
               WHERE ac.advertisement_post_id = ap.post_id) AS click_count
       FROM advertisement_posts ap
       INNER JOIN posts p ON p.id = ap.post_id
       ORDER BY ap.updated_at DESC, ap.post_id DESC`
    );
    const withImages = await attachImages(rows);
    res.json({ status: 0, data: withImages.map(mapRow) });
  } catch (error) {
    console.error('广告列表读取失败:', error);
    sendDatabaseError(res, error);
  }
});

router.get('/admin/:postId/preview', async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ status: -1, message: '广告 ID 无效' });
  }
  try {
    const rows = await query(
      `SELECT ap.post_id, p.title, p.content, ap.status AS ad_status,
              ap.sponsor_name, ap.sponsor_logo, ap.cta_label, ap.cta_type,
              ap.cta_target, ap.created_by, ap.updated_by,
              ap.created_at, ap.updated_at, 0 AS banner_count
       FROM advertisement_posts ap
       INNER JOIN posts p ON p.id = ap.post_id
       WHERE ap.post_id = ?`,
      [postId]
    );
    if (!rows.length) return res.status(404).json({ status: -1, message: '广告不存在' });
    const [row] = await attachImages(rows);
    res.json({ status: 0, data: mapRow(row) });
  } catch (error) {
    console.error('广告预览读取失败:', error);
    sendDatabaseError(res, error);
  }
});

router.post('/', withUpload(async (req, res) => {
  const title = cleanText(req.body && req.body.title, 120);
  const content = cleanText(req.body && req.body.content);
  const sponsorName = cleanText(req.body && req.body.sponsor_name, 160);
  const sponsorLogo = cleanText(req.body && req.body.sponsor_logo, 500);
  const status = parseStatus(req.body && req.body.status);
  const ctaType = parseCtaType(req.body && req.body.cta_type);
  const ctaLabel = cleanText(req.body && req.body.cta_label, 80);
  const ctaTarget = cleanText(req.body && req.body.cta_target, 500);

  if (!title || !content || !sponsorName) {
    return res.status(400).json({ status: -1, message: '标题、正文和投放方不能为空' });
  }
  if (!status || !ctaType) {
    return res.status(400).json({ status: -1, message: '广告状态或跳转类型无效' });
  }
  if (ctaType === 'https' && ctaTarget && !/^https:\/\//i.test(ctaTarget)) {
    return res.status(400).json({ status: -1, message: '外链只支持 https:// 地址' });
  }
  if (ctaType !== 'none' && !ctaTarget) {
    return res.status(400).json({ status: -1, message: '选择跳转类型后必须填写跳转目标' });
  }

  try {
    // Keep a missing migration from leaving an orphan row in posts.
    await query('SELECT 1 FROM advertisement_posts LIMIT 1');
    const postResult = await query(
      `INSERT INTO posts (user_id, title, content, type)
       VALUES (?, ?, ?, 'normal')`,
      [req.user.id, title, content]
    );
    const postId = postResult.insertId;
    await query(
      `INSERT INTO advertisement_posts
       (post_id, status, sponsor_name, sponsor_logo, cta_label, cta_type, cta_target, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [postId, status, sponsorName, sponsorLogo || null, ctaLabel || null, ctaType, ctaTarget || null, req.user.id, req.user.id]
    );
    if (req.files && req.files.length) {
      const paths = await savePostImages(req.files, postId);
      if (paths.length) {
        const values = paths.map(() => '(?, ?, ?)').join(',');
        const params = paths.flatMap((path, index) => [postId, path, index]);
        await query(`INSERT INTO post_images (post_id, file_path, sort_order) VALUES ${values}`, params);
      }
    }
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'ADVERTISEMENT_CREATE',
      targetType: 'post',
      targetId: postId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.status(201).json({ status: 0, message: '广告已创建', data: { id: postId } });
  } catch (error) {
    console.error('广告创建失败:', error);
    sendDatabaseError(res, error);
  }
}));

router.patch('/:postId', withUpload(async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ status: -1, message: '广告 ID 无效' });
  }
  const title = cleanText(req.body && req.body.title, 120);
  const content = cleanText(req.body && req.body.content);
  const sponsorName = cleanText(req.body && req.body.sponsor_name, 160);
  const sponsorLogo = cleanText(req.body && req.body.sponsor_logo, 500);
  const status = parseStatus(req.body && req.body.status);
  const ctaType = parseCtaType(req.body && req.body.cta_type);
  const ctaLabel = cleanText(req.body && req.body.cta_label, 80);
  const ctaTarget = cleanText(req.body && req.body.cta_target, 500);
  if (!title || !content || !sponsorName || !status || !ctaType) {
    return res.status(400).json({ status: -1, message: '广告字段不完整或无效' });
  }
  if (ctaType === 'https' && ctaTarget && !/^https:\/\//i.test(ctaTarget)) {
    return res.status(400).json({ status: -1, message: '外链只支持 https:// 地址' });
  }
  if (ctaType !== 'none' && !ctaTarget) {
    return res.status(400).json({ status: -1, message: '选择跳转类型后必须填写跳转目标' });
  }
  try {
    const existing = await query(
      'SELECT post_id FROM advertisement_posts WHERE post_id = ?',
      [postId]
    );
    if (!existing.length) return res.status(404).json({ status: -1, message: '广告不存在' });
    await query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
    await query(
      `UPDATE advertisement_posts
       SET status = ?, sponsor_name = ?, sponsor_logo = ?, cta_label = ?,
           cta_type = ?, cta_target = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE post_id = ?`,
      [status, sponsorName, sponsorLogo || null, ctaLabel || null, ctaType, ctaTarget || null, req.user.id, postId]
    );
    if (req.files && req.files.length) {
      await query('DELETE FROM post_images WHERE post_id = ?', [postId]);
      const paths = await savePostImages(req.files, postId);
      if (paths.length) {
        const values = paths.map(() => '(?, ?, ?)').join(',');
        const params = paths.flatMap((path, index) => [postId, path, index]);
        await query(`INSERT INTO post_images (post_id, file_path, sort_order) VALUES ${values}`, params);
      }
    }
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'ADVERTISEMENT_UPDATE',
      targetType: 'post',
      targetId: postId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.json({ status: 0, message: '广告已保存', data: { id: postId } });
  } catch (error) {
    console.error('广告更新失败:', error);
    sendDatabaseError(res, error);
  }
}));

router.post('/:postId/archive', async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ status: -1, message: '广告 ID 无效' });
  }
  try {
    const result = await query(
      `UPDATE advertisement_posts
       SET status = 'archived', updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE post_id = ? AND status <> 'archived'`,
      [req.user.id, postId]
    );
    if (!result.affectedRows) return res.status(404).json({ status: -1, message: '广告不存在或已归档' });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'ADVERTISEMENT_ARCHIVE',
      targetType: 'post',
      targetId: postId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.json({ status: 0, message: '广告已归档' });
  } catch (error) {
    console.error('广告归档失败:', error);
    sendDatabaseError(res, error);
  }
});

module.exports = router;
