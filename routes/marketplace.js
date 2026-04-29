/**
 * ============================================
 * Square · Second-hand Marketplace API
 * ============================================
 * - 分类 Tabs、筛选、列表/详情、发布、收藏（want）、卖家改状态、编辑
 * - 举报：本期不做
 * - 图片：每个 item 最多 4 张（后端硬限制）
 */
const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const { assetUrl } = require('../utils/assets');
const { simpleCache } = require('../utils/simpleCache');
const { uploadBuffer, guessContentType, isObjectStorageConfigured } = require('../services/objectStorage');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');

const MAX_IMAGES_PER_ITEM = 4;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

function parseOptionalUser(req) {
  if (!req.headers.authorization) return null;
  try {
    const jwt = require('jsonwebtoken');
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (_) {
    return null;
  }
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function cleanText(input, maxLen) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!maxLen) return cleaned;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function ensureUploadsDir(relDir) {
  const dir = path.join(process.cwd(), 'uploads', relDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseTags(tagsRaw) {
  if (tagsRaw == null || tagsRaw === '') return null;
  if (Array.isArray(tagsRaw)) {
    const arr = tagsRaw.map((s) => cleanText(s, 20)).filter(Boolean).slice(0, 10);
    return arr.length ? arr : null;
  }
  const s = String(tagsRaw).trim();
  if (!s) return null;
  // JSON array
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return parseTags(arr);
    } catch (_) {
      // ignore
    }
  }
  // comma separated
  const arr = s
    .split(',')
    .map((x) => cleanText(x, 20))
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 10);
  return arr.length ? arr : null;
}

function parsePrice(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

const itemImagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) return cb(new Error('仅支持 jpg / png / webp 格式'));
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return cb(new Error('仅支持 jpg / png / webp 格式'));
    cb(null, true);
  },
}).array('images', MAX_IMAGES_PER_ITEM);

