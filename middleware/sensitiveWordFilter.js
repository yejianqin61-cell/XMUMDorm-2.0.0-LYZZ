/**
 * 敏感词过滤中间件
 * 从数据库读取启用的敏感词列表（内存缓存），检查请求正文中的文本内容
 * 命中敏感词时返回 400 并提示违规词汇
 */

const { query } = require('../database');

// 内存缓存
let cachedWords = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 分钟

/**
 * 刷新敏感词缓存
 */
async function refreshCache() {
  try {
    const rows = await query(
      'SELECT word FROM sensitive_words WHERE enabled = 1'
    );
    if (!Array.isArray(rows)) {
      throw new TypeError('Expected sensitive words query to return an array');
    }
    cachedWords = rows
      .map((r) => (typeof r?.word === 'string' ? r.word.trim() : ''))
      .filter(Boolean);
    cacheTime = Date.now();
    return cachedWords;
  } catch (err) {
    console.error('[sensitiveWordFilter] cache refresh failed:', err.message);
    // 缓存过期时回退到空列表（不阻断用户）
    return cachedWords || [];
  }
}

/**
 * 获取当前敏感词列表（带缓存）
 */
async function getSensitiveWords() {
  if (!cachedWords || Date.now() - cacheTime > CACHE_TTL_MS) {
    await refreshCache();
  }
  return cachedWords || [];
}

/**
 * 纯 ASCII 词（fk / sb / fuck …）
 * 这类词**必须**用词边界匹配，不能用子串 —— 否则：
 *   `sb` 会命中 USB / ISBN / base64 / passage 里的随机串
 *   `fk` 会命中任意含这两个字母的串
 * 中文等非 ASCII 词没有「词」的边界概念，仍走子串匹配
 * （「你sb」中「你」不是 \w，所以 \bsb\b 依然命中，拦截能力不受影响）。
 */
const ASCII_ONLY = /^[a-z0-9]+$/i;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 词 → 正则 的缓存（词表很长时避免每个请求都重新编译） */
const regexCache = new Map();

function boundaryRegex(word) {
  const key = word.toLowerCase();
  let re = regexCache.get(key);
  if (!re) {
    re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    regexCache.set(key, re);
  }
  return re;
}

/**
 * 检查文本是否包含敏感词
 * @returns {{ hit: boolean, word?: string }}
 */
function checkText(text, words) {
  if (!text || !words || words.length === 0) return { hit: false };
  const lower = text.toLowerCase();
  for (const w of words) {
    const hit = ASCII_ONLY.test(w) ? boundaryRegex(w).test(text) : lower.includes(w.toLowerCase());
    if (hit) return { hit: true, word: w };
  }
  return { hit: false };
}

/**
 * 从 req.body 中提取所有需要检查的文本字段
 */
function extractTexts(body) {
  const texts = [];
  if (!body) return texts;

  // 通用字段
  if (typeof body.content === 'string' && body.content.trim()) texts.push(body.content);
  if (typeof body.title === 'string' && body.title.trim()) texts.push(body.title);
  if (typeof body.summary === 'string' && body.summary.trim()) texts.push(body.summary);
  if (typeof body.description === 'string' && body.description.trim()) texts.push(body.description);
  if (typeof body.reason === 'string' && body.reason.trim()) texts.push(body.reason);
  if (typeof body.detail === 'string' && body.detail.trim()) texts.push(body.detail);
  if (typeof body.name === 'string' && body.name.trim()) texts.push(body.name);

  return texts;
}

/**
 * 敏感词过滤中间件
 * 放在 authenticateToken 之后、业务逻辑之前
 *
 * 用法：
 *   router.post('/...', authenticateToken, sensitiveWordFilter, async (req, res) => { ... })
 */
async function sensitiveWordFilter(req, res, next) {
  try {
    const texts = extractTexts(req.body);
    if (texts.length === 0) return next();

    const words = await getSensitiveWords();
    if (words.length === 0) return next();

    for (const text of texts) {
      const result = checkText(text, words);
      if (result.hit) {
        return res.status(400).json({
          status: -1,
          message: `内容包含违规词汇，请修改后重新发布`,
          sensitive_word: result.word,
        });
      }
    }

    next();
  } catch (err) {
    console.error('[sensitiveWordFilter]', err.message || err);
    // 过滤失败不阻断用户
    next();
  }
}

// 导出刷新函数供管理端调用（新增/删除/启停敏感词后刷新缓存）
sensitiveWordFilter.refreshCache = refreshCache;

// 额外导出内部助手，供需要「自行取词表并检查非 req.body 文本」的场景复用
// （例如学习资料上传时检查 .md/.txt 的**文件内容**）。
// 默认导出仍是中间件本身，不影响既有用法。
sensitiveWordFilter.getSensitiveWords = getSensitiveWords;
sensitiveWordFilter.checkText = checkText;

module.exports = sensitiveWordFilter;
