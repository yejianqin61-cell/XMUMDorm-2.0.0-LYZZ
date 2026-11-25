/**
 * 邮件识别待办接口（任务管理表 #7「web:自动读邮件」第一期）
 *
 *   GET  /api/mail-reader/config    { enabled }：没配置 AI 服务时前端不显示入口
 *   POST /api/mail-reader/extract   { content, lang? } → { summary, items }，需登录，每人每分钟 6 次
 *
 * 只做"识别"，不写库：用户在前端勾选、修改后，再走已有的 POST /api/todos 创建待办。
 * 邮件原文不落库、不写日志（报错日志里也只记错误码）。
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { MAX_INPUT_CHARS } = require('../services/mailExtract');

function malaysiaToday(now = new Date()) {
  // 学校在马来西亚（UTC+8），"本周五"之类按当地日期算
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function createMailReaderRouter({ extractor, auth, limiter, now = () => new Date() }) {
  const router = express.Router();
  const extractLimiter = limiter || rateLimit({
    windowMs: 60 * 1000,
    limit: 6,
    keyGenerator: (req) => String(req.user.id),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: -1, message: '识别太频繁了，请稍后再试' },
  });

  router.get('/config', (_req, res) => {
    res.status(200).json({ status: 0, message: 'ok', data: { enabled: extractor.enabled, maxChars: MAX_INPUT_CHARS } });
  });

  router.post('/extract', auth, extractLimiter, async (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) return res.status(400).json({ status: -1, message: '请粘贴邮件内容' });
    if (content.length > MAX_INPUT_CHARS) {
      return res.status(413).json({ status: -1, message: `邮件太长了，最多 ${MAX_INPUT_CHARS} 字，可以只粘正文部分` });
    }
    if (!extractor.enabled) return res.status(503).json({ status: -1, message: '邮件识别服务未开启' });
    const lang = req.body?.lang === 'en' ? 'en' : 'zh';
    try {
      const result = await extractor.extract(content, { today: malaysiaToday(now()), lang });
      res.status(200).json({ status: 0, message: 'ok', data: result });
    } catch (e) {
      console.error('[mail-reader] extract failed:', (e && e.code) || 'UNKNOWN');
      res.status(502).json({ status: -1, message: '识别失败，请稍后重试' });
    }
  });

  return router;
}

function createDefaultRouter() {
  const authenticateToken = require('../middleware/auth');
  const { createMailExtractor, pickConfig } = require('../services/mailExtract');
  return createMailReaderRouter({ extractor: createMailExtractor(pickConfig()), auth: authenticateToken });
}

module.exports = createDefaultRouter();
module.exports.createMailReaderRouter = createMailReaderRouter;
module.exports.malaysiaToday = malaysiaToday;
