const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function normalizeBaseUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  return s.endsWith('/') ? s : s + '/';
}

function getEnv(name, fallback = '') {
  return process.env[name] != null ? String(process.env[name]) : fallback;
}

function requireEnv(name) {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function createS3Client() {
  const endpoint = getEnv('OBJECT_STORAGE_ENDPOINT');
  const region = getEnv('OBJECT_STORAGE_REGION', 'auto');

  const accessKeyId = getEnv('OBJECT_STORAGE_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('OBJECT_STORAGE_SECRET_ACCESS_KEY');

  const cfg = { region };
  if (endpoint) cfg.endpoint = endpoint;
  if (accessKeyId && secretAccessKey) cfg.credentials = { accessKeyId, secretAccessKey };

  // 对 R2 等 S3 兼容服务：通常需要 path-style（取决于 endpoint 配置）
  const forcePathStyle = getEnv('OBJECT_STORAGE_FORCE_PATH_STYLE', 'true') !== 'false';
  cfg.forcePathStyle = forcePathStyle;

  return new S3Client(cfg);
}

let _client = null;
function client() {
  if (!_client) _client = createS3Client();
  return _client;
}

function sanitizeKey(key) {
  const s = String(key || '').replace(/^\/+/, '');
  if (!s) throw new Error('Invalid object key');
  return s;
}

function guessContentType(mime, ext) {
  if (mime) return mime;
  const e = String(ext || '').toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function uploadBuffer({ key, body, contentType }) {
  const Bucket = requireEnv('OBJECT_STORAGE_BUCKET');
  const Key = sanitizeKey(key);
  const cmd = new PutObjectCommand({
    Bucket,
    Key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    // 公开读：若桶策略已设置公开读，这里不需要 ACL。
    // 但部分服务支持 ACL，这里保持不设置，避免兼容性问题。
    CacheControl: 'public, max-age=31536000, immutable',
  });
  await client().send(cmd);
  return Key;
}

function publicUrlForKey(key) {
  const base = normalizeBaseUrl(getEnv('PUBLIC_ASSET_BASE_URL'));
  if (!base) return null;
  const k = sanitizeKey(key);
  return base + k;
}

module.exports = {
  uploadBuffer,
  publicUrlForKey,
  sanitizeKey,
  guessContentType,
};

