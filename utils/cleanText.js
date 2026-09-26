/**
 * 统一的文本清洗：剥离全部 HTML 标签，只保留纯文本，防止 XSS 注入。
 *
 * 来源：从 routes/posts.js 的同名函数提取（行为完全一致），供新模块共用。
 *
 * ⚠️ 现状说明：仓库内另有 11 处同名局部实现（routes/square.js、routes/todos.js、
 * routes/marketplace.js 等）。本次**仅新增本模块复用**，未改动既有路由——
 * 全量收敛是一次独立的、跨 11 个文件的重构，不应混在 M09 功能开发中。
 * 新代码请优先复用本文件。
 */
const sanitizeHtml = require('sanitize-html');

function cleanText(input) {
  const raw = input == null ? '' : String(input);
  const cleaned = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.trim();
}

module.exports = { cleanText };
