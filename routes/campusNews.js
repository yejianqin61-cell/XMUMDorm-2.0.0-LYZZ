'use strict';
const express = require('express');
const multer = require('multer');
const { NewsError, id } = require('../services/campusNews/domain');
const { MAX_BYTES } = require('../services/campusNews/assets');
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
function handleError(error, req, res, _next) {
  const status = error.status || (error instanceof multer.MulterError ? 400 : error.code === 'ER_DUP_ENTRY' ? 409 : 503);
  const message = error instanceof NewsError ? error.message : error instanceof multer.MulterError ? '上传超出数量/大小限制或字段无效'
    : ['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(error.code) ? '校园快讯数据库结构尚未获批初始化'
      : '校园快讯操作失败，未确认保存成功';
  res.status(status).json({ status: -1, message });
}
// Busboy emits partsLimit on reaching the count, including the valid last part.
// files/fields still enforce exactly one image and no text fields.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0, parts: 2 }, fileFilter: (_req, file, cb) => {
  cb(['image/jpeg','image/png','image/webp'].includes(file.mimetype) ? null : new NewsError(400, '仅支持 JPEG、PNG、WebP'), true);
} }).single('image');
function createAdminRouter({ authenticate, service, assets, afterWrite = () => {} }) {
  const router = express.Router();
  router.use(authenticate);
  router.use((req, res, next) => Promise.resolve(service.assertAdmin(req.user.id)).then(() => next(), next));
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const reply = handler => asyncRoute(async (req, res) => {
    const data = await handler(req);
    if (req.method !== 'GET') afterWrite();
    res.json({ status: 0, data });
  });
  router.get('/', reply(req => service.list(req.user.id, req.query)));
  router.get('/colleges', reply(req => service.colleges(req.user.id)));
  router.get('/legacy', reply(req => service.legacyList(req.user.id, req.query)));
  router.get('/images/orphans', reply(req => assets.orphans(req.user.id)));
  router.post('/images', upload, reply(req => assets.upload(req.user.id, req.file)));
  router.post('/drafts', reply(req => service.createDraft(req.user.id, req.body)));
  router.post('/publish', reply(req => {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)) throw new NewsError(400, '直接发布须提供 UUID v4 Idempotency-Key，重试时保持相同标识');
    return service.createPublished(req.user.id, req.body, key);
  }));
  router.get('/:id/versions/compare', reply(req => service.compare(req.user.id, req.params.id, req.query.from, req.query.to)));
  router.get('/:id/versions', reply(req => service.versions(req.user.id, req.params.id)));
  router.get('/:id', reply(req => service.detail(req.user.id, req.params.id)));
  router.put('/:id', reply(req => service.mutate(req.user.id, req.params.id, req.body, 'update')));
  for (const action of ['publish','withdraw','hide','unhide','classify']) router.post(`/:id/${action}`, reply(req => service.mutate(req.user.id, req.params.id, req.body, action)));
  router.delete('/:id', reply(req => service.mutate(req.user.id, req.params.id, req.body, 'delete')));
  router.use(handleError);
  return router;
}
function createPublicRouter({ authenticate, service, assets, favorites }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
  router.get('/images/:id', asyncRoute(async (req, res) => {
    // <img> cannot attach localStorage Bearer headers. Use short-lived,
    // asset-specific JWTs, and still recheck the current user/content in DB.
    const filename = await assets.signedImage(req.params.id, req.query.imageToken);
    res.sendFile(filename, { headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } }, error => { if (error && !res.headersSent) res.status(404).json({ status: -1, message: '图片文件不可用' }); });
  }));
  router.use(authenticate);
  if (favorites) {
    router.get('/me/favorites', asyncRoute(async (req, res) => res.json({ status: 0, data: await favorites.list(req.user.id, req.query) })));
    router.get('/:id/favorite', asyncRoute(async (req, res) => res.json({ status: 0, data: await favorites.get(req.user.id, req.params.id) })));
    router.put('/:id/favorite', asyncRoute(async (req, res) => res.json({ status: 0, data: await favorites.set(req.user.id, req.params.id, true) })));
    router.delete('/:id/favorite', asyncRoute(async (req, res) => res.json({ status: 0, data: await favorites.set(req.user.id, req.params.id, false) })));
  }
  router.get('/context', asyncRoute(async (req, res) => res.json({ status: 0, data: await service.publicContext(req.user.id) })));
  router.get('/', asyncRoute(async (req, res) => res.json({ status: 0, data: await service.publicFeed(req.user.id, req.query) })));
  router.get('/:id', asyncRoute(async (req, res) => res.json({ status: 0, data: await service.publicDetail(req.user.id, req.params.id) })));
  router.use(handleError);
  return router;
}
// Mounted only on campus paths. Treehole/other square routes remain untouched.
function createVisibilityGate({ query, authenticate }) {
  return (req, res, next) => {
    Promise.resolve().then(async () => {
      const rows = await query('SELECT source_kind,lifecycle_status,hidden_by_admin,deleted_at FROM campus_posts WHERE id=?', [id(req.params.id)]);
      const post = rows[0];
      if (!post || post.deleted_at || post.hidden_by_admin || post.lifecycle_status !== 'published') return res.status(404).json({ status: -1, message: '校园帖子不存在' });
      if (post.source_kind !== 'news') return next();
      authenticate(req, res, () => {
        query('SELECT status FROM users WHERE id=?', [req.user.id]).then(users => {
          if (users[0]?.status !== 'active') return res.status(403).json({ status: -1, message: '当前账号无效' });
          next();
        }).catch(next);
      });
    }).catch(next);
  };
}
module.exports = { createAdminRouter, createPublicRouter, createVisibilityGate, handleError };