// ============================================
// 分类 Tabs（公开读）
// ============================================
router.get('/categories', async (req, res) => {
  try {
    const ttlMs = Number(process.env.CACHE_MARKETPLACE_CATEGORIES_TTL_MS || 60 * 60 * 1000);
    const rows = await simpleCache.getOrSet('marketplace:categories:v1', ttlMs, async () => {
      return await query(
        `SELECT id, slug, name_zh, name_en, sort_order
         FROM marketplace_categories
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, id ASC`
      );
    });
    res.status(200).json({ status: 0, message: 'ok', data: rows || [] });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 marketplace 表，请先执行 migrations/026_marketplace.sql' });
    }
    console.error('marketplace categories error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 列表（公开读 + 可选登录态）
// ============================================
router.get('/items', async (req, res) => {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 2000);
    const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 50);
    const offset = (page - 1) * pageSize;

    const category = cleanText(req.query.category, 40) || 'all';
    const status = cleanText(req.query.status, 20) || 'all';
    const priceMinRaw = req.query.priceMin;
    const priceMaxRaw = req.query.priceMax;
    const priceMin = priceMinRaw == null || priceMinRaw === '' ? null : parsePrice(priceMinRaw);
    const priceMax = priceMaxRaw == null || priceMaxRaw === '' ? null : parsePrice(priceMaxRaw);
    if (priceMin === null) return res.status(400).json({ status: -1, message: 'priceMin 不合法' });
    if (priceMax === null) return res.status(400).json({ status: -1, message: 'priceMax 不合法' });

    const where = ['i.deleted_at IS NULL'];
    const params = [];

    if (category && category !== 'all') {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (status && status !== 'all') {
      if (!['on_sale', 'sold'].includes(status)) {
        return res.status(400).json({ status: -1, message: 'status 不合法' });
      }
      where.push('i.status = ?');
      params.push(status);
    }
    if (priceMin != null) {
      where.push('i.price >= ?');
      params.push(priceMin);
    }
    if (priceMax != null) {
      where.push('i.price <= ?');
      params.push(priceMax);
    }

    const sql = `
      SELECT
        i.id,
        i.title,
        i.price,
        i.status,
        i.tags_json,
        i.wants_count,
        i.created_at,
        c.slug AS category,
        c.name_zh AS category_name_zh,
        c.name_en AS category_name_en,
        COALESCE(NULLIF(u.nickname, ''), u.username) AS sellerName,
        img.file_path AS cover_path
      FROM marketplace_items i
      JOIN marketplace_categories c ON c.id = i.category_id
      JOIN users u ON u.id = i.seller_user_id
      LEFT JOIN (
        SELECT ii.item_id, ii.file_path
        FROM marketplace_item_images ii
        JOIN (
          SELECT item_id, MIN(sort_order) AS min_sort
          FROM marketplace_item_images
          GROUP BY item_id
        ) x ON x.item_id = ii.item_id AND x.min_sort = ii.sort_order
      ) img ON img.item_id = i.id
      WHERE ${where.join(' AND ')}
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT ? OFFSET ?`;
    const rows = await query(sql, [...params, pageSize + 1, offset]);

    const list = (rows || []).slice(0, pageSize).map((r) => {
      let tags = null;
      if (r.tags_json) {
        try {
          const arr = typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : r.tags_json;
          tags = Array.isArray(arr) ? arr : null;
        } catch (_) {
          tags = null;
        }
      }
      return {
        id: r.id,
        title: r.title,
        price: Number(r.price),
        status: r.status,
        wants_count: r.wants_count,
        tags: tags || [],
        category: r.category,
        sellerName: r.sellerName,
        cover: assetUrl(r.cover_path),
        created_at: r.created_at,
      };
    });

    res.status(200).json({
      status: 0,
      message: 'ok',
      data: {
        list,
        hasMore: (rows || []).length > pageSize,
        page,
        pageSize,
      },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 marketplace 表，请先执行 migrations/026_marketplace.sql' });
    }
    console.error('marketplace list error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 详情（公开读 + 可选登录态）
// ============================================
router.get('/items/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'id 不合法' });

    const viewer = parseOptionalUser(req);

    const rows = await query(
      `SELECT
         i.*,
         c.slug AS category,
         c.name_zh AS category_name_zh,
         c.name_en AS category_name_en,
         COALESCE(NULLIF(u.nickname, ''), u.username) AS sellerName
       FROM marketplace_items i
       JOIN marketplace_categories c ON c.id = i.category_id
       JOIN users u ON u.id = i.seller_user_id
       WHERE i.id = ? AND i.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    const item = rows && rows[0];
    if (!item) return res.status(404).json({ status: -1, message: '商品不存在或已删除' });

    const imgRows = await query(
      `SELECT id, file_path, sort_order
       FROM marketplace_item_images
       WHERE item_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    // 浏览量自增（不阻塞主返回也可；这里简单 await）
    await query('UPDATE marketplace_items SET views_count = views_count + 1 WHERE id = ?', [id]);

    const canEdit = !!(viewer && (Number(viewer.id) === Number(item.seller_user_id) || viewer.role === 'admin'));
    let viewerWant = false;
    if (viewer) {
      const w = await query('SELECT 1 FROM marketplace_item_wants WHERE user_id = ? AND item_id = ? LIMIT 1', [viewer.id, id]);
      viewerWant = !!(w && w[0]);
    }

    let tags = null;
    if (item.tags_json) {
      try {
        const arr = typeof item.tags_json === 'string' ? JSON.parse(item.tags_json) : item.tags_json;
        tags = Array.isArray(arr) ? arr : null;
      } catch (_) {
        tags = null;
      }
    }

    res.status(200).json({
      status: 0,
      message: 'ok',
      data: {
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        status: item.status,
        tags: tags || [],
        wants_count: item.wants_count,
        views_count: item.views_count + 1, // 已自增
        images: (imgRows || []).map((x) => ({ url: assetUrl(x.file_path), sort_order: x.sort_order })),
        category: item.category,
        sellerInfo: { name: item.sellerName },
        contactInfo: {
          wechat: item.contact_wechat || null,
          phone: item.contact_phone || null,
          remark: item.contact_remark || null,
        },
        viewer: {
          want: viewerWant,
          canEdit,
        },
        actions: {
          want: !!viewer,
          markSold: canEdit,
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
    });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ status: -1, message: '数据库缺少 marketplace 表，请先执行 migrations/026_marketplace.sql' });
    }
    console.error('marketplace detail error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 发布（登录，multipart/form-data）
// ============================================
router.post('/items', authenticateToken, (req, res, next) => {
  itemImagesUpload(req, res, (err) => {
    if (err) return res.status(400).json({ status: -1, message: err.message || '图片上传失败' });
    next();
  });
}, async (req, res) => {
  try {
    const title = cleanText(req.body.title, 120);
    const description = cleanText(req.body.description, 3000);
    const category = cleanText(req.body.category, 40);
    const price = parsePrice(req.body.price);
    const tags = parseTags(req.body.tags);
    const wechat = cleanText(req.body.wechat, 80) || null;
    const phone = cleanText(req.body.phone, 40) || null;
    const remark = cleanText(req.body.remark, 200) || null;

    if (!title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    if (!description) return res.status(400).json({ status: -1, message: '描述不能为空' });
    if (!category) return res.status(400).json({ status: -1, message: '请选择分类' });
    if (price == null) return res.status(400).json({ status: -1, message: '价格不合法' });

    const catRows = await query('SELECT id FROM marketplace_categories WHERE slug = ? AND is_enabled = 1 LIMIT 1', [category]);
    const cat = catRows && catRows[0];
    if (!cat) return res.status(400).json({ status: -1, message: '分类不存在' });

    const files = req.files || [];
    if (files.length > MAX_IMAGES_PER_ITEM) {
      return res.status(400).json({ status: -1, message: `图片最多 ${MAX_IMAGES_PER_ITEM} 张` });
    }

    const tagsJson = tags && tags.length ? JSON.stringify(tags) : null;
    const ins = await query(
      `INSERT INTO marketplace_items (category_id, seller_user_id, title, description, price, status, tags_json, contact_wechat, contact_phone, contact_remark)
       VALUES (?, ?, ?, ?, ?, 'on_sale', ?, ?, ?, ?)`,
      [cat.id, req.user.id, title, description, price, tagsJson, wechat, phone, remark]
    );
    const itemId = ins && ins.insertId;

    const useObjectStorage = isObjectStorageConfigured();
    if (!useObjectStorage) ensureUploadsDir('marketplace/items');

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = extMap[f.mimetype] || '.jpg';
      const key = `marketplace/items/item_${itemId}_${i + 1}${ext}`;
      if (useObjectStorage) {
        await uploadBuffer({ key, body: f.buffer, contentType: guessContentType(f.mimetype, ext) });
      } else {
        const filePath = path.join(process.cwd(), 'uploads', key);
        fs.writeFileSync(filePath, f.buffer);
      }
      await query(
        'INSERT INTO marketplace_item_images (item_id, file_path, sort_order) VALUES (?, ?, ?)',
        [itemId, key, i]
      );
    }

    res.status(201).json({ status: 0, message: 'ok', data: { id: itemId } });
  } catch (e) {
    console.error('marketplace create error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 编辑（登录，卖家本人或 admin）
// ============================================
router.patch('/items/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'id 不合法' });

    const rows = await query('SELECT id, seller_user_id, status FROM marketplace_items WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const item = rows && rows[0];
    if (!item) return res.status(404).json({ status: -1, message: '商品不存在或已删除' });

    const canEdit = Number(item.seller_user_id) === Number(req.user.id) || isAdmin(req);
    if (!canEdit) return res.status(403).json({ status: -1, message: '无权限' });

    const title = req.body.title != null ? cleanText(req.body.title, 120) : null;
    const description = req.body.description != null ? cleanText(req.body.description, 3000) : null;
    const category = req.body.category != null ? cleanText(req.body.category, 40) : null;
    const price = req.body.price != null ? parsePrice(req.body.price) : null;
    const tags = req.body.tags != null ? parseTags(req.body.tags) : null;
    const wechat = req.body.wechat != null ? cleanText(req.body.wechat, 80) : null;
    const phone = req.body.phone != null ? cleanText(req.body.phone, 40) : null;
    const remark = req.body.remark != null ? cleanText(req.body.remark, 200) : null;

    if (price === null && req.body.price != null) return res.status(400).json({ status: -1, message: '价格不合法' });
    if (title !== null && !title) return res.status(400).json({ status: -1, message: '标题不能为空' });
    if (description !== null && !description) return res.status(400).json({ status: -1, message: '描述不能为空' });

    let categoryId = null;
    if (category !== null) {
      if (!category) return res.status(400).json({ status: -1, message: '分类不能为空' });
      const catRows = await query('SELECT id FROM marketplace_categories WHERE slug = ? AND is_enabled = 1 LIMIT 1', [category]);
      const cat = catRows && catRows[0];
      if (!cat) return res.status(400).json({ status: -1, message: '分类不存在' });
      categoryId = cat.id;
    }

    const sets = [];
    const params = [];
    if (title !== null) { sets.push('title = ?'); params.push(title); }
    if (description !== null) { sets.push('description = ?'); params.push(description); }
    if (price !== null) { sets.push('price = ?'); params.push(price); }
    if (categoryId !== null) { sets.push('category_id = ?'); params.push(categoryId); }
    if (tags !== null) { sets.push('tags_json = ?'); params.push(tags && tags.length ? JSON.stringify(tags) : null); }
    if (wechat !== null) { sets.push('contact_wechat = ?'); params.push(wechat || null); }
    if (phone !== null) { sets.push('contact_phone = ?'); params.push(phone || null); }
    if (remark !== null) { sets.push('contact_remark = ?'); params.push(remark || null); }

    if (!sets.length) return res.status(200).json({ status: 0, message: 'ok', data: { updated: false } });

    await query(`UPDATE marketplace_items SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    res.status(200).json({ status: 0, message: 'ok', data: { updated: true } });
  } catch (e) {
    console.error('marketplace update error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 状态流转（登录，卖家本人或 admin）
// ============================================
router.post('/items/:id/status', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'id 不合法' });
    const nextStatus = cleanText(req.body.status, 20);
    if (!['on_sale', 'sold'].includes(nextStatus)) return res.status(400).json({ status: -1, message: 'status 不合法' });

    const rows = await query('SELECT id, seller_user_id, status FROM marketplace_items WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    const item = rows && rows[0];
    if (!item) return res.status(404).json({ status: -1, message: '商品不存在或已删除' });

    const canEdit = Number(item.seller_user_id) === Number(req.user.id) || isAdmin(req);
    if (!canEdit) return res.status(403).json({ status: -1, message: '无权限' });

    const cur = item.status;
    if (cur === nextStatus) return res.status(200).json({ status: 0, message: 'ok', data: { status: cur } });

    const allowed = new Set();
    if (cur === 'on_sale') {
      allowed.add('sold');
    } else if (cur === 'sold') {
      // sold -> on_sale：仅 admin 允许
      if (isAdmin(req)) allowed.add('on_sale');
    }
    if (!allowed.has(nextStatus)) return res.status(400).json({ status: -1, message: `不允许从 ${cur} 变更为 ${nextStatus}` });

    await query('UPDATE marketplace_items SET status = ? WHERE id = ?', [nextStatus, id]);
    res.status(200).json({ status: 0, message: 'ok', data: { status: nextStatus } });
  } catch (e) {
    console.error('marketplace status error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// Want（收藏）（登录，toggle）
// ============================================
router.post('/items/:id/want', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'id 不合法' });

    const existRows = await query('SELECT id FROM marketplace_items WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (!existRows || !existRows[0]) return res.status(404).json({ status: -1, message: '商品不存在或已删除' });

    const w = await query('SELECT 1 FROM marketplace_item_wants WHERE user_id = ? AND item_id = ? LIMIT 1', [req.user.id, id]);
    const exists = !!(w && w[0]);
    if (exists) {
      await query('DELETE FROM marketplace_item_wants WHERE user_id = ? AND item_id = ?', [req.user.id, id]);
      await query('UPDATE marketplace_items SET wants_count = GREATEST(0, wants_count - 1) WHERE id = ?', [id]);
    } else {
      await query('INSERT INTO marketplace_item_wants (user_id, item_id) VALUES (?, ?)', [req.user.id, id]);
      await query('UPDATE marketplace_items SET wants_count = wants_count + 1 WHERE id = ?', [id]);
    }
    const cntRows = await query('SELECT wants_count FROM marketplace_items WHERE id = ? LIMIT 1', [id]);
    const wantsCount = cntRows && cntRows[0] ? cntRows[0].wants_count : 0;
    res.status(200).json({ status: 0, message: 'ok', data: { want: !exists, wants_count: wantsCount } });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      // 并发插入：按已收藏处理
      return res.status(200).json({ status: 0, message: 'ok', data: { want: true } });
    }
    console.error('marketplace want error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 删除（登录，卖家本人或 admin，逻辑删除）
// ============================================
router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ status: -1, message: 'id 不合法' });

    const rows = await query(
      'SELECT id, seller_user_id FROM marketplace_items WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    const item = rows && rows[0];
    if (!item) return res.status(404).json({ status: -1, message: '商品不存在或已删除' });

    const canEdit = Number(item.seller_user_id) === Number(req.user.id) || isAdmin(req);
    if (!canEdit) return res.status(403).json({ status: -1, message: '无权限' });

    await query('UPDATE marketplace_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: 'ok', data: { id } });
  } catch (e) {
    console.error('marketplace delete error:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;

