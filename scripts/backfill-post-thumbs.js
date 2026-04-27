/**
 * 批量回填帖子缩略图到对象存储：posts/thumbs/post_<postId>_<index>.webp
 *
 * 使用：
 * 1) 配好 .env：OBJECT_STORAGE_* + PUBLIC_ASSET_BASE_URL + 数据库连接
 * 2) node scripts/backfill-post-thumbs.js
 *
 * 可选环境变量：
 * - BACKFILL_LIMIT=5000      单次最多处理多少张
 * - BACKFILL_CONCURRENCY=4   并发数
 * - BACKFILL_WIDTH=720       缩略图宽度
 * - BACKFILL_QUALITY=60      webp 质量
 */

require('dotenv').config();
const sharp = require('sharp');
const { query } = require('../database');
const { isObjectStorageConfigured, objectExists, headObject, downloadBuffer, uploadBuffer } = require('../services/objectStorage');

function parseIntSafe(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function keyToThumbKey(key) {
  // key 例：posts/post_123_1.jpg 或 /posts/post_123_1.webp
  const clean = String(key || '').replace(/^\/+/, '');
  const m = clean.match(/^posts\/post_(\d+)_([0-9]+)\.(jpg|jpeg|png|webp)$/i);
  if (!m) return null;
  return `posts/thumbs/post_${m[1]}_${m[2]}.webp`;
}

async function downloadWithRetry(key, retries) {
  let lastErr = null;
  const n = Math.max(0, Number(retries) || 0);
  for (let i = 0; i <= n; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await downloadBuffer({ key });
    } catch (e) {
      lastErr = e;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr || new Error('download failed');
}

function isHeifLikeError(e) {
  const msg = (e && (e.message || e.toString())) ? String(e.message || e.toString()) : '';
  return /heif|heic/i.test(msg);
}

async function mapLimit(items, concurrency, worker) {
  const out = new Array(items.length);
  let i = 0;
  const run = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  };
  const n = Math.max(1, concurrency);
  await Promise.all(new Array(n).fill(0).map(run));
  return out;
}

async function main() {
  if (!isObjectStorageConfigured()) {
    console.error('❌ OBJECT_STORAGE_BUCKET 未配置，无法回填缩略图');
    process.exit(1);
  }

  const limit = parseIntSafe(process.env.BACKFILL_LIMIT, 5000);
  const concurrency = parseIntSafe(process.env.BACKFILL_CONCURRENCY, 4);
  const width = parseIntSafe(process.env.BACKFILL_WIDTH, 720);
  const quality = parseIntSafe(process.env.BACKFILL_QUALITY, 60);
  const downloadRetries = parseIntSafe(process.env.BACKFILL_DOWNLOAD_RETRIES, 2);

  const rows = await query(
    `SELECT file_path
     FROM post_images
     WHERE file_path IS NOT NULL AND file_path <> ''
     ORDER BY post_id DESC, sort_order ASC
     LIMIT ${limit}`
  );

  const keys = [...new Set((rows || []).map((r) => String(r.file_path || '').trim()).filter(Boolean))];
  console.log(`🔎 scanned ${keys.length} post image keys (limit ${limit})`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  await mapLimit(keys, concurrency, async (key) => {
    const thumbKey = keyToThumbKey(key);
    if (!thumbKey) {
      skipped += 1;
      return;
    }
    try {
      const exists = await objectExists(thumbKey);
      if (exists) {
        skipped += 1;
        return;
      }
      const meta = await headObject(key);
      if (meta && typeof meta.contentLength === 'number' && meta.contentLength <= 0) {
        skipped += 1;
        return;
      }

      const srcBuf = await downloadWithRetry(key, downloadRetries);
      if (!srcBuf || srcBuf.length < 64) {
        throw new Error(`downloaded buffer too small (${srcBuf ? srcBuf.length : 0} bytes)`);
      }
      const thumbBuf = await sharp(srcBuf, { failOn: 'none' })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      await uploadBuffer({ key: thumbKey, body: thumbBuf, contentType: 'image/webp' });
      ok += 1;
      if ((ok + skipped + failed) % 50 === 0) {
        console.log(`progress ok=${ok} skipped=${skipped} failed=${failed}`);
      }
    } catch (e) {
      // HEIF/HEIC 在部分环境（尤其 Windows / 预编译 sharp）可能不支持；直接跳过，不要让脚本中断
      if (isHeifLikeError(e)) {
        skipped += 1;
        console.warn('[backfill-post-thumbs] skip (heif/heic not supported)', key, '->', thumbKey);
        return;
      }
      failed += 1;
      const msg = e && e.message ? e.message : String(e);
      console.warn('[backfill-post-thumbs] failed', key, '->', thumbKey, msg);
    }
  });

  console.log(`✅ done ok=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error('❌ backfill failed:', e);
  process.exit(1);
});

