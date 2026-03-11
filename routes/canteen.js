/**
 * ============================================
 * 食堂系统路由（按设计说明 2.0.0）
 * ============================================
 * 区域、店铺、分类、商品、评论；所有删除为逻辑删除
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database');
const authenticateToken = require('../middleware/auth');
const {
  productImagesUpload,
  commentImagesUpload,
  saveProductImages,
  saveCommentImages,
  shopLogoUpload
} = require('../middleware/upload');
const { onPrimaryCommentChange } = require('../services/rankingStats');
const { logAudit } = require('../services/auditLog');
const { shanghaiDaysAgoStart } = require('../utils/timezone');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const { assetUrl } = require('../utils/assets');
const { uploadBuffer, guessContentType } = require('../services/objectStorage');

const RATING_ENUM = ['夯爆了', '顶级', '人上人', 'NPC', '拉完了'];

// 统一的文本清洗，防止 XSS 注入（去掉所有 HTML 标签，只保留纯文本）
function cleanText(input) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return cleaned.trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

/** 可选登录：若有 Authorization 则解析出 req.user，否则 req.user 为 null */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? null : decoded;
    next();
  });
}

/** 校验当前用户是否为某店铺的店主 */
async function isShopOwner(shopId, userId) {
  const rows = await query('SELECT id FROM shops WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [shopId, userId]);
  return rows && rows.length > 0;
}

/** 校验当前用户是否为某分类所属店铺的店主 */
async function isCategoryOwner(categoryId, userId) {
  const rows = await query(
    'SELECT s.id FROM product_categories c JOIN shops s ON c.shop_id = s.id WHERE c.id = ? AND s.user_id = ? AND s.deleted_at IS NULL AND c.deleted_at IS NULL',
    [categoryId, userId]
  );
  return rows && rows.length > 0;
}

/** 校验当前用户是否为某商品所属店铺的店主 */
async function isProductOwner(productId, userId) {
  const rows = await query(
    'SELECT p.id FROM products p JOIN shops s ON p.shop_id = s.id WHERE p.id = ? AND s.user_id = ? AND p.deleted_at IS NULL AND s.deleted_at IS NULL',
    [productId, userId]
  );
  return rows && rows.length > 0;
}

// ============================================
// 区域（只读）
// ============================================
router.get('/regions', async (req, res) => {
  try {
    const rows = await query('SELECT id, code, name, sort_order FROM regions ORDER BY sort_order ASC');
    res.status(200).json({ status: 0, message: '获取成功', data: rows || [] });
  } catch (e) {
    console.error('获取区域列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 店铺
// ============================================
router.post('/shops', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '仅商家可创建店铺' });
    }
    const name = (req.body.name || '').trim();
    const regionId = parseInt(req.body.region_id, 10);
    if (!name) return res.status(400).json({ status: -1, message: '店铺名称不能为空' });
    if (!regionId) return res.status(400).json({ status: -1, message: '请选择区域' });

    const exist = await query('SELECT id FROM shops WHERE user_id = ? AND deleted_at IS NULL', [req.user.id]);
    if (exist && exist.length > 0) {
      return res.status(400).json({ status: -1, message: '您已创建过店铺，一个商家只能有一个店铺' });
    }

    const region = await query('SELECT id FROM regions WHERE id = ?', [regionId]);
    if (!region || region.length === 0) {
      return res.status(400).json({ status: -1, message: '区域不存在' });
    }

    await query('INSERT INTO shops (user_id, region_id, name) VALUES (?, ?, ?)', [req.user.id, regionId, name]);
    const shopId = (await query('SELECT LAST_INSERT_ID() AS id'))[0].id;
    const rows = await query(
      'SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, s.updated_at, r.code AS region_code, r.name AS region_name FROM shops s JOIN regions r ON s.region_id = r.id WHERE s.id = ?',
      [shopId]
    );
    const row = rows[0];
    res.status(200).json({
      status: 0,
      message: '创建成功',
      data: {
        id: row.id,
        user_id: row.user_id,
        region_id: row.region_id,
        region_code: row.region_code,
        region_name: row.region_name,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (e) {
    console.error('创建店铺错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/regions/:regionId/shops', async (req, res) => {
  try {
    const regionId = parseInt(req.params.regionId, 10);
    if (!regionId) {
      return res.status(400).json({ status: -1, message: '区域 ID 无效' });
    }
    let rows = await query(
      `SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, r.code AS region_code, r.name AS region_name
       FROM shops s JOIN regions r ON s.region_id = r.id
       WHERE s.region_id = ? AND s.deleted_at IS NULL
       ORDER BY s.created_at ASC`,
      [regionId]
    );
    let withLogo = false;
    try {
      const withCols = await query(
        `SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, s.logo_path, s.opening_hours, r.code AS region_code, r.name AS region_name
         FROM shops s JOIN regions r ON s.region_id = r.id
         WHERE s.region_id = ? AND s.deleted_at IS NULL
         ORDER BY s.created_at ASC`,
        [regionId]
      );
      rows = withCols;
      withLogo = true;
    } catch (_) {}
    const list = (rows || []).map((r) => {
      const item = {
        id: r.id,
        user_id: r.user_id,
        region_id: r.region_id,
        region_code: r.region_code,
        region_name: r.region_name,
        name: r.name,
        created_at: r.created_at
      };
      if (withLogo && r) {
        item.logo = assetUrl(r.logo_path);
        item.opening_hours = r.opening_hours || null;
      }
      return item;
    });
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('按区域获取店铺列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/shops/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
      return res.status(403).json({ status: -1, message: '仅商家可查看我的店铺' });
    }
    let rows = await query(
      `SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, s.updated_at, r.code AS region_code, r.name AS region_name
       FROM shops s JOIN regions r ON s.region_id = r.id
       WHERE s.user_id = ? AND s.deleted_at IS NULL`,
      [req.user.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '您尚未创建店铺' });
    }
    const row = rows[0];
    let logo = null;
    let opening_hours = null;
    try {
      const ext = await query('SELECT logo_path, opening_hours FROM shops WHERE id = ?', [row.id]);
      if (ext && ext[0]) {
        logo = assetUrl(ext[0].logo_path);
        opening_hours = ext[0].opening_hours || null;
      }
    } catch (_) {}
    const categories = await query(
      'SELECT id, name, sort_order, created_at FROM product_categories WHERE shop_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC',
      [row.id]
    );
    const productCount = await query(
      'SELECT COUNT(*) AS cnt FROM products WHERE shop_id = ? AND deleted_at IS NULL',
      [row.id]
    );
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        id: row.id,
        user_id: row.user_id,
        region_id: row.region_id,
        region_code: row.region_code,
        region_name: row.region_name,
        name: row.name,
        logo,
        opening_hours,
        created_at: row.created_at,
        updated_at: row.updated_at,
        categories: categories || [],
        product_count: (productCount && productCount[0] && productCount[0].cnt) || 0
      }
    });
  } catch (e) {
    console.error('获取我的店铺错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/shops/:shopId', async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    const rows = await query(
      `SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, s.updated_at, r.code AS region_code, r.name AS region_name
       FROM shops s JOIN regions r ON s.region_id = r.id
       WHERE s.id = ? AND s.deleted_at IS NULL`,
      [shopId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '店铺不存在' });
    }
    const row = rows[0];
    let logo = null;
    let opening_hours = null;
    try {
      const ext = await query('SELECT logo_path, opening_hours FROM shops WHERE id = ?', [shopId]);
      if (ext && ext[0]) {
        logo = assetUrl(ext[0].logo_path);
        opening_hours = ext[0].opening_hours || null;
      }
    } catch (_) {}
    const categories = await query(
      'SELECT id, name, sort_order, created_at FROM product_categories WHERE shop_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC',
      [shopId]
    );
    const productCount = await query(
      'SELECT COUNT(*) AS cnt FROM products WHERE shop_id = ? AND deleted_at IS NULL',
      [shopId]
    );
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        id: row.id,
        user_id: row.user_id,
        region_id: row.region_id,
        region_code: row.region_code,
        region_name: row.region_name,
        name: row.name,
        logo,
        opening_hours,
        created_at: row.created_at,
        updated_at: row.updated_at,
        categories: categories || [],
        product_count: (productCount && productCount[0] && productCount[0].cnt) || 0
      }
    });
  } catch (e) {
    console.error('店铺详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/shops/:shopId', authenticateToken, (req, res, next) => {
  shopLogoUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    const owner = await isShopOwner(shopId, req.user.id);
    if (!owner) {
      return res.status(403).json({ status: -1, message: '仅店主可修改店铺信息' });
    }
    const name = (req.body && req.body.name !== undefined) ? String(req.body.name).trim() : '';
    const opening_hours = (req.body && req.body.opening_hours !== undefined) ? String(req.body.opening_hours).trim() || null : undefined;
    if (!name) return res.status(400).json({ status: -1, message: '店铺名称不能为空' });

    const updates = ['name = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [name];
    if (opening_hours !== undefined) {
      updates.push('opening_hours = ?');
      params.push(opening_hours);
    }
    if (req.file && req.file.buffer) {
      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.jpg';
      const key = `shops/shop_${shopId}${safeExt}`;
      await uploadBuffer({ key, body: req.file.buffer, contentType: guessContentType(req.file.mimetype, safeExt) });
      updates.push('logo_path = ?');
      params.push(key);
    }
    params.push(shopId);
    const sql = `UPDATE shops SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    try {
      await query(sql, params);
    } catch (updateErr) {
      const msg = (updateErr && (updateErr.message || updateErr.code || '')).toString();
      const isUnknownColumn = msg.includes('Unknown column') || msg.includes('ER_BAD_FIELD');
      if (isUnknownColumn && (opening_hours !== undefined || (req.file && req.file.filename))) {
        await query(
          'UPDATE shops SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
          [name, shopId]
        );
      } else {
        throw updateErr;
      }
    }

    const rows = await query(
      'SELECT s.id, s.user_id, s.region_id, s.name, s.created_at, s.updated_at FROM shops s WHERE s.id = ?',
      [shopId]
    );
    let data = rows && rows[0] ? { ...rows[0] } : {};
    try {
      const ext = await query('SELECT logo_path, opening_hours FROM shops WHERE id = ?', [shopId]);
      if (ext && ext[0]) {
        data.logo = assetUrl(ext[0].logo_path);
        data.opening_hours = ext[0].opening_hours || null;
      }
    } catch (_) {}
    res.status(200).json({ status: 0, message: '修改成功', data });
  } catch (e) {
    console.error('修改店铺错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/shops/:shopId', authenticateToken, async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    const owner = await isShopOwner(shopId, req.user.id);
    const admin = isAdmin(req);
    if (!owner && !admin) {
      return res.status(403).json({ status: -1, message: '仅店主或管理员可删除店铺' });
    }
    await query('UPDATE shops SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [shopId]);
    res.status(200).json({ status: 0, message: '已删除（逻辑删除）' });
  } catch (e) {
    console.error('删除店铺错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 商品分类
// ============================================
router.post('/shops/:shopId/categories', authenticateToken, async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    const owner = await isShopOwner(shopId, req.user.id);
    if (!owner) return res.status(403).json({ status: -1, message: '仅店主可创建分类' });
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ status: -1, message: '分类名称不能为空' });
    const sortOrder = parseInt(req.body.sort_order, 10);
    const order = isNaN(sortOrder) ? 0 : sortOrder;
    await query('INSERT INTO product_categories (shop_id, name, sort_order) VALUES (?, ?, ?)', [shopId, name, order]);
    const id = (await query('SELECT LAST_INSERT_ID() AS id'))[0].id;
    const rows = await query('SELECT id, shop_id, name, sort_order, created_at FROM product_categories WHERE id = ?', [id]);
    res.status(200).json({ status: 0, message: '创建成功', data: rows[0] });
  } catch (e) {
    console.error('创建分类错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/shops/:shopId/categories', async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    const rows = await query(
      'SELECT id, shop_id, name, sort_order, created_at FROM product_categories WHERE shop_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC',
      [shopId]
    );
    res.status(200).json({ status: 0, message: '获取成功', data: rows || [] });
  } catch (e) {
    console.error('获取分类列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) return res.status(400).json({ status: -1, message: '分类 ID 无效' });
    const owner = await isCategoryOwner(categoryId, req.user.id);
    if (!owner) return res.status(403).json({ status: -1, message: '仅店主可编辑分类' });
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ status: -1, message: '分类名称不能为空' });
    const sortOrder = parseInt(req.body.sort_order, 10);
    const order = isNaN(sortOrder) ? 0 : sortOrder;
    await query(
      'UPDATE product_categories SET name = ?, sort_order = ? WHERE id = ? AND deleted_at IS NULL',
      [name, order, categoryId]
    );
    const rows = await query('SELECT id, shop_id, name, sort_order, created_at FROM product_categories WHERE id = ?', [categoryId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '分类不存在' });
    }
    res.status(200).json({ status: 0, message: '修改成功', data: rows[0] });
  } catch (e) {
    console.error('修改分类错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) return res.status(400).json({ status: -1, message: '分类 ID 无效' });
    const owner = await isCategoryOwner(categoryId, req.user.id);
    if (!owner) return res.status(403).json({ status: -1, message: '仅店主可删除分类' });
    await query('UPDATE products SET category_id = NULL WHERE category_id = ?', [categoryId]);
    await query('UPDATE product_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [categoryId]);
    res.status(200).json({ status: 0, message: '已删除（逻辑删除），其下商品已设为未分类' });
  } catch (e) {
    console.error('删除分类错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 商品
// ============================================
router.post('/products', authenticateToken, (req, res, next) => {
  productImagesUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: -1,
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp，单张≤5MB，最多5张）'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const categoryId = parseInt(req.body.category_id, 10);
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    if (!categoryId) return res.status(400).json({ status: -1, message: '请选择分类' });
    if (!name) return res.status(400).json({ status: -1, message: '商品名称不能为空' });

    const catRows = await query(
      'SELECT c.id, c.shop_id FROM product_categories c JOIN shops s ON c.shop_id = s.id WHERE c.id = ? AND c.deleted_at IS NULL AND s.deleted_at IS NULL',
      [categoryId]
    );
    if (!catRows || catRows.length === 0) {
      return res.status(400).json({ status: -1, message: '分类不存在或已删除' });
    }
    const shopId = catRows[0].shop_id;
    const owner = await isShopOwner(shopId, req.user.id);
    if (!owner) return res.status(403).json({ status: -1, message: '仅可在自己店铺下创建商品' });

    const priceInput = req.body.price;
    const priceNum = priceInput !== undefined && priceInput !== null && priceInput !== '' ? parseFloat(priceInput) : null;
    const hasPrice = priceNum !== null && Number.isFinite(priceNum);
    try {
      if (hasPrice) {
        await query('INSERT INTO products (shop_id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)', [shopId, categoryId, name, description || null, priceNum]);
      } else {
        await query('INSERT INTO products (shop_id, category_id, name, description) VALUES (?, ?, ?, ?)', [shopId, categoryId, name, description || null]);
      }
    } catch (insertErr) {
      const msg = (insertErr && (insertErr.message || insertErr.code || '')).toString();
      if (msg.includes('Unknown column') && msg.includes('price')) {
        await query('INSERT INTO products (shop_id, category_id, name, description) VALUES (?, ?, ?, ?)', [shopId, categoryId, name, description || null]);
      } else {
        throw insertErr;
      }
    }
    const productId = (await query('SELECT LAST_INSERT_ID() AS id'))[0].id;
    const files = req.files || [];
    if (files.length > 0) {
      const paths = await saveProductImages(files, productId);
      for (let i = 0; i < paths.length; i++) {
        await query('INSERT INTO product_images (product_id, file_path, sort_order) VALUES (?, ?, ?)', [productId, paths[i], i]);
      }
    } else if (req.is('multipart/form-data')) {
      console.warn('[创建商品] 未收到图片：req.files 为空，请确认前端是否用 FormData 并 append("images", file)');
    }

    let rows = await query(
      `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.created_at, p.updated_at,
        c.name AS category_name, pi.file_path, pi.sort_order
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.id = ?`,
      [productId]
    );
    try {
      rows = await query(
        `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.created_at, p.updated_at,
          c.name AS category_name, pi.file_path, pi.sort_order
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.id = ?`,
        [productId]
      );
    } catch (_) {}
    const byId = {};
    for (const r of rows) {
      if (!byId[r.id]) {
        byId[r.id] = {
          id: r.id,
          shop_id: r.shop_id,
          category_id: r.category_id,
          category_name: r.category_name,
          name: r.name,
          description: r.description,
          price: r.price != null ? Number(r.price) : null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          images: []
        };
      }
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);
    res.status(200).json({ status: 0, message: '创建成功', data: product });
  } catch (e) {
    console.error('创建商品错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/shops/:shopId/products', async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });

    let sql = `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.comprehensive_score, p.review_count, p.created_at, p.updated_at,
        c.name AS category_name, pi.file_path, pi.sort_order
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.shop_id = ? AND p.deleted_at IS NULL`;
    const params = [shopId];
    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY p.created_at DESC';
    let rows;
    try {
      rows = await query(sql, params);
    } catch (qErr) {
      const msg = (qErr && (qErr.message || qErr.code || '')).toString();
      if (msg.includes('Unknown column') && (msg.includes('price') || msg.includes('comprehensive_score'))) {
        sql = `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.created_at, p.updated_at,
          c.name AS category_name, pi.file_path, pi.sort_order
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.shop_id = ? AND p.deleted_at IS NULL${categoryId ? ' AND p.category_id = ?' : ''} ORDER BY p.created_at DESC`;
        rows = await query(sql, categoryId ? [shopId, categoryId] : [shopId]);
      } else {
        throw qErr;
      }
    }
    const byId = {};
    for (const r of rows) {
      if (!byId[r.id]) {
        byId[r.id] = {
          id: r.id,
          shop_id: r.shop_id,
          category_id: r.category_id,
          category_name: r.category_name,
          name: r.name,
          description: r.description,
          price: r.price != null ? Number(r.price) : null,
          comprehensive_score: r.comprehensive_score != null ? Number(r.comprehensive_score) : null,
          review_count: r.review_count != null ? Number(r.review_count) : null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          images: []
        };
      }
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path), sort_order: r.sort_order });
    }
    const list = Object.values(byId).map((p) => {
      p.images.sort((a, b) => a.sort_order - b.sort_order);
      return p;
    });
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取店铺商品列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    let rows;
    try {
      rows = await query(
        `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.comprehensive_score, p.review_count, p.created_at, p.updated_at,
          c.name AS category_name, s.name AS shop_name, s.region_id, r.name AS region_name,
          pi.file_path, pi.sort_order
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         LEFT JOIN shops s ON p.shop_id = s.id
         LEFT JOIN regions r ON s.region_id = r.id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.id = ? AND p.deleted_at IS NULL AND s.deleted_at IS NULL`,
        [productId]
      );
    } catch (qErr) {
      const msg = (qErr && (qErr.message || qErr.code || '')).toString();
      if (msg.includes('Unknown column') && (msg.includes('price') || msg.includes('comprehensive_score'))) {
        rows = await query(
          `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.created_at, p.updated_at,
            c.name AS category_name, s.name AS shop_name, s.region_id, r.name AS region_name,
            pi.file_path, pi.sort_order
           FROM products p
           LEFT JOIN product_categories c ON p.category_id = c.id
           LEFT JOIN shops s ON p.shop_id = s.id
           LEFT JOIN regions r ON s.region_id = r.id
           LEFT JOIN product_images pi ON pi.product_id = p.id
           WHERE p.id = ? AND p.deleted_at IS NULL AND s.deleted_at IS NULL`,
          [productId]
        );
      } else {
        throw qErr;
      }
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '商品不存在' });
    }
    const byId = {};
    for (const r of rows) {
      if (!byId[r.id]) {
        byId[r.id] = {
          id: r.id,
          shop_id: r.shop_id,
          shop_name: r.shop_name,
          region_id: r.region_id,
          region_name: r.region_name,
          category_id: r.category_id,
          category_name: r.category_name,
          name: r.name,
          description: r.description,
          price: r.price != null ? Number(r.price) : null,
          comprehensive_score: r.comprehensive_score != null ? Number(r.comprehensive_score) : null,
          review_count: r.review_count != null ? Number(r.review_count) : null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          images: []
        };
      }
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize) + 1;
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }
    const commentRows = await query(
      `SELECT pc.id, pc.product_id, pc.user_id, pc.parent_id, pc.rating, pc.content, pc.created_at,
        u.nickname AS author_nickname, u.avatar AS author_avatar, u.role AS author_role,
        pci.file_path AS image_path, pci.sort_order AS image_sort
       FROM product_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN product_comment_images pci ON pci.comment_id = pc.id
       WHERE pc.product_id = ? AND pc.deleted_at IS NULL
       ORDER BY pc.created_at ASC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [productId]
    );
    const commentById = {};
    for (const c of commentRows || []) {
      const isMerchantReply = c.parent_id !== null && c.author_role === 'merchant';
      const nick = isMerchantReply ? c.author_nickname : null;
      const avatar = isMerchantReply ? assetUrl(c.author_avatar) : null;
      if (!commentById[c.id]) {
        commentById[c.id] = {
          id: c.id,
          product_id: c.product_id,
          user_id: c.user_id,
          parent_id: c.parent_id,
          rating: c.rating,
          content: c.content,
          created_at: c.created_at,
          author: { nickname: nick, avatar },
          images: []
        };
      }
      if (c.image_path) commentById[c.id].images.push({ url: assetUrl(c.image_path), sort_order: c.image_sort });
    }
    const comments = Object.values(commentById).map((c) => {
      c.images.sort((a, b) => a.sort_order - b.sort_order);
      return c;
    });
    const hasMore = (commentRows || []).length > pageSize;

    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        ...product,
        comments: { list: comments, hasMore, page, pageSize }
      }
    });
  } catch (e) {
    console.error('商品详情错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const owner = await isProductOwner(productId, req.user.id);
    if (!owner) return res.status(403).json({ status: -1, message: '仅店主可编辑商品' });

    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const rawCategoryId = req.body.category_id;
    const categoryId = rawCategoryId !== undefined && rawCategoryId !== '' ? parseInt(rawCategoryId, 10) : undefined;
    const priceRaw = req.body.price;
    const price = priceRaw !== undefined && priceRaw !== null && priceRaw !== '' ? parseFloat(priceRaw) : undefined;
    if (!name) return res.status(400).json({ status: -1, message: '商品名称不能为空' });

    const updates = ['name = ?', 'description = ?'];
    const params = [name, description || null];
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(Number.isFinite(price) ? price : null);
    }
    if (rawCategoryId !== undefined) {
      if (categoryId != null && !isNaN(categoryId) && categoryId > 0) {
        const cat = await query('SELECT id, shop_id FROM product_categories WHERE id = ? AND deleted_at IS NULL', [categoryId]);
        const prod = await query('SELECT shop_id FROM products WHERE id = ?', [productId]);
        if (cat && cat.length > 0 && prod && prod[0].shop_id === cat[0].shop_id) {
          updates.push('category_id = ?');
          params.push(categoryId);
        }
      } else {
        updates.push('category_id = NULL');
      }
    }
    params.push(productId);
    await query(`UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

    const rows = await query(
      `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.created_at, p.updated_at,
        c.name AS category_name, pi.file_path, pi.sort_order
       FROM products p LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON pi.product_id = p.id WHERE p.id = ?`,
      [productId]
    );
    const byId = {};
    for (const r of rows) {
      if (!byId[r.id]) {
        byId[r.id] = { id: r.id, shop_id: r.shop_id, category_id: r.category_id, category_name: r.category_name, name: r.name, description: r.description, price: r.price != null ? Number(r.price) : null, created_at: r.created_at, updated_at: r.updated_at, images: [] };
      }
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);
    res.status(200).json({ status: 0, message: '修改成功', data: product });
  } catch (e) {
    console.error('修改商品错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const owner = await isProductOwner(productId, req.user.id);
    const admin = isAdmin(req);
    if (!owner && !admin) return res.status(403).json({ status: -1, message: '仅店主或管理员可删除商品' });
    await query('UPDATE products SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [productId]);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][PRODUCT_DELETE]', {
      userId: req.user.id,
      role: req.user.role,
      productId,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: admin ? 'ADMIN_PRODUCT_DELETE' : 'PRODUCT_DELETE',
      targetType: 'product',
      targetId: productId,
      ip,
      userAgent: ua,
    });
    res.status(200).json({ status: 0, message: '已删除（逻辑删除）' });
  } catch (e) {
    console.error('删除商品错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 商品评论
// ============================================
router.post('/products/:productId/comments', authenticateToken, (req, res, next) => {
  commentImagesUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: -1,
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp，单张≤5MB，最多3张）'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const rating = (req.body.rating || '').trim();
    const content = cleanText(req.body.content || '');
    const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
    if (!RATING_ENUM.includes(rating)) {
      return res.status(400).json({ status: -1, message: '请选择评级：' + RATING_ENUM.join(' / ') });
    }
    if (!content) return res.status(400).json({ status: -1, message: '评论内容不能为空' });
    if (content.length > 300) return res.status(400).json({ status: -1, message: '评论最多 300 字' });

    const prod = await query('SELECT id, shop_id FROM products WHERE id = ? AND deleted_at IS NULL', [productId]);
    if (!prod || prod.length === 0) return res.status(404).json({ status: -1, message: '商品不存在' });
    const shopId = prod[0].shop_id;

    const isMerchantUser = req.user && req.user.role === 'merchant';
    const isAdminUser = req.user && req.user.role === 'admin';

    // 商家点评限制：
    // - 不能对任何商品发表一级点评（parentId 为 null）
    // - 不能给其他商家的商品回复二级评论
    // - 仅允许给自家商品的一级点评回复二级评论
    if (isMerchantUser && !isAdminUser) {
      const isOwner = await isProductOwner(productId, req.user.id);
      if (parentId === null) {
        return res.status(403).json({ status: -1, message: '商家不能对商品进行一级点评' });
      }
      if (!isOwner) {
        return res.status(403).json({ status: -1, message: '商家只能给自家商品的点评回复二级评论' });
      }
    }

    if (parentId) {
      const parent = await query('SELECT id FROM product_comments WHERE id = ? AND product_id = ? AND parent_id IS NULL AND deleted_at IS NULL', [parentId, productId]);
      if (!parent || parent.length === 0) {
        return res.status(400).json({ status: -1, message: '只能回复一级评论，且该评论必须存在' });
      }
    }

    await query(
      'INSERT INTO product_comments (product_id, user_id, parent_id, rating, content) VALUES (?, ?, ?, ?, ?)',
      [productId, req.user.id, parentId, rating, content]
    );
    const commentId = (await query('SELECT LAST_INSERT_ID() AS id'))[0].id;
    const files = req.files || [];
    if (files.length > 0) {
      const paths = await saveCommentImages(files, commentId);
      for (let i = 0; i < paths.length; i++) {
        await query('INSERT INTO product_comment_images (comment_id, file_path, sort_order) VALUES (?, ?, ?)', [commentId, paths[i], i]);
      }
    }
    if (parentId === null) {
      await onPrimaryCommentChange(productId, shopId, req.user.id, rating, 1);
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][PRODUCT_COMMENT_CREATE]', {
      userId: req.user.id,
      role: req.user.role,
      productId,
      commentId,
      rating,
      parentId,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'PRODUCT_COMMENT_CREATE',
      targetType: 'product_comment',
      targetId: commentId,
      ip,
      userAgent: ua,
      meta: { productId, rating, parentId },
    });

    const rows = await query(
      `SELECT pc.id, pc.product_id, pc.user_id, pc.parent_id, pc.rating, pc.content, pc.created_at,
        u.nickname AS author_nickname, u.avatar AS author_avatar, u.role AS author_role,
        pci.file_path AS image_path, pci.sort_order AS image_sort
       FROM product_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN product_comment_images pci ON pci.comment_id = pc.id
       WHERE pc.id = ?`,
      [commentId]
    );
    const commentById = {};
    for (const c of rows || []) {
      const isMerchantReply = c.parent_id !== null && c.author_role === 'merchant';
      const nick = isMerchantReply ? c.author_nickname : null;
      const avatar = isMerchantReply ? assetUrl(c.author_avatar) : null;
      if (!commentById[c.id]) {
        commentById[c.id] = {
          id: c.id,
          product_id: c.product_id,
          user_id: c.user_id,
          parent_id: c.parent_id,
          rating: c.rating,
          content: c.content,
          created_at: c.created_at,
          author: { nickname: nick, avatar },
          images: []
        };
      }
      if (c.image_path) commentById[c.id].images.push({ url: assetUrl(c.image_path), sort_order: c.image_sort });
    }
    const comment = Object.values(commentById)[0];
    if (comment) comment.images.sort((a, b) => a.sort_order - b.sort_order);
    res.status(200).json({ status: 0, message: '评论成功', data: comment });
  } catch (e) {
    console.error('发表评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.get('/products/:productId/comments', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize) + 1;
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }
    const rows = await query(
      `SELECT pc.id, pc.product_id, pc.user_id, pc.parent_id, pc.rating, pc.content, pc.created_at,
        u.nickname AS author_nickname, u.avatar AS author_avatar, u.role AS author_role,
        pci.file_path AS image_path, pci.sort_order AS image_sort
       FROM product_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       LEFT JOIN product_comment_images pci ON pci.comment_id = pc.id
       WHERE pc.product_id = ? AND pc.deleted_at IS NULL
       ORDER BY pc.created_at ASC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [productId]
    );
    const commentById = {};
    for (const c of rows || []) {
      const isMerchantReply = c.parent_id !== null && c.author_role === 'merchant';
      const nick = isMerchantReply ? c.author_nickname : null;
      const avatar = isMerchantReply ? assetUrl(c.author_avatar) : null;
      if (!commentById[c.id]) {
        commentById[c.id] = {
          id: c.id,
          product_id: c.product_id,
          user_id: c.user_id,
          parent_id: c.parent_id,
          rating: c.rating,
          content: c.content,
          created_at: c.created_at,
          author: { nickname: nick, avatar },
          images: []
        };
      }
      if (c.image_path) commentById[c.id].images.push({ url: assetUrl(c.image_path), sort_order: c.image_sort });
    }
    const list = Object.values(commentById).map((c) => {
      c.images.sort((a, b) => a.sort_order - b.sort_order);
      return c;
    });
    const hasMore = (rows || []).length > pageSize;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    console.error('获取评论列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/products/:productId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    if (!productId || !commentId) return res.status(400).json({ status: -1, message: '参数无效' });
    const rows = await query(
      'SELECT id, user_id, rating, parent_id, product_id FROM product_comments WHERE id = ? AND product_id = ? AND deleted_at IS NULL',
      [commentId, productId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: -1, message: '评论不存在' });
    }
    const isAuthor = rows[0].user_id === req.user.id;
    const admin = isAdmin(req);
    if (!isAuthor && !admin) {
      return res.status(403).json({ status: -1, message: '仅本人或管理员可删除该评论' });
    }
    const isPrimary = rows[0].parent_id === null;
    const rating = rows[0].rating;
    const userId = rows[0].user_id;
    const prod = await query('SELECT shop_id FROM products WHERE id = ?', [productId]);
    const shopId = prod && prod[0] ? prod[0].shop_id : null;

    await query('UPDATE product_comments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [commentId]);
    if (isPrimary && shopId != null) {
      await onPrimaryCommentChange(productId, shopId, userId, rating, -1);
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][PRODUCT_COMMENT_DELETE]', {
      userId: req.user.id,
      role: req.user.role,
      productId,
      commentId,
      ip,
    });
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: admin ? 'ADMIN_PRODUCT_COMMENT_DELETE' : 'PRODUCT_COMMENT_DELETE',
      targetType: 'product_comment',
      targetId: commentId,
      ip,
      userAgent: ua,
      meta: { productId, isPrimary },
    });
    res.status(200).json({ status: 0, message: '已删除（逻辑删除）' });
  } catch (e) {
    console.error('删除评论错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 我的点评：当前用户对商品的一级点评列表（用于「我的点评」页）
// ============================================
router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize) + 1;
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || !Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }
    const rows = await query(
      `SELECT pc.id, pc.product_id, pc.rating, pc.content, pc.created_at,
        p.name AS product_name, p.shop_id,
        s.name AS shop_name,
        (SELECT pi.file_path FROM product_images pi WHERE pi.product_id = pc.product_id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path,
        pci.file_path AS image_path, pci.sort_order AS image_sort
       FROM product_comments pc
       INNER JOIN products p ON p.id = pc.product_id AND p.deleted_at IS NULL
       INNER JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL
       LEFT JOIN product_comment_images pci ON pci.comment_id = pc.id
       WHERE pc.user_id = ? AND pc.parent_id IS NULL AND pc.deleted_at IS NULL
       ORDER BY pc.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [req.user.id]
    );
    const byId = {};
    for (const r of rows || []) {
      if (!byId[r.id]) {
        byId[r.id] = {
          id: r.id,
          product_id: r.product_id,
          product_name: r.product_name,
          shop_id: r.shop_id,
          shop_name: r.shop_name,
          rating: r.rating,
          content: r.content,
          created_at: r.created_at,
          product_image: assetUrl(r.product_image_path),
          images: []
        };
      }
      if (r.image_path) byId[r.id].images.push({ url: assetUrl(r.image_path), sort_order: r.image_sort });
    }
    const list = Object.values(byId).map((item) => {
      item.images.sort((a, b) => a.sort_order - b.sort_order);
      return item;
    });
    const hasMore = (rows || []).length > pageSize;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    console.error('获取我的点评错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 商品收藏：加收藏、取消收藏、当前用户是否已收藏、我的收藏列表
// ============================================

/** 检查当前用户是否已收藏该商品（可选登录，未登录返回 false） */
router.get('/products/:productId/favorite', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(200).json({ status: 0, message: '获取成功', data: { favorited: false } });
  }
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(200).json({ status: 0, message: '获取成功', data: { favorited: false } });
    }
    req.user = decoded;
    next();
  });
}, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const prod = await query('SELECT id FROM products WHERE id = ? AND deleted_at IS NULL', [productId]);
    if (!prod || prod.length === 0) return res.status(404).json({ status: -1, message: '商品不存在' });
    const rows = await query('SELECT 1 FROM product_favorites WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
    const favorited = rows && rows.length > 0;
    res.status(200).json({ status: 0, message: '获取成功', data: { favorited } });
  } catch (e) {
    console.error('查询收藏状态错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 添加收藏（已收藏则幂等成功） */
router.post('/products/:productId/favorite', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    const prod = await query('SELECT id FROM products WHERE id = ? AND deleted_at IS NULL', [productId]);
    if (!prod || prod.length === 0) return res.status(404).json({ status: -1, message: '商品不存在' });
    await query('INSERT IGNORE INTO product_favorites (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
    res.status(200).json({ status: 0, message: '已收藏', data: { favorited: true } });
  } catch (e) {
    console.error('添加收藏错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 取消收藏 */
router.delete('/products/:productId/favorite', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ status: -1, message: '商品 ID 无效' });
    await query('DELETE FROM product_favorites WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
    res.status(200).json({ status: 0, message: '已取消收藏', data: { favorited: false } });
  } catch (e) {
    console.error('取消收藏错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 我的收藏列表（用于个人主页收藏栏，缩略卡片：商品图+名称+店铺） */
router.get('/my-favorites', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;
    const limitNum = Number(pageSize) + 1;
    const offsetNum = Number(offset);
    if (!Number.isInteger(limitNum) || limitNum < 1 || offsetNum < 0) {
      return res.status(400).json({ status: -1, message: '分页参数无效' });
    }
    const rows = await query(
      `SELECT pf.product_id, pf.created_at AS favorited_at,
        p.name AS product_name, p.shop_id,
        s.name AS shop_name,
        (SELECT pi.file_path FROM product_images pi WHERE pi.product_id = pf.product_id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path
       FROM product_favorites pf
       INNER JOIN products p ON p.id = pf.product_id AND p.deleted_at IS NULL
       INNER JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL
       WHERE pf.user_id = ?
       ORDER BY pf.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [req.user.id]
    );
    const list = (rows || []).slice(0, pageSize).map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      shop_name: r.shop_name,
      product_image: assetUrl(r.product_image_path),
      favorited_at: r.favorited_at,
    }));
    const hasMore = (rows || []).length > pageSize;
    res.status(200).json({ status: 0, message: '获取成功', data: { list, hasMore, page, pageSize } });
  } catch (e) {
    console.error('获取我的收藏错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 排行榜（零点评商品/店铺不参与按评分排序的榜单）
// ============================================

/** 最夯单品榜：上线至今累计综合评分 Top 5，同分按上架时间越早越前 */
router.get('/rankings/hot-products', async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.id, p.shop_id, p.name, p.comprehensive_score, p.review_count, p.created_at, s.name AS shop_name
       FROM products p
       JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
       WHERE p.deleted_at IS NULL AND p.review_count > 0 AND p.comprehensive_score IS NOT NULL
       ORDER BY p.comprehensive_score DESC, p.created_at ASC
       LIMIT 5`
    );
    const list = (rows || []).map((r) => ({
      rank: 0,
      product_id: r.id,
      product_name: r.name,
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      comprehensive_score: Number(r.comprehensive_score),
      review_count: r.review_count,
      created_at: r.created_at
    }));
    list.forEach((item, i) => { item.rank = i + 1; });
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('最夯单品榜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 门庭若市商家榜：当周点评数 Top 5 */
router.get('/rankings/busy-shops', async (req, res) => {
  try {
    const rows = await query(
      `SELECT s.id, s.name, s.region_id, s.weekly_review_count, r.name AS region_name
       FROM shops s
       JOIN regions r ON s.region_id = r.id
       WHERE s.deleted_at IS NULL
       ORDER BY s.weekly_review_count DESC, s.created_at ASC
       LIMIT 5`
    );
    const list = (rows || []).map((r, i) => ({
      rank: i + 1,
      shop_id: r.id,
      shop_name: r.name,
      region_id: r.region_id,
      region_name: r.region_name,
      weekly_review_count: r.weekly_review_count
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('门庭若市榜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 最夯商家榜：商家综合评分 Top 5，零点评不参与 */
router.get('/rankings/top-shops', async (req, res) => {
  try {
    const rows = await query(
      `SELECT s.id, s.name, s.region_id, s.comprehensive_score, s.review_count, r.name AS region_name
       FROM shops s
       JOIN regions r ON s.region_id = r.id
       WHERE s.deleted_at IS NULL AND s.review_count > 0 AND s.comprehensive_score IS NOT NULL
       ORDER BY s.comprehensive_score DESC, s.created_at ASC
       LIMIT 5`
    );
    const list = (rows || []).map((r, i) => ({
      rank: i + 1,
      shop_id: r.id,
      shop_name: r.name,
      region_id: r.region_id,
      region_name: r.region_name,
      comprehensive_score: Number(r.comprehensive_score),
      review_count: r.review_count
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('最夯商家榜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 爆款新品：上架距今 ≤7 自然日（东八区），按累计综合评分 Top 3，名额不足可为空 */
router.get('/rankings/new-hit-products', async (req, res) => {
  try {
    const sevenDaysAgo = shanghaiDaysAgoStart(7);
    const rows = await query(
      `SELECT p.id, p.shop_id, p.name, p.comprehensive_score, p.review_count, p.created_at, s.name AS shop_name
       FROM products p
       JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
       WHERE p.deleted_at IS NULL AND p.review_count > 0 AND p.comprehensive_score IS NOT NULL AND p.created_at >= ?
       ORDER BY p.comprehensive_score DESC, p.created_at ASC
       LIMIT 3`,
      [sevenDaysAgo]
    );
    const list = (rows || []).map((r, i) => ({
      rank: i + 1,
      product_id: r.id,
      product_name: r.name,
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      comprehensive_score: Number(r.comprehensive_score),
      review_count: r.review_count,
      created_at: r.created_at
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('爆款新品榜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 点评达人榜：当周点评数 Top 5 */
router.get('/rankings/active-users', async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.weekly_comment_count
       FROM users u
       WHERE u.weekly_comment_count > 0
       ORDER BY u.weekly_comment_count DESC, u.id ASC
       LIMIT 5`
    );
    const list = (rows || []).map((r, i) => ({
      rank: i + 1,
      user_id: r.id,
      username: r.username,
      nickname: r.nickname,
      avatar: assetUrl(r.avatar),
      weekly_comment_count: r.weekly_comment_count
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('点评达人榜错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
