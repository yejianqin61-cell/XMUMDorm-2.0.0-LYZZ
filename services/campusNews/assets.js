'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const { prepareImageUpload } = require('../imageProcessing');
const { NewsError, currentAdmin } = require('./domain');
const ROOT = path.resolve(__dirname, '../../.local/stage2/news-assets');
const MAX_BYTES = 8 * 1024 * 1024;
function localOnly(env = process.env) {
  if (env.STAGE2_LOCAL_ISOLATED !== '1' || env.DB_HOST !== '127.0.0.1' || env.DB_NAME !== 'xmumdorm_stage2_dev'
    || env.DB_USER !== 'xmumdorm_dev' || String(env.DB_PORT) !== '3306') throw new NewsError(503, '校园快讯存储目前仅支持隔离本地环境，远程存储未启用');
}
function signedUrl(assetId, viewerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !viewerId) throw new NewsError(503, '图片访问签名尚未配置');
  const token = jwt.sign({ purpose: 'campus-news-image', assetId, viewerId }, secret, { expiresIn: '15m', algorithm: 'HS256' });
  return `/api/campus-news/images/${assetId}?imageToken=${encodeURIComponent(token)}`;
}
function assetUrl(key, storageKind, viewerId) {
  if (key.startsWith('campus-news/') && key.endsWith('.webp')) return signedUrl(path.basename(key, '.webp'), viewerId);
  // Legacy URLs continue using the project's original resolver.
  if (storageKind === 'object') throw new NewsError(503, '远程快讯存储尚未启用');
  return require('../../utils/assets').assetUrl(key);
}
async function normalize(file, assetId) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length > MAX_BYTES || !file.buffer.length) throw new NewsError(400, '图片不能为空，最多 8 MiB');
  const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!formats[file.mimetype]) throw new NewsError(400, '仅支持 JPEG、PNG、WebP');
  try {
    const metadata = await sharp(file.buffer, { failOn: 'error', limitInputPixels: 40000000 }).metadata();
    if (metadata.format !== formats[file.mimetype] || (metadata.pages || 1) !== 1 || !metadata.width || !metadata.height
      || metadata.width * metadata.height > 40000000) throw new Error('Invalid image');
    const result = await prepareImageUpload({ key: `campus-news/${assetId}.webp`, body: file.buffer, mimetype: file.mimetype });
    if (result.body.length > MAX_BYTES) throw new Error('Processed image too large');
    return result;
  } catch { throw new NewsError(400, '图片解码失败、类型不符、包含多帧或尺寸过大'); }
}
function createDiskStore() {
  return {
    async put(key, body) {
      localOnly();
      if (!/^campus-news\/[0-9a-f-]{36}\.webp$/.test(key)) throw new NewsError(400, '无效资源 Key');
      await fs.mkdir(ROOT, { recursive: true });
      const file = await fs.open(path.join(ROOT, path.basename(key)), 'wx', 0o600);
      try { await file.writeFile(body); await file.sync(); } finally { await file.close(); }
    },
    file(key) {
      localOnly();
      if (!/^campus-news\/[0-9a-f-]{36}\.webp$/.test(key)) throw new NewsError(404, '图片不存在');
      return path.join(ROOT, path.basename(key));
    },
  };
}
function createAssetService(repository, disk = createDiskStore(), processImage = normalize, checkEnvironment = localOnly) {
  return {
    async upload(actor, file) {
      checkEnvironment();
      const assetId = randomUUID();
      const image = await processImage(file, assetId);
      await repository.transaction(async session => {
        currentAdmin(await session.admin(actor, true));
        await session.sql("INSERT INTO campus_news_assets(id,object_key,mime,byte_size,storage_kind,state,uploaded_by) VALUES(?,?,?,?,'local','pending',?)", [assetId, image.key, image.contentType, image.body.length, actor]);
      });
      try {
        await disk.put(image.key, image.body);
        await repository.transaction(async session => {
          currentAdmin(await session.admin(actor, true));
          await session.sql("UPDATE campus_news_assets SET state='ready' WHERE id=? AND state='pending'", [assetId]);
        });
        return { id: assetId, url: signedUrl(assetId, actor) };
      } catch (error) {
        // Never delete/overwrite an object as compensation. Failed/pending rows
        // are retained for explicit orphan review; no automatic cleanup task.
        try { await repository.read(session => session.sql("UPDATE campus_news_assets SET state='failed' WHERE id=? AND state='pending'", [assetId])); } catch { /* pending is discoverable by orphan inspection */ }
        throw error;
      }
    },
    async image(userId, assetId) {
      if (!/^[0-9a-f-]{36}$/i.test(assetId)) throw new NewsError(404, '图片不存在');
      return repository.read(async session => {
        const user = await session.admin(userId);
        if (!user || user.status !== 'active') throw new NewsError(403, '当前账号无效');
        const rows = await session.sql("SELECT object_key,storage_kind FROM campus_news_assets WHERE id=? AND state='ready'", [assetId]);
        if (!rows.length) throw new NewsError(404, '图片不存在');
        if (user.role !== 'admin') {
          const refs = await session.sql("SELECT 1 FROM campus_news_images i JOIN campus_posts p ON p.id=i.post_id WHERE i.asset_id=? AND p.lifecycle_status='published' AND p.hidden_by_admin=0 AND p.deleted_at IS NULL LIMIT 1", [assetId]);
          if (!refs.length) throw new NewsError(404, '图片不可访问');
        }
        if (rows[0].storage_kind !== 'local') throw new NewsError(503, '远程存储尚未接入');
        return disk.file(rows[0].object_key);
      });
    },
    async signedImage(assetId, token) {
      let claims;
      try { claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
      catch { throw new NewsError(401, '图片访问链接已过期，请刷新页面'); }
      if (claims.purpose !== 'campus-news-image' || claims.assetId !== assetId || !Number.isSafeInteger(Number(claims.viewerId))) throw new NewsError(401, '图片访问凭证无效');
      return this.image(Number(claims.viewerId), assetId);
    },
    async orphans(actor) {
      return repository.read(async session => {
        currentAdmin(await session.admin(actor));
        return { items: await session.sql("SELECT a.id,a.object_key,a.state,a.created_at FROM campus_news_assets a WHERE a.created_at < CURRENT_TIMESTAMP() - INTERVAL 24 HOUR AND NOT EXISTS(SELECT 1 FROM campus_news_images i WHERE i.asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM campus_news_version_assets v WHERE v.asset_id=a.id) ORDER BY a.created_at LIMIT 100") };
      });
    },
  };
}
module.exports = { MAX_BYTES, localOnly, normalize, createAssetService, createDiskStore, assetUrl, signedUrl };
