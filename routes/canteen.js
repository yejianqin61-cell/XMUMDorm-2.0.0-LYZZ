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
  shopLogoUpload,
  bannerImageUpload
} = require('../middleware/upload');
const { onPrimaryCommentChange } = require('../services/rankingStats');
const { logAudit } = require('../services/auditLog');
const { shanghaiDaysAgoStart } = require('../utils/timezone');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const { assetUrl } = require('../utils/assets');
const { uploadBuffer, guessContentType } = require('../services/objectStorage');
const { simpleCache } = require('../utils/simpleCache');
const { grantExp } = require('../services/expService');
const { attachExp } = require('../utils/expResponse');
const { isQualityReview } = require('../utils/expEligibility');

const RATING_ENUM = ['夯爆了', '顶级', '人上人', 'NPC', '拉完了'];

/** 吃货广场：与 migrations/032_food_square_tag.sql、树洞发帖 tag 一致 */
const FOOD_SQUARE_TAG_SLUG = 'food-square';
const BANNER_LINK_TYPES = ['none', 'product', 'shop', 'post', 'url', 'region'];
const BANNER_TYPES = ['content', 'ad'];

function invalidateBannerCache() {
  simpleCache.delete('canteen:banners:v1');
}

async function saveBannerImageFile(file, bannerId) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? (ext === '.jpeg' ? '.jpg' : ext)
    : '.jpg';
  const key = `canteen/banners/banner_${bannerId}${safeExt}`;
  await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, safeExt) });
  return key;
}

function parseBannerBody(body) {
  const raw = body || {};
  const type = raw.type === 'ad' ? 'ad' : 'content';
  const title = cleanText(raw.title);
  const subtitle = raw.subtitle != null && String(raw.subtitle).trim() !== ''
    ? cleanText(raw.subtitle)
    : null;
  let link_type = String(raw.link_type || 'none');
  if (!BANNER_LINK_TYPES.includes(link_type)) link_type = 'none';
  let link_target = raw.link_target != null ? String(raw.link_target).trim() : '';
  if (link_type === 'none') link_target = null;
  else if (!link_target) link_target = null;
  const sort_order = parseInt(raw.sort_order, 10);
  const is_active = raw.is_active === '0' || raw.is_active === 0 || raw.is_active === false ? 0 : 1;
  const startsRaw = raw.starts_at != null ? String(raw.starts_at).trim() : '';
  const endsRaw = raw.ends_at != null ? String(raw.ends_at).trim() : '';
  const starts_at = startsRaw ? new Date(startsRaw) : null;
  const ends_at = endsRaw ? new Date(endsRaw) : null;
  return {
    type,
    title,
    subtitle,
    link_type,
    link_target,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    is_active,
    starts_at: starts_at && !Number.isNaN(starts_at.getTime()) ? starts_at : null,
    ends_at: ends_at && !Number.isNaN(ends_at.getTime()) ? ends_at : null,
  };
}

function mapBannerAdminRow(r) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle || '',
    image_url: assetUrl(r.image_url),
    image_path: r.image_url,
    link_type: r.link_type,
    link_target: r.link_target || '',
    sort_order: r.sort_order,
    is_active: !!r.is_active,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
  };
}

/** 未上传图片的商品使用的默认图（与前端 public/products 文件名一致，便于同源 /products/* 加载） */
const DEFAULT_PRODUCT_IMAGE_PATH = process.env.DEFAULT_PRODUCT_IMAGE_PATH || '/products/default.png';

/** 获取商品第一张点评图片（按 sort_order），无则返回 null */
async function getFirstReviewImageForProduct(productId) {
  const rows = await query(
    `SELECT pci.file_path FROM product_comment_images pci
     JOIN product_comments pc ON pci.comment_id = pc.id
     WHERE pc.product_id = ? AND pc.deleted_at IS NULL
     ORDER BY pci.sort_order ASC, pci.created_at ASC
     LIMIT 1`,
    [productId]
  );
  if (rows && rows.length > 0 && rows[0].file_path) {
    return assetUrl(rows[0].file_path);
  }
  return null;
}

