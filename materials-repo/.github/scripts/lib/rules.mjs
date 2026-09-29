/**
 * ============================================
 * 学习资料库 · 规则单一来源（materials repo 侧）
 * ============================================
 * 仅被 .github/scripts/ 下的「校验器」与「生成器」使用。
 *
 * ⚠️ 设计取舍：这里对规则做**独立实现**，故意不复用主仓库后端的生成器代码。
 *    校验器与生成器共享同一份实现 = 共享同一个 bug，防线形同虚设。
 *    两边枚举如需改动，必须同步修改：
 *      - materials repo: .github/scripts/lib/rules.mjs
 *      - 主仓库:         shared/constants/materials.js
 */

/** index.json 数据结构版本（v2 = 引入 courses[] / type / lesson / examNode / source） */
export const SCHEMA_VERSION = 2;

/** 第一层：文件类型（同时是目录第二段） */
export const TYPES = ['notes', 'lecture', 'exam', 'answer', 'other'];

/** 第三层 b：考试节点；null = 整门课/无 */
export const EXAM_NODES = ['midterm', 'final', 'quiz', 'assignment', 'monthly'];

/** 试题来源；仅 type=exam 允许非 null */
export const SOURCES = ['official', 'recalled'];

/** 单文件上限 20MB（已定，与 jsDelivr 上限持平） */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** 仓库体积上限 1GB（GitHub 官方建议 < 1GB） */
export const MAX_REPO_BYTES = 1024 * 1024 * 1024;

export const MAX_TITLE_LEN = 100;
export const MAX_DESCRIPTION_LEN = 300;
export const MAX_LESSON_TITLE_LEN = 64;
export const MAX_TAGS = 5;
export const MAX_TAG_LEN = 16;
export const MAX_PATH_LEN = 512;
export const MAX_FILENAME_LEN = 200;

/** 允许的材料扩展名 → index.json 的 kind（前端据此选渲染器） */
export const EXT_KIND = {
  md: 'markdown',
  markdown: 'markdown',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  zip: 'archive',
  docx: 'document',
  pptx: 'document',
  xlsx: 'document',
  txt: 'document',
};

export const ALLOWED_EXT = new Set(Object.keys(EXT_KIND));

/**
 * 永久黑名单（纵深防御）
 *
 * 理由：即使将来放宽白名单，也绝不能出现「会在浏览器里执行」的文件。
 * GitHub Pages 无法自定义响应头（实测不发送 nosniff），一个 .html/.svg 被直链打开
 * 就等于在 *.github.io 源上执行脚本 —— 见 Module09 设计 §16.1。
 */
export const BLOCKED_EXT = new Set([
  // 浏览器会执行
  'html', 'htm', 'shtml', 'xhtml', 'xht', 'svg', 'svgz', 'js', 'mjs', 'cjs',
  'xml', 'xsl', 'xslt', 'xsd', 'rss', 'atom',
  // 动态页面 / 配置
  'hta', 'htc', 'jsp', 'asp', 'aspx', 'php', 'phtml', 'cgi',
  // 可执行 / 脚本
  'exe', 'dll', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'psm1',
  'sh', 'bash', 'zsh', 'py', 'rb', 'pl', 'jar', 'apk', 'app', 'dmg', 'vbs',
]);

/** 顶层允许的保留文件（不参与材料校验） */
export const RESERVED_ROOT_FILES = new Set([
  'index.json',
  'README.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'LICENSE.md',
  '.nojekyll',
  '.gitignore',
]);

/** 顶层允许的保留目录 */
export const RESERVED_ROOT_DIRS = new Set(['.github', '.git']);

/** 材料路径：c<courseId>/<type>/<filename> */
export const MATERIAL_PATH_RE = /^c(\d+)\/(notes|lecture|exam|answer|other)\/(.+)$/;

/** 允许的课程级说明文件：c<courseId>/README.md */
export const COURSE_README_RE = /^c\d+\/README\.md$/;

/**
 * 文件名禁用字符（会破坏 CDN URL，或被 shell / 正则误解析）
 * 允许：中日韩文字、字母、数字、`-` `_` `.` 空格
 */
export const FORBIDDEN_NAME_CHARS = /[#?%&=+:;,@$!*'"()[\]{}|\\<>^~`\u0000-\u001f\u007f]/;

/** 取小写扩展名（不含点）；无扩展名返回 '' */
export function extOf(name) {
  const i = name.lastIndexOf('.');
  if (i <= 0) return '';
  return name.slice(i + 1).toLowerCase();
}

/** 路径是否为材料文件 */
export function isMaterialPath(p) {
  return MATERIAL_PATH_RE.test(p);
}

/** 路径是否属于允许的保留内容 */
export function isReservedPath(p) {
  const seg = p.split('/');
  if (seg.length === 1) return RESERVED_ROOT_FILES.has(p);
  if (RESERVED_ROOT_DIRS.has(seg[0])) return true;
  return COURSE_README_RE.test(p);
}
