const express = require('express');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('../middleware/auth');
const { query } = require('../database');
const { createTranslator, TARGET_NAMES, MAX_CHARS } = require('../services/translation');

/**
 * 只按「内容类型 + ID」翻译，后端自己从库里取原文：
 * 不接受任意文本，防止接口被当成免费翻译代理；已删除 / 被隐藏的内容取不到，也就翻不了。
 */
const SOURCES = {
  post: `SELECT content FROM posts
          WHERE id = ? AND deleted_at IS NULL AND hidden_by_admin = 0`,
  comment: `SELECT c.content FROM comments c
               JOIN posts p ON p.id = c.post_id
              WHERE c.id = ? AND c.deleted_at IS NULL
                AND p.deleted_at IS NULL AND p.hidden_by_admin = 0`,
  review: `SELECT content FROM product_comments
            WHERE id = ? AND deleted_at IS NULL`,
};

async function loadFromDatabase(kind, id) {
  const rows = await query(SOURCES[kind], [id]);
  return rows && rows[0] ? rows[0].content : null;
}

function createTranslateRouter({
  translator = createTranslator(),
  loadContent = loadFromDatabase,
  auth = authenticateToken,
} = {}) {
  const router = express.Router();

  router.get('/config', (req, res) => {
    res.json({ status: 0, data: { enabled: translator.enabled } });
  });

  const translateLimit = rateLimit({
    windowMs: 60000, limit: 30, keyGenerator: req => String(req.user.id),
    standardHeaders: true, legacyHeaders: false,
    message: { status: -1, message: '翻译太频繁，请稍后再试' },
  });

  router.post('/', auth, translateLimit, async (req, res) => {
    const { kind, id, target } = req.body || {};
    const contentId = Number(id);
    if (!Object.hasOwn(SOURCES, kind) || !Number.isSafeInteger(contentId) || contentId <= 0
        || !Object.hasOwn(TARGET_NAMES, target)) {
      return res.status(400).json({ status: -1, message: '翻译参数不正确' });
    }
    if (!translator.enabled) {
      return res.status(503).json({ status: -1, message: '翻译功能尚未开启' });
    }
    try {
      const content = await loadContent(kind, contentId);
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(404).json({ status: -1, message: '内容不存在或已删除' });
      }
      if (content.length > MAX_CHARS) {
        return res.status(413).json({ status: -1, message: '内容太长，暂不支持翻译' });
      }
      const result = await translator.translate(content, target);
      return res.json({ status: 0, data: { text: result.text, target, cached: result.cached } });
    } catch (_error) {
      // 不把服务商的报错和密钥相关信息透给前端。
      return res.status(502).json({ status: -1, message: '翻译服务暂时不可用，请稍后再试' });
    }
  });

  return router;
}

module.exports = createTranslateRouter();
module.exports.createTranslateRouter = createTranslateRouter;
