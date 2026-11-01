'use strict';
const REASON = '此功能尚未具备完整的本地隔离依赖，未执行操作';
// Installed ONLY by the isolated backend. Deny before auth/business handlers,
// rather than attempting best-effort writes to absent global business tables.
function localHttpBoundary(req, res, next) {
  const raw = req.originalUrl || req.url;
  let pathname, parsed;
  try { parsed = new URL(raw, 'http://127.0.0.1'); pathname = decodeURIComponent(parsed.pathname); }
  catch { return res.status(400).json({ status: -1, message: '无效路径' }); }
  // Canonical paths prevent encoded slashes or duplicate separators from escaping policy.
  if (pathname.includes('\\') || pathname.includes('//') || /%[0-9a-f]{2}/i.test(pathname)
    || /%(?:2f|5c|2e)|\/\.{1,2}(?:\/|$)/i.test(raw.split('?')[0])) return res.status(503).json({ status: -1, message: REASON, code: 'STAGE2_FUNCTION_UNAVAILABLE' });
  pathname = pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  if (!/^\/api(?:\/|$)/i.test(pathname)) return next();
  const read = method === 'GET' || method === 'HEAD';
  if ((pathname === '/api/campus-news/me/favorites' || /^\/api\/campus-news\/[1-9]\d*\/favorite$/.test(pathname))
    && require('./campus-favorite-test.cjs')(req, res, next)) return;
  if (read && ['/api/users/me/posts', '/api/canteen/my-reviews', '/api/canteen/my-favorites'].includes(pathname)
      && require('./myzone-read-test.cjs')(req, res, next)) return;
  // 05B reads only; favorite writes additionally require dedicated fixture ownership.
  if (['POST', 'DELETE'].includes(method) && /^\/api\/canteen\/products\/[1-9]\d*\/favorite$/.test(pathname)) {
    return require('./myzone-fixture-boundary.cjs')(req, res, next);
  }
  const mailbox = (read && /^\/api\/notifications(?:\/(?:unread-summary|unread-announcements|[1-9]\d*))?$/i.test(pathname)) || (method === 'PATCH' && /^\/api\/notifications\/(?:[1-9]\d*\/read|read-batch)$/i.test(pathname)) || (method === 'DELETE' && pathname === '/api/notifications/clear');
  const allowed = (read && (/^\/api\/users\/(?:me\/posts|[1-9]\d*\/profile)$/.test(pathname)
    || /^\/api\/canteen\/(?:my-reviews|my-favorites|regions|products\/[1-9]\d*(?:\/comments|\/favorite)?)$/.test(pathname)
    || /^\/api\/posts\/[1-9]\d*(?:\/comments)?$/.test(pathname)
    || /^\/api\/(?:posts\/tags|tags)$/.test(pathname)))
    || mailbox || (method === 'PATCH' && /^\/api\/users\/me$/i.test(pathname))
    || (read && /^\/api\/academic-directory\/colleges(?:\/[a-z0-9-]+\/programmes)?$/i.test(pathname))
    || /^\/api\/admin\/campus-news(?:\/|$)/i.test(pathname)
    || (read && /^\/api\/campus-news(?:\/|$)/i.test(pathname))
    || (['PUT', 'DELETE'].includes(method) && /^\/api\/campus-news\/[1-9]\d*\/favorite$/.test(pathname))
    || (method === 'POST' && /^\/api\/auth\/login$/i.test(pathname))
    || (read && /^\/api\/users\/me(?:\/terms)?$/i.test(pathname))
    || (method === 'POST' && /^\/api\/users\/me\/terms\/accept$/i.test(pathname))
    || (read && /^\/api\/organizations\/me$/i.test(pathname))
    || (read && /^\/api\/square\/(?:campus-feed|campus-posts\/[1-9]\d*(?:\/comments|\/interactions)?)$/i.test(pathname))
    || (['PUT', 'DELETE', 'POST'].includes(method) && /^\/api\/square\/campus-posts\/[1-9]\d*\/like$/i.test(pathname))
    || (read && /^\/api\/square\/campus-posts\/[1-9]\d*\/comments\/[1-9]\d*\/replies$/i.test(pathname))
    || (method === 'POST' && /^\/api\/square\/campus-posts\/[1-9]\d*\/comments$/i.test(pathname))
    || (method === 'DELETE' && /^\/api\/square\/campus-posts\/[1-9]\d*\/comments\/[1-9]\d*$/i.test(pathname))
    || (method === 'POST' && /^\/api\/square\/campus-posts$/i.test(pathname));
  if (allowed) return next();
  return res.status(503).json({ status: -1, code: 'STAGE2_FUNCTION_UNAVAILABLE', message: `${REASON}。当前仅开放快讯模块、必要认证和受限旧校园入口。` });
}
function rejectLegacyCampusImages(req, res, next) {
  if (process.env.STAGE2_LOCAL_ISOLATED === '1' && req.files?.length) return res.status(503).json({ status: -1, code: 'STAGE2_LEGACY_IMAGES_DISABLED', message: '本地旧组织带图发布尚未适配，未创建帖子；请移除图片或使用新快讯管理。' });
  next();
}
module.exports = { localHttpBoundary, rejectLegacyCampusImages };
