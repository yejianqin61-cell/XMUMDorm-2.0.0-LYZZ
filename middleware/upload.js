/**
 * ============================================
 * 上传中间件（帖子图片 / 头像）
 * ============================================
 * 2.0.0：帖子图片 jpg/png/webp，≤5MB，最多 3 张
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const POSTS_IMAGES_DIR = path.join(UPLOAD_ROOT, 'posts');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(POSTS_IMAGES_DIR);
ensureDir(AVATAR_DIR);

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
 * 头像：直接存到 uploads/avatars，文件名 user_<user_id>.<ext>
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    const uid = req.user && req.user.id ? req.user.id : Date.now();
    cb(null, `user_${uid}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) || !ALLOWED_IMAGE_EXT.includes(ext)) {
      return cb(new Error('仅支持 jpg / png / webp 格式'));
    }
    cb(null, true);
  }
}).single('avatar');

/**
 * 将内存中的帖子图片写入磁盘：post_<postId>_<index>.<ext>
 * @param {Array} files - req.files (multer memory)
 * @param {number} postId - 帖子 ID
 * @returns {Promise<string[]>} 相对路径数组，如 ['posts/post_102_1.jpg']
 */
function savePostImages(files, postId) {
  const relativePaths = [];
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  for (let i = 0; i < (files || []).length; i++) {
    const file = files[i];
    const ext = extMap[file.mimetype] || '.jpg';
    const filename = `post_${postId}_${i + 1}${ext}`;
    const filePath = path.join(POSTS_IMAGES_DIR, filename);
    fs.writeFileSync(filePath, file.buffer);
    relativePaths.push(`posts/${filename}`);
  }
  return relativePaths;
}

module.exports = {
  postImagesUpload,
  avatarUpload,
  savePostImages,
  UPLOAD_ROOT,
  POSTS_IMAGES_DIR,
  AVATAR_DIR
};
