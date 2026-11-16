const { createHash } = require('node:crypto');

/**
 * 帖子 / 评论 / 点评的 AI 翻译（OpenAI 兼容的 chat/completions 接口）。
 * 智谱、火山方舟（豆包）、DeepSeek 等都兼容这一格式，换服务商只改环境变量。
 * 三个变量缺一个 → enabled=false，路由返回 503，前端不显示「翻译」按钮。
 */
const TARGET_NAMES = { zh: 'Simplified Chinese', en: 'English' };
const MAX_CHARS = 4000;

function buildPrompt(target) {
  return 'You translate posts and comments from a university student community. '
    + `Translate the user's text into ${TARGET_NAMES[target]}. `
    + 'Output only the translation, with no notes or quotes. '
    + 'Keep emoji, @mentions, #tags, URLs, numbers and line breaks as they are. '
    + 'If the text is already in the target language, return it unchanged.';
}

function createTranslator({
  baseUrl = process.env.TRANSLATE_API_BASE_URL || '',
  apiKey = process.env.TRANSLATE_API_KEY || '',
  model = process.env.TRANSLATE_MODEL || '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 20000,
  cacheSize = 500,
} = {}) {
  const enabled = Boolean(baseUrl && apiKey && model && typeof fetchImpl === 'function');
  // Map 保持插入顺序：命中时删了重插 = 最近使用，超量时删最早的那条。
  const cache = new Map();

  async function translate(text, target) {
    if (!enabled) throw new Error('Translator not configured');
    const key = target + ':' + createHash('sha1').update(text).digest('hex');
    if (cache.has(key)) {
      const hit = cache.get(key);
      cache.delete(key);
      cache.set(key, hit);
      return { text: hit, cached: true };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(baseUrl.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: buildPrompt(target) },
            { role: 'user', content: text },
          ],
        }),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Upstream status ' + response.status);
      const data = await response.json();
      const translated = data?.choices?.[0]?.message?.content;
      if (typeof translated !== 'string' || !translated.trim()) throw new Error('Empty translation');
      const result = translated.trim();
      cache.set(key, result);
      if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
      return { text: result, cached: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { enabled, translate };
}

module.exports = { createTranslator, TARGET_NAMES, MAX_CHARS };
