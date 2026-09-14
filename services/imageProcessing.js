const path = require('path');
const sharp = require('sharp');

const MAX_WIDTH = 2048;
const WEBP_QUALITY = 82;

/**
 * Normalize a newly uploaded raster image before persistence.
 * Existing objects are intentionally untouched; callers must use the returned key.
 */
async function prepareImageUpload({ key, body, mimetype }) {
  if (!body || !Buffer.isBuffer(body)) throw new Error('Invalid image body');
  const inputType = String(mimetype || '').toLowerCase();
  const output = await sharp(body, {
    failOn: 'none',
    animated: inputType === 'image/gif',
  })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const normalizedKey = String(key || '').replace(/\.[^.\/]+$/, '.webp');
  return { key: normalizedKey || `${path.basename(String(key || 'image'))}.webp`, body: output, contentType: 'image/webp' };
}

module.exports = { prepareImageUpload, MAX_WIDTH, WEBP_QUALITY };
