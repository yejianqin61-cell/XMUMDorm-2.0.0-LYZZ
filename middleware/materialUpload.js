/**
 * ============================================
 * 学习资料上传中间件
 * ============================================
 * 内存存储：文件不落磁盘 —— 校验通过后直接经 Git Data API 推送到资料库，
 * 本项目服务器不留副本（设计原则 P6「无服务器状态」）。
 *
 * 体积上限取自 shared/constants/materials.js（20 MiB，与 jsDelivr 上限一致）。
 * multer 的 fileSize 是**第一道**闸门（超限直接中断流），
 * services/materialValidation 里还有第二道精确校验。
 */

const multer = require('multer');
const {
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  BLOCKED_EXT,
  extOf,
} = require('../shared/constants/materials');

/** 单文件字段名为 `file` */
const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
    // 表单文本字段不设过小限制：标题/简介/标签合计不会很大
    fields: 40,
    // 文档类（docx/pptx/xlsx/zip）是压缩包，字段名与值都可能较长
    fieldSize: 64 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = extOf(file.originalname || '');
    if (!ext) {
      return cb(new Error('文件缺少扩展名'));
    }
    if (BLOCKED_EXT.includes(ext)) {
      return cb(new Error(`出于安全考虑，不支持 .${ext} 文件`));
    }
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error(`不支持的文件类型 .${ext}`));
    }
    cb(null, true);
  },
}).single('file');

module.exports = materialUpload;

/** 复用车名编码修复（实现在 utils/multipartFilename.js，幂等） */
module.exports.fixMultipartFilename = require('../utils/multipartFilename');

/**
 * 把 multer 的错误翻译成统一的 { code, message }，便于路由层返回可读原因。
 * multer 自身抛的错误（LIMIT_FILE_SIZE 等）默认信息对用户不友好。
 */
module.exports.translateMulterError = function translateMulterError(err) {
  if (!err) return null;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return {
      code: 'MATERIALS_TOO_LARGE',
      message: `文件超过 ${MAX_FILE_BYTES / 1024 / 1024}MB 上限`,
    };
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return { code: 'MATERIALS_BAD_UPLOAD', message: '一次只能上传一个文件（字段名请用 file）' };
  }
  if (err.code === 'LIMIT_FIELD_SIZE' || err.code === 'LIMIT_FIELD_COUNT') {
    return { code: 'MATERIALS_BAD_UPLOAD', message: '表单字段过多或过长' };
  }
  if (err.message && /不支持|缺少扩展名|安全/.test(err.message)) {
    return { code: 'MATERIALS_BAD_EXT', message: err.message };
  }
  return { code: 'MATERIALS_BAD_UPLOAD', message: err.message || '上传失败' };
};
