'use strict';
// Local fixture writes cannot touch existing accounts or other batches' dishes.
module.exports = async function fixtureBoundary(req, res, next) {
  let identity;
  try { identity = require('jsonwebtoken').verify((req.headers.authorization || '').split(' ')[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ status: -1, message: '测试收藏需要有效登录' }); }
  try {
    const productId = Number(req.originalUrl.match(/\/products\/(\d+)/)[1]);
    const rows = await require('../../database').query(`SELECT p.id FROM products p
      JOIN shops s ON s.id = p.shop_id JOIN users m ON m.id = s.user_id
      JOIN users u ON u.id = ? WHERE p.id = ?
      AND LEFT(u.username, 15) IN ('STAGE5_05B_TEST','STAGE5_05C_TEST') AND LEFT(m.username, 15) = 'STAGE5_05B_TEST'`, [identity.id, productId]);
    if (!rows.length) return res.status(503).json({ status: -1, message: '仅允许05B专用样本收藏操作' });
    next();
  } catch { res.status(503).json({ status: -1, message: '测试样本归属验证失败' }); }
};