/** 批量获取商品第一张点评图片 */
async function batchGetFirstReviewImages(productIds) {
  if (!productIds || productIds.length === 0) return {};
  const placeholders = productIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT pc.product_id, pci.file_path FROM product_comment_images pci
     JOIN product_comments pc ON pci.comment_id = pc.id
     WHERE pc.product_id IN (${placeholders}) AND pc.deleted_at IS NULL
     ORDER BY pci.sort_order ASC, pci.created_at ASC`,
    productIds
  );
  const map = {};
  for (const r of rows || []) {
    if (!map[r.product_id] && r.file_path) {
      map[r.product_id] = assetUrl(r.file_path);
    }
  }
  return map;
}

/** 确保商品至少有默认图；当无商家图时优先使用点评第一张图片，其次用默认占位图 */
async function ensureProductDefaultImageAsync(product) {
  if (product && product.images && product.images.length === 0) {
    const reviewImage = product.id ? await getFirstReviewImageForProduct(product.id) : null;
    product.images = [{ url: reviewImage || DEFAULT_PRODUCT_IMAGE_PATH, sort_order: 0 }];
  }
  return product;
}

/** 批量确保商品默认图 */
async function ensureProductListDefaultImages(list) {
  const needFallback = list.filter((p) => p && p.images && p.images.length === 0);
  if (needFallback.length > 0) {
    const ids = needFallback.map((p) => p.id);
    const reviewMap = await batchGetFirstReviewImages(ids);
    for (const p of needFallback) {
      p.images = [{ url: reviewMap[p.id] || DEFAULT_PRODUCT_IMAGE_PATH, sort_order: 0 }];
    }
  }
  return list;
}

// 统一的文本清洗，防止 XSS 注入（去掉所有 HTML 标签，只保留纯文本）
function cleanText(input) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return cleaned.trim();
}

/** 转义 LIKE 通配符，供模糊搜索使用 */
function escapeLikeToken(raw) {
  return String(raw || '')
    .trim()
    .replace(/[%_\\]/g, '\\$&');
}

/** 将搜索词拆成 token，每 token 须在任一字段中模糊命中（LIKE %token%） */
function tokenizeSearchQuery(q) {
  return String(q || '')
    .trim()
    .split(/\s+/)
    .map(escapeLikeToken)
    .filter(Boolean);
}

function buildFuzzyLikeClause(tokens, fields) {
  if (!tokens.length || !fields.length) {
    return { clause: '1=0', params: [] };
  }
  const parts = [];
  const params = [];
  for (const token of tokens) {
    const like = `%${token}%`;
    const fieldExprs = fields.map((f) => `${f} LIKE ?`).join(' OR ');
    parts.push(`(${fieldExprs})`);
    params.push(...fields.map(() => like));
  }
  return { clause: parts.join(' AND '), params };
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
    const ttlMs = Number(process.env.CACHE_REGIONS_TTL_MS || 10 * 60 * 1000); // 10min
    const rows = await simpleCache.getOrSet('canteen:regions:v1', ttlMs, async () => {
      return await query('SELECT id, code, name, sort_order FROM regions ORDER BY sort_order ASC');
    });
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

/**
 * 分区内商品排行榜数据（供多路由复用）
 * 排序分：优先用一级点评实时加权均值（与 rankingStats 等级分一致）；若无点评聚合行则用商品表 comprehensive_score。
 * 入选条件：存在至少一条有效一级点评，或（review_count>0 且 comprehensive_score 非空）。
 * 解决：历史点评已写入 product_comments，但 products 上 review_count/综合分未回填时仍会上榜。
 * 同分则 created_at 更晚在前，再 id 降序。返回项含 rank（1-based）。
 */
async function buildRegionTopProductsList(regionId, limitRaw) {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 20));
  const ratingCase = `SUM(
      CASE rating
        WHEN '夯爆了' THEN 10
        WHEN '顶级' THEN 7
        WHEN '人上人' THEN 4
        WHEN 'NPC' THEN 1
        WHEN '拉完了' THEN -1
      END
    ) / NULLIF(COUNT(*), 0)`;

  const orderRank = `ORDER BY (rank_score IS NULL) ASC, rank_score DESC, p.created_at DESC, p.id DESC`;

  let idRows;
  try {
    // LIMIT 使用内联整数：部分托管 MySQL + mysql2 对 LIMIT ? 预处理偶发异常
    idRows = await query(
      `SELECT p.id AS id,
        ROUND(COALESCE(
          IF(ca.cc IS NOT NULL AND ca.cc > 0, ca.live_score, NULL),
          p.comprehensive_score
        ), 2) AS rank_score
       FROM products p
       INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL AND s.region_id = ?
       LEFT JOIN (
         SELECT product_id,
           COUNT(*) AS cc,
           ${ratingCase} AS live_score
         FROM product_comments
         WHERE (parent_id IS NULL OR parent_id = 0) AND deleted_at IS NULL
           AND rating IN ('夯爆了','顶级','人上人','NPC','拉完了')
         GROUP BY product_id
       ) ca ON ca.product_id = p.id
       WHERE p.deleted_at IS NULL
         AND (
           (ca.cc IS NOT NULL AND ca.cc > 0)
           OR (p.review_count > 0 AND p.comprehensive_score IS NOT NULL)
         )
       ${orderRank}
       LIMIT ${safeLimit}`,
      [regionId]
    );
  } catch (qErr) {
    const msg = (qErr && (qErr.message || qErr.code || '')).toString();
    // 未跑 migrations/003 时可能缺 review_count / comprehensive_score / count_rating_*，不能只匹配 comprehensive_score
    const missingProductRankingCols =
      msg.includes('Unknown column') &&
      /comprehensive_score|review_count|count_rating/i.test(msg);
    const missingDeletedAtCol = msg.includes('Unknown column') && /deleted_at/i.test(msg);

    if (missingProductRankingCols) {
      try {
        idRows = await query(
          `SELECT p.id AS id,
            ROUND(ca.live_score, 2) AS rank_score
           FROM products p
           INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL AND s.region_id = ?
           INNER JOIN (
             SELECT product_id,
               ${ratingCase} AS live_score
             FROM product_comments
             WHERE (parent_id IS NULL OR parent_id = 0) AND deleted_at IS NULL
               AND rating IN ('夯爆了','顶级','人上人','NPC','拉完了')
             GROUP BY product_id
             HAVING COUNT(*) > 0
           ) ca ON ca.product_id = p.id
           WHERE p.deleted_at IS NULL
           ${orderRank}
           LIMIT ${safeLimit}`,
          [regionId]
        );
      } catch (e2) {
        idRows = await query(
          `SELECT p.id AS id, NULL AS rank_score
           FROM products p
           INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL AND s.region_id = ?
           WHERE p.deleted_at IS NULL
           ORDER BY p.created_at DESC, p.id DESC
           LIMIT ${safeLimit}`,
          [regionId]
        );
      }
    } else if (missingDeletedAtCol) {
      // 极老库无 deleted_at：不做逻辑删除过滤（宁可多显示也不要 500）
      idRows = await query(
        `SELECT p.id AS id,
          ROUND(COALESCE(
            IF(ca.cc IS NOT NULL AND ca.cc > 0, ca.live_score, NULL),
            p.comprehensive_score
          ), 2) AS rank_score
         FROM products p
         INNER JOIN shops s ON p.shop_id = s.id AND s.region_id = ?
         LEFT JOIN (
           SELECT product_id,
             COUNT(*) AS cc,
             ${ratingCase} AS live_score
           FROM product_comments
           WHERE (parent_id IS NULL OR parent_id = 0)
             AND rating IN ('夯爆了','顶级','人上人','NPC','拉完了')
           GROUP BY product_id
         ) ca ON ca.product_id = p.id
         WHERE (
             (ca.cc IS NOT NULL AND ca.cc > 0)
             OR (p.review_count > 0 AND p.comprehensive_score IS NOT NULL)
           )
         ${orderRank}
         LIMIT ${safeLimit}`,
        [regionId]
      );
    } else {
      console.error('[buildRegionTopProductsList] id query failed:', qErr.sqlMessage || qErr.message);
      throw qErr;
    }
  }

  const ids = (idRows || []).map((r) => r.id);
  const scoreById = new Map(
    (idRows || []).map((r) => [r.id, r.rank_score != null ? Number(r.rank_score) : null])
  );
  if (ids.length === 0) return [];

  const ph = ids.map(() => '?').join(',');
  let rows;
  try {
    rows = await query(
      `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.comprehensive_score, p.review_count, p.created_at, p.updated_at,
        c.name AS category_name, s.name AS shop_name, pi.file_path, pi.sort_order
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.id IN (${ph}) AND p.deleted_at IS NULL`,
      ids
    );
  } catch (qErr) {
    const msg = (qErr && (qErr.message || qErr.code || '')).toString();
    if (
      msg.includes('Unknown column') &&
      /price|comprehensive_score|review_count|count_rating/i.test(msg)
    ) {
      rows = await query(
        `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.created_at, p.updated_at,
          c.name AS category_name, s.name AS shop_name, pi.file_path, pi.sort_order
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.id IN (${ph}) AND p.deleted_at IS NULL`,
        ids
      );
    } else if (msg.includes('Unknown column') && /deleted_at/i.test(msg)) {
      rows = await query(
        `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.comprehensive_score, p.review_count, p.created_at, p.updated_at,
          c.name AS category_name, s.name AS shop_name, pi.file_path, pi.sort_order
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         INNER JOIN shops s ON p.shop_id = s.id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.id IN (${ph})`,
        ids
      );
    } else {
      console.error('[buildRegionTopProductsList] detail query failed:', qErr.sqlMessage || qErr.message);
      throw qErr;
    }
  }

  const byId = {};
  for (const r of rows || []) {
    if (!byId[r.id]) {
      byId[r.id] = {
        id: r.id,
        shop_id: r.shop_id,
        shop_name: r.shop_name,
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
    if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
  }

  const products = ids
    .map((id) => {
      const p = byId[id];
      if (!p) return null;
      p.images.sort((a, b) => a.sort_order - b.sort_order);
      return { ...p };
    })
    .filter(Boolean);
  await ensureProductListDefaultImages(products);
  return products.map((p, index) => {
    const rs = scoreById.get(p.id);
    return {
      ...p,
      rank: index + 1,
      comprehensive_score: rs != null && !Number.isNaN(rs) ? rs : p.comprehensive_score,
    };
  });
}

// 按区域 code（如 D6、LY3）取分区商品榜，与 /regions/:id/top-products 数据一致
router.get('/regions/code/:regionCode/top-products', async (req, res) => {
  try {
    let regionCode = String(req.params.regionCode || '').trim();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    if (!regionCode) {
      return res.status(400).json({ status: -1, message: '区域代码无效' });
    }
    if (/^others$/i.test(regionCode)) regionCode = 'other';
    const found = await query(
      'SELECT id FROM regions WHERE LOWER(code) = LOWER(?)',
      [regionCode]
    );
    if (!found || !found[0]) {
      return res.status(404).json({ status: -1, message: '区域不存在' });
    }
    const list = await buildRegionTopProductsList(found[0].id, limit);
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('按代码获取区域热门商品错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// 按区域 id 取分区商品榜；每项含 rank
router.get('/regions/:regionId/top-products', async (req, res) => {
  try {
    const regionId = parseInt(req.params.regionId, 10);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    if (!regionId) {
      return res.status(400).json({ status: -1, message: '区域 ID 无效' });
    }
    const list = await buildRegionTopProductsList(regionId, limit);
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取区域热门商品错误:', e);
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
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp，单张≤8MB，最多5张）'
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
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);
    await ensureProductDefaultImageAsync(product);
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
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
    }
    const list = await ensureProductListDefaultImages(
      Object.values(byId).map((p) => {
        p.images.sort((a, b) => a.sort_order - b.sort_order);
        return p;
      })
    );
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取店铺商品列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// 本店热门商品：按综合评分从高到低取前 10 名（仅统计有评分的商品）
router.get('/shops/:shopId/hot-products', async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ status: -1, message: '店铺 ID 无效' });
    let sql = `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.comprehensive_score, p.review_count, p.created_at, p.updated_at,
        c.name AS category_name, pi.file_path, pi.sort_order
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.shop_id = ? AND p.deleted_at IS NULL
         AND p.review_count > 0 AND p.comprehensive_score IS NOT NULL
       ORDER BY p.comprehensive_score DESC, p.created_at DESC
       LIMIT 10`;
    let rows;
    try {
      rows = await query(sql, [shopId]);
    } catch (qErr) {
      const msg = (qErr && (qErr.message || qErr.code || '')).toString();
      if (msg.includes('Unknown column') && msg.includes('comprehensive_score')) {
        // 兼容旧库：若还没有综合评分字段，则退化为按创建时间排序的前 10 个有该店评价的商品
        sql = `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.created_at, p.updated_at,
            c.name AS category_name, pi.file_path, pi.sort_order
           FROM products p
           LEFT JOIN product_categories c ON p.category_id = c.id
           LEFT JOIN product_images pi ON pi.product_id = p.id
           WHERE p.shop_id = ? AND p.deleted_at IS NULL
           ORDER BY p.created_at DESC
           LIMIT 10`;
        rows = await query(sql, [shopId]);
      } else {
        throw qErr;
      }
    }
    const byId = {};
    for (const r of rows || []) {
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
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
    }
    const list = await ensureProductListDefaultImages(
      Object.values(byId).map((p) => {
        p.images.sort((a, b) => a.sort_order - b.sort_order);
        return p;
      })
    );
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('获取本店热门商品错误:', e);
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
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);
    await ensureProductDefaultImageAsync(product);

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

// 编辑商品：支持 JSON 或 multipart（带新图片时用 FormData，会替换旧图）
router.patch('/products/:productId', authenticateToken, (req, res, next) => {
  const isMultipart = (req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data');
  if (isMultipart) {
    productImagesUpload(req, res, (err) => {
      if (err) return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
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

    const files = req.files || [];
    if (files.length > 0) {
      await query('DELETE FROM product_images WHERE product_id = ?', [productId]);
      const paths = await saveProductImages(files, productId);
      for (let i = 0; i < paths.length; i++) {
        await query('INSERT INTO product_images (product_id, file_path, sort_order) VALUES (?, ?, ?)', [productId, paths[i], i]);
      }
    }

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
      if (r.file_path) byId[r.id].images.push({ url: assetUrl(r.file_path, r.updated_at), sort_order: r.sort_order });
    }
    const product = byId[productId];
    if (product) product.images.sort((a, b) => a.sort_order - b.sort_order);
    await ensureProductDefaultImageAsync(product);
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
        message: err.message || '图片格式或大小不符合要求（仅 jpg/png/webp，单张≤8MB，最多3张）'
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
    let expResult = null;
    if (parentId === null) {
      expResult = await grantExp(req.user.id, {
        action: 'cafeteria_review',
        refType: 'product_comment',
        refId: commentId,
      });
      const hasImages = (files && files.length > 0) || (rows && rows.some((r) => r.image_path));
      if (isQualityReview(content, hasImages)) {
        const bonus = await grantExp(req.user.id, {
          action: 'quality_bonus',
          refType: 'product_comment',
          refId: commentId,
        });
        if (bonus.delta && expResult) {
          expResult = {
            ...bonus,
            delta: (expResult.delta || 0) + bonus.delta,
            messages: [...(expResult.messages || []), ...(bonus.messages || [])],
          };
        } else if (bonus.delta) {
          expResult = bonus;
        }
      }
    }

    res.status(200).json(attachExp({ status: 0, message: '评论成功', data: comment }, expResult));
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
    const ttlMs = Number(process.env.CACHE_RANKINGS_TTL_MS || 30 * 1000); // 30s
    const rows = await simpleCache.getOrSet('canteen:rankings:hot-products:v1', ttlMs, async () => {
      return await query(
        `SELECT p.id, p.shop_id, p.name, p.comprehensive_score, p.review_count, p.created_at, s.name AS shop_name,
          (SELECT pi.file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path,
          (SELECT pci2.file_path FROM product_comment_images pci2
           JOIN product_comments pc2 ON pci2.comment_id = pc2.id
           WHERE pc2.product_id = p.id AND pc2.deleted_at IS NULL
           ORDER BY pci2.sort_order ASC, pci2.created_at ASC LIMIT 1) AS review_image_path
         FROM products p
         JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
         WHERE p.deleted_at IS NULL AND p.review_count > 0 AND p.comprehensive_score IS NOT NULL
         ORDER BY p.comprehensive_score DESC, p.created_at DESC
         LIMIT 5`
      );
    });
    const list = (rows || []).map((r) => ({
      rank: 0,
      product_id: r.id,
      product_name: r.name,
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      comprehensive_score: Number(r.comprehensive_score),
      review_count: r.review_count,
      created_at: r.created_at,
      product_image: assetUrl(r.product_image_path) || assetUrl(r.review_image_path) || DEFAULT_PRODUCT_IMAGE_PATH,
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
    const ttlMs = Number(process.env.CACHE_RANKINGS_TTL_MS || 30 * 1000); // 30s
    const rows = await simpleCache.getOrSet('canteen:rankings:busy-shops:v1', ttlMs, async () => {
      return await query(
        `SELECT s.id, s.name, s.region_id, s.weekly_review_count, r.name AS region_name
         FROM shops s
         JOIN regions r ON s.region_id = r.id
         WHERE s.deleted_at IS NULL
         ORDER BY s.weekly_review_count DESC, s.created_at ASC
         LIMIT 5`
      );
    });
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
    const ttlMs = Number(process.env.CACHE_RANKINGS_TTL_MS || 30 * 1000); // 30s
    const rows = await simpleCache.getOrSet('canteen:rankings:top-shops:v1', ttlMs, async () => {
      return await query(
        `SELECT s.id, s.name, s.region_id, s.comprehensive_score, s.review_count, r.name AS region_name
         FROM shops s
         JOIN regions r ON s.region_id = r.id
         WHERE s.deleted_at IS NULL AND s.review_count > 0 AND s.comprehensive_score IS NOT NULL
         ORDER BY s.comprehensive_score DESC, s.created_at ASC
         LIMIT 5`
      );
    });
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
    const ttlMs = Number(process.env.CACHE_RANKINGS_TTL_MS || 30 * 1000); // 30s
    const cacheKey = `canteen:rankings:new-hit-products:v1:${sevenDaysAgo.toISOString().slice(0, 10)}`;
    const rows = await simpleCache.getOrSet(cacheKey, ttlMs, async () => {
      return await query(
        `SELECT p.id, p.shop_id, p.name, p.comprehensive_score, p.review_count, p.created_at, s.name AS shop_name,
          (SELECT pi.file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path,
          (SELECT pci2.file_path FROM product_comment_images pci2
           JOIN product_comments pc2 ON pci2.comment_id = pc2.id
           WHERE pc2.product_id = p.id AND pc2.deleted_at IS NULL
           ORDER BY pci2.sort_order ASC, pci2.created_at ASC LIMIT 1) AS review_image_path
         FROM products p
         JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
         WHERE p.deleted_at IS NULL AND p.review_count > 0 AND p.comprehensive_score IS NOT NULL AND p.created_at >= ?
         ORDER BY p.comprehensive_score DESC, p.created_at DESC
         LIMIT 3`,
        [sevenDaysAgo]
      );
    });
    const list = (rows || []).map((r, i) => ({
      rank: i + 1,
      product_id: r.id,
      product_name: r.name,
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      comprehensive_score: Number(r.comprehensive_score),
      review_count: r.review_count,
      created_at: r.created_at,
      product_image: assetUrl(r.product_image_path) || assetUrl(r.review_image_path) || DEFAULT_PRODUCT_IMAGE_PATH,
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
    const ttlMs = Number(process.env.CACHE_RANKINGS_TTL_MS || 30 * 1000); // 30s
    const rows = await simpleCache.getOrSet('canteen:rankings:active-users:v1', ttlMs, async () => {
      return await query(
        `SELECT u.id, u.username, u.nickname, u.avatar, u.weekly_comment_count
         FROM users u
         WHERE u.weekly_comment_count > 0
         ORDER BY u.weekly_comment_count DESC, u.id ASC
         LIMIT 5`
      );
    });
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

// ============================================
// V3.0 食堂首页改版新增路由
// ============================================

// ---------- 模块一：统一搜索 ----------
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length > 50) {
      return res.status(200).json({ status: -1, message: !q ? '请输入搜索关键词' : '搜索词过长（最多50字符）', data: { products: [], articles: [], hasMore: { products: false, articles: false } } });
    }
    const type = (req.query.type || 'all').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;
    const tokens = tokenizeSearchQuery(q);
    if (!tokens.length) {
      return res.status(200).json({
        status: 0,
        message: '搜索成功',
        data: { q, products: [], articles: [], hasMore: { products: false, articles: false } },
      });
    }

    const productFuzzy = buildFuzzyLikeClause(tokens, ['p.name', "COALESCE(p.description, '')"]);
    const articleFuzzy = buildFuzzyLikeClause(tokens, ["COALESCE(p.title, '')"]);

    let products = [];
    let articles = [];
    let hasMoreP = false;
    let hasMoreA = false;

    if (type === 'all' || type === 'products') {
      const rows = await query(
        `SELECT p.id, p.name, p.shop_id, s.name AS shop_name, s.region_id, r.code AS region_code,
                p.comprehensive_score,
                (SELECT pi.file_path FROM product_images pi
                 WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path,
                (SELECT pci2.file_path FROM product_comment_images pci2
                 JOIN product_comments pc2 ON pci2.comment_id = pc2.id
                 WHERE pc2.product_id = p.id AND pc2.deleted_at IS NULL
                 ORDER BY pci2.sort_order ASC, pci2.created_at ASC LIMIT 1) AS review_image_path
         FROM products p
         JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
         JOIN regions r ON s.region_id = r.id
         WHERE p.deleted_at IS NULL AND (${productFuzzy.clause})
         ORDER BY p.comprehensive_score DESC, p.id DESC
         LIMIT ${limitCount} OFFSET ${offset}`,
        productFuzzy.params
      );
      hasMoreP = rows.length > pageSize;
      products = rows.slice(0, pageSize).map((r) => ({
        id: r.id,
        name: r.name,
        shop_id: r.shop_id,
        shop_name: r.shop_name,
        region_code: r.region_code,
        cover_url: assetUrl(r.product_image_path) || assetUrl(r.review_image_path) || DEFAULT_PRODUCT_IMAGE_PATH,
        comprehensive_score: r.comprehensive_score,
      }));
    }

    if (type === 'all' || type === 'articles') {
      // 美食文章：带「吃货广场」标签的帖子，模糊匹配标题
      let rows;
      try {
        rows = await query(
          `SELECT p.id, p.title, p.content, p.created_at, u.id AS author_id, u.username, u.nickname, u.avatar
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.deleted_at IS NULL AND p.hidden_by_admin = 0
             AND (${articleFuzzy.clause})
             AND EXISTS (
               SELECT 1 FROM post_tag_map ptm
               INNER JOIN tags tg ON tg.id = ptm.tag_id
               WHERE ptm.post_id = p.id AND tg.slug = ?
             )
           ORDER BY p.created_at DESC
           LIMIT ${limitCount} OFFSET ${offset}`,
          [...articleFuzzy.params, FOOD_SQUARE_TAG_SLUG]
        );
      } catch (qErr) {
        const msg = (qErr && (qErr.message || qErr.code || '')).toString();
        if (msg.includes('Unknown column') && msg.includes('title')) {
          const legacyArticleFuzzy = buildFuzzyLikeClause(tokens, ['p.content']);
          rows = await query(
            `SELECT p.id, p.content, p.created_at, u.id AS author_id, u.username, u.nickname, u.avatar
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.deleted_at IS NULL AND p.hidden_by_admin = 0
               AND (${legacyArticleFuzzy.clause})
               AND EXISTS (
                 SELECT 1 FROM post_tag_map ptm
                 INNER JOIN tags tg ON tg.id = ptm.tag_id
                 WHERE ptm.post_id = p.id AND tg.slug = ?
               )
             ORDER BY p.created_at DESC
             LIMIT ${limitCount} OFFSET ${offset}`,
            [...legacyArticleFuzzy.params, FOOD_SQUARE_TAG_SLUG]
          );
        } else {
          throw qErr;
        }
      }
      hasMoreA = rows.length > pageSize;
      articles = rows.slice(0, pageSize).map((r) => {
        const plain = (r.content || '').replace(/<[^>]*>/g, '').replace(/!\[.*?\]\([^)]*\)/g, '').replace(/\n+/g, ' ').trim();
        const titleTrim = (r.title || '').trim();
        return {
          id: r.id,
          title_or_excerpt: titleTrim || plain.slice(0, 80) || '（无文字内容）',
          author: { id: r.author_id, name: r.nickname || r.username || '匿名 Anonymous', avatar: assetUrl(r.avatar) },
          created_at: r.created_at,
        };
      });
    }

    res.status(200).json({
      status: 0,
      message: '搜索成功',
      data: { q, products, articles, hasMore: { products: hasMoreP, articles: hasMoreA } },
    });
  } catch (e) {
    console.error('食堂搜索错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ---------- 模块二：推荐轮播 ----------
router.get('/banners', async (req, res) => {
  try {
    const now = new Date();
    const rows = await simpleCache.getOrSet('canteen:banners:v1', 5 * 60 * 1000, async () => {
      return await query(
        `SELECT id, type, title, subtitle, image_url, link_type, link_target
         FROM canteen_banners
         WHERE is_active = 1
           AND (starts_at IS NULL OR starts_at <= ?)
           AND (ends_at IS NULL OR ends_at >= ?)
         ORDER BY sort_order ASC, id ASC
         LIMIT 10`,
        [now, now]
      );
    });
    const list = (rows || []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      subtitle: r.subtitle || '',
      image_url: assetUrl(r.image_url),
      link_type: r.link_type,
      link_target: r.link_target || '',
    }));
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('轮播获取错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

/** 管理员：全部轮播（含未生效） */
router.get('/banners/all', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    }
    const rows = await query(
      `SELECT id, type, title, subtitle, image_url, link_type, link_target,
              sort_order, starts_at, ends_at, is_active
       FROM canteen_banners
       ORDER BY sort_order ASC, id ASC`
    );
    const list = (rows || []).map(mapBannerAdminRow);
    res.status(200).json({ status: 0, message: '获取成功', data: list });
  } catch (e) {
    console.error('轮播管理列表错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.post('/banners', authenticateToken, (req, res, next) => {
  bannerImageUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    }
    const parsed = parseBannerBody(req.body);
    if (!parsed.title) {
      return res.status(400).json({ status: -1, message: '标题不能为空' });
    }
    let imagePath = req.body && req.body.image_url != null ? String(req.body.image_url).trim() : '';
    if (!imagePath && !req.file) {
      return res.status(400).json({ status: -1, message: '请上传图片或填写图片地址' });
    }
    const ins = await query(
      `INSERT INTO canteen_banners
         (type, title, subtitle, image_url, link_type, link_target, sort_order, starts_at, ends_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.type,
        parsed.title,
        parsed.subtitle,
        imagePath || '/products/default.png',
        parsed.link_type,
        parsed.link_target,
        parsed.sort_order,
        parsed.starts_at,
        parsed.ends_at,
        parsed.is_active,
      ]
    );
    const bannerId = ins && ins.insertId;
    if (req.file && bannerId) {
      imagePath = await saveBannerImageFile(req.file, bannerId);
      await query('UPDATE canteen_banners SET image_url = ? WHERE id = ?', [imagePath, bannerId]);
    }
    invalidateBannerCache();
    const rows = await query(
      `SELECT id, type, title, subtitle, image_url, link_type, link_target,
              sort_order, starts_at, ends_at, is_active
       FROM canteen_banners WHERE id = ?`,
      [bannerId]
    );
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CANTEEN_BANNER_CREATE',
      targetType: 'canteen_banner',
      targetId: bannerId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.status(201).json({
      status: 0,
      message: '创建成功',
      data: rows && rows[0] ? mapBannerAdminRow(rows[0]) : { id: bannerId },
    });
  } catch (e) {
    console.error('轮播创建错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.patch('/banners/:id', authenticateToken, (req, res, next) => {
  bannerImageUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: -1, message: err.message || '图片格式或大小不符合要求' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    }
    const bannerId = parseInt(req.params.id, 10);
    if (!bannerId) return res.status(400).json({ status: -1, message: '轮播 ID 无效' });
    const existing = await query('SELECT id FROM canteen_banners WHERE id = ?', [bannerId]);
    if (!existing || !existing.length) {
      return res.status(404).json({ status: -1, message: '轮播不存在' });
    }
    const parsed = parseBannerBody(req.body);
    if (!parsed.title) {
      return res.status(400).json({ status: -1, message: '标题不能为空' });
    }
    const updates = [
      'type = ?', 'title = ?', 'subtitle = ?', 'link_type = ?', 'link_target = ?',
      'sort_order = ?', 'starts_at = ?', 'ends_at = ?', 'is_active = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ];
    const params = [
      parsed.type,
      parsed.title,
      parsed.subtitle,
      parsed.link_type,
      parsed.link_target,
      parsed.sort_order,
      parsed.starts_at,
      parsed.ends_at,
      parsed.is_active,
    ];
    if (req.file) {
      const imagePath = await saveBannerImageFile(req.file, bannerId);
      updates.push('image_url = ?');
      params.push(imagePath);
    } else if (req.body && req.body.image_url != null && String(req.body.image_url).trim()) {
      updates.push('image_url = ?');
      params.push(String(req.body.image_url).trim());
    }
    params.push(bannerId);
    await query(`UPDATE canteen_banners SET ${updates.join(', ')} WHERE id = ?`, params);
    invalidateBannerCache();
    const rows = await query(
      `SELECT id, type, title, subtitle, image_url, link_type, link_target,
              sort_order, starts_at, ends_at, is_active
       FROM canteen_banners WHERE id = ?`,
      [bannerId]
    );
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CANTEEN_BANNER_UPDATE',
      targetType: 'canteen_banner',
      targetId: bannerId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.status(200).json({
      status: 0,
      message: '更新成功',
      data: rows && rows[0] ? mapBannerAdminRow(rows[0]) : null,
    });
  } catch (e) {
    console.error('轮播更新错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

router.delete('/banners/:id', authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: -1, message: '仅管理员可操作' });
    }
    const bannerId = parseInt(req.params.id, 10);
    if (!bannerId) return res.status(400).json({ status: -1, message: '轮播 ID 无效' });
    const result = await query('DELETE FROM canteen_banners WHERE id = ?', [bannerId]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ status: -1, message: '轮播不存在' });
    }
    invalidateBannerCache();
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CANTEEN_BANNER_DELETE',
      targetType: 'canteen_banner',
      targetId: bannerId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    res.status(200).json({ status: 0, message: '删除成功' });
  } catch (e) {
    console.error('轮播删除错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ---------- 模块五：今天吃什么（从所有已有一级评分的商品中随机） ----------
router.get('/pick-random', async (req, res) => {
  try {
    const excludeId = parseInt(req.query.exclude_id, 10) || 0;
    const params = [];
    let excludeSql = '';
    if (excludeId > 0) {
      excludeSql = 'AND p.id != ?';
      params.push(excludeId);
    }
    const rows = await query(
      `SELECT p.id, p.name, p.comprehensive_score, p.review_count,
              s.id AS shop_id, s.name AS shop_name, r.code AS region_code,
              (SELECT pi.file_path FROM product_images pi
               WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS product_image_path
       FROM products p
       JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL
       JOIN regions r ON s.region_id = r.id
       WHERE p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM product_comments pc
           WHERE pc.product_id = p.id
             AND pc.parent_id IS NULL
             AND pc.deleted_at IS NULL
             AND pc.rating IS NOT NULL
         )
         ${excludeSql}
       ORDER BY RAND()
       LIMIT 1`,
      params
    );
    if (!rows || rows.length === 0) {
      return res.status(200).json({ status: 0, message: '暂无已评分菜品', data: null });
    }
    const r = rows[0];
    const imagePath = r.product_image_path
      ? assetUrl(r.product_image_path)
      : DEFAULT_PRODUCT_IMAGE_PATH;
    res.status(200).json({
      status: 0,
      message: '随机推荐成功',
      data: {
        id: r.id,
        name: r.name,
        cover_url: imagePath,
        comprehensive_score: r.comprehensive_score != null ? Number(r.comprehensive_score) : null,
        review_count: r.review_count != null ? Number(r.review_count) : null,
        shop_id: r.shop_id,
        shop_name: r.shop_name,
        region_code: r.region_code,
      },
    });
  } catch (e) {
    console.error('随机推荐错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ---------- 模块六：吃货广场（树洞带「吃货广场」tag 的帖子） ----------
router.get('/food-articles', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const offset = (page - 1) * pageSize;
    const limitCount = pageSize + 1;

    const tagRows = await query('SELECT id FROM tags WHERE slug = ? LIMIT 1', [FOOD_SQUARE_TAG_SLUG]);
    if (!tagRows || tagRows.length === 0) {
      return res.status(200).json({
        status: 0,
        message: '获取成功',
        data: { list: [], total: 0, page, pageSize, hasMore: false },
      });
    }
    const tagId = tagRows[0].id;

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM posts p
       INNER JOIN post_tag_map ptm ON ptm.post_id = p.id AND ptm.tag_id = ?
       WHERE p.deleted_at IS NULL AND p.hidden_by_admin = 0`,
      [tagId]
    );
    const total = (countRows && countRows[0]) ? countRows[0].total : 0;

    let rows;
    try {
      rows = await query(
        `SELECT p.id, p.title, p.content, p.user_id, p.created_at,
                u.username, u.nickname, u.avatar,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
                (SELECT pi.file_path FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS first_image_path
         FROM posts p
         INNER JOIN post_tag_map ptm ON ptm.post_id = p.id AND ptm.tag_id = ?
         JOIN users u ON p.user_id = u.id
         WHERE p.deleted_at IS NULL AND p.hidden_by_admin = 0
         ORDER BY p.created_at DESC
         LIMIT ${limitCount} OFFSET ${offset}`,
        [tagId]
      );
    } catch (qErr) {
      const msg = (qErr && (qErr.message || qErr.code || '')).toString();
      if (msg.includes('Unknown column') && msg.includes('title')) {
        rows = await query(
          `SELECT p.id, p.content, p.user_id, p.created_at,
                  u.username, u.nickname, u.avatar,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
                  (SELECT pi.file_path FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS first_image_path
           FROM posts p
           INNER JOIN post_tag_map ptm ON ptm.post_id = p.id AND ptm.tag_id = ?
           JOIN users u ON p.user_id = u.id
           WHERE p.deleted_at IS NULL AND p.hidden_by_admin = 0
           ORDER BY p.created_at DESC
           LIMIT ${limitCount} OFFSET ${offset}`,
          [tagId]
        );
      } else {
        throw qErr;
      }
    }
    const hasMore = rows.length > pageSize;
    const list = rows.slice(0, pageSize).map((r) => {
      const plain = (r.content || '').replace(/<[^>]*>/g, '').replace(/!\[.*?\]\([^)]*\)/g, '').replace(/\n+/g, ' ').trim();
      const titleTrim = (r.title || '').trim();
      let cover = null;
      // 优先使用 post_images 表中的第一张图，构造缩略图路径
      if (r.first_image_path) {
        const thumbPath = r.first_image_path.replace(/^posts\//, 'posts/thumbs/').replace(/\.[^.]+$/, '.webp');
        cover = assetUrl(thumbPath);
      } else {
        const imgMatch = (r.content || '').match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) cover = assetUrl(imgMatch[1]);
      }
      return {
        id: r.id,
        title_or_excerpt: titleTrim || plain.slice(0, 100) || '（无文字内容）',
        cover_url: cover,
        author: { id: r.user_id, name: r.nickname || r.username || '匿名 Anonymous', avatar: assetUrl(r.avatar) },
        like_count: r.like_count || 0,
        comment_count: r.comment_count || 0,
        created_at: r.created_at,
      };
    });
    res.status(200).json({ status: 0, message: '获取成功', data: { list, total, page, pageSize, hasMore } });
  } catch (e) {
    console.error('吃货广场错误:', e);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

module.exports = router;
