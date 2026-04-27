/**
 * ============================================
 * 上传中间件（帖子图片 / 头像 / 商品图 / 评论图）
 * ============================================
 * 2.0.0：帖子图片 jpg/png/webp，≤8MB，最多 3 张
 * 食堂：商品图最多 5 张、评论图最多 3 张，格式与大小与帖子图片一致
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer, guessContentType, isObjectStorageConfigured } = require('../services/objectStorage');
const sharp = require('sharp');

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

// 云存储模式下不再确保本地 uploads 目录存在；旧 /uploads 静态服务可用于过渡期兼容历史数据。

/**
 * 帖子图片：内存存储，路由里根据 post_id 再写入 post_<id>_<index>.<ext>
 */
const postImagesStorage = multer.memoryStorage();

const postImagesUpload = multer({
  storage: postImagesStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).array('images', 3);

/**
 * 头像：内存存储，路由中上传到对象存储，key 为 avatars/user_<userId>.<ext>
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).single('avatar');

/** 店铺 logo：内存存储，路由中上传到对象存储，key 为 shops/shop_<shopId>.<ext> */
const shopLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).single('logo');

/**
 * 将内存中的帖子图片上传：若已配置对象存储则上传到云存储，否则写入本地 uploads/posts/
 * 返回的 key 统一为 posts/post_<postId>_<index>.<ext>，供 assetUrl 拼接 URL
 */
async function savePostImages(files, postId) {
  const keys = [];
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const useObjectStorage = isObjectStorageConfigured();

  if (!useObjectStorage) {
    const dir = path.join(process.cwd(), 'uploads', 'posts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const thumbsDir = path.join(process.cwd(), 'uploads', 'posts', 'thumbs');
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
  }

  for (let i = 0; i < (files || []).length; i++) {
    const file = files[i];
    const ext = extMap[file.mimetype] || '.jpg';
    const filename = `post_${postId}_${i + 1}${ext}`;
    const key = `posts/${filename}`;
    const thumbKey = `posts/thumbs/post_${postId}_${i + 1}.webp`;
    if (useObjectStorage) {
      await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    } else {
      const filePath = path.join(process.cwd(), 'uploads', key);
      fs.writeFileSync(filePath, file.buffer);
    }
    keys.push(key);

    // 生成缩略图：瀑布流优先加载，减少带宽与解码压力
    // - webp: 兼容性好
    // - width: 720 能覆盖大多数双列瀑布流与高 DPI 场景
    // - quality: 60 在体积/观感间折中
    try {
      const thumbBuf = await sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 720, withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer();

      if (useObjectStorage) {
        await uploadBuffer({ key: thumbKey, body: thumbBuf, contentType: 'image/webp' });
      } else {
        const thumbPath = path.join(process.cwd(), 'uploads', thumbKey);
        fs.writeFileSync(thumbPath, thumbBuf);
      }
    } catch (e) {
      // 缩略图失败不影响主流程（仍保留原图可用）
      // eslint-disable-next-line no-console
      console.warn('[upload] generate post thumb failed:', e && e.message ? e.message : e);
    }
  }
  return keys;
}

/**
 * 商品图：内存存储，最多 5 张，格式/大小同帖子（jpg/png/webp，≤5MB）
 */
const productImagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).array('images', 5);

/**
 * 评论图：内存存储，最多 3 张，格式/大小与帖子图片一致
 */
const commentImagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).array('images', 3);

/** 将内存中的商品图片上传到对象存储：products/product_<productId>_<index>.<ext>，返回 key 如 ['products/product_101_1.jpg'] */
async function saveProductImages(files, productId) {
  const keys = [];
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  for (let i = 0; i < (files || []).length; i++) {
    const file = files[i];
    const ext = extMap[file.mimetype] || '.jpg';
    const filename = `product_${productId}_${i + 1}${ext}`;
    const key = `products/${filename}`;
    await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    keys.push(key);
  }
  return keys;
}

/** 将内存中的评论图片上传到对象存储：comments/comment_<commentId>_<index>.<ext>，返回 key 如 ['comments/comment_201_1.jpg'] */
async function saveCommentImages(files, commentId) {
  const keys = [];
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  for (let i = 0; i < (files || []).length; i++) {
    const file = files[i];
    const ext = extMap[file.mimetype] || '.jpg';
    const filename = `comment_${commentId}_${i + 1}${ext}`;
    const key = `comments/${filename}`;
    await uploadBuffer({ key, body: file.buffer, contentType: guessContentType(file.mimetype, ext) });
    keys.push(key);
  }
  return keys;
}

module.exports = {
  postImagesUpload,
  avatarUpload,
  shopLogoUpload,
  savePostImages,
  productImagesUpload,
  commentImagesUpload,
  saveProductImages,
  saveCommentImages,
  // 兼容旧逻辑：不再导出本地目录常量
};
