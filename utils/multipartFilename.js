/**
 * ============================================
 * multipart 文件名编码修复
 * ============================================
 * **实测问题**：multer/busboy 默认用 latin1 解码 `Content-Disposition` 的
 * filename，中文名会变成 `è®²ä¹.pdf`。若不修：
 *   · 资料以乱码名存进 GitHub 仓库
 *   · index.json 里 path / name 是乱码
 *   · 用户下载到的文件名也是乱码
 *
 * 做法：把 latin1 字节序列按 utf8 重新解释。
 *   · 纯 ASCII → 直接返回
 *   · 重解释后出现 U+FFFD（替换字符）→ 说明原值本来就是正确 UTF-8，原样返回
 * 因此本函数**幂等**，可以放心地在多层重复调用。
 */

function fixMultipartFilename(raw) {
  if (typeof raw !== 'string' || raw === '') return raw;
  if (!/[\u0080-\u00ff]/.test(raw)) return raw;
  const fixed = Buffer.from(raw, 'latin1').toString('utf8');
  if (fixed.includes('\uFFFD')) return raw;
  return fixed;
}

module.exports = fixMultipartFilename;
module.exports.fixMultipartFilename = fixMultipartFilename;
